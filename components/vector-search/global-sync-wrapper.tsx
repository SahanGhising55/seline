"use client";

import { VectorSyncProvider } from "./vector-sync-provider";
import { GlobalSyncIndicator } from "./global-sync-indicator";
import type { ReactNode } from "react";

interface GlobalSyncWrapperProps {
  children: ReactNode;
}

/**
 * GlobalSyncWrapper - Client component that provides sync status globally
 * 
 * This wraps the app content with the VectorSyncProvider and renders
 * the GlobalSyncIndicator for persistent visibility.
 */
export function GlobalSyncWrapper({ children }: GlobalSyncWrapperProps) {
  return (
    <VectorSyncProvider>
      {children}
      <GlobalSyncIndicator />
    </VectorSyncProvider>
  );
}

