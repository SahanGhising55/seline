"use client";

import { useEffect, useState } from "react";
import type { SessionAnalytics, SessionInput, MessageInput } from "./session-analytics";
import { computeSessionAnalytics } from "./session-analytics";

interface UseSessionAnalyticsState {
  analytics: SessionAnalytics | null;
  loading: boolean;
  error: string | null;
}

interface SessionResponse {
  session: SessionInput;
  messages: MessageInput[];
}

export function useSessionAnalytics(sessionId: string | null | undefined): UseSessionAnalyticsState {
  const [state, setState] = useState<UseSessionAnalyticsState>({
    analytics: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!sessionId) {
      setState({ analytics: null, loading: false, error: null });
      return;
    }

    let cancelled = false;

    async function fetchAndCompute() {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) {
          throw new Error(`Failed to load session ${sessionId}`);
        }

        const data = (await res.json()) as SessionResponse;
        const analytics = computeSessionAnalytics(data.session, data.messages || []);

        if (!cancelled) {
          setState({ analytics, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            analytics: null,
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    fetchAndCompute();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return state;
}
