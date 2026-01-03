/**
 * Animation utility functions
 */

import { cubicBezier, spring, eases } from "animejs";

/**
 * Generates a random value within a range for organic animations
 */
export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Creates stagger delays for list animations
 */
export function staggerDelay(index: number, baseDelay: number = 50): number {
  return index * baseDelay;
}

/**
 * Easing presets for Styly Agents style
 * Uses anime.js v4 function-based easing API
 */
export const ZLUTTY_EASINGS = {
  // Smooth and organic
  smooth: cubicBezier(0.4, 0, 0.2, 1),
  // Bouncy entrance
  bounceIn: spring({ mass: 1, stiffness: 80, damping: 10, velocity: 0 }),
  // Gentle float
  float: eases.inOut(2),
  // Quick snap
  snap: eases.out(3),
  // Elastic pop
  pop: spring({ mass: 1, stiffness: 100, damping: 12, velocity: 0 }),
  // Slow reveal
  reveal: cubicBezier(0.16, 1, 0.3, 1),
};

/**
 * Duration presets in milliseconds
 */
export const ZLUTTY_DURATIONS = {
  instant: 150,
  fast: 300,
  normal: 500,
  slow: 800,
  glacial: 1200,
  loop: 3000,
  ambientLoop: 5000,
} as const;

/**
 * Common animation values
 */
export const ZLUTTY_VALUES = {
  floatDistance: 6,
  rotateAmount: 3,
  scaleHover: 1.02,
  scalePress: 0.98,
  liftDistance: 4,
} as const;

