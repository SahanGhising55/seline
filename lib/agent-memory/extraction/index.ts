/**
 * Memory Extraction Module
 *
 * Exports all extraction-related functionality.
 */

export { MEMORY_EXTRACTION_PROMPT, buildExtractionPrompt } from "./prompt";
export {
  IMPORTANCE_WEIGHTS,
  IMPORTANCE_THRESHOLD,
  calculateImportance,
  meetsThreshold,
  scoreAboveThreshold,
  validateFactors,
  normalizeFactors,
  explainScore,
} from "./importance";
export { extractMemories, type ExtractionInput, type ExtractionResult } from "./service";
export {
  shouldTriggerExtraction,
  triggerExtraction,
  manualExtraction,
  resetCooldown,
  clearAllCooldowns,
} from "./trigger";
