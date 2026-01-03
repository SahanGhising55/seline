import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { nanoid } from "nanoid";

// Get the base storage path
function getStoragePath(): string {
  // In Electron, LOCAL_DATA_PATH is set to userDataPath/data
  // So media goes to userDataPath/data/media
  if (process.env.LOCAL_DATA_PATH) {
    return join(process.env.LOCAL_DATA_PATH, "media");
  }
  // Fallback for development
  const dataDir = join(process.cwd(), ".local-data");
  return join(dataDir, "media");
}

// Ensure directory exists
function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

// Convert local path to URL for display in the app
// Uses /api/media/ endpoint which works in both Electron and browser
function pathToFileUrl(filePath: string): string {
  // Normalize path separators for cross-platform compatibility
  const normalizedPath = filePath.replace(/\\/g, "/");
  // Use the API endpoint to serve media files
  // This works in both Electron (via Next.js server) and browser
  return `/api/media/${normalizedPath}`;
}

export interface UploadResult {
  localPath: string;
  url: string;
}

export interface DocumentUploadResult extends UploadResult {
  extension: string;
}

/**
 * Save a base64-encoded image to local storage
 */
export async function saveBase64Image(
  base64Data: string,
  sessionId: string,
  role: "upload" | "reference" | "generated" | "mask" | "tile" = "generated",
  format: string = "png"
): Promise<UploadResult> {
  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Clean, "base64");

  const storagePath = getStoragePath();
  const relativePath = join(sessionId, role, `${nanoid()}.${format}`);
  const fullPath = join(storagePath, relativePath);

  ensureDir(dirname(fullPath));
  writeFileSync(fullPath, buffer);

  return {
    localPath: relativePath,
    url: pathToFileUrl(relativePath),
  };
}

/**
 * Save a base64-encoded video to local storage
 */
export async function saveBase64Video(
  base64Data: string,
  sessionId: string,
  role: "upload" | "reference" | "generated" | "mask" | "tile" = "generated",
  format: string = "mp4"
): Promise<UploadResult> {
  const base64Clean = base64Data.replace(/^data:(video|application)\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Clean, "base64");

  const storagePath = getStoragePath();
  const relativePath = join(sessionId, role, `${nanoid()}.${format}`);
  const fullPath = join(storagePath, relativePath);

  ensureDir(dirname(fullPath));
  writeFileSync(fullPath, buffer);

  return {
    localPath: relativePath,
    url: pathToFileUrl(relativePath),
  };
}

/**
 * Save a file buffer to local storage
 */
export async function saveFile(
  file: Buffer,
  sessionId: string,
  filename: string,
  role: "upload" | "reference" | "generated" | "mask" | "tile" = "upload"
): Promise<UploadResult> {
  const ext = filename.split(".").pop() || "bin";
  
  const storagePath = getStoragePath();
  const relativePath = join(sessionId, role, `${nanoid()}.${ext}`);
  const fullPath = join(storagePath, relativePath);

  ensureDir(dirname(fullPath));
  writeFileSync(fullPath, file);

  return {
    localPath: relativePath,
    url: pathToFileUrl(relativePath),
  };
}

	/**
	 * Save a document file (PDF, text, Markdown, HTML) to local storage
	 * under a stable, agent-scoped path.
	 */
	export async function saveDocumentFile(
	  file: Buffer,
	  userId: string,
	  characterId: string,
	  filename: string
	): Promise<DocumentUploadResult> {
	  const ext = filename.split(".").pop() || "bin";

	  const storagePath = getStoragePath();
	  const relativePath = join("docs", userId, characterId, `${nanoid()}.${ext}`);
	  const fullPath = join(storagePath, relativePath);

	  ensureDir(dirname(fullPath));
	  writeFileSync(fullPath, file);

	  return {
	    localPath: relativePath,
	    url: pathToFileUrl(relativePath),
	    extension: ext,
	  };
	}

/**
 * Read a file from local storage
 */
export function readLocalFile(relativePath: string): Buffer {
  const storagePath = getStoragePath();
  const fullPath = join(storagePath, relativePath);
  return readFileSync(fullPath);
}

/**
 * Delete a file from local storage
 */
export function deleteLocalFile(relativePath: string): void {
  const storagePath = getStoragePath();
  const fullPath = join(storagePath, relativePath);
  if (existsSync(fullPath)) {
    unlinkSync(fullPath);
  }
}

/**
 * Get the full file path for a relative path
 */
export function getFullPath(relativePath: string): string {
  const storagePath = getStoragePath();
  return join(storagePath, relativePath);
}

/**
 * Check if a file exists
 */
export function fileExists(relativePath: string): boolean {
  const storagePath = getStoragePath();
  const fullPath = join(storagePath, relativePath);
  return existsSync(fullPath);
}

/**
 * Get the storage base path (useful for Electron to serve files)
 */
export function getMediaStoragePath(): string {
  return getStoragePath();
}

