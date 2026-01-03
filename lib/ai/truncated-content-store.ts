/**
 * Truncated Content Store
 *
 * In-memory session-scoped storage for full untruncated content.
 * When text content is truncated for the AI's context window, the full
 * content is stored here and can be retrieved on-demand via the
 * retrieveFullContent tool.
 *
 * This enables token-efficient context while preserving access to full content.
 */

import { nanoid } from "nanoid";

// ============================================================================
// Configuration
// ============================================================================

// Default TTL: 1 hour (content expires after this time)
const DEFAULT_TTL_MS = 60 * 60 * 1000;

// Max entries per session (prevent memory bloat)
const MAX_ENTRIES_PER_SESSION = 50;

// Cleanup interval: run every 15 minutes
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

// Track sessions that have truncated content (for dynamic tool injection)
const sessionsWithTruncation = new Set<string>();

/**
 * Check if a session has any truncated content stored
 * Used to dynamically inject retrieveFullContent tool
 */
export function sessionHasTruncatedContent(sessionId: string): boolean {
  return sessionsWithTruncation.has(sessionId);
}

// ============================================================================
// Types
// ============================================================================

export interface TruncatedContentEntry {
  /** Unique identifier for retrieving the content */
  id: string;
  /** Session this content belongs to */
  sessionId: string;
  /** Context where truncation occurred (e.g., "user message", "webSearch result") */
  context: string;
  /** The full untruncated content */
  fullContent: string;
  /** Length of the full content */
  fullLength: number;
  /** Length it was truncated to */
  truncatedLength: number;
  /** When the content was stored */
  storedAt: Date;
  /** When the content expires */
  expiresAt: Date;
}

interface TruncatedContentSession {
  sessionId: string;
  entries: Map<string, TruncatedContentEntry>;
  createdAt: Date;
  lastAccessedAt: Date;
}

// ============================================================================
// Session Store
// ============================================================================

const sessionStore = new Map<string, TruncatedContentSession>();

/**
 * Get or create a truncated content session
 */
function getSession(sessionId: string): TruncatedContentSession {
  let session = sessionStore.get(sessionId);

  if (!session) {
    session = {
      sessionId,
      entries: new Map(),
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    };
    sessionStore.set(sessionId, session);
    console.log(`[TruncatedContentStore] Created new session: ${sessionId}`);
  }

  session.lastAccessedAt = new Date();
  return session;
}

/**
 * Store full content and return a reference ID
 */
export function storeFullContent(
  sessionId: string,
  context: string,
  fullContent: string,
  truncatedLength: number,
  ttlMs: number = DEFAULT_TTL_MS
): string {
  const session = getSession(sessionId);

  // Generate a short, readable ID
  const id = `trunc_${nanoid(8)}`;

  // Enforce max entries limit (remove oldest first)
  if (session.entries.size >= MAX_ENTRIES_PER_SESSION) {
    // Find and remove the oldest entry
    let oldestId: string | null = null;
    let oldestTime = Date.now();
    for (const [entryId, entry] of session.entries) {
      if (entry.storedAt.getTime() < oldestTime) {
        oldestTime = entry.storedAt.getTime();
        oldestId = entryId;
      }
    }
    if (oldestId) {
      session.entries.delete(oldestId);
      console.log(`[TruncatedContentStore] Evicted oldest entry: ${oldestId}`);
    }
  }

  const entry: TruncatedContentEntry = {
    id,
    sessionId,
    context,
    fullContent,
    fullLength: fullContent.length,
    truncatedLength,
    storedAt: new Date(),
    expiresAt: new Date(Date.now() + ttlMs),
  };

  session.entries.set(id, entry);

  // Track that this session has truncated content (for dynamic tool injection)
  sessionsWithTruncation.add(sessionId);

  console.log(
    `[TruncatedContentStore] Stored content ${id}: ${fullContent.length} chars (truncated to ${truncatedLength})`
  );

  return id;
}

/**
 * Retrieve full content by reference ID
 */
export function retrieveFullContent(
  sessionId: string,
  contentId: string
): TruncatedContentEntry | null {
  const session = sessionStore.get(sessionId);
  if (!session) {
    console.log(`[TruncatedContentStore] Session not found: ${sessionId}`);
    return null;
  }

  const entry = session.entries.get(contentId);
  if (!entry) {
    console.log(`[TruncatedContentStore] Content not found: ${contentId}`);
    return null;
  }

  // Check expiration
  if (entry.expiresAt.getTime() < Date.now()) {
    session.entries.delete(contentId);
    console.log(`[TruncatedContentStore] Content expired: ${contentId}`);
    return null;
  }

  console.log(`[TruncatedContentStore] Retrieved content ${contentId}: ${entry.fullLength} chars`);
  return entry;
}

/**
 * List all stored content IDs for a session (for debugging/listing)
 */
export function listStoredContent(sessionId: string): Array<{
  id: string;
  context: string;
  fullLength: number;
  truncatedLength: number;
}> {
  const session = sessionStore.get(sessionId);
  if (!session) return [];

  const now = Date.now();
  const results: Array<{
    id: string;
    context: string;
    fullLength: number;
    truncatedLength: number;
  }> = [];

  for (const entry of session.entries.values()) {
    if (entry.expiresAt.getTime() > now) {
      results.push({
        id: entry.id,
        context: entry.context,
        fullLength: entry.fullLength,
        truncatedLength: entry.truncatedLength,
      });
    }
  }

  return results;
}

/**
 * Clear a specific session
 */
export function clearSession(sessionId: string): void {
  sessionStore.delete(sessionId);
  console.log(`[TruncatedContentStore] Cleared session: ${sessionId}`);
}

/**
 * Clean up expired entries across all sessions
 */
export function cleanupExpiredEntries(): number {
  const now = Date.now();
  let totalCleaned = 0;
  const sessionsToDelete: string[] = [];

  for (const [sessionId, session] of sessionStore) {
    for (const [entryId, entry] of session.entries) {
      if (entry.expiresAt.getTime() <= now) {
        session.entries.delete(entryId);
        totalCleaned++;
      }
    }

    // Mark empty sessions for deletion
    if (session.entries.size === 0) {
      sessionsToDelete.push(sessionId);
    }
  }

  // Delete empty sessions
  for (const sessionId of sessionsToDelete) {
    sessionStore.delete(sessionId);
  }

  if (totalCleaned > 0 || sessionsToDelete.length > 0) {
    console.log(
      `[TruncatedContentStore] Cleanup: removed ${totalCleaned} entries, ${sessionsToDelete.length} sessions`
    );
  }

  return totalCleaned;
}

// Run cleanup periodically
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredEntries, CLEANUP_INTERVAL_MS);
}

