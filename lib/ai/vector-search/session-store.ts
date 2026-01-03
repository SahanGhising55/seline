/**
 * Vector Search Session Store
 *
 * In-memory session-scoped storage for search history with TTL-based cleanup.
 * Sessions are isolated per character and automatically cleaned up.
 * Follows the web-browse session store pattern.
 */

import { nanoid } from "nanoid";
import type { VectorSearchSession, SearchHistoryEntry } from "./types";

// ============================================================================
// Configuration
// ============================================================================

// Session TTL: 30 minutes
const SESSION_TTL_MS = 30 * 60 * 1000;

// Max search history entries per session
const MAX_SEARCH_HISTORY = 20;

// Cleanup interval: run every 10 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

// ============================================================================
// Session Store
// ============================================================================

const sessionStore = new Map<string, VectorSearchSession>();

/**
 * Get or create a vector search session for a character
 */
export function getVectorSearchSession(characterId: string): VectorSearchSession {
  let session = sessionStore.get(characterId);

  if (!session) {
    session = {
      id: nanoid(),
      characterId,
      searchHistory: [],
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };
    sessionStore.set(characterId, session);
    console.log(`[VectorSearchSession] Created new session for character: ${characterId}`);
  }

  session.lastUsedAt = new Date();
  return session;
}

/**
 * Add a search to the session history
 */
export function addSearchHistory(
  characterId: string,
  entry: Omit<SearchHistoryEntry, "timestamp">
): void {
  const session = getVectorSearchSession(characterId);

  session.searchHistory.push({
    ...entry,
    timestamp: new Date(),
  });

  // Enforce max history limit (remove oldest first)
  if (session.searchHistory.length > MAX_SEARCH_HISTORY) {
    session.searchHistory = session.searchHistory.slice(-MAX_SEARCH_HISTORY);
  }

  session.lastUsedAt = new Date();
}

/**
 * Get recent search history for a character
 */
export function getSearchHistory(
  characterId: string,
  limit: number = 5
): SearchHistoryEntry[] {
  const session = sessionStore.get(characterId);
  if (!session) return [];

  return session.searchHistory.slice(-limit);
}

/**
 * Clear session for a character
 */
export function clearSession(characterId: string): void {
  sessionStore.delete(characterId);
  console.log(`[VectorSearchSession] Cleared session for character: ${characterId}`);
}

/**
 * Clean up stale sessions (older than TTL)
 */
export function cleanupStaleSessions(): number {
  const now = Date.now();
  let cleaned = 0;
  const sessionsToDelete: string[] = [];

  for (const [characterId, session] of sessionStore) {
    if (now - session.lastUsedAt.getTime() > SESSION_TTL_MS) {
      sessionsToDelete.push(characterId);
    }
  }

  for (const characterId of sessionsToDelete) {
    sessionStore.delete(characterId);
    cleaned++;
  }

  if (cleaned > 0) {
    console.log(`[VectorSearchSession] Cleaned up ${cleaned} stale sessions`);
  }

  return cleaned;
}

/**
 * Get session statistics (for debugging)
 */
export function getSessionStats(): {
  totalSessions: number;
  totalSearches: number;
} {
  let totalSearches = 0;
  for (const session of sessionStore.values()) {
    totalSearches += session.searchHistory.length;
  }

  return {
    totalSessions: sessionStore.size,
    totalSearches,
  };
}

// Run cleanup periodically
if (typeof setInterval !== "undefined") {
  setInterval(cleanupStaleSessions, CLEANUP_INTERVAL_MS);
}
