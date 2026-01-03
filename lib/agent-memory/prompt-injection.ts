/**
 * Prompt Injection Helper
 *
 * Formats agent memories for injection into system prompts.
 */

import { AgentMemoryManager } from "./memory-manager";
import type { FormattedMemory } from "./types";

/**
 * Format approved memories for injection into system prompt.
 * Returns the markdown content and an estimated token count.
 */
export function formatMemoriesForPrompt(characterId: string): FormattedMemory {
  const manager = new AgentMemoryManager(characterId);
  const markdown = manager.formatForPrompt();

  if (!markdown) {
    return {
      markdown: "",
      tokenEstimate: 0,
      memoryCount: 0,
    };
  }

  // Rough token estimate: ~4 chars per token
  const tokenEstimate = Math.ceil(markdown.length / 4);

  // Count memories (count lines starting with "- ")
  const memoryCount = (markdown.match(/^- /gm) || []).length;

  return {
    markdown,
    tokenEstimate,
    memoryCount,
  };
}

/**
 * Get just the memory count without loading full content
 * Useful for UI badges showing pending memory count
 */
export async function getPendingMemoryCount(characterId: string): Promise<number> {
  const manager = new AgentMemoryManager(characterId);
  const metadata = await manager.getMetadata();
  return metadata.pendingCount;
}

/**
 * Get approved memory count
 */
export async function getApprovedMemoryCount(characterId: string): Promise<number> {
  const manager = new AgentMemoryManager(characterId);
  const metadata = await manager.getMetadata();
  return metadata.approvedCount;
}
