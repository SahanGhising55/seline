"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "../hooks/use-reduced-motion";
import { FolderSyncManager } from "@/components/vector-search/folder-sync-manager";
import { DatabaseIcon, ArrowLeftIcon, ArrowRightIcon, SkipForwardIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface VectorSearchPageProps {
  agentId: string;
  agentName: string;
  onSubmit: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export function VectorSearchPage({
  agentId,
  agentName,
  onSubmit,
  onBack,
  onSkip,
}: VectorSearchPageProps) {
  const t = useTranslations("characterCreation.vectorSearchPage");
  const [showContent, setShowContent] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Show content immediately or with a short delay
  useEffect(() => {
    if (prefersReducedMotion) {
      setShowContent(true);
    } else {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  return (
    <div className="h-screen overflow-y-auto flex flex-col items-center p-6 bg-terminal-cream">
      <div className="w-full max-w-2xl space-y-6 my-auto">
        {/* Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
          className="flex items-center gap-3"
        >
          <div className="p-2 rounded-lg bg-terminal-green/10">
            <DatabaseIcon className="w-5 h-5 text-terminal-green" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-terminal-muted uppercase tracking-wide">{t("step")}</span>
              <h2 className="font-mono font-semibold text-terminal-dark">{t("title")}</h2>
            </div>
            <p className="text-sm text-terminal-muted font-mono">
              {t("description", { agentName })}
            </p>
          </div>
        </motion.div>

        {/* Folder Manager */}
        {showContent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: 0.1 }}
            className="bg-terminal-bg/20 rounded-lg border border-terminal-border p-4"
          >
            <FolderSyncManager characterId={agentId} />
          </motion.div>
        )}

        {/* Navigation */}
        {showContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: 0.2 }}
            className="flex justify-between items-center"
          >
            <button
              onClick={onBack}
              className="flex items-center gap-2 font-mono text-terminal-muted hover:text-terminal-dark transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              {t("back")}
            </button>

            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="flex items-center gap-2 font-mono text-terminal-muted hover:text-terminal-dark transition-colors"
              >
                <SkipForwardIcon className="w-4 h-4" />
                {t("skip")}
              </button>
              <button
                onClick={onSubmit}
                className="flex items-center gap-2 px-4 py-2 bg-terminal-green text-white font-mono rounded hover:bg-terminal-green/90 transition-colors"
              >
                {t("continue")}
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
