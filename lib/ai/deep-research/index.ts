/**
 * Deep Research Module
 * 
 * Provides comprehensive research capabilities inspired by ThinkDepth.ai's
 * Deep Research agent. This module enables multi-step research workflows
 * with web search, analysis, and report generation.
 * 
 * Usage:
 * ```typescript
 * import { runDeepResearch } from '@/lib/ai/deep-research';
 * 
 * const state = await runDeepResearch(
 *   "What are the latest developments in quantum computing?",
 *   (event) => console.log(event),
 *   { maxIterations: 3 }
 * );
 * ```
 */

// Export types
export type {
  ResearchSource,
  ResearchFinding,
  ResearchPlan,
  DraftReport,
  FinalReport,
  DeepResearchState,
  ResearchPhase,
  DeepResearchEventType,
  DeepResearchEvent,
  PhaseChangeEvent,
  SearchProgressEvent,
  SearchResultEvent,
  AnalysisUpdateEvent,
  DraftUpdateEvent,
  RefinementUpdateEvent,
  FinalReportEvent,
  ErrorEvent,
  CompleteEvent,
  DeepResearchConfig,
} from './types';

export { DEFAULT_CONFIG } from './types';

// Export orchestrator functions
export {
  runDeepResearch,
  createInitialState,
  type EventEmitter,
} from './orchestrator';

// Export search utilities
export {
  tavilySearch,
  executeSearches,
  isSearchAvailable,
} from './search';

// Export prompts (for customization)
export {
  RESEARCH_PLANNER_PROMPT,
  SEARCH_QUERY_GENERATOR_PROMPT,
  RESEARCH_ANALYZER_PROMPT,
  DRAFT_REPORT_PROMPT,
  REPORT_REFINEMENT_PROMPT,
  FINAL_REPORT_PROMPT,
  THINK_PROMPT,
} from './prompts';

