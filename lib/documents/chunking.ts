export interface DocumentChunk {
  index: number;
  text: string;
  tokenCount?: number;
}

export interface ChunkingOptions {
  maxCharacters?: number;
  overlapCharacters?: number;
  maxChunks?: number;
}

function estimateChunkCount(
  textLength: number,
  maxCharacters: number,
  overlapCharacters: number
): number {
  if (textLength <= maxCharacters) return 1;
  const stride = Math.max(maxCharacters - overlapCharacters, 1);
  return Math.ceil((textLength - maxCharacters) / stride) + 1;
}

/**
 * Simple character-based chunking with configurable window and overlap.
 *
 * This keeps implementation lightweight while producing reasonable
 * chunks for embedding and retrieval.
 */
export function chunkText(
  text: string,
  options: ChunkingOptions = {}
): DocumentChunk[] {
  let maxCharacters = options.maxCharacters ?? 1500;
  let overlapCharacters = options.overlapCharacters ?? 200;
  const maxChunks = options.maxChunks ?? 0;

  const trimmed = text.trim();
  if (!trimmed) return [];

  if (maxCharacters <= 0) maxCharacters = 1;
  if (overlapCharacters < 0) overlapCharacters = 0;

  // Widen the window if needed to stay under the max chunk count.
  if (maxChunks > 0) {
    const estimatedChunks = estimateChunkCount(
      trimmed.length,
      maxCharacters,
      overlapCharacters
    );
    if (estimatedChunks > maxChunks) {
      const minWindow = Math.ceil(
        (trimmed.length + (maxChunks - 1) * overlapCharacters) / maxChunks
      );
      if (minWindow > maxCharacters) {
        maxCharacters = minWindow;
      }
    }
  }

  if (overlapCharacters >= maxCharacters) {
    overlapCharacters = Math.floor(maxCharacters / 4);
  }

  const chunks: DocumentChunk[] = [];

  let index = 0;
  let position = 0;

  while (position < trimmed.length) {
    const sliceEnd = Math.min(position + maxCharacters, trimmed.length);
    let chunkText = trimmed.slice(position, sliceEnd);

    // Try to avoid cutting in the middle of a sentence or paragraph
    if (sliceEnd < trimmed.length) {
      const lastLineBreak = chunkText.lastIndexOf("\n");
      const lastSentence = chunkText.lastIndexOf(". ");
      const cutoff = Math.max(lastLineBreak, lastSentence);
      if (cutoff > maxCharacters * 0.5) {
        chunkText = chunkText.slice(0, cutoff + 1);
      }
    }

    const normalized = chunkText.trim();
    if (normalized) {
      chunks.push({
        index,
        text: normalized,
        // Rough heuristic: ~4 chars per token
        tokenCount: Math.round(normalized.length / 4),
      });
      index += 1;
    }

    if (sliceEnd >= trimmed.length) {
      break;
    }

    // Move forward with overlap
    position = sliceEnd - overlapCharacters;
    if (position < 0) position = 0;
  }

  return chunks;
}

