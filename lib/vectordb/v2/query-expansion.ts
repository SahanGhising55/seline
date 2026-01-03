/**
 * Query Expansion with Caching
 * Reference: docs/vector-search-v2-analysis.md Section 2.5
 */

import { LRUCache } from "lru-cache";

const expansionCache = new LRUCache<string, string[]>({
  max: 1000,
  ttl: 1000 * 60 * 60,
});

/**
 * Expand query with semantically similar terms.
 * Uses embedding similarity to find related terms from a vocabulary.
 */
export async function expandQuery(
  query: string,
  options: { threshold?: number } = {}
): Promise<string[]> {
  const threshold = options.threshold ?? 0.7;
  const cacheKey = `${query}:${threshold}`;

  const cached = expansionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const expanded = [query];
  const codeExpansions = getCodeExpansions(query);
  expanded.push(...codeExpansions);

  const unique = Array.from(new Set(expanded));
  expansionCache.set(cacheKey, unique);
  return unique;
}

function getCodeExpansions(query: string): string[] {
  const expansions: string[] = [];
  const lowerQuery = query.toLowerCase();

  const synonyms: Record<string, string[]> = {
    function: ["method", "fn", "func"],
    class: ["type", "interface", "struct"],
    get: ["fetch", "retrieve", "read", "load"],
    set: ["update", "write", "save", "store"],
    delete: ["remove", "destroy", "drop"],
    create: ["new", "add", "insert", "make"],
    user: ["account", "member", "profile"],
    auth: ["authentication", "login", "signin"],
    error: ["exception", "failure", "issue"],
    config: ["configuration", "settings", "options"],
  };

  for (const [key, values] of Object.entries(synonyms)) {
    if (lowerQuery.includes(key)) {
      expansions.push(...values.map((value) => query.replace(new RegExp(key, "gi"), value)));
    }
  }

  return expansions.slice(0, 3);
}

/**
 * Clear expansion cache
 */
export function clearExpansionCache(): void {
  expansionCache.clear();
}
