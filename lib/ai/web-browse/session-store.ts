/**
 * Web Browse Session Store
 *
 * In-memory session-scoped storage for web content with TTL-based cleanup.
 * Content is isolated per conversation session and automatically cleaned up.
 * Does NOT pollute the permanent document embeddings (docsSearch).
 */

import { nanoid } from "nanoid";
import type { WebContentEntry, WebBrowseSession } from "./types";
import { logToolEvent } from "@/lib/ai/tool-registry/logging";
import {
  deleteExpiredWebBrowseEntries,
  deleteWebBrowseEntries,
  getSession,
  listWebBrowseEntries,
  listWebBrowseEntriesByUrls,
  updateSession,
  upsertWebBrowseEntry,
} from "@/lib/db/queries";
import type { WebBrowseEntry } from "@/lib/db/schema";

// ============================================================================
// Configuration
// ============================================================================

// Default TTL: 2 hours (content expires after this time)
const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000;

// Max entries per session (prevent memory bloat)
const MAX_ENTRIES_PER_SESSION = 20;

// Cleanup interval: run every 10 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

// ============================================================================
// Session Store
// ============================================================================

const sessionStore = new Map<string, WebBrowseSession>();

/**
 * Get or create a web browse session
 */
export function getWebBrowseSession(sessionId: string): WebBrowseSession {
  let session = sessionStore.get(sessionId);

  if (!session) {
    session = {
      sessionId,
      entries: [],
      lastFetchedUrls: [],
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    };
    sessionStore.set(sessionId, session);
    console.log(`[WebBrowseSession] Created new session: ${sessionId}`);
  }

  session.lastAccessedAt = new Date();
  return session;
}

/**
 * Options for adding web content
 */
export interface AddWebContentOptions {
  images?: string[];
  ogImage?: string;
  ttlMs?: number;
}

function normalizeImages(images: unknown): string[] | undefined {
  if (!images) return undefined;
  if (Array.isArray(images)) {
    return images.filter((img) => typeof img === "string");
  }
  if (typeof images === "string") {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter((img) => typeof img === "string");
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function hydrateEntry(entry: WebBrowseEntry): WebContentEntry {
  return {
    id: entry.id,
    sessionId: entry.sessionId,
    url: entry.url,
    title: entry.title,
    content: entry.content,
    contentLength: entry.contentLength,
    fetchedAt: new Date(entry.fetchedAt),
    expiresAt: new Date(entry.expiresAt),
    images: normalizeImages(entry.images),
    ogImage: entry.ogImage || undefined,
  };
}

/**
 * Add web content to a session
 */
export async function addWebContent(
  sessionId: string,
  url: string,
  title: string,
  content: string,
  options: AddWebContentOptions = {}
): Promise<WebContentEntry> {
  const { images, ogImage, ttlMs = DEFAULT_TTL_MS } = options;
  const session = getWebBrowseSession(sessionId);
  const imagesToStore = images ?? [];

  // Check if URL already exists in session
  const existingIndex = session.entries.findIndex((e) => e.url === url);
  if (existingIndex >= 0) {
    // Update existing entry
    const entry = session.entries[existingIndex];
    entry.content = content;
    entry.title = title;
    entry.contentLength = content.length;
    entry.fetchedAt = new Date();
    entry.expiresAt = new Date(Date.now() + ttlMs);
    entry.images = images;
    entry.ogImage = ogImage;

    try {
      await upsertWebBrowseEntry({
        sessionId,
        url,
        title,
        content,
        contentLength: content.length,
        images: imagesToStore,
        ogImage,
        fetchedAt: entry.fetchedAt.toISOString(),
        expiresAt: entry.expiresAt.toISOString(),
      });
    } catch (error) {
      console.warn("[WebBrowseSession] Failed to persist entry update:", error);
    }

    // Log session store update
    logToolEvent({
      level: "info",
      toolName: "webBrowse.sessionStore",
      sessionId,
      event: "success",
      result: {
        action: "updated",
        url,
        contentLength: content.length,
        imageCount: images?.length || 0,
        hasOgImage: !!ogImage,
      },
    });

    return entry;
  }

  // Create new entry
  const entry: WebContentEntry = {
    id: nanoid(),
    sessionId,
    url,
    title,
    content,
    contentLength: content.length,
    fetchedAt: new Date(),
    expiresAt: new Date(Date.now() + ttlMs),
    images,
    ogImage,
  };

  // Enforce max entries limit (remove oldest first)
  if (session.entries.length >= MAX_ENTRIES_PER_SESSION) {
    const removed = session.entries.shift();
    logToolEvent({
      level: "warn",
      toolName: "webBrowse.sessionStore",
      sessionId,
      event: "success",
      result: { action: "evicted", evictedUrl: removed?.url },
    });
  }

  session.entries.push(entry);

  // Log session store addition with image details
  logToolEvent({
    level: "info",
    toolName: "webBrowse.sessionStore",
    sessionId,
    event: "success",
    result: {
      action: "added",
      url,
      title,
      contentLength: content.length,
      imageCount: images?.length || 0,
      hasOgImage: !!ogImage,
      sampleImages: images?.slice(0, 3),
    },
  });

  try {
    await upsertWebBrowseEntry({
      sessionId,
      url,
      title,
      content,
      contentLength: content.length,
      images: imagesToStore,
      ogImage,
      fetchedAt: entry.fetchedAt.toISOString(),
      expiresAt: entry.expiresAt.toISOString(),
    });
  } catch (error) {
    console.warn("[WebBrowseSession] Failed to persist entry:", error);
  }

  return entry;
}

/**
 * Get all content entries for a session
 */
export async function getSessionContent(sessionId: string): Promise<WebContentEntry[]> {
  const session = sessionStore.get(sessionId);
  const now = Date.now();

  if (session) {
    session.entries = session.entries.filter((e) => e.expiresAt.getTime() > now);
    if (session.entries.length > 0) {
      return session.entries;
    }
  }

  try {
    const storedEntries = await listWebBrowseEntries(sessionId);
    if (storedEntries.length === 0) return [];

    const hydrated = storedEntries.map(hydrateEntry);
    const hydratedSession = getWebBrowseSession(sessionId);
    hydratedSession.entries = hydrated;
    return hydrated;
  } catch (error) {
    console.warn("[WebBrowseSession] Failed to load entries from storage:", error);
  }

  return session?.entries ?? [];
}

/**
 * Get content for specific URLs in a session
 */
export async function getContentByUrls(
  sessionId: string,
  urls: string[]
): Promise<WebContentEntry[]> {
  if (urls.length === 0) return [];

  try {
    const storedEntries = await listWebBrowseEntriesByUrls(sessionId, urls);
    if (storedEntries.length > 0) {
      const hydrated = storedEntries.map(hydrateEntry);
      const session = getWebBrowseSession(sessionId);
      const byUrl = new Map(session.entries.map((entry) => [entry.url, entry]));
      for (const entry of hydrated) {
        byUrl.set(entry.url, entry);
      }
      session.entries = Array.from(byUrl.values());
      return hydrated;
    }
  } catch (error) {
    console.warn("[WebBrowseSession] Failed to load entries by URL:", error);
  }

  const session = sessionStore.get(sessionId);
  if (!session) return [];

  const now = Date.now();
  session.entries = session.entries.filter((e) => e.expiresAt.getTime() > now);
  const urlSet = new Set(urls);
  return session.entries.filter((e) => urlSet.has(e.url));
}

export async function setSessionRecentUrls(sessionId: string, urls: string[]): Promise<void> {
  const session = getWebBrowseSession(sessionId);
  session.lastFetchedUrls = urls;
  session.lastFetchedAt = new Date();
  session.lastAccessedAt = new Date();

  const storedSession = await getSession(sessionId);
  if (!storedSession) return;

  const metadata = (storedSession.metadata || {}) as Record<string, unknown>;
  const webBrowseMetadata = (metadata.webBrowse || {}) as Record<string, unknown>;

  await updateSession(sessionId, {
    metadata: {
      ...metadata,
      webBrowse: {
        ...webBrowseMetadata,
        lastFetchedUrls: urls,
        lastFetchedAt: new Date().toISOString(),
      },
    },
  });
}

export async function getSessionRecentUrls(sessionId: string): Promise<string[]> {
  const session = sessionStore.get(sessionId);
  if (session?.lastFetchedUrls && session.lastFetchedUrls.length > 0) {
    return session.lastFetchedUrls;
  }

  const storedSession = await getSession(sessionId);
  const metadata = storedSession?.metadata as Record<string, unknown> | undefined;
  const webBrowse = metadata?.webBrowse as Record<string, unknown> | undefined;
  const storedUrls = webBrowse?.lastFetchedUrls;

  if (Array.isArray(storedUrls) && storedUrls.every((url) => typeof url === "string")) {
    const hydratedSession = getWebBrowseSession(sessionId);
    hydratedSession.lastFetchedUrls = storedUrls;
    return storedUrls;
  }

  return [];
}

/**
 * Clear a specific session
 */
export async function clearSession(sessionId: string): Promise<void> {
  sessionStore.delete(sessionId);
  await deleteWebBrowseEntries(sessionId);
  console.log(`[WebBrowseSession] Cleared session: ${sessionId}`);
}

/**
 * Clean up expired entries across all sessions
 */
export async function cleanupExpiredEntries(): Promise<number> {
  const now = Date.now();
  let totalCleaned = 0;
  const sessionsToDelete: string[] = [];

  for (const [sessionId, session] of sessionStore) {
    const beforeCount = session.entries.length;
    session.entries = session.entries.filter((e) => e.expiresAt.getTime() > now);
    totalCleaned += beforeCount - session.entries.length;

    // Mark empty sessions for deletion
    if (session.entries.length === 0) {
      sessionsToDelete.push(sessionId);
    }
  }

  // Delete empty sessions
  for (const sessionId of sessionsToDelete) {
    sessionStore.delete(sessionId);
  }

  if (totalCleaned > 0 || sessionsToDelete.length > 0) {
    console.log(
      `[WebBrowseSession] Cleanup: removed ${totalCleaned} entries, ${sessionsToDelete.length} sessions`
    );
  }

  totalCleaned += await deleteExpiredWebBrowseEntries();

  return totalCleaned;
}

// Run cleanup periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    cleanupExpiredEntries().catch((error) => {
      console.warn("[WebBrowseSession] Cleanup failed:", error);
    });
  }, CLEANUP_INTERVAL_MS);
}

