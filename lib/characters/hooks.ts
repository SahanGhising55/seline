"use client";

import { useState, useCallback } from "react";
import type { CharacterDraft } from "@/lib/ai/character-tools";

// ============================================================================
// RATE LIMIT HELPERS
// ============================================================================

interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfterSeconds?: number;
  resetAt?: Date;
}

/**
 * Parse rate limit information from a 429 response
 */
function parseRateLimitError(response: Response): RateLimitInfo {
  const retryAfter = response.headers.get("Retry-After");
  const resetAt = response.headers.get("X-RateLimit-Reset");

  return {
    isRateLimited: true,
    retryAfterSeconds: retryAfter ? parseInt(retryAfter, 10) : undefined,
    resetAt: resetAt ? new Date(resetAt) : undefined,
  };
}

/**
 * Format a rate limit error message for display
 */
function formatRateLimitMessage(info: RateLimitInfo): string {
  if (info.retryAfterSeconds) {
    const minutes = Math.ceil(info.retryAfterSeconds / 60);
    return `Rate limit exceeded. Please try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`;
  }
  if (info.resetAt) {
    return `Rate limit exceeded. Limit resets at ${info.resetAt.toLocaleTimeString()}.`;
  }
  return "Rate limit exceeded. Please try again later.";
}

// ============================================================================
// AGENT EXPANSION HOOK
// ============================================================================

interface UseAgentExpansionResult {
  expand: (concept: string) => Promise<{ name: string; tagline: string; purpose: string } | null>;
  isExpanding: boolean;
  error: string | null;
}

export function useAgentExpansion(): UseAgentExpansionResult {
  const [isExpanding, setIsExpanding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expand = useCallback(async (concept: string) => {
    setIsExpanding(true);
    setError(null);

    try {
      const response = await fetch("/api/characters/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to expand agent concept");
      }

      const data = await response.json();
      return data.agent;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return null;
    } finally {
      setIsExpanding(false);
    }
  }, []);

  return { expand, isExpanding, error };
}

// ============================================================================
// CHARACTER IMAGE GENERATION HOOK
// ============================================================================

interface GeneratedImage {
  url: string;
  width: number;
  height: number;
  format: string;
}

interface UseCharacterImageResult {
  generate: (
    draft: CharacterDraft,
    imageType?: "portrait" | "full_body" | "avatar",
    artStyle?: string
  ) => Promise<GeneratedImage[] | null>;
  isGenerating: boolean;
  error: string | null;
  lastPrompt: string | null;
  rateLimitInfo: RateLimitInfo | null;
}

export function useCharacterImage(): UseCharacterImageResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);

  const generate = useCallback(
    async (
      draft: CharacterDraft,
      imageType: "portrait" | "full_body" | "avatar" = "portrait",
      artStyle?: string
    ): Promise<GeneratedImage[] | null> => {
      setIsGenerating(true);
      setError(null);
      setRateLimitInfo(null);

      try {
        const response = await fetch("/api/characters/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterDraft: draft,
            imageType,
            artStyle,
          }),
        });

        // Handle rate limiting
        if (response.status === 429) {
          const info = parseRateLimitError(response);
          setRateLimitInfo(info);
          setError(formatRateLimitMessage(info));
          return null;
        }

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to generate image");
        }

        const data = await response.json();
        setLastPrompt(data.prompt || null);
        return data.images as GeneratedImage[];
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { generate, isGenerating, error, lastPrompt, rateLimitInfo };
}

// ============================================================================
// CHARACTER CRUD HOOKS
// ============================================================================

interface Character {
  id: string;
  name: string;
  displayName?: string;
  tagline?: string;
  status: string;
  createdAt: Date;
}

interface UseCharactersResult {
  characters: Character[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCharacters(): UseCharactersResult {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/characters");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch characters");
      }

      const data = await response.json();
      setCharacters(data.characters);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { characters, isLoading, error, refresh };
}

