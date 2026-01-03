"use client";

import { useEffect, useRef, useCallback } from "react";
import { createScope, type Scope } from "animejs";

interface UseAnimeScopeOptions {
  /**
   * Whether to automatically create the scope on mount
   * @default true
   */
  autoCreate?: boolean;
}

interface UseAnimeScopeReturn {
  /** Ref to attach to the root element */
  root: React.RefObject<HTMLDivElement | null>;
  /** The anime.js scope instance */
  scope: React.MutableRefObject<Scope | null>;
  /** Manually create/recreate the scope */
  createScopeInstance: () => void;
  /** Check if scope is ready */
  isReady: boolean;
}

/**
 * React hook for integrating Anime.js with proper cleanup
 * Uses createScope() to scope all animations to a root element
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { root, scope } = useAnimeScope();
 * 
 *   useEffect(() => {
 *     if (!scope.current) return;
 *     
 *     scope.current.add(() => {
 *       animate('.element', { opacity: [0, 1] });
 *     });
 *   }, []);
 * 
 *   return <div ref={root}>...</div>;
 * }
 * ```
 */
export function useAnimeScope(
  options: UseAnimeScopeOptions = {}
): UseAnimeScopeReturn {
  const { autoCreate = true } = options;

  const root = useRef<HTMLDivElement | null>(null);
  const scope = useRef<Scope | null>(null);
  const isReady = useRef(false);

  const createScopeInstance = useCallback(() => {
    if (!root.current) return;

    // Cleanup existing scope if any
    if (scope.current) {
      scope.current.revert();
    }

    // Create new scope
    scope.current = createScope({ root });
    isReady.current = true;
  }, []);

  useEffect(() => {
    if (autoCreate && root.current) {
      createScopeInstance();
    }

    // Cleanup on unmount
    return () => {
      if (scope.current) {
        scope.current.revert();
        scope.current = null;
        isReady.current = false;
      }
    };
  }, [autoCreate, createScopeInstance]);

  return {
    root,
    scope,
    createScopeInstance,
    get isReady() {
      return isReady.current;
    },
  };
}

export type { Scope };

