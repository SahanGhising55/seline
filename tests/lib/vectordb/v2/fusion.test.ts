import { mmrDiversify, rrfFusion } from "@/lib/ai/vector-search/v2/fusion";
import type { VectorSearchHit } from "@/lib/vectordb/search";

describe("fusion utilities", () => {
  it("should combine scores for documents appearing in multiple lists", () => {
    const denseHits = [{ id: "a", rank: 0, score: 0.9, source: "dense" as const }];
    const lexicalHits = [
      { id: "a", rank: 1, score: 0.8, source: "lexical" as const },
      { id: "b", rank: 0, score: 0.7, source: "lexical" as const },
    ];

    const scores = rrfFusion(denseHits, lexicalHits, { k: 30, denseWeight: 1, lexicalWeight: 1 });
    expect(scores.get("a")).toBeGreaterThan(scores.get("b") ?? 0);
  });

  it("should diversify results with MMR", () => {
    const hits: VectorSearchHit[] = [
      { id: "a", score: 1, text: "A", filePath: "a", relativePath: "a", chunkIndex: 0, folderId: "f" },
      { id: "b", score: 0.9, text: "B", filePath: "b", relativePath: "b", chunkIndex: 1, folderId: "f" },
      { id: "c", score: 0.2, text: "C", filePath: "c", relativePath: "c", chunkIndex: 2, folderId: "f" },
    ];

    const embeddings = new Map<string, number[]>([
      ["a", [1, 0]],
      ["b", [1, 0]],
      ["c", [0, 1]],
    ]);

    const diversified = mmrDiversify(hits, embeddings, 0.3, 2);
    expect(diversified.length).toBe(2);
    expect(diversified[0].id).toBe("a");
    expect(diversified[1].id).toBe("c");
  });

  it("should return empty list for empty input", () => {
    expect(mmrDiversify([], new Map(), 0.7, 10)).toEqual([]);
  });
});
