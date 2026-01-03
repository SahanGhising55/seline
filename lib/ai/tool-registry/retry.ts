/**
 * Retry Utilities for Tool Execution
 *
 * Provides configurable retry logic for transient errors in tool execution.
 */

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs: number;
  /** Exponential backoff factor (default: 2) */
  backoffFactor: number;
  /** Function to determine if an error is retryable */
  isRetryable?: (error: unknown) => boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffFactor: 2,
  isRetryable: defaultIsRetryable,
};

/**
 * Default function to determine if an error is retryable
 * Retries on network errors, rate limits, and 5xx server errors
 */
export function defaultIsRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("fetch failed")
    ) {
      return true;
    }

    // Rate limiting
    if (message.includes("rate limit") || message.includes("429")) {
      return true;
    }

    // Server errors (5xx)
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("internal server error") ||
      message.includes("service unavailable")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate delay for a given retry attempt
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig
): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffFactor, attempt);
  // Add jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, config.maxDelayMs);
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: unknown;
  attempts: number;
}

/**
 * Execute a function with retry logic
 *
 * @param fn - The async function to execute
 * @param config - Retry configuration (uses defaults if not provided)
 * @returns The result of the function or throws after all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const isRetryable = fullConfig.isRetryable ?? defaultIsRetryable;

  let lastError: unknown;
  let attempts = 0;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    attempts = attempt + 1;
    try {
      const result = await fn();
      return { success: true, result, attempts };
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt < fullConfig.maxRetries && isRetryable(error)) {
        const delay = calculateDelay(attempt, fullConfig);
        console.log(
          `[Retry] Attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms...`,
          error instanceof Error ? error.message : error
        );
        await sleep(delay);
      } else {
        // Either out of retries or error is not retryable
        break;
      }
    }
  }

  return { success: false, error: lastError, attempts };
}

/**
 * Decorator to add retry logic to a tool execute function
 */
export function withToolRetry<TInput, TOutput>(
  executeFn: (input: TInput) => Promise<TOutput>,
  config: Partial<RetryConfig> = {}
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput): Promise<TOutput> => {
    const result = await withRetry(() => executeFn(input), config);
    if (result.success && result.result !== undefined) {
      return result.result;
    }
    throw result.error;
  };
}

