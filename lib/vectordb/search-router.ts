/**
 * Search Router: V1/V2 Side-by-Side Operation
 * Reference: docs/vector-search-v2-analysis.md Section 6.2
 */

import { searchVectorDB, type VectorSearchHit, type VectorSearchOptions } from "./search";
import { hybridSearchV2 } from "./v2/hybrid-search";
import { getVectorSearchConfig } from "@/lib/config/vector-search";

/**
 * Router that enables gradual V2 rollout.
 * Replace direct calls to searchVectorDB with this.
 */
export async function searchWithRouter(params: {
  characterId: string;
  query: string;
  options?: VectorSearchOptions;
}): Promise<VectorSearchHit[]> {
  const config = getVectorSearchConfig();

  if (config.enableHybridSearch && config.searchMode === "hybrid") {
    const percentage = parseInt(process.env.VECTOR_SEARCH_V2_PERCENTAGE ?? "0", 10);
    if (percentage > 0) {
      return shouldUseV2(params.characterId)
        ? hybridSearchV2(params)
        : searchVectorDB(params);
    }
    return hybridSearchV2(params);
  }

  return searchVectorDB(params);
}

/**
 * Gradual rollout: Use V2 for percentage of requests
 * Based on characterId hash for consistent assignment
 */
export function shouldUseV2(characterId: string): boolean {
  const percentage = parseInt(process.env.VECTOR_SEARCH_V2_PERCENTAGE ?? "0", 10);
  if (percentage === 0) return false;
  if (percentage >= 100) return true;

  let hash = 0;
  for (let i = 0; i < characterId.length; i++) {
    hash = ((hash << 5) - hash) + characterId.charCodeAt(i);
    hash = hash & hash;
  }
  return (Math.abs(hash) % 100) < percentage;
}
