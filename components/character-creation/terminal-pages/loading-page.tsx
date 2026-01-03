"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { animate, eases } from "animejs";
import { ComputerGraphic } from "../computer-graphic";
import { useReducedMotion } from "../hooks/use-reduced-motion";
import { useTranslations } from "next-intl";

interface LoadingPageProps {
  characterName: string;
  onComplete: () => void;
  /** Simulated progress for demo, or real progress from API */
  progress?: number;
  /** Whether generation is actually complete */
  isComplete?: boolean;
  /** Custom loading title (overrides translation) */
  loadingTitle?: string;
  /** Custom messages to show during loading (overrides translations) */
  customMessages?: string[];
}

const ASCII_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function LoadingPage({
  characterName,
  onComplete,
  progress: externalProgress,
  isComplete = false,
  loadingTitle,
  customMessages,
}: LoadingPageProps) {
  const t = useTranslations("characterCreation.loading");
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [spinnerFrame, setSpinnerFrame] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const defaultMessages = [
    t("messages.initializingProfile"),
    t("messages.configuringCapabilities"),
    t("messages.settingUpKnowledgeBase"),
    t("messages.applyingToolPermissions"),
    t("messages.validatingConfiguration"),
    t("messages.finalizingSetup"),
  ];

  const messages = customMessages || defaultMessages;
  const title = loadingTitle || t("title", { name: characterName });

  // ASCII spinner animation
  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      setSpinnerFrame((prev) => (prev + 1) % ASCII_FRAMES.length);
    }, 100);

    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  // Progress simulation or external progress
  useEffect(() => {
    if (externalProgress !== undefined) {
      setProgress(externalProgress);
      return;
    }

    // Simulated progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Slow down as we approach 100
        const increment = Math.max(1, Math.floor((100 - prev) / 10));
        return Math.min(100, prev + increment);
      });
    }, 150);

    return () => clearInterval(interval);
  }, [externalProgress]);

  // Update loading message based on progress
  useEffect(() => {
    const messageIndex = Math.min(
      Math.floor((progress / 100) * messages.length),
      messages.length - 1
    );
    setCurrentMessage(messageIndex);
  }, [progress, messages.length]);

  // Animate progress bar with Anime.js
  useEffect(() => {
    if (!progressBarRef.current || prefersReducedMotion) return;

    animate(progressBarRef.current, {
      width: `${progress}%`,
      duration: 300,
      ease: eases.out(2),
    });
  }, [progress, prefersReducedMotion]);

  // Auto-complete when done
  useEffect(() => {
    if ((progress >= 100 || isComplete) && !prefersReducedMotion) {
      const timer = setTimeout(onComplete, 500);
      return () => clearTimeout(timer);
    } else if (isComplete && prefersReducedMotion) {
      onComplete();
    }
  }, [progress, isComplete, onComplete, prefersReducedMotion]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-terminal-cream">
      <div className="w-full max-w-lg space-y-8 text-center">
        {/* Computer with loading screen */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center"
        >
          <ComputerGraphic
            size="md"
            screenContent={
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <span className="text-terminal-green text-2xl">
                  {ASCII_FRAMES[spinnerFrame]}
                </span>
                <span className="text-terminal-amber text-xs">
                  {progress}%
                </span>
              </div>
            }
          />
        </motion.div>

        {/* Loading Text */}
        <div className="space-y-4">
          <h2 className="font-mono text-xl text-terminal-dark">
            {title}
          </h2>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-terminal-bg/50 rounded-full overflow-hidden border border-terminal-border">
            <div
              ref={progressBarRef}
              className="h-full bg-gradient-to-r from-terminal-green to-terminal-amber rounded-full"
              style={{ width: prefersReducedMotion ? `${progress}%` : "0%" }}
            />
          </div>

          {/* Current Status */}
          <motion.div
            key={currentMessage}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-sm text-terminal-text/80"
          >
            <span className="text-terminal-green">{ASCII_FRAMES[spinnerFrame]}</span>
            {" "}
            {messages[currentMessage]}
          </motion.div>
        </div>

        {/* Terminal Log */}
        <div className="bg-terminal-bg/30 rounded-lg border border-terminal-border p-4 text-left font-mono text-xs max-h-32 overflow-y-auto">
          {messages.slice(0, currentMessage + 1).map((msg: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-terminal-green">✓</span>
              <span className="text-terminal-text/70">{msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

