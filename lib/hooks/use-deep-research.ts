/**
 * Deep Research React Hook
 * 
 * Provides a React hook for managing deep research state and streaming.
 */

import { useState, useCallback, useRef } from 'react';
import type { 
  DeepResearchEvent, 
  DeepResearchState, 
  ResearchPhase,
  FinalReport,
  ResearchFinding,
  DeepResearchConfig,
} from '@/lib/ai/deep-research/types';

export interface UseDeepResearchOptions {
  sessionId?: string;
  config?: Partial<DeepResearchConfig>;
  onComplete?: (report: FinalReport) => void;
  onError?: (error: string) => void;
}

export interface UseDeepResearchReturn {
  // State
  isActive: boolean;
  isLoading: boolean;
  phase: ResearchPhase;
  phaseMessage: string;
  progress: { completed: number; total: number; currentQuery: string } | null;
  findings: ResearchFinding[];
  finalReport: FinalReport | null;
  error: string | null;
  
  // Actions
  startResearch: (query: string) => Promise<void>;
  cancelResearch: () => void;
  reset: () => void;
}

export function useDeepResearch(options: UseDeepResearchOptions = {}): UseDeepResearchReturn {
  const { sessionId, config, onComplete, onError } = options;
  
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<ResearchPhase>('idle');
  const [phaseMessage, setPhaseMessage] = useState('');
  const [progress, setProgress] = useState<{ completed: number; total: number; currentQuery: string } | null>(null);
  const [findings, setFindings] = useState<ResearchFinding[]>([]);
  const [finalReport, setFinalReport] = useState<FinalReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setIsActive(false);
    setIsLoading(false);
    setPhase('idle');
    setPhaseMessage('');
    setProgress(null);
    setFindings([]);
    setFinalReport(null);
    setError(null);
  }, []);

  const cancelResearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsActive(false);
    setIsLoading(false);
    setPhase('idle');
    setPhaseMessage('Research cancelled');
  }, []);

  // Use refs for callbacks to avoid stale closures
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  const handleEvent = useCallback((event: DeepResearchEvent) => {
    console.log('[DEEP-RESEARCH-HOOK] Received event:', event.type, event);

    switch (event.type) {
      case 'phase_change':
        setPhase(event.phase);
        setPhaseMessage(event.message);
        break;
      case 'search_progress':
        setProgress({ completed: event.completed, total: event.total, currentQuery: event.currentQuery });
        break;
      case 'search_result':
        setFindings(prev => [...prev, event.finding]);
        break;
      case 'final_report':
        console.log('[DEEP-RESEARCH-HOOK] Setting final report:', event.report?.title);
        setFinalReport(event.report);
        setPhase('complete'); // Also set phase to complete when we get the report
        setIsLoading(false); // Research is done, stop loading state
        onCompleteRef.current?.(event.report);
        break;
      case 'error':
        setError(event.error);
        setPhase('error');
        setIsLoading(false); // Stop loading on error
        onErrorRef.current?.(event.error);
        break;
      case 'complete':
        // Phase should already be set by final_report, but ensure it's complete
        setPhase(prev => prev === 'error' ? prev : 'complete');
        setIsLoading(false); // Ensure loading is stopped
        break;
    }
  }, []);

  const startResearch = useCallback(async (query: string) => {
    // Reset state
    reset();
    setIsActive(true);
    setIsLoading(true);

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/deep-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sessionId, config }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start research');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Process any remaining buffer content
          if (buffer.trim()) {
            console.log('[DEEP-RESEARCH-HOOK] Processing remaining buffer:', buffer);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              console.log('[DEEP-RESEARCH-HOOK] Received [DONE] signal');
              continue;
            }

            try {
              const event: DeepResearchEvent = JSON.parse(data);
              handleEvent(event);
            } catch (parseError) {
              console.warn('[DEEP-RESEARCH-HOOK] Failed to parse event:', data, parseError);
            }
          }
        }
      }

      console.log('[DEEP-RESEARCH-HOOK] Stream ended');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Cancelled, don't set error
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[DEEP-RESEARCH-HOOK] Error:', errorMessage);
      setError(errorMessage);
      setPhase('error');
      onErrorRef.current?.(errorMessage);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [sessionId, config, reset, handleEvent]);

  return {
    isActive, isLoading, phase, phaseMessage, progress, findings, finalReport, error,
    startResearch, cancelResearch, reset,
  };
}

