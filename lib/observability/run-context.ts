/**
 * Run Context - AsyncLocalStorage-based context propagation
 * 
 * Provides a way to propagate run context (runId, sessionId, etc.) through
 * the call stack without explicitly passing it through every function.
 * 
 * Usage:
 * 
 * // At pipeline entrypoint (e.g., API route):
 * await withRunContext({ runId, sessionId, pipelineName }, async () => {
 *   // All code here can access context via getRunContext()
 *   await someFunction();
 * });
 * 
 * // Anywhere in the call stack:
 * const ctx = getRunContext();
 * if (ctx) {
 *   await appendRunEvent({ runId: ctx.runId, ... });
 * }
 */

import { AsyncLocalStorage } from "async_hooks";

// ============================================================================
// Types
// ============================================================================

/**
 * Run context data available throughout a request/execution
 */
export interface RunContextData {
  /** Unique identifier for this agent run */
  runId: string;
  /** Session this run belongs to */
  sessionId: string;
  /** User who triggered the run (optional) */
  userId?: string;
  /** Character/agent context (optional) */
  characterId?: string;
  /** Pipeline name for categorization */
  pipelineName: string;
  /** How the run was triggered */
  triggerType?: "chat" | "api" | "job" | "cron" | "webhook" | "tool";
  /** Message ID being processed (optional, may be set mid-run) */
  messageId?: string;
  /** OpenTelemetry trace ID (optional) */
  traceId?: string;
  /** OpenTelemetry span ID (optional) */
  spanId?: string;
  /** Run start time for duration calculations */
  startTime: number;
}

/**
 * Options for creating a run context
 */
export interface CreateRunContextOptions {
  runId: string;
  sessionId: string;
  pipelineName: string;
  userId?: string;
  characterId?: string;
  triggerType?: RunContextData["triggerType"];
  traceId?: string;
  spanId?: string;
}

// ============================================================================
// AsyncLocalStorage Instance
// ============================================================================

const runContextStorage = new AsyncLocalStorage<RunContextData>();

// ============================================================================
// Context API
// ============================================================================

/**
 * Get the current run context, if any.
 * Returns undefined if not within a run context.
 */
export function getRunContext(): RunContextData | undefined {
  return runContextStorage.getStore();
}

/**
 * Get the current run context, throwing if not available.
 * Use this in code that MUST be within a run context.
 */
export function requireRunContext(): RunContextData {
  const ctx = runContextStorage.getStore();
  if (!ctx) {
    throw new Error("No run context available. Ensure code is called within withRunContext().");
  }
  return ctx;
}

/**
 * Execute a function within a run context.
 * All code called within the callback will have access to the context.
 */
export async function withRunContext<T>(
  options: CreateRunContextOptions,
  fn: () => Promise<T>
): Promise<T> {
  const context: RunContextData = {
    runId: options.runId,
    sessionId: options.sessionId,
    pipelineName: options.pipelineName,
    userId: options.userId,
    characterId: options.characterId,
    triggerType: options.triggerType ?? "api",
    traceId: options.traceId,
    spanId: options.spanId,
    startTime: Date.now(),
  };

  return runContextStorage.run(context, fn);
}

/**
 * Execute a synchronous function within a run context.
 * For sync callbacks that don't need to await.
 */
export function withRunContextSync<T>(
  options: CreateRunContextOptions,
  fn: () => T
): T {
  const context: RunContextData = {
    runId: options.runId,
    sessionId: options.sessionId,
    pipelineName: options.pipelineName,
    userId: options.userId,
    characterId: options.characterId,
    triggerType: options.triggerType ?? "api",
    startTime: Date.now(),
  };

  return runContextStorage.run(context, fn);
}

/**
 * Update the current run context with additional data.
 * Useful for setting messageId after it's known.
 * Note: This creates a NEW context for subsequent code.
 */
export async function updateRunContext<T>(
  updates: Partial<Omit<RunContextData, "runId" | "startTime">>,
  fn: () => Promise<T>
): Promise<T> {
  const current = getRunContext();
  if (!current) {
    throw new Error("Cannot update run context: no context available");
  }

  const updated: RunContextData = { ...current, ...updates };
  return runContextStorage.run(updated, fn);
}

/**
 * Get elapsed time since run started (in milliseconds)
 */
export function getRunElapsedMs(): number | undefined {
  const ctx = getRunContext();
  return ctx ? Date.now() - ctx.startTime : undefined;
}

