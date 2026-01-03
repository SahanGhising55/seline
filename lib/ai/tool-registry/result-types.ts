/**
 * Standardized Tool Result Types
 *
 * Provides consistent result structures for all tools, making it easier
 * to handle tool outputs in the UI and for programmatic consumption.
 */

/**
 * Base result status for all tools
 */
export type ToolResultStatus =
  | "completed"     // Tool completed successfully
  | "processing"    // Async job started, result pending
  | "error";        // Tool execution failed

/**
 * Generated image information
 */
export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
  format: string;
}

/**
 * Generated video information
 */
export interface GeneratedVideo {
  url: string;
  width: number;
  height: number;
  format: string;
  duration?: number;
  fps?: number;
}

/**
 * Metadata about tool execution
 */
export interface ToolExecutionMetadata {
  /** Time taken to execute in milliseconds */
  timeTaken?: number;
  /** Async job ID for polling */
  jobId?: string;
  /** Seed used for reproducible generation */
  seed?: number;
  /** Whether the error is likely transient and worth retrying */
  retryable?: boolean;
  /** Number of retry attempts made */
  retryCount?: number;
}

/**
 * Base tool result interface
 */
export interface ToolResultBase {
  /** Result status */
  status: ToolResultStatus;
  /** Execution metadata */
  metadata?: ToolExecutionMetadata;
}

/**
 * Successful result with images
 */
export interface ImageGenerationResult extends ToolResultBase {
  status: "completed";
  /** Generated images */
  images: GeneratedImage[];
  /** Optional text response */
  text?: string;
}

/**
 * Successful result with videos
 */
export interface VideoGenerationResult extends ToolResultBase {
  status: "completed";
  /** Generated videos */
  videos: GeneratedVideo[];
}

/**
 * Async processing result
 */
export interface ProcessingResult extends ToolResultBase {
  status: "processing";
  /** Status message */
  message: string;
  /** Job ID for status polling */
  jobId: string;
}

/**
 * Error result
 */
export interface ErrorResult extends ToolResultBase {
  status: "error";
  /** Error message */
  error: string;
}

/**
 * Union type for all possible tool results
 */
export type ToolResult =
  | ImageGenerationResult
  | VideoGenerationResult
  | ProcessingResult
  | ErrorResult;

/**
 * Type guard for image generation results
 */
export function isImageResult(result: ToolResult): result is ImageGenerationResult {
  return result.status === "completed" && "images" in result;
}

/**
 * Type guard for video generation results
 */
export function isVideoResult(result: ToolResult): result is VideoGenerationResult {
  return result.status === "completed" && "videos" in result;
}

/**
 * Type guard for processing results
 */
export function isProcessingResult(result: ToolResult): result is ProcessingResult {
  return result.status === "processing";
}

/**
 * Type guard for error results
 */
export function isErrorResult(result: ToolResult): result is ErrorResult {
  return result.status === "error";
}

/**
 * Create a standardized error result
 */
export function createErrorResult(
  error: unknown,
  options?: { retryable?: boolean; retryCount?: number }
): ErrorResult {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    status: "error",
    error: errorMessage,
    metadata: {
      retryable: options?.retryable ?? false,
      retryCount: options?.retryCount,
    },
  };
}

/**
 * Create a processing result for async jobs
 */
export function createProcessingResult(
  message: string,
  jobId: string
): ProcessingResult {
  return {
    status: "processing",
    message,
    jobId,
    metadata: { jobId },
  };
}

