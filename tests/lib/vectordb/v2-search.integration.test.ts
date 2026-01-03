import { describe, expect, it } from "vitest";
import { hybridSearchV2 } from "@/lib/vectordb/v2/hybrid-search";
import { updateVectorSearchConfig } from "@/lib/config/vector-search";

const runIntegration = process.env.RUN_VECTOR_SEARCH_INTEGRATION === "true";
const testOrSkip = runIntegration ? it : it.skip;

describe("V2 Search Integration", () => {
  testOrSkip("should find exact identifier matches", async () => {
    updateVectorSearchConfig({ enableHybridSearch: true, searchMode: "hybrid" });

    const characterId = process.env.VECTOR_SEARCH_TEST_CHARACTER_ID ?? "test-agent";
    const results = await hybridSearchV2({
      characterId,
      query: "searchVectorDB",
      options: { topK: 10 },
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => result.text.includes("searchVectorDB"))).toBe(true);
  });
});
