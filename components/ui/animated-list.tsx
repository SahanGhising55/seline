"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { animate, stagger } from "animejs";
import { useReducedMotion } from "@/lib/animations/hooks";
import { ZLUTTY_EASINGS, ZLUTTY_DURATIONS } from "@/lib/animations/utils";

interface AnimatedListProps {
  children: ReactNode;
  /** Delay between each item animation in ms */
  staggerMs?: number;
  /** Animation direction */
  direction?: "up" | "down" | "left" | "right";
  /** Distance to travel during animation */
  distance?: number;
  /** Custom className */
  className?: string;
  /** Enable wave animation (continuous subtle movement) */
  wave?: boolean;
  /** Wave amplitude in pixels */
  waveAmplitude?: number;
}

/**
 * AnimatedList - Container that staggers child animations
 * Perfect for session lists, character grids, and menu items
 */
export function AnimatedList({
  children,
  staggerMs = 50,
  direction = "up",
  distance = 15,
  className,
  wave = false,
  waveAmplitude = 2,
}: AnimatedListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const hasAnimated = useRef(false);
  const waveAnimationsRef = useRef<ReturnType<typeof animate>[]>([]);

  // Initial stagger reveal
  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion || hasAnimated.current) return;

    const children = containerRef.current.children;
    if (children.length === 0) return;

    hasAnimated.current = true;

    const translateProp = direction === "up" || direction === "down" ? "translateY" : "translateX";
    const translateValue = direction === "up" || direction === "left" ? distance : -distance;

    // Set initial state
    Array.from(children).forEach((child) => {
      (child as HTMLElement).style.opacity = "0";
      (child as HTMLElement).style.transform = `${translateProp === "translateY" ? `translateY(${translateValue}px)` : `translateX(${translateValue}px)`}`;
    });

    // Animate in
    animate(children, {
      opacity: [0, 1],
      [translateProp]: [translateValue, 0],
      duration: ZLUTTY_DURATIONS.normal,
      ease: ZLUTTY_EASINGS.reveal,
      delay: stagger(staggerMs),
    });
  }, [staggerMs, direction, distance, prefersReducedMotion]);

  // Optional wave animation
  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion || !wave) return;

    const children = Array.from(containerRef.current.children);

    waveAnimationsRef.current = children.map((child, i) =>
      animate(child, {
        translateY: [-waveAmplitude, waveAmplitude, -waveAmplitude],
        duration: ZLUTTY_DURATIONS.ambientLoop,
        loop: true,
        ease: ZLUTTY_EASINGS.float,
        delay: i * 80,
      })
    );

    return () => {
      waveAnimationsRef.current.forEach((anim) => anim.pause());
    };
  }, [wave, waveAmplitude, prefersReducedMotion]);

  return (
    <div ref={containerRef} className={cn("space-y-1", className)}>
      {children}
    </div>
  );
}

