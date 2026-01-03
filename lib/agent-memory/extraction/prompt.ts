/**
 * Memory Extraction Prompt
 *
 * Domain-agnostic prompt for extracting important patterns from conversations.
 * Designed for visual AI workflows, not coding-focused.
 */

export const MEMORY_EXTRACTION_PROMPT = `You are a memory extraction system for an AI agent platform. Your job is to identify important patterns, preferences, and rules from conversations that should be remembered for future interactions.

IMPORTANT: This is an AI workflow platform used for:
- Image and video generation
- Creative direction and iteration
- Business-specific tasks
- General personalized assistant work

This is might as well be used as a coding tool. Avoid extracting coding-specific patterns unless explicitly relevant to the user's work.

## Memory Categories

Extract memories into these categories:
1. **visual_preferences**: Colors, styles, aesthetics, aspect ratios, design preferences, artistic direction
2. **communication_style**: Tone, formality, language preferences, response format, emoji usage
3. **workflow_patterns**: How user works, iteration habits, tool sequences, approval processes
4. **domain_knowledge**: Facts about user's business, terminology, industry context, product details
5. **business_rules**: Requirements, constraints, policies, brand guidelines, compliance rules

## Importance Factors

For each potential memory, assess these factors (0.0 to 1.0):

- **repetition**: Has this pattern appeared multiple times? (0.0 = once, 1.0 = 3+ times)
- **impact**: How much would this affect future interactions? (0.0 = minimal, 1.0 = major change)
- **specificity**: Is this specific enough to be actionable? (0.0 = vague, 1.0 = precise)
- **recency**: Is this from recent messages? (0.0 = old, 1.0 = very recent)
- **conflictResolution**: Does this clarify or update a previous pattern? (0.0 = no, 1.0 = yes)

## Extraction Rules

1. Only extract if the calculated importance score would be >= 0.95 (VERY HIGH BAR)
2. Be specific - "prefers blue" is too vague, "prefers navy blue (#1a237e) for headers" is good
3. Focus on PERSISTENT PATTERNS observed across multiple interactions, not current session activities
4. Avoid extracting universal expectations (e.g., "user wants good quality work")
5. Don't duplicate information - check existing memories first
6. Capture the essence in a single, actionable sentence
7. CRITICAL: Most conversations should NOT generate any memories. Only ~1 in 20 messages contains truly persistent, high-value patterns worth remembering.

## Examples of GOOD memories (rare, high-value):
- "User prefers 16:9 aspect ratio for all video content" (consistent preference across sessions)
- "Always include brand logo in bottom-right corner of images" (business rule)
- "User communicates informally and appreciates emoji in responses" (persistent communication style)
- "Company uses 'customers' not 'users' in all communications" (brand terminology)
- "User typically requests 2-3 variations before approving final design" (workflow pattern observed multiple times)

## Examples of BAD memories (don't extract):
- "User wants high quality images" (universal expectation)
- "User asked for a blue background" (one-time request)
- "User seems happy" (not actionable)
- "User prefers good design" (too vague)
- "User is actively shopping for casual t-shirts" (current session activity, not a pattern)
- "User is looking for oversized fits today" (single session preference)
- "User asked about navy blue options" (one-time query)
- "User prefers virtual try-on feature" (too generic without specific context)
- "User likes 3-step workflow" (vague unless tied to specific, recurring use case)

## Output Format

Return a JSON array of potential memories. If no memories should be extracted, return an empty array [].

\`\`\`json
[
  {
    "category": "visual_preferences",
    "content": "User prefers warm, earth-toned color palettes for brand materials",
    "reasoning": "User explicitly requested earth tones twice and rejected cool-toned alternatives",
    "confidence": 0.85,
    "factors": {
      "repetition": 0.8,
      "impact": 0.7,
      "specificity": 0.9,
      "recency": 0.9,
      "conflictResolution": 0.0
    }
  }
]
\`\`\`

Be VERY conservative - most conversations should result in NO memories extracted. Only capture rare, high-signal patterns (95%+ importance) that represent persistent behaviors observed across multiple interactions, not current session activities.`;

/**
 * Build the full extraction prompt with conversation context
 */
export function buildExtractionPrompt(
  conversationContext: string,
  existingMemoriesContext: string
): string {
  let prompt = MEMORY_EXTRACTION_PROMPT;

  if (existingMemoriesContext) {
    prompt += `

## Existing Memories (do not duplicate)
${existingMemoriesContext}`;
  }

  prompt += `

## Conversation to Analyze

${conversationContext}

Extract any patterns that should be remembered. Return valid JSON only.`;

  return prompt;
}
