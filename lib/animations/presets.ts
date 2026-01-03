/**
 * Animation preset configurations for anime.js
 * These define reusable animation patterns for the Styly Agents style
 */

import { steps, linear, type EasingParam } from "animejs";
import { ZLUTTY_EASINGS, ZLUTTY_DURATIONS, ZLUTTY_VALUES } from "./utils";

export interface AnimationPreset {
  keyframes?: Record<string, unknown>[];
  duration?: number;
  ease?: EasingParam;
  loop?: boolean | number;
  direction?: "normal" | "reverse" | "alternate";
  delay?: number | ((el: Element, i: number) => number);
}

/**
 * Floating animation - subtle vertical movement
 */
export const floatPreset: AnimationPreset = {
  keyframes: [
    { translateY: 0 },
    { translateY: -ZLUTTY_VALUES.floatDistance },
    { translateY: 0 },
  ],
  duration: ZLUTTY_DURATIONS.ambientLoop,
  ease: ZLUTTY_EASINGS.float,
  loop: true,
};

/**
 * Gentle 3D rotation for depth
 */
export const gentleRotatePreset: AnimationPreset = {
  keyframes: [
    { rotateY: 0, rotateX: 0 },
    { rotateY: ZLUTTY_VALUES.rotateAmount, rotateX: 1 },
    { rotateY: 0, rotateX: 0 },
    { rotateY: -ZLUTTY_VALUES.rotateAmount, rotateX: -1 },
    { rotateY: 0, rotateX: 0 },
  ],
  duration: ZLUTTY_DURATIONS.ambientLoop * 1.5,
  ease: ZLUTTY_EASINGS.float,
  loop: true,
};

/**
 * Subtle breathing effect - gentle scale pulse
 */
export const breathePreset: AnimationPreset = {
  keyframes: [
    { scale: 1 },
    { scale: 1.015 },
    { scale: 1 },
  ],
  duration: ZLUTTY_DURATIONS.ambientLoop,
  ease: ZLUTTY_EASINGS.float,
  loop: true,
};

/**
 * Staggered fade in from bottom
 */
export const staggerRevealPreset = (staggerMs: number = 80): AnimationPreset => ({
  keyframes: [
    { opacity: 0, translateY: 20 },
    { opacity: 1, translateY: 0 },
  ],
  duration: ZLUTTY_DURATIONS.normal,
  ease: ZLUTTY_EASINGS.reveal,
  delay: (_el: Element, i: number) => i * staggerMs,
});

/**
 * Card hover lift effect
 */
export const cardHoverPreset: AnimationPreset = {
  keyframes: [
    { translateY: 0, scale: 1 },
    { translateY: -4, scale: ZLUTTY_VALUES.scaleHover },
  ],
  duration: ZLUTTY_DURATIONS.fast,
  ease: ZLUTTY_EASINGS.smooth,
};

/**
 * Magnetic pull effect
 */
export const magneticPreset: AnimationPreset = {
  duration: ZLUTTY_DURATIONS.fast,
  ease: ZLUTTY_EASINGS.smooth,
};

/**
 * Terminal cursor blink
 */
export const cursorBlinkPreset: AnimationPreset = {
  keyframes: [
    { opacity: 1 },
    { opacity: 0 },
    { opacity: 1 },
  ],
  duration: 1000,
  ease: steps(1),
  loop: true,
};

/**
 * Wave animation for lists
 */
export const wavePreset = (amplitude: number = 3): AnimationPreset => ({
  keyframes: [
    { translateY: 0 },
    { translateY: -amplitude },
    { translateY: 0 },
    { translateY: amplitude },
    { translateY: 0 },
  ],
  duration: ZLUTTY_DURATIONS.loop,
  ease: ZLUTTY_EASINGS.float,
  loop: true,
});

/**
 * Shimmer effect for loading states
 */
export const shimmerPreset: AnimationPreset = {
  keyframes: [
    { backgroundPosition: "-200% 0" },
    { backgroundPosition: "200% 0" },
  ],
  duration: ZLUTTY_DURATIONS.glacial * 2,
  ease: linear(),
  loop: true,
};

/**
 * Typewriter character reveal
 */
export const typewriterPreset = (charDelay: number = 40): AnimationPreset => ({
  keyframes: [
    { opacity: 0, translateX: -5 },
    { opacity: 1, translateX: 0 },
  ],
  duration: ZLUTTY_DURATIONS.instant,
  ease: ZLUTTY_EASINGS.snap,
  delay: (_el: Element, i: number) => i * charDelay,
});

/**
 * Scale pop for buttons/interactive elements
 */
export const scalePopPreset: AnimationPreset = {
  keyframes: [
    { scale: 0.95 },
    { scale: 1.05 },
    { scale: 1 },
  ],
  duration: ZLUTTY_DURATIONS.fast,
  ease: ZLUTTY_EASINGS.pop,
};

