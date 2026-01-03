/**
 * LanceDB Vector Search
 * 
 * Performs semantic similarity search over indexed documents.
 */

import { embed } from "ai";
import { getLanceDB } from "./client";
import { getAgentTableName } from "./collections";
import { getEmbeddingModel, getEmbeddingModelId } from "@/lib/ai/providers";
import { normalizeEmbedding } from "@/lib/ai/embedding-utils";

export interface VectorSearchHit {
  id: string;
  score: number;
  text: string;
  filePath: string;
  relativePath: string;
  chunkIndex: number;
  folderId: string;
  startLine?: number;
  endLine?: number;
  tokenOffset?: number;
  tokenCount?: number;
  version?: number;
}

export interface VectorSearchOptions {
  topK?: number;
  minScore?: number;
  folderIds?: string[]; // Filter by specific folders
}

/**
 * Search an agent's vector table for similar content
 */
export async function searchVectorDB(params: {
  characterId: string;
  query: string;
  options?: VectorSearchOptions;
}): Promise<VectorSearchHit[]> {
  const { characterId, query, options } = params;

  const topK = options?.topK ?? 10;
  const minScore = options?.minScore ?? 0.3;

  const db = await getLanceDB();
  if (!db) {
    console.log("[VectorDB] Search skipped - VectorDB not enabled");
    return [];
  }

  const tableName = getAgentTableName(characterId);
  const existingTables = await db.tableNames();

  if (!existingTables.includes(tableName)) {
    console.log(`[VectorDB] Table ${tableName} not found`);
    return [];
  }

  try {
    // Generate query embedding
    const embeddingModelId = getEmbeddingModelId();
    const embeddingModel = getEmbeddingModel(embeddingModelId);
    const { embedding: queryEmbedding } = await embed({
      model: embeddingModel,
      value: query,
    });
    const normalizedQuery = normalizeEmbedding(queryEmbedding);

    const table = await db.openTable(tableName);

    // Build the search query with cosine distance metric
    // IMPORTANT: LanceDB defaults to L2 (Euclidean) distance, but we need cosine distance
    // for proper similarity scoring where score = 1 - distance gives values in [0, 1]
    let searchQuery = table
      .vectorSearch(normalizedQuery)
      .distanceType("cosine")
      .limit(topK);

    // Add folder filter if specified
    if (options?.folderIds && options.folderIds.length > 0) {
      const folderList = options.folderIds.map(id => `"${id}"`).join(", ");
      searchQuery = searchQuery.where(`"folderId" IN (${folderList})`);
    }

    // Execute search
    const results = await searchQuery.toArray();

    console.log(`[VectorDB] Raw search returned ${results.length} results`);

    // Transform and filter results
    const hits: VectorSearchHit[] = results
      .map((result) => {
        // LanceDB returns _distance (lower is better) - convert to score (higher is better)
        // For cosine distance: distance is in [0, 2], so score = 1 - distance gives [-1, 1]
        // But typically for normalized vectors, distance is in [0, 1], so score is in [0, 1]
        const distance = (result as { _distance?: number })._distance ?? 0;
        const score = 1 - distance;

        return {
          id: result.id as string,
          score,
          text: result.text as string,
          filePath: result.filePath as string,
          relativePath: result.relativePath as string,
          chunkIndex: result.chunkIndex as number,
          folderId: result.folderId as string,
          startLine: result.startLine as number | undefined,
          endLine: result.endLine as number | undefined,
          tokenOffset: result.tokenOffset as number | undefined,
          tokenCount: result.tokenCount as number | undefined,
          version: result.version as number | undefined,
        };
      })
      .filter(hit => hit.score >= minScore);

    console.log(`[VectorDB] Search returned ${hits.length} results (after minScore=${minScore} filter) for query: "${query.slice(0, 50)}..."`);
    return hits;
  } catch (error) {
    console.error("[VectorDB] Search error:", error);
    return [];
  }
}

/**
 * Search with combined results from multiple agents (for future use)
 */
export async function searchMultipleAgents(params: {
  characterIds: string[];
  query: string;
  options?: VectorSearchOptions;
}): Promise<VectorSearchHit[]> {
  const { characterIds, query, options } = params;

  const allResults: VectorSearchHit[] = [];

  for (const characterId of characterIds) {
    const results = await searchVectorDB({
      characterId,
      query,
      options,
    });
    allResults.push(...results);
  }

  // Sort by score and take top K
  const topK = options?.topK ?? 10;
  return allResults
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

