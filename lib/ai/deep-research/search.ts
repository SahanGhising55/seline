/**
 * Deep Research Search Module
 * 
 * Provides web search capabilities for the deep research workflow.
 * Supports Tavily API (primary) with fallback options.
 */

import type { ResearchSource, ResearchFinding } from './types';
import { loadSettings } from '@/lib/settings/settings-manager';

// ============================================================================
// Tavily Search Integration
// ============================================================================

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
  query: string;
}

const TAVILY_API_URL = 'https://api.tavily.com/search';

function getTavilyApiKey(): string | undefined {
  // Ensure settings are loaded so process.env is updated (Electron standalone).
  loadSettings();
  return process.env.TAVILY_API_KEY;
}

/**
 * Search using Tavily API
 */
export async function tavilySearch(
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: 'basic' | 'advanced';
    includeAnswer?: boolean;
    abortSignal?: AbortSignal;
  } = {}
): Promise<ResearchSource[]> {
  const apiKey = getTavilyApiKey();
  if (!apiKey) {
    console.warn('[DEEP-RESEARCH] Tavily API key not configured, using mock search');
    return mockSearch(query);
  }

  const { maxResults = 5, searchDepth = 'advanced', includeAnswer = false, abortSignal } = options;

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: maxResults,
        search_depth: searchDepth,
        include_answer: includeAnswer,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DEEP-RESEARCH] Tavily search failed:', errorText);
      throw new Error(`Tavily search failed: ${response.status}`);
    }

    const data: TavilyResponse = await response.json();

    return data.results.map((result) => ({
      url: result.url,
      title: result.title,
      snippet: result.content,
      relevanceScore: result.score,
    }));
  } catch (error) {
    // Re-throw abort errors so they propagate correctly
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Research cancelled');
    }
    console.error('[DEEP-RESEARCH] Search error:', error);
    // Return empty results on error rather than throwing
    return [];
  }
}

// ============================================================================
// Mock Search (for development/testing)
// ============================================================================

/**
 * Mock search for development when no API key is available
 */
export function mockSearch(query: string): ResearchSource[] {
  console.log('[DEEP-RESEARCH] Using mock search for:', query);
  
  return [
    {
      url: 'https://example.com/article-1',
      title: `Research on: ${query}`,
      snippet: `This is a mock search result for "${query}". In production, this would contain real search results from Tavily or another search provider.`,
      relevanceScore: 0.95,
    },
    {
      url: 'https://example.com/article-2',
      title: `Analysis: ${query}`,
      snippet: `Another mock result providing analysis on "${query}". Configure TAVILY_API_KEY for real search results.`,
      relevanceScore: 0.85,
    },
  ];
}

// ============================================================================
// Search Orchestration
// ============================================================================

/**
 * Execute multiple searches in parallel with rate limiting
 */
export async function executeSearches(
  queries: string[],
  options: {
    maxConcurrent?: number;
    maxResultsPerQuery?: number;
    onProgress?: (completed: number, total: number, currentQuery: string) => void;
    abortSignal?: AbortSignal;
  } = {}
): Promise<ResearchFinding[]> {
  const { maxConcurrent = 3, maxResultsPerQuery = 5, onProgress, abortSignal } = options;
  const findings: ResearchFinding[] = [];

  // Process queries in batches
  for (let i = 0; i < queries.length; i += maxConcurrent) {
    // Check for abort before starting each batch
    if (abortSignal?.aborted) {
      throw new Error('Research cancelled');
    }

    const batch = queries.slice(i, i + maxConcurrent);

    const batchResults = await Promise.all(
      batch.map(async (query, batchIndex) => {
        const globalIndex = i + batchIndex;
        onProgress?.(globalIndex, queries.length, query);

        const sources = await tavilySearch(query, { maxResults: maxResultsPerQuery, abortSignal });

        return {
          query,
          sources,
          summary: '', // Will be filled by analysis step
          timestamp: new Date(),
        };
      })
    );

    findings.push(...batchResults);
  }

  // Final progress update
  onProgress?.(queries.length, queries.length, 'Complete');

  return findings;
}

/**
 * Check if search is available (API key configured)
 */
export function isSearchAvailable(): boolean {
  return !!getTavilyApiKey();
}

