/**
 * Importance Calculator
 *
 * Calculates the importance score for a potential memory based on weighted factors.
 */

import type { ImportanceFactors } from "../types";

/**
 * Weight configuration for importance factors
 */
export const IMPORTANCE_WEIGHTS = {
  repetition: 0.30, // Has this pattern appeared multiple times?
  impact: 0.35, // How much would this affect future interactions?
  specificity: 0.20, // Is this specific enough to be actionable?
  recency: 0.10, // Is this from recent messages?
  conflictResolution: 0.05, // Does this clarify/update a previous pattern?
} as const;

/**
 * Threshold for storing a memory (memories below this are rejected)
 */
export const IMPORTANCE_THRESHOLD = 0.80;

/**
 * Calculate the overall importance score from individual factors
 *
 * Formula:
 * importance = (repetition × 0.30) + (impact × 0.35) + (specificity × 0.20)
 *            + (recency × 0.10) + (conflictResolution × 0.05)
 */
export function calculateImportance(factors: ImportanceFactors): number {
  const score =
    factors.repetition * IMPORTANCE_WEIGHTS.repetition +
    factors.impact * IMPORTANCE_WEIGHTS.impact +
    factors.specificity * IMPORTANCE_WEIGHTS.specificity +
    factors.recency * IMPORTANCE_WEIGHTS.recency +
    factors.conflictResolution * IMPORTANCE_WEIGHTS.conflictResolution;

  // Round to 2 decimal places
  return Math.round(score * 100) / 100;
}

/**
 * Check if an importance score meets the threshold for storage
 */
export function meetsThreshold(factors: ImportanceFactors): boolean {
  return calculateImportance(factors) >= IMPORTANCE_THRESHOLD;
}

/**
 * Check if a score value meets the threshold
 */
export function scoreAboveThreshold(score: number): boolean {
  return score >= IMPORTANCE_THRESHOLD;
}

/**
 * Validate that all factors are within valid range (0-1)
 */
export function validateFactors(factors: ImportanceFactors): boolean {
  const keys: (keyof ImportanceFactors)[] = [
    "repetition",
    "impact",
    "specificity",
    "recency",
    "conflictResolution",
  ];

  return keys.every((key) => {
    const value = factors[key];
    return typeof value === "number" && value >= 0 && value <= 1;
  });
}

/**
 * Normalize factors to ensure they're within valid range
 */
export function normalizeFactors(factors: Partial<ImportanceFactors>): ImportanceFactors {
  const clamp = (value: number | undefined, defaultValue: number): number => {
    if (value === undefined) return defaultValue;
    return Math.max(0, Math.min(1, value));
  };

  return {
    repetition: clamp(factors.repetition, 0.5),
    impact: clamp(factors.impact, 0.5),
    specificity: clamp(factors.specificity, 0.5),
    recency: clamp(factors.recency, 1.0),
    conflictResolution: clamp(factors.conflictResolution, 0),
  };
}

/**
 * Get a human-readable breakdown of the importance score
 */
export function explainScore(factors: ImportanceFactors): string {
  const score = calculateImportance(factors);
  const breakdown = [
    `Repetition:     ${factors.repetition.toFixed(2)} × ${IMPORTANCE_WEIGHTS.repetition} = ${(factors.repetition * IMPORTANCE_WEIGHTS.repetition).toFixed(3)}`,
    `Impact:         ${factors.impact.toFixed(2)} × ${IMPORTANCE_WEIGHTS.impact} = ${(factors.impact * IMPORTANCE_WEIGHTS.impact).toFixed(3)}`,
    `Specificity:    ${factors.specificity.toFixed(2)} × ${IMPORTANCE_WEIGHTS.specificity} = ${(factors.specificity * IMPORTANCE_WEIGHTS.specificity).toFixed(3)}`,
    `Recency:        ${factors.recency.toFixed(2)} × ${IMPORTANCE_WEIGHTS.recency} = ${(factors.recency * IMPORTANCE_WEIGHTS.recency).toFixed(3)}`,
    `Conflict Res:   ${factors.conflictResolution.toFixed(2)} × ${IMPORTANCE_WEIGHTS.conflictResolution} = ${(factors.conflictResolution * IMPORTANCE_WEIGHTS.conflictResolution).toFixed(3)}`,
    `────────────────────────`,
    `TOTAL:          ${score.toFixed(2)}`,
    `THRESHOLD:      ${IMPORTANCE_THRESHOLD}`,
    `DECISION:       ${score >= IMPORTANCE_THRESHOLD ? "✓ STORE" : "✗ REJECT"}`,
  ];

  return breakdown.join("\n");
}
