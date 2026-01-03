"use client";

/**
	 * Styly Agents Animation Hooks
	 * Powerful anime.js hooks for consistent, delightful animations
	 */

import { useEffect, useRef, useCallback, useState } from "react";
import { animate, stagger, createScope, type Scope } from "animejs";
import { ZLUTTY_EASINGS, ZLUTTY_DURATIONS, ZLUTTY_VALUES } from "./utils";

// Re-export the reduced motion hook
export { useReducedMotion, useAnimationDuration } from "@/components/character-creation/hooks/use-reduced-motion";
import { useReducedMotion } from "@/components/character-creation/hooks/use-reduced-motion";

/**
 * Hook for ambient floating animation
 * Creates organic, gentle vertical movement
 */
export function useFloat(
  options: {
    distance?: number;
    duration?: number;
    delay?: number;
  } = {}
) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const animationRef = useRef<ReturnType<typeof animate> | null>(null);

  const { distance = ZLUTTY_VALUES.floatDistance, duration = ZLUTTY_DURATIONS.ambientLoop, delay = 0 } = options;

  useEffect(() => {
    if (!ref.current || prefersReducedMotion) return;

    animationRef.current = animate(ref.current, {
      translateY: [-distance, distance, -distance],
      duration,
      loop: true,
      ease: ZLUTTY_EASINGS.float,
      delay,
    });

    return () => {
      animationRef.current?.pause();
    };
  }, [distance, duration, delay, prefersReducedMotion]);

  return ref;
}

/**
 * Hook for 3D rotation effect
 * Adds subtle depth and movement
 */
export function useGentleRotate(
  options: {
    rotateY?: number;
    rotateX?: number;
    duration?: number;
  } = {}
) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const animationRef = useRef<ReturnType<typeof animate> | null>(null);

  const {
    rotateY = ZLUTTY_VALUES.rotateAmount,
    rotateX = 1,
    duration = ZLUTTY_DURATIONS.ambientLoop * 1.4,
  } = options;

  useEffect(() => {
    if (!ref.current || prefersReducedMotion) return;

    animationRef.current = animate(ref.current, {
      rotateY: [-rotateY, rotateY, -rotateY],
      rotateX: [-rotateX, rotateX, -rotateX],
      duration,
      loop: true,
      ease: ZLUTTY_EASINGS.float,
    });

    return () => {
      animationRef.current?.pause();
    };
  }, [rotateY, rotateX, duration, prefersReducedMotion]);

  return ref;
}

/**
 * Hook for staggered list reveal animation
 * Elements fade and slide in sequentially
 */
export function useStaggerReveal(
  options: {
    staggerMs?: number;
    duration?: number;
    distance?: number;
    enabled?: boolean;
  } = {}
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const hasAnimated = useRef(false);

  const {
    staggerMs = 60,
    duration = ZLUTTY_DURATIONS.normal,
    distance = 20,
    enabled = true,
  } = options;

  const triggerAnimation = useCallback(() => {
    if (!containerRef.current || prefersReducedMotion || hasAnimated.current) return;

    const children = containerRef.current.children;
    if (children.length === 0) return;

    hasAnimated.current = true;

    animate(children, {
      opacity: [0, 1],
      translateY: [distance, 0],
      duration,
      ease: ZLUTTY_EASINGS.reveal,
      delay: stagger(staggerMs),
    });
  }, [staggerMs, duration, distance, prefersReducedMotion]);

  useEffect(() => {
    if (enabled) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(triggerAnimation, 50);
      return () => clearTimeout(timer);
    }
  }, [enabled, triggerAnimation]);

  return { containerRef, triggerAnimation };
}

/**
 * Hook for card hover effects
 * Lift and subtle scale on hover
 */
export function useCardHover() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const onMouseEnter = useCallback(() => {
    if (!ref.current || prefersReducedMotion) return;

    animate(ref.current, {
      translateY: -ZLUTTY_VALUES.liftDistance,
      scale: ZLUTTY_VALUES.scaleHover,
      duration: ZLUTTY_DURATIONS.fast,
      ease: ZLUTTY_EASINGS.smooth,
    });
  }, [prefersReducedMotion]);

  const onMouseLeave = useCallback(() => {
    if (!ref.current || prefersReducedMotion) return;

    animate(ref.current, {
      translateY: 0,
      scale: 1,
      duration: ZLUTTY_DURATIONS.fast,
      ease: ZLUTTY_EASINGS.smooth,
    });
  }, [prefersReducedMotion]);

  return { ref, onMouseEnter, onMouseLeave };
}

/**
 * Hook for button press effect
 * Quick scale down and back
 */
export function useButtonPress() {
  const ref = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const onMouseDown = useCallback(() => {
    if (!ref.current || prefersReducedMotion) return;

    animate(ref.current, {
      scale: ZLUTTY_VALUES.scalePress,
      duration: ZLUTTY_DURATIONS.instant,
      ease: ZLUTTY_EASINGS.snap,
    });
  }, [prefersReducedMotion]);

  const onMouseUp = useCallback(() => {
    if (!ref.current || prefersReducedMotion) return;

    animate(ref.current, {
      scale: 1,
      duration: ZLUTTY_DURATIONS.fast,
      ease: ZLUTTY_EASINGS.pop,
    });
  }, [prefersReducedMotion]);

  return { ref, onMouseDown, onMouseUp, onMouseLeave: onMouseUp };
}

/**
 * Hook for entrance animation
 * Fade in with optional slide direction
 */
export function useEntrance(
  options: {
    direction?: "up" | "down" | "left" | "right" | "none";
    duration?: number;
    delay?: number;
    distance?: number;
  } = {}
) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [hasEntered, setHasEntered] = useState(false);

  const {
    direction = "up",
    duration = ZLUTTY_DURATIONS.normal,
    delay = 0,
    distance = 20,
  } = options;

  useEffect(() => {
    if (!ref.current || prefersReducedMotion) {
      setHasEntered(true);
      return;
    }

    const translateProps: Record<string, Record<string, number[]>> = {
      up: { translateY: [distance, 0] },
      down: { translateY: [-distance, 0] },
      left: { translateX: [distance, 0] },
      right: { translateX: [-distance, 0] },
      none: {},
    };

    animate(ref.current, {
      opacity: [0, 1],
      ...translateProps[direction],
      duration,
      delay,
      ease: ZLUTTY_EASINGS.reveal,
      complete: () => setHasEntered(true),
    } as Parameters<typeof animate>[1]);
  }, [direction, duration, delay, distance, prefersReducedMotion]);

  return { ref, hasEntered };
}

/**
 * Hook for wave animation on list items
 * Creates a gentle wave effect across children
 */
export function useWave(
  options: {
    amplitude?: number;
    duration?: number;
    staggerMs?: number;
  } = {}
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const animationsRef = useRef<ReturnType<typeof animate>[]>([]);

  const {
    amplitude = 3,
    duration = ZLUTTY_DURATIONS.loop,
    staggerMs = 100,
  } = options;

  useEffect(() => {
    if (!containerRef.current || prefersReducedMotion) return;

    const children = Array.from(containerRef.current.children);

    animationsRef.current = children.map((child, i) =>
      animate(child, {
        translateY: [-amplitude, amplitude, -amplitude],
        duration,
        loop: true,
        ease: ZLUTTY_EASINGS.float,
        delay: i * staggerMs,
      })
    );

    return () => {
      animationsRef.current.forEach((anim) => anim.pause());
    };
  }, [amplitude, duration, staggerMs, prefersReducedMotion]);

  return containerRef;
}

/**
 * Hook for magnetic cursor effect
 * Element subtly moves toward cursor on hover
 */
export function useMagnetic(strength: number = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!ref.current || prefersReducedMotion) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) * strength;
      const deltaY = (e.clientY - centerY) * strength;

      animate(ref.current, {
        translateX: deltaX,
        translateY: deltaY,
        duration: ZLUTTY_DURATIONS.fast,
        ease: ZLUTTY_EASINGS.smooth,
      });
    },
    [strength, prefersReducedMotion]
  );

  const onMouseLeave = useCallback(() => {
    if (!ref.current || prefersReducedMotion) return;

    animate(ref.current, {
      translateX: 0,
      translateY: 0,
      duration: ZLUTTY_DURATIONS.normal,
      ease: ZLUTTY_EASINGS.smooth,
    });
  }, [prefersReducedMotion]);

  return { ref, onMouseMove, onMouseLeave };
}

/**
 * Hook for typewriter text animation
 * Characters appear one by one
 */
export function useTypewriter(
  text: string,
  options: {
    charDelay?: number;
    startDelay?: number;
    onComplete?: () => void;
  } = {}
) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const { charDelay = 40, startDelay = 0, onComplete } = options;

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    setDisplayedText("");
    setIsComplete(false);

    let currentIndex = 0;
    const startTimeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
          setIsComplete(true);
          onComplete?.();
        }
      }, charDelay);

      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(startTimeout);
  }, [text, charDelay, startDelay, onComplete, prefersReducedMotion]);

  return { displayedText, isComplete };
}

/**
 * Hook for progress bar animation
 */
export function useProgressBar(progress: number) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!ref.current) return;

    if (prefersReducedMotion) {
      ref.current.style.width = `${progress}%`;
      return;
    }

    animate(ref.current, {
      width: `${progress}%`,
      duration: ZLUTTY_DURATIONS.fast,
      ease: ZLUTTY_EASINGS.snap,
    });
  }, [progress, prefersReducedMotion]);

  return ref;
}

/**
 * Hook for shake animation (for errors/attention)
 */
export function useShake() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const shake = useCallback(() => {
    if (!ref.current || prefersReducedMotion) return;

    animate(ref.current, {
      translateX: [0, -8, 8, -6, 6, -4, 4, 0],
      duration: ZLUTTY_DURATIONS.normal,
      ease: ZLUTTY_EASINGS.snap,
    });
  }, [prefersReducedMotion]);

  return { ref, shake };
}

/**
 * Combined hook for ambient card animations
 * Float + gentle rotate for featured elements
 */
export function useAmbientCard(
  options: {
    floatDistance?: number;
    rotateAmount?: number;
    enabled?: boolean;
  } = {}
) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const animationsRef = useRef<ReturnType<typeof animate>[]>([]);

  const {
    floatDistance = ZLUTTY_VALUES.floatDistance,
    rotateAmount = ZLUTTY_VALUES.rotateAmount,
    enabled = true,
  } = options;

  useEffect(() => {
    if (!ref.current || prefersReducedMotion || !enabled) return;

    // Float animation
    animationsRef.current.push(
      animate(ref.current, {
        translateY: [-floatDistance, floatDistance, -floatDistance],
        duration: ZLUTTY_DURATIONS.ambientLoop,
        loop: true,
        ease: ZLUTTY_EASINGS.float,
      })
    );

    // Rotate animation with offset timing
    animationsRef.current.push(
      animate(ref.current, {
        rotateY: [-rotateAmount, rotateAmount, -rotateAmount],
        rotateX: [-1, 1, -1],
        duration: ZLUTTY_DURATIONS.ambientLoop * 1.3,
        loop: true,
        ease: ZLUTTY_EASINGS.float,
      })
    );

    return () => {
      animationsRef.current.forEach((anim) => anim.pause());
      animationsRef.current = [];
    };
  }, [floatDistance, rotateAmount, enabled, prefersReducedMotion]);

  return ref;
}
