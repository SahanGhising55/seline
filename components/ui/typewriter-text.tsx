"use client";

import { useEffect, useRef, useState } from "react";
import { animate, stagger } from "animejs";
import { useReducedMotion } from "@/components/character-creation/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

interface TypewriterTextProps {
  /** The text to display with typewriter effect */
  text: string;
  /** Delay before starting the animation in ms */
  delay?: number;
  /** Speed per character in ms */
  speed?: number;
  /** CSS class for the container */
  className?: string;
  /** Callback when animation completes */
  onComplete?: () => void;
  /** Whether to show cursor */
  showCursor?: boolean;
  /** Cursor character */
  cursor?: string;
  /** Whether to start animation immediately */
  autoStart?: boolean;
}

export function TypewriterText({
  text,
  delay = 0,
  speed = 40,
  className,
  onComplete,
  showCursor = true,
  cursor = "▋",
  autoStart = true,
}: TypewriterTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!autoStart) return;

    // If reduced motion, show text immediately
    if (prefersReducedMotion) {
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    // Reset state
    setDisplayedText("");
    setIsComplete(false);

    // Animate character by character using interval
    let currentIndex = 0;
    const timeoutId = setTimeout(() => {
      const intervalId = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(intervalId);
          setIsComplete(true);
          onComplete?.();
        }
      }, speed);

      return () => clearInterval(intervalId);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [text, delay, speed, autoStart, prefersReducedMotion, onComplete]);

  return (
    <span ref={containerRef} className={cn("inline", className)}>
      {displayedText}
      {showCursor && !isComplete && (
        <span className="animate-blink ml-0.5">{cursor}</span>
      )}
    </span>
  );
}

interface TypewriterLinesProps {
  /** Array of lines to display */
  lines: string[];
  /** Delay between lines in ms */
  lineDelay?: number;
  /** Speed per character in ms */
  speed?: number;
  /** CSS class for each line */
  lineClassName?: string;
  /** CSS class for the container */
  className?: string;
  /** Callback when all lines complete */
  onComplete?: () => void;
}

export function TypewriterLines({
  lines,
  lineDelay = 300,
  speed = 40,
  lineClassName,
  className,
  onComplete,
}: TypewriterLinesProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [completedLines, setCompletedLines] = useState<string[]>([]);

  const handleLineComplete = () => {
    setCompletedLines((prev) => [...prev, lines[currentLineIndex]]);

    if (currentLineIndex < lines.length - 1) {
      setTimeout(() => {
        setCurrentLineIndex((prev) => prev + 1);
      }, lineDelay);
    } else {
      onComplete?.();
    }
  };

  return (
    <div className={cn("space-y-1", className)}>
      {completedLines.map((line, index) => (
        <div key={index} className={lineClassName}>
          {line}
        </div>
      ))}
      {currentLineIndex < lines.length && (
        <div className={lineClassName}>
          <TypewriterText
            text={lines[currentLineIndex]}
            speed={speed}
            onComplete={handleLineComplete}
            showCursor={currentLineIndex === lines.length - 1}
          />
        </div>
      )}
    </div>
  );
}

