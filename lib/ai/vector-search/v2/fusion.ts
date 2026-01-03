/**
 * Reciprocal Rank Fusion (RRF) and MMR Diversification
 * Reference: docs/vector-search-v2-analysis.md Section 5.1
 */

import type { VectorSearchHit } from "@/lib/vectordb/search";

export interface RankedHit {
  id: string;
  rank: number;
  score: number;
  source: "dense" | "lexical";
}

export interface FusionOptions {
  k?: number;
  denseWeight?: number;
  lexicalWeight?: number;
}

/**
 * Reciprocal Rank Fusion combines multiple ranked lists.
 */
export function rrfFusion(
  denseHits: RankedHit[],
  lexicalHits: RankedHit[],
  options: FusionOptions = {}
): Map<string, number> {
  const { k = 30, denseWeight = 1.5, lexicalWeight = 0.2 } = options;
  const scores = new Map<string, number>();

  denseHits.forEach((hit, index) => {
    const rrfScore = denseWeight / (k + index);
    scores.set(hit.id, (scores.get(hit.id) ?? 0) + rrfScore);
  });

  lexicalHits.forEach((hit, index) => {
    const rrfScore = lexicalWeight / (k + index);
    scores.set(hit.id, (scores.get(hit.id) ?? 0) + rrfScore);
  });

  return scores;
}

/**
 * Sort fused results by RRF score
 */
export function sortByFusedScore(
  scores: Map<string, number>,
  hitMap: Map<string, VectorSearchHit>,
  topK: number
): VectorSearchHit[] {
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id, score]) => {
      const hit = hitMap.get(id);
      if (!hit) throw new Error(`Missing hit for id: ${id}`);
      return { ...hit, score };
    });
}

/**
 * Cosine similarity for MMR diversification
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

/**
 * Maximal Marginal Relevance (MMR) for result diversification.
 */
export function mmrDiversify(
  hits: VectorSearchHit[],
  embeddings: Map<string, number[]>,
  lambda: number = 0.7,
  topK: number = 10
): VectorSearchHit[] {
  if (hits.length === 0) return [];

  const selected: VectorSearchHit[] = [];
  const remaining = new Set(hits.map((h) => h.id));

  const firstHit = hits[0];
  selected.push(firstHit);
  remaining.delete(firstHit.id);

  while (selected.length < topK && remaining.size > 0) {
    let bestId: string | null = null;
    let bestScore = -Infinity;

    for (const id of remaining) {
      const hit = hits.find((h) => h.id === id);
      if (!hit) continue;

      const relevance = hit.score;
      let maxSim = 0;
      const embedding = embeddings.get(id);

      if (embedding) {
        for (const sel of selected) {
          const selEmb = embeddings.get(sel.id);
          if (selEmb) {
            const sim = cosineSimilarity(embedding, selEmb);
            maxSim = Math.max(maxSim, sim);
          }
        }
      }

      const mmrScore = lambda * relevance - (1 - lambda) * maxSim;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestId = id;
      }
    }

    if (bestId) {
      const nextHit = hits.find((h) => h.id === bestId);
      if (nextHit) selected.push(nextHit);
      remaining.delete(bestId);
    } else {
      break;
    }
  }

  return selected;
}
