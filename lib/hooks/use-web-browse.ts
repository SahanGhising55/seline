/**
 * useWebBrowse Hook
 *
 * React hook for managing web browsing state and streaming progress.
 * Similar to useDeepResearch but for web content fetching and synthesis.
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type {
  WebBrowsePhase,
  WebBrowseEvent,
  WebBrowseContentEvent,
} from "@/lib/ai/web-browse";

// ============================================================================
// Types
// ============================================================================

export interface UseWebBrowseOptions {
  sessionId?: string;
  characterId?: string;
  onComplete?: (synthesis: string, sources: string[]) => void;
  onError?: (error: string) => void;
}

export interface UseWebBrowseReturn {
  isActive: boolean;
  isLoading: boolean;
  phase: WebBrowsePhase;
  phaseMessage: string;
  fetchedPages: WebBrowseContentEvent[];
  synthesis: string | null;
  error: string | null;
  browse: (urls: string[], query: string) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useWebBrowse(
  options: UseWebBrowseOptions = {}
): UseWebBrowseReturn {
  const { sessionId, characterId, onComplete, onError } = options;

  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<WebBrowsePhase>("idle");
  const [phaseMessage, setPhaseMessage] = useState("");
  const [fetchedPages, setFetchedPages] = useState<WebBrowseContentEvent[]>([]);
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Store callbacks in refs to avoid stale closures
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  const reset = useCallback(() => {
    setIsActive(false);
    setIsLoading(false);
    setPhase("idle");
    setPhaseMessage("");
    setFetchedPages([]);
    setSynthesis(null);
    setError(null);
    abortControllerRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    reset();
  }, [reset]);

  const handleEvent = useCallback((event: WebBrowseEvent) => {
    switch (event.type) {
      case "phase_change":
        setPhase(event.phase);
        setPhaseMessage(event.message);
        break;

      case "content_fetched":
        setFetchedPages((prev) => [...prev, event]);
        break;

      case "synthesis_complete":
        setSynthesis(event.synthesis);
        setPhase("complete");
        setIsLoading(false);
        onCompleteRef.current?.(event.synthesis, event.sourcesUsed);
        break;

      case "error":
        setError(event.error);
        setPhase("error");
        setIsLoading(false);
        onErrorRef.current?.(event.error);
        break;
    }
  }, []);

  const browse = useCallback(
    async (urls: string[], query: string) => {
      if (!sessionId) {
        setError("Session ID is required");
        return;
      }

      // Reset state and start loading
      reset();
      setIsActive(true);
      setIsLoading(true);
      setPhase("fetching");
      setPhaseMessage("Starting...");

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/web-browse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls, query, sessionId, characterId }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to start browsing");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event: WebBrowseEvent = JSON.parse(line.slice(6));
                handleEvent(event);
              } catch (err) {
                console.warn("[WEB-BROWSE-HOOK] Failed to parse event:", err);
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return; // Cancelled
        }
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("[WEB-BROWSE-HOOK] Error:", errorMessage);
        setError(errorMessage);
        setPhase("error");
        onErrorRef.current?.(errorMessage);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [sessionId, characterId, reset, handleEvent]
  );

  return {
    isActive,
    isLoading,
    phase,
    phaseMessage,
    fetchedPages,
    synthesis,
    error,
    browse,
    cancel,
    reset,
  };
}

