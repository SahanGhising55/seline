export const CLAUDE_SONNET_45_INPUT_COST_PER_MILLION = 3;
export const CLAUDE_SONNET_45_OUTPUT_COST_PER_MILLION = 15;

export interface ClaudeCostBreakdown {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
}

/**
 * Calculate approximate Claude 3.5 Sonnet (4.5) cost for the given token usage.
 * Prices are in USD per 1M tokens: $3 input, $15 output.
 */
export function calculateClaudeSonnet45Cost(
  inputTokens: number,
  outputTokens: number
): ClaudeCostBreakdown {
  const safeInput = Number.isFinite(inputTokens) ? Math.max(0, Math.floor(inputTokens)) : 0;
  const safeOutput = Number.isFinite(outputTokens) ? Math.max(0, Math.floor(outputTokens)) : 0;

  const inputCostUsd = (safeInput / 1_000_000) * CLAUDE_SONNET_45_INPUT_COST_PER_MILLION;
  const outputCostUsd = (safeOutput / 1_000_000) * CLAUDE_SONNET_45_OUTPUT_COST_PER_MILLION;

  const totalTokens = safeInput + safeOutput;
  const totalCostUsd = inputCostUsd + outputCostUsd;

  return {
    inputTokens: safeInput,
    outputTokens: safeOutput,
    totalTokens,
    inputCostUsd,
    outputCostUsd,
    totalCostUsd,
  };
}

/**
 * Lightweight currency formatting helper for displaying USD amounts.
 */
export function formatUsd(amount: number, fractionDigits = 4): string {
  if (!Number.isFinite(amount)) return "$0.0000";
  return `$${amount.toFixed(fractionDigits)}`;
}
