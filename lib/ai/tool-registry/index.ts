/**
 * Tool Registry Module
 *
 * Provides centralized tool management with support for:
 * - Tool Search Tool pattern (Anthropic's Advanced Tool Use)
 * - Deferred loading for context optimization
 * - Tool categorization and discovery
 * - Standardized result types
 * - Retry logic for transient errors
 * - Structured logging
 */

// Core registry
export { ToolRegistry } from "./registry";
export { createToolSearchTool, createListToolsTool, type ToolSearchContext } from "./search-tool";
export { registerAllTools } from "./tool-definitions";

// Result types and utilities
export {
  type ToolResultStatus,
  type GeneratedImage,
  type GeneratedVideo,
  type ToolExecutionMetadata,
  type ToolResultBase,
  type ImageGenerationResult,
  type VideoGenerationResult,
  type ProcessingResult,
  type ErrorResult,
  type ToolResult,
  isImageResult,
  isVideoResult,
  isProcessingResult,
  isErrorResult,
  createErrorResult,
  createProcessingResult,
} from "./result-types";

// Retry utilities
export {
  type RetryConfig,
  type RetryResult,
  DEFAULT_RETRY_CONFIG,
  defaultIsRetryable,
  withRetry,
  withToolRetry,
} from "./retry";

// Logging utilities
export {
  type LogLevel,
  type ToolLogEntry,
  setToolLogHandler,
  logToolEvent,
  createToolLogger,
} from "./logging";

// Type exports
export type {
  ToolCategory,
  ToolMetadata,
  ToolFactory,
  ToolFactoryOptions,
  ToolContext,
  ToolSearchResult,
  RegisteredTool,
  ToolLoadingConfig,
} from "./types";

// Agent state management
export {
  type AgentToolState,
  type ImageAnalysisState,
  type ToolLimits,
  DEFAULT_TOOL_LIMITS,
  createAgentToolState,
  incrementToolCount,
  getToolCount,
  isToolLimitExceeded,
  addCachedMarker,
  wasQueryExecuted,
  recordQuery,
  setImageAnalysis,
  cacheReferenceUrl,
  getCachedReferenceUrl,
} from "./agent-state";

// Tool selection helpers
export {
  type ToolRecommendation,
  type ToolSelectionContext,
  evaluateSearchToolUsage,
  evaluateVirtualTryOnWorkflow,
  evaluateToolSelection,
} from "./tool-selector";

