/**
 * Agent Memory System
 *
 * A per-agent memory system that extracts important patterns from conversations
 * and builds a living ruleset that's injected into system prompts.
 *
 * @example
 * ```typescript
 * import { AgentMemoryManager, formatMemoriesForPrompt, triggerExtraction } from "@/lib/agent-memory";
 *
 * // Load memories for prompt injection
 * const { markdown, tokenEstimate } = formatMemoriesForPrompt(characterId);
 *
 * // Trigger extraction after chat
 * await triggerExtraction(characterId, sessionId);
 *
 * // Manual memory management
 * const manager = new AgentMemoryManager(characterId);
 * const memories = await manager.loadPendingMemories();
 * await manager.approveMemory(memoryId);
 * ```
 */

// Types
export type {
  MemoryCategory,
  MemoryStatus,
  MemorySource,
  ImportanceFactors,
  MemoryEntry,
  MemoryLogEvent,
  MemoryLogEventType,
  MemoryMetadata,
  CreateMemoryInput,
  UpdateMemoryInput,
  ExtractedMemory,
  FormattedMemory,
  MemoryListResponse,
  MemoryActionResponse,
} from "./types";

export { MEMORY_CATEGORIES } from "./types";

// Memory Manager
export { AgentMemoryManager } from "./memory-manager";

// Prompt Injection
export {
  formatMemoriesForPrompt,
  getPendingMemoryCount,
  getApprovedMemoryCount,
} from "./prompt-injection";

// Extraction
export {
  // Prompt
  MEMORY_EXTRACTION_PROMPT,
  buildExtractionPrompt,
  // Importance
  IMPORTANCE_WEIGHTS,
  IMPORTANCE_THRESHOLD,
  calculateImportance,
  meetsThreshold,
  scoreAboveThreshold,
  validateFactors,
  normalizeFactors,
  explainScore,
  // Service
  extractMemories,
  type ExtractionInput,
  type ExtractionResult,
  // Trigger
  shouldTriggerExtraction,
  triggerExtraction,
  manualExtraction,
  resetCooldown,
  clearAllCooldowns,
} from "./extraction";
