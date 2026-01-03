/**
 * BM25-Style Lexical Vector Generation
 * Reference: docs/vector-search-v2-analysis.md Section 5.3
 */

export const LEX_DIM = 4096;

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "must", "shall",
  "can", "need", "dare", "ought", "used", "to", "of", "in",
  "for", "on", "with", "at", "by", "from", "as", "into",
  "through", "during", "before", "after", "above", "below",
  "between", "under", "again", "further", "then", "once",
  "if", "or", "and", "but", "not", "so", "than", "too",
  "very", "just", "only", "own", "same", "that", "this",
  "function", "return", "const", "let", "var", "import", "export",
  "from", "default", "class", "interface", "type", "extends",
]);

/**
 * Tokenize text for lexical matching.
 * Handles camelCase, snake_case, and code patterns.
 */
export function tokenizeForLex(text: string): string[] {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[_\-\s\.\/\\:;,(){}[\]<>"'`=+*&|!?@#$%^~]+/)
    .map((token) => token.toLowerCase().trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * DJB2 hash function for bucket assignment
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Generate a BM25-style hashed lexical vector.
 * Maps tokens to fixed-dimension vector using hashing trick.
 */
export function generateLexicalVector(text: string): number[] {
  const tokens = tokenizeForLex(text);
  const vec = new Array<number>(LEX_DIM).fill(0);

  for (const token of tokens) {
    const bucket = hashString(token) % LEX_DIM;
    vec[bucket] += 1.0;
  }

  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) {
      vec[i] /= norm;
    }
  }

  return vec;
}

/**
 * Compute cosine similarity between two lexical vectors
 */
export function lexicalSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}
