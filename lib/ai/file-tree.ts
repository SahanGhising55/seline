/**
 * File Tree Generation for LLM Enhancement
 *
 * Generates file tree structures from synced folders for use by the
 * secondary LLM in prompt enhancement. Provides workspace context
 * to help the LLM understand the project structure.
 */

import { readdir, stat } from "fs/promises";
import { join, relative, extname, basename, dirname } from "path";
import { getSyncFolders } from "@/lib/vectordb/sync-service";

// =============================================================================
// Types
// =============================================================================

export interface FileTreeEntry {
  path: string;
  relativePath: string;
  type: "file" | "directory";
  extension?: string;
  depth: number;
}

export interface FileTreeResult {
  folderPath: string;
  displayName: string;
  entries: FileTreeEntry[];
  totalFiles: number;
  totalDirectories: number;
}

export interface FileTreeOptions {
  /** Maximum depth to traverse (default: 4) */
  maxDepth?: number;
  /** Maximum total entries to return (default: 200) */
  maxEntries?: number;
  /** File extensions to include (default: all) */
  includeExtensions?: string[];
  /** Patterns to exclude (default: common excludes) */
  excludePatterns?: string[];
}

const DEFAULT_EXCLUDE_PATTERNS = [
  "node_modules",
  ".git",
  ".next",
  ".cache",
  "dist",
  "build",
  "__pycache__",
  ".DS_Store",
  "*.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
];

// =============================================================================
// File Tree Discovery
// =============================================================================

/**
 * Check if a path should be excluded based on patterns
 */
function shouldExclude(name: string, excludePatterns: string[]): boolean {
  for (const pattern of excludePatterns) {
    if (pattern.startsWith("*.")) {
      const ext = pattern.slice(1);
      if (name.endsWith(ext)) return true;
    } else if (name === pattern || name.startsWith(".")) {
      return true;
    }
  }
  return false;
}

/**
 * Recursively discover files and directories in a folder
 */
async function discoverFileTree(
  folderPath: string,
  basePath: string,
  options: Required<FileTreeOptions>,
  currentDepth: number = 0,
  entries: FileTreeEntry[] = []
): Promise<FileTreeEntry[]> {
  if (currentDepth > options.maxDepth || entries.length >= options.maxEntries) {
    return entries;
  }

  try {
    const items = await readdir(folderPath, { withFileTypes: true });
    const sortedItems = items.sort((a, b) => {
      // Directories first, then files, both alphabetically
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const item of sortedItems) {
      if (entries.length >= options.maxEntries) break;
      if (shouldExclude(item.name, options.excludePatterns)) continue;

      const fullPath = join(folderPath, item.name);
      const relPath = relative(basePath, fullPath);

      if (item.isDirectory()) {
        entries.push({
          path: fullPath,
          relativePath: relPath,
          type: "directory",
          depth: currentDepth,
        });
        await discoverFileTree(fullPath, basePath, options, currentDepth + 1, entries);
      } else if (item.isFile()) {
        const ext = extname(item.name).slice(1).toLowerCase();
        if (options.includeExtensions.length === 0 || options.includeExtensions.includes(ext)) {
          entries.push({
            path: fullPath,
            relativePath: relPath,
            type: "file",
            extension: ext || undefined,
            depth: currentDepth,
          });
        }
      }
    }
  } catch (error) {
    console.error(`[FileTree] Error reading ${folderPath}:`, error);
  }

  return entries;
}

/**
 * Get file tree for all synced folders of an agent
 */
export async function getFileTreeForAgent(
  characterId: string,
  options: FileTreeOptions = {}
): Promise<FileTreeResult[]> {
  const folders = await getSyncFolders(characterId);
  const results: FileTreeResult[] = [];

  const opts: Required<FileTreeOptions> = {
    maxDepth: options.maxDepth ?? 4,
    maxEntries: options.maxEntries ?? 200,
    includeExtensions: options.includeExtensions ?? [],
    excludePatterns: options.excludePatterns ?? DEFAULT_EXCLUDE_PATTERNS,
  };

  for (const folder of folders) {
    const entries = await discoverFileTree(folder.folderPath, folder.folderPath, opts);

    results.push({
      folderPath: folder.folderPath,
      displayName: folder.displayName || basename(folder.folderPath),
      entries,
      totalFiles: entries.filter((e) => e.type === "file").length,
      totalDirectories: entries.filter((e) => e.type === "directory").length,
    });
  }

  return results;
}

// =============================================================================
// Markdown Formatting
// =============================================================================

/**
 * Format file tree as markdown for LLM consumption
 */
export function formatFileTreeAsMarkdown(
  trees: FileTreeResult[],
  maxLines: number = 100
): string {
  const lines: string[] = [];
  lines.push("## Workspace Structure\n");

  let totalLines = 2;

  for (const tree of trees) {
    if (totalLines >= maxLines) {
      lines.push(`\n*[...additional folders truncated]*`);
      break;
    }

    lines.push(`### ${tree.displayName}`);
    lines.push(`*Path: \`${tree.folderPath}\`*`);
    lines.push(`*${tree.totalFiles} files, ${tree.totalDirectories} directories*\n`);
    lines.push("```");
    totalLines += 5;

    // Build tree visualization
    for (const entry of tree.entries) {
      if (totalLines >= maxLines - 5) {
        lines.push(`...and ${tree.entries.length - tree.entries.indexOf(entry)} more entries`);
        totalLines++;
        break;
      }

      const indent = "  ".repeat(entry.depth);
      const prefix = entry.type === "directory" ? "📁 " : "📄 ";
      const name = basename(entry.relativePath);

      lines.push(`${indent}${prefix}${name}`);
      totalLines++;
    }

    lines.push("```\n");
    totalLines += 2;
  }

  return lines.join("\n");
}

/**
 * Get a compact file tree summary (for token-limited contexts)
 */
export function formatFileTreeCompact(trees: FileTreeResult[]): string {
  const lines: string[] = [];
  lines.push("**Synced Folders:**");

  for (const tree of trees) {
    lines.push(`- \`${tree.displayName}\`: ${tree.totalFiles} files in ${tree.totalDirectories} dirs`);

    // List top-level directories only
    const topDirs = tree.entries
      .filter((e) => e.type === "directory" && e.depth === 0)
      .map((e) => basename(e.relativePath))
      .slice(0, 8);

    if (topDirs.length > 0) {
      lines.push(`  Folders: ${topDirs.join(", ")}`);
    }
  }

  return lines.join("\n");
}

