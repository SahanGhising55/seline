/**
 * V2 Hybrid Search: Dense + Lexical with RRF Fusion
 * Reference: docs/vector-search-v2-analysis.md Section 5.4
 */

import { getLanceDB } from "../client";
import { getAgentTableName } from "../collections";
import { searchVectorDB, type VectorSearchHit, type VectorSearchOptions } from "../search";
import { generateLexicalVector } from "./lexical-vectors";
import { rrfFusion, sortByFusedScore } from "@/lib/ai/vector-search/v2/fusion";
import { getVectorSearchConfig } from "@/lib/config/vector-search";
import { expandQuery } from "./query-expansion";
import { rerankResults } from "@/lib/ai/vector-search/v2/reranker";

export interface HybridSearchOptions extends VectorSearchOptions {
  enableDiversification?: boolean;
}

const missingLexicalColumnTables = new Set<string>();

/**
 * Hybrid search combining dense (semantic) and lexical (keyword) search.
 * Falls back to V1 semantic-only search if hybrid is disabled.
 */
export async function hybridSearchV2(params: {
  characterId: string;
  query: string;
  options?: HybridSearchOptions;
}): Promise<VectorSearchHit[]> {
  const config = getVectorSearchConfig();
  const { characterId, query, options } = params;
  const topK = options?.topK ?? 10;
  const minScore = options?.minScore ?? 0.01;
  const folderIds = options?.folderIds;

  if (!config.enableHybridSearch) {
    console.log("[HybridSearch] Falling back to V1 semantic search");
    return searchVectorDB({ characterId, query, options: { topK, minScore, folderIds } });
  }

  console.log("[HybridSearch] Running hybrid search (dense + lexical)");

  const queries = config.enableQueryExpansion ? await expandQuery(query) : [query];
  const candidateLimit = topK * 2;

  const [denseResults, lexicalResults] = await Promise.all([
    searchDense({
      characterId,
      queries,
      topK: candidateLimit,
      minScore: Math.min(minScore, 0.01),
      folderIds,
    }),
    searchLexical({ characterId, queries, topK: candidateLimit, folderIds }),
  ]);

  console.log(`[HybridSearch] Dense: ${denseResults.length}, Lexical: ${lexicalResults.length}`);

  if (denseResults.length === 0) return lexicalResults.slice(0, topK);
  if (lexicalResults.length === 0) return denseResults.slice(0, topK);

  const fusedScores = rrfFusion(
    denseResults.map((h, i) => ({ id: h.id, rank: i, score: h.score, source: "dense" as const })),
    lexicalResults.map((h, i) => ({ id: h.id, rank: i, score: h.score, source: "lexical" as const })),
    { k: config.rrfK, denseWeight: config.denseWeight, lexicalWeight: config.lexicalWeight }
  );

  const hitMap = new Map<string, VectorSearchHit>();
  [...denseResults, ...lexicalResults].forEach((hit) => {
    if (!hitMap.has(hit.id)) hitMap.set(hit.id, hit);
  });

  let results = sortByFusedScore(fusedScores, hitMap, topK);

  if (config.enableReranking) {
    results = await rerankResults(query, results);
    console.log(`[HybridSearch] Reranked ${results.length} results`);
  }

  console.log(`[HybridSearch] Returning ${results.length} fused results`);
  return results;
}

async function searchDense(params: {
  characterId: string;
  queries: string[];
  topK: number;
  minScore: number;
  folderIds?: string[];
}): Promise<VectorSearchHit[]> {
  const { characterId, queries, topK, minScore, folderIds } = params;

  const results = await Promise.all(
    queries.map((query) =>
      searchVectorDB({
        characterId,
        query,
        options: { topK, minScore, folderIds },
      })
    )
  );

  return mergeHitsByScore(results.flat()).slice(0, topK);
}

async function searchLexical(params: {
  characterId: string;
  queries: string[];
  topK: number;
  folderIds?: string[];
}): Promise<VectorSearchHit[]> {
  const { characterId, queries, topK, folderIds } = params;

  const db = await getLanceDB();
  if (!db) return [];

  const tableName = getAgentTableName(characterId);
  const existingTables = await db.tableNames();

  if (!existingTables.includes(tableName)) {
    return [];
  }

  try {
    const table = await db.openTable(tableName);

    const hasLexicalColumn = await hasLexicalVectorColumn(table);
    if (!hasLexicalColumn) {
      warnMissingLexicalColumn(tableName);
      return [];
    }

    const results = await Promise.all(
      queries.map(async (query) => {
        const lexicalVector = generateLexicalVector(query);

        let searchQuery = table
          .vectorSearch(lexicalVector)
          .column("lexicalVector")
          .distanceType("cosine")
          .limit(topK);

        if (folderIds && folderIds.length > 0) {
          const folderList = folderIds.map((id) => `"${id}"`).join(", ");
          searchQuery = searchQuery.where(`"folderId" IN (${folderList})`);
        }

        const rows = await searchQuery.toArray();
        return rows.map((result) => {
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
        });
      })
    );

    return mergeHitsByScore(results.flat()).slice(0, topK);
  } catch (error) {
    console.warn("[HybridSearch] Lexical search failed, table may need migration:", error);
    return [];
  }
}

async function hasLexicalVectorColumn(table: { schema: () => Promise<{ fields?: Array<{ name: string }> }> }): Promise<boolean> {
  const schema = await table.schema();
  const fields = Array.isArray(schema.fields) ? schema.fields : [];
  return fields.some((field) => field.name === "lexicalVector");
}

function warnMissingLexicalColumn(tableName: string): void {
  if (missingLexicalColumnTables.has(tableName)) return;
  missingLexicalColumnTables.add(tableName);
  console.warn(
    `[HybridSearch] Table ${tableName} is missing lexicalVector. Reindex all folders for this agent to enable hybrid search.`
  );
}

function mergeHitsByScore(hits: VectorSearchHit[]): VectorSearchHit[] {
  const merged = new Map<string, VectorSearchHit>();

  for (const hit of hits) {
    const existing = merged.get(hit.id);
    if (!existing || hit.score > existing.score) {
      merged.set(hit.id, hit);
    }
  }

  return [...merged.values()].sort((a, b) => b.score - a.score);
}
