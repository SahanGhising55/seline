"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2Icon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/components/character-creation/hooks/use-reduced-motion";
import type { VectorSearchPhase } from "@/lib/ai/vector-search/types";
import { useTranslations } from "next-intl";

interface PhaseIndicatorProps {
  currentPhase: VectorSearchPhase;
  className?: string;
}

const ACTIVE_PHASES = ["analyzing", "searching", "synthesizing"] as const;

function getPhaseIndex(phase: VectorSearchPhase): number {
  const idx = ACTIVE_PHASES.indexOf(phase as typeof ACTIVE_PHASES[number]);
  if (idx !== -1) return idx;
  if (phase === "complete") return ACTIVE_PHASES.length;
  return -1;
}

function getProgress(phase: VectorSearchPhase): number {
  const idx = getPhaseIndex(phase);
  if (idx === -1) return 0;
  if (phase === "complete") return 100;
  // Each active phase represents 1/3 of the progress
  // Add 50% within each phase to show it's in progress
  return ((idx + 0.5) / ACTIVE_PHASES.length) * 100;
}

export function PhaseIndicator({ currentPhase, className }: PhaseIndicatorProps) {
  const prefersReducedMotion = useReducedMotion();
  const t = useTranslations("vectorSearchPhase");
  const progress = useMemo(() => getProgress(currentPhase), [currentPhase]);
  const isActive = ACTIVE_PHASES.includes(currentPhase as typeof ACTIVE_PHASES[number]);
  const isComplete = currentPhase === "complete";
  const isError = currentPhase === "error";
  const isIdle = currentPhase === "idle";

  // Get translated phase config
  const getPhaseLabel = (phase: VectorSearchPhase) => t(phase);
  const getPhaseShortLabel = (phase: VectorSearchPhase) => {
    if (phase === "analyzing") return t("analyzingShort");
    if (phase === "searching") return t("searchingShort");
    if (phase === "synthesizing") return t("synthesizingShort");
    return t(phase);
  };

  // Don't render anything if idle
  if (isIdle) return null;

  const currentIndex = getPhaseIndex(currentPhase);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress bar */}
      <div className="relative h-1.5 bg-terminal-muted/20 rounded-full overflow-hidden">
        <motion.div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full",
            isError ? "bg-destructive" : isComplete ? "bg-terminal-green" : "bg-terminal-green"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.5,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
      </div>

      {/* Phase dots and labels */}
      <div className="flex items-center justify-between">
        {ACTIVE_PHASES.map((phase, idx) => {
          const isCurrentPhase = currentPhase === phase;
          const isPastPhase = currentIndex > idx || isComplete;
          const isFuturePhase = currentIndex < idx && !isComplete;

          return (
            <div key={phase} className="flex items-center gap-2">
              {/* Dot indicator */}
              <div
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  isCurrentPhase && "bg-terminal-green",
                  isPastPhase && "bg-terminal-green",
                  isFuturePhase && "bg-terminal-muted/30"
                )}
              />

              {/* Label */}
              <span
                className={cn(
                  "text-xs font-mono transition-colors",
                  isCurrentPhase && "text-terminal-dark font-medium",
                  isPastPhase && "text-terminal-green",
                  isFuturePhase && "text-terminal-muted"
                )}
              >
                {getPhaseShortLabel(phase)}
              </span>

              {/* Spinner for current phase */}
              {isCurrentPhase && isActive && (
                <Loader2Icon className="w-3 h-3 text-terminal-green animate-spin" />
              )}
            </div>
          );
        })}

        {/* Complete/Error state */}
        {(isComplete || isError) && (
          <div className="flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircleIcon className="w-4 h-4 text-terminal-green" />
                <span className="text-xs font-mono text-terminal-green font-medium">
                  {t("complete")}
                </span>
              </>
            ) : (
              <>
                <AlertCircleIcon className="w-4 h-4 text-destructive" />
                <span className="text-xs font-mono text-destructive font-medium">
                  {t("error")}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Current phase message */}
      {isActive && (
        <motion.p
          key={currentPhase}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          className="text-sm font-mono text-terminal-muted"
        >
          {getPhaseLabel(currentPhase)}
        </motion.p>
      )}
    </div>
  );
}
