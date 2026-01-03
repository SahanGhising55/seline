/**
 * Vector Search Module
 *
 * LLM-powered semantic search over indexed codebase folders.
 * Uses a secondary LLM to synthesize and explain search results.
 *
 * Architecture:
 * - session-store.ts: Per-character session management with search history
 * - synthesizer.ts: Secondary LLM for intelligent result synthesis
 * - tool.ts: AI tool implementation
 * - types.ts: Type definitions
 */

// Types
export type {
  SearchStrategy,
  SearchHistoryEntry,
  VectorSearchSession,
  VectorSearchOptions,
  SearchFinding,
  VectorSearchResult,
  VectorSearchPhase,
  VectorSearchEvent,
  VectorSearchEventEmitter,
  RawSearchResult,
  SynthesisRequest,
  SynthesisResult,
} from "./types";

// Session management
export {
  getVectorSearchSession,
  addSearchHistory,
  getSearchHistory,
  clearSession,
  cleanupStaleSessions,
  getSessionStats,
} from "./session-store";

// Synthesizer
export { synthesizeSearchResults } from "./synthesizer";

// Tool factory
export { createVectorSearchToolV2, createVectorQueryTool, createReadFileTool } from "./tool";
export type { ReadFileToolOptions } from "./tool";
