export function normalizeEmbedding(vector: number[]): number[] {
  if (!Array.isArray(vector) || vector.length === 0) {
    return vector;
  }

  let sumSquares = 0;
  for (const value of vector) {
    sumSquares += value * value;
  }

  if (!Number.isFinite(sumSquares) || sumSquares === 0) {
    return vector;
  }

  const norm = Math.sqrt(sumSquares);
  return vector.map((value) => value / norm);
}

export function normalizeEmbeddings(embeddings: number[][]): number[][] {
  if (!Array.isArray(embeddings) || embeddings.length === 0) {
    return embeddings;
  }

  return embeddings.map((vector) => normalizeEmbedding(vector));
}
