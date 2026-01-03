/**
 * Web Cache Service
 *
 * Caches web search and fetch results in the embeddings system (agentDocuments)
 * for efficient retrieval via semantic search instead of bloating context.
 */

import {
  createAgentDocument,
  createAgentDocumentChunks,
  getExpiredAgentDocuments,
  deleteAgentDocument,
} from "@/lib/db/queries";
import { indexAgentDocumentEmbeddings } from "@/lib/documents/embeddings";
import { chunkText } from "@/lib/documents/chunking";
import type { WebSearchSource, WebSearchResult } from "@/lib/ai/web-search";

// ============================================================================
// Types
// ============================================================================

export interface WebCacheOptions {
  userId: string;
  characterId: string;
  expiryHours?: number; // Default 24 hours
}

export interface CacheResult {
  documentId: string;
  chunksCreated: number;
  url: string;
}

// ============================================================================
// Web Search Caching
// ============================================================================

/**
 * Cache web search results as agent documents for later retrieval via docsSearch.
 * Each source becomes a separate document with its snippet chunked and embedded.
 */
export async function cacheWebSearchResults(
  searchResults: WebSearchResult,
  options: WebCacheOptions
): Promise<CacheResult[]> {
  const results: CacheResult[] = [];
  const expiryMs = (options.expiryHours || 24) * 60 * 60 * 1000;

  for (const source of searchResults.sources) {
    try {
      // Create document record
      const doc = await createAgentDocument({
        userId: options.userId,
        characterId: options.characterId,
        originalFilename: source.title || new URL(source.url).hostname,
        contentType: "text/html",
        extension: "html",
        sourceType: "web_search",
        storagePath: `web-cache/search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        status: "pending",
        metadata: {
          url: source.url,
          searchQuery: searchResults.query,
          cachedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + expiryMs).toISOString(),
          relevanceScore: source.relevanceScore,
          sourceType: "web_search",
        },
      });

      // Chunk the snippet content
      const chunks = chunkText(source.snippet, {
        maxCharacters: 500,
        overlapCharacters: 50,
      });

      if (chunks.length > 0) {
        // Store chunks
        await createAgentDocumentChunks(
          chunks.map((chunk) => ({
            documentId: doc.id,
            userId: options.userId,
            characterId: options.characterId,
            chunkIndex: chunk.index,
            text: chunk.text,
            tokenCount: chunk.tokenCount,
          }))
        );

        // Index embeddings (async, don't block)
        indexAgentDocumentEmbeddings({
          documentId: doc.id,
          userId: options.userId,
        }).catch((err) => {
          console.error(`[WEB-CACHE] Failed to index embeddings for ${doc.id}:`, err);
        });
      }

      results.push({
        documentId: doc.id,
        chunksCreated: chunks.length,
        url: source.url,
      });

      console.log(`[WEB-CACHE] Cached search result: ${source.title} (${chunks.length} chunks)`);
    } catch (err) {
      console.error(`[WEB-CACHE] Failed to cache search result ${source.url}:`, err);
    }
  }

  return results;
}

// ============================================================================
// Web Page Caching (for fetchWebpage)
// ============================================================================

/**
 * Cache a fetched web page as an agent document for later retrieval via docsSearch.
 * The full markdown content is chunked and embedded.
 */
export async function cacheWebPage(
  url: string,
  markdown: string,
  title: string,
  options: WebCacheOptions
): Promise<CacheResult | null> {
  const expiryMs = (options.expiryHours || 24) * 60 * 60 * 1000;

  try {
    // Create document record
    const doc = await createAgentDocument({
      userId: options.userId,
      characterId: options.characterId,
      originalFilename: title || new URL(url).hostname,
      contentType: "text/html",
      extension: "html",
      sourceType: "web_fetch",
      storagePath: `web-cache/fetch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: "pending",
      metadata: {
        url,
        cachedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + expiryMs).toISOString(),
        sourceType: "web_fetch",
        contentLength: markdown.length,
      },
    });

    // Chunk the full markdown content
    const chunks = chunkText(markdown, {
      maxCharacters: 1000,
      overlapCharacters: 100,
    });

    if (chunks.length > 0) {
      // Store chunks
      await createAgentDocumentChunks(
        chunks.map((chunk) => ({
          documentId: doc.id,
          userId: options.userId,
          characterId: options.characterId,
          chunkIndex: chunk.index,
          text: chunk.text,
          tokenCount: chunk.tokenCount,
        }))
      );

      // Index embeddings (async, don't block)
      indexAgentDocumentEmbeddings({
        documentId: doc.id,
        userId: options.userId,
      }).catch((err) => {
        console.error(`[WEB-CACHE] Failed to index embeddings for ${doc.id}:`, err);
      });
    }

    console.log(`[WEB-CACHE] Cached web page: ${title} (${chunks.length} chunks, ${markdown.length} chars)`);

    return {
      documentId: doc.id,
      chunksCreated: chunks.length,
      url,
    };
  } catch (err) {
    console.error(`[WEB-CACHE] Failed to cache web page ${url}:`, err);
    return null;
  }
}

// ============================================================================
// Cleanup
// ============================================================================

/**
 * Cleanup expired web cache documents.
 * Deletes documents where metadata.expiresAt is in the past.
 */
export async function cleanupExpiredWebCache(): Promise<void> {
  try {
    const expiredDocs = await getExpiredAgentDocuments();

    if (expiredDocs.length === 0) return;

    console.log(`[WEB-CACHE] Cleaning up ${expiredDocs.length} expired documents...`);

    for (const doc of expiredDocs) {
      await deleteAgentDocument(doc.id, doc.userId);
      console.log(`[WEB-CACHE] Deleted expired document: ${doc.id} (${doc.originalFilename})`);
    }
  } catch (err) {
    console.error("[WEB-CACHE] Failed to cleanup expired web cache:", err);
  }
}

// ============================================================================
// Brief Result Formatters
// ============================================================================

/**
 * Format search results as a brief summary (titles + URLs only, no snippets).
 * This is what gets returned to the AI context instead of full results.
 */
export function formatBriefSearchResults(sources: WebSearchSource[]): string {
  if (sources.length === 0) {
    return "No results found.";
  }

  let formatted = "**Search Results (cached for retrieval via docsSearch):**\n\n";
  sources.forEach((source, index) => {
    formatted += `${index + 1}. **${source.title}** - ${source.url}\n`;
  });
  formatted += "\n*Use docsSearch to retrieve specific information from these results.*";

  return formatted;
}

/**
 * Format a fetched page as a brief summary.
 */
export function formatBriefPageResult(url: string, title: string, contentLength: number): string {
  return `**Fetched:** ${title}\n**URL:** ${url}\n**Content:** ${contentLength} chars cached\n\n*Full content cached. Use docsSearch to retrieve specific information.*`;
}
