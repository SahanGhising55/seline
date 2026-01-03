"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { animate } from "animejs";
import { useReducedMotion } from "@/lib/animations/hooks";
import { ZLUTTY_EASINGS, ZLUTTY_DURATIONS } from "@/lib/animations/utils";

interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  /** Animation direction */
  direction?: "up" | "down" | "left" | "right" | "none";
  /** Animation distance */
  distance?: number;
  /** Animation delay in ms */
  delay?: number;
  /** Animation duration in ms */
  duration?: number;
}

/**
 * AnimatedContainer - Wrapper for fade-in entrance animations
 * Use for page sections, modals, and content areas
 */
export function AnimatedContainer({
  children,
  className,
  direction = "up",
  distance = 20,
  delay = 0,
  duration = ZLUTTY_DURATIONS.normal,
}: AnimatedContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion || hasAnimated.current) return;

    hasAnimated.current = true;
    const el = containerRef.current;

    const translateProps: Record<string, { prop: string; value: number }> = {
      up: { prop: "translateY", value: distance },
      down: { prop: "translateY", value: -distance },
      left: { prop: "translateX", value: distance },
      right: { prop: "translateX", value: -distance },
      none: { prop: "translateY", value: 0 },
    };

    const { prop, value } = translateProps[direction];

    // Set initial state
    el.style.opacity = "0";
    if (value !== 0) {
      el.style.transform = `${prop}(${value}px)`;
    }

    // Animate
    animate(el, {
      opacity: [0, 1],
      ...(value !== 0 ? { [prop]: [value, 0] } : {}),
      duration,
      delay,
      ease: ZLUTTY_EASINGS.reveal,
    });
  }, [direction, distance, delay, duration, prefersReducedMotion]);

  return (
    <div
      ref={containerRef}
      className={cn("transform-gpu", className)}
      style={prefersReducedMotion ? {} : { opacity: 0 }}
    >
      {children}
    </div>
  );
}

