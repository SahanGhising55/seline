/**
 * File Watcher Service
 *
 * Uses chokidar to watch folders for changes and trigger incremental sync.
 * Implements debouncing to avoid excessive re-indexing.
 */

import chokidar, { FSWatcher } from "chokidar";
import { extname, relative } from "path";
import { db } from "@/lib/db/sqlite-client";
import { agentSyncFolders, agentSyncFiles } from "@/lib/db/sqlite-character-schema";
import { eq, and } from "drizzle-orm";
import { indexFileToVectorDB, removeFileFromVectorDB } from "./indexing";
import { isVectorDBEnabled } from "./client";

// Map of folder ID to watcher instance
const watchers = new Map<string, FSWatcher>();

// Debounce timers for file changes
const debounceTimers = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_MS = 1000; // Wait 1 second after last change before processing

interface WatcherConfig {
  folderId: string;
  characterId: string;
  folderPath: string;
  recursive: boolean;
  includeExtensions: string[];
  excludePatterns: string[];
}

/**
 * Start watching a folder for changes
 */
export async function startWatching(config: WatcherConfig): Promise<void> {
  if (!isVectorDBEnabled()) {
    console.log("[FileWatcher] VectorDB not enabled, skipping watch");
    return;
  }

  // Stop existing watcher if any
  await stopWatching(config.folderId);

  const { folderId, characterId, folderPath, recursive, includeExtensions, excludePatterns } = config;

  console.log(`[FileWatcher] Starting watch for folder: ${folderPath}`);

  const watcher = chokidar.watch(folderPath, {
    persistent: true,
    ignoreInitial: true, // Don't trigger on existing files
    depth: recursive ? undefined : 0,
    ignored: (path: string) => {
      // Check exclude patterns
      for (const pattern of excludePatterns) {
        if (path.includes(pattern)) {
          return true;
        }
      }
      return false;
    },
  });

  // Handle file add/change
  const handleFileChange = async (filePath: string) => {
    // Get extension without the leading dot for comparison
    const ext = extname(filePath).slice(1).toLowerCase();
    // Normalize includeExtensions by removing any leading dots
    const normalizedExts = includeExtensions.map(e => e.startsWith(".") ? e.slice(1).toLowerCase() : e.toLowerCase());
    if (normalizedExts.length > 0 && !normalizedExts.includes(ext)) {
      return; // Skip files with non-matching extensions
    }

    // Debounce to avoid rapid re-indexing
    const key = `${folderId}:${filePath}`;
    if (debounceTimers.has(key)) {
      clearTimeout(debounceTimers.get(key)!);
    }

    debounceTimers.set(
      key,
      setTimeout(async () => {
        debounceTimers.delete(key);
        try {
          console.log(`[FileWatcher] Indexing changed file: ${filePath}`);
          const relativePath = relative(folderPath, filePath);
          await indexFileToVectorDB({
            characterId,
            filePath,
            folderId,
            relativePath,
          });
        } catch (error) {
          console.error(`[FileWatcher] Error indexing file ${filePath}:`, error);
        }
      }, DEBOUNCE_MS)
    );
  };

  // Handle file removal
  const handleFileRemove = async (filePath: string) => {
    try {
      console.log(`[FileWatcher] Removing deleted file from index: ${filePath}`);

      // Look up the file record in the database
      const [fileRecord] = await db
        .select()
        .from(agentSyncFiles)
        .where(and(
          eq(agentSyncFiles.folderId, folderId),
          eq(agentSyncFiles.filePath, filePath)
        ));

      if (fileRecord) {
        // Parse vectorPointIds - handle both arrays and double-stringified data
        let pointIds: string[] = [];
        if (Array.isArray(fileRecord.vectorPointIds)) {
          pointIds = fileRecord.vectorPointIds;
        } else if (typeof fileRecord.vectorPointIds === "string") {
          try {
            const parsed = JSON.parse(fileRecord.vectorPointIds);
            pointIds = Array.isArray(parsed) ? parsed : [];
          } catch {
            pointIds = [];
          }
        }

        // Remove from vector DB
        if (pointIds.length > 0) {
          await removeFileFromVectorDB({
            characterId,
            pointIds,
          });
        }

        // Remove from database
        await db.delete(agentSyncFiles).where(eq(agentSyncFiles.id, fileRecord.id));
        console.log(`[FileWatcher] Removed ${pointIds.length} vectors for deleted file: ${filePath}`);
      }
    } catch (error) {
      console.error(`[FileWatcher] Error removing file ${filePath}:`, error);
    }
  };

  watcher
    .on("add", handleFileChange)
    .on("change", handleFileChange)
    .on("unlink", handleFileRemove)
    .on("error", (error) => {
      console.error(`[FileWatcher] Error watching ${folderPath}:`, error);
    });

  watchers.set(folderId, watcher);

  // Update folder status
  await db
    .update(agentSyncFolders)
    .set({ status: "synced" })
    .where(eq(agentSyncFolders.id, folderId));
}

/**
 * Stop watching a folder
 */
export async function stopWatching(folderId: string): Promise<void> {
  const watcher = watchers.get(folderId);
  if (watcher) {
    await watcher.close();
    watchers.delete(folderId);
    console.log(`[FileWatcher] Stopped watching folder: ${folderId}`);
  }

  // Clear any pending debounce timers for this folder
  for (const [key, timer] of debounceTimers.entries()) {
    if (key.startsWith(`${folderId}:`)) {
      clearTimeout(timer);
      debounceTimers.delete(key);
    }
  }
}

/**
 * Stop all watchers
 */
export async function stopAllWatchers(): Promise<void> {
  for (const folderId of watchers.keys()) {
    await stopWatching(folderId);
  }
}

/**
 * Get list of currently watched folders
 */
export function getWatchedFolders(): string[] {
  return Array.from(watchers.keys());
}

/**
 * Check if a folder is being watched
 */
export function isWatching(folderId: string): boolean {
  return watchers.has(folderId);
}

