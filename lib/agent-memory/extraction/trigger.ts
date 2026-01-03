/**
 * Memory Extraction Trigger
 *
 * Determines when to run memory extraction and manages the background extraction process.
 */

import { extractMemories, type ExtractionResult } from "./service";
import { getMessages } from "@/lib/db/queries";
import { AgentMemoryManager } from "../memory-manager";

// Configuration
const EXTRACTION_COOLDOWN_MS = 240 * 1000; // 4 minute between extractions
const MIN_MESSAGES_FOR_EXTRACTION = 4; // At least 4 messages (2 exchanges)
const MAX_MESSAGES_TO_ANALYZE = 5; // Don't analyze more than 30 messages at once

// Track last extraction time per character (in-memory cache)
const lastExtractionTime = new Map<string, number>();

/**
 * Check if extraction should be triggered for a character
 */
export async function shouldTriggerExtraction(
  characterId: string,
  sessionId: string
): Promise<boolean> {
  // Check cooldown
  const lastTime = lastExtractionTime.get(characterId);
  if (lastTime && Date.now() - lastTime < EXTRACTION_COOLDOWN_MS) {
    console.log(`[Memory Trigger] Skipping extraction for ${characterId} - cooldown active`);
    return false;
  }

  // Check message count
  try {
    const messages = await getMessages(sessionId);
    if (messages.length < MIN_MESSAGES_FOR_EXTRACTION) {
      console.log(`[Memory Trigger] Skipping extraction for ${characterId} - not enough messages (${messages.length})`);
      return false;
    }
  } catch (error) {
    console.error("[Memory Trigger] Error checking messages:", error);
    return false;
  }

  return true;
}

/**
 * Trigger memory extraction for a character's session
 * This runs in the background (fire-and-forget) to not block chat responses
 */
export async function triggerExtraction(
  characterId: string,
  sessionId: string
): Promise<void> {
  // Check if we should run extraction
  if (!(await shouldTriggerExtraction(characterId, sessionId))) {
    return;
  }

  // Update cooldown immediately to prevent duplicate triggers
  lastExtractionTime.set(characterId, Date.now());

  // Run extraction in background
  runExtractionBackground(characterId, sessionId).catch((error) => {
    console.error("[Memory Trigger] Background extraction failed:", error);
  });
}

/**
 * Run extraction in the background
 */
async function runExtractionBackground(
  characterId: string,
  sessionId: string
): Promise<ExtractionResult> {
  console.log(`[Memory Trigger] Starting background extraction for ${characterId}`);

  try {
    // Get recent messages
    const allMessages = await getMessages(sessionId);
    const recentMessages = allMessages.slice(-MAX_MESSAGES_TO_ANALYZE);

    // Format messages for extraction
    const formattedMessages = recentMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: extractTextContent(m.content),
        createdAt: m.createdAt,
      }));

    // Run extraction
    const result = await extractMemories({
      characterId,
      sessionId,
      messages: formattedMessages,
    });

    console.log(`[Memory Trigger] Extraction complete: ${result.extracted.length} new, ${result.skipped} skipped`);

    return result;
  } catch (error) {
    console.error("[Memory Trigger] Extraction error:", error);
    return {
      extracted: [],
      skipped: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Extract text content from message content (which can be string or JSON array)
 */
function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const textParts: string[] = [];

    for (const part of content) {
      if (typeof part === "object" && part !== null) {
        const obj = part as Record<string, unknown>;
        if (obj.type === "text" && typeof obj.text === "string") {
          textParts.push(obj.text);
        }
      }
    }

    return textParts.join("\n");
  }

  // Fallback: stringify
  try {
    return JSON.stringify(content);
  } catch {
    return "";
  }
}

/**
 * Manually trigger extraction (for API endpoint)
 */
export async function manualExtraction(
  characterId: string,
  sessionId: string
): Promise<ExtractionResult> {
  console.log(`[Memory Trigger] Manual extraction requested for ${characterId}`);

  // Skip cooldown for manual triggers
  lastExtractionTime.set(characterId, Date.now());

  return runExtractionBackground(characterId, sessionId);
}

/**
 * Reset cooldown for a character (useful for testing)
 */
export function resetCooldown(characterId: string): void {
  lastExtractionTime.delete(characterId);
}

/**
 * Clear all cooldowns (useful for testing)
 */
export function clearAllCooldowns(): void {
  lastExtractionTime.clear();
}
