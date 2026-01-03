/**
 * Agent Memory System Types
 *
 * Type definitions for the per-agent memory system that extracts
 * and stores important patterns from conversations.
 */

// Memory categories - domain-agnostic for visual AI workflows
export type MemoryCategory =
  | "visual_preferences" // Colors, styles, aesthetics, aspect ratios
  | "communication_style" // Tone, formality, response format
  | "workflow_patterns" // User habits, iteration patterns, sequences
  | "domain_knowledge" // Business facts, terminology, context
  | "business_rules"; // Requirements, constraints, brand guidelines

export const MEMORY_CATEGORIES: Record<MemoryCategory, { label: string; description: string }> = {
  visual_preferences: {
    label: "Visual Preferences",
    description: "Colors, styles, aesthetics, aspect ratios, design preferences",
  },
  communication_style: {
    label: "Communication Style",
    description: "Tone, formality, language preferences, response format",
  },
  workflow_patterns: {
    label: "Workflow Patterns",
    description: "User habits, iteration patterns, tool sequences",
  },
  domain_knowledge: {
    label: "Domain Knowledge",
    description: "Business facts, terminology, industry context",
  },
  business_rules: {
    label: "Business Rules",
    description: "Requirements, constraints, brand guidelines, policies",
  },
};

// Memory entry status
export type MemoryStatus = "pending" | "approved" | "rejected";

// Memory source
export type MemorySource = "auto" | "manual";

// Importance score factors
export interface ImportanceFactors {
  repetition: number; // 0-1, weight 0.30 - Has this pattern appeared multiple times?
  impact: number; // 0-1, weight 0.35 - How much would this affect future interactions?
  specificity: number; // 0-1, weight 0.20 - Is this specific enough to be actionable?
  recency: number; // 0-1, weight 0.10 - Is this from recent messages?
  conflictResolution: number; // 0-1, weight 0.05 - Does this clarify/update a previous pattern?
}

// Single memory entry
export interface MemoryEntry {
  id: string;
  category: MemoryCategory;
  content: string; // The actual memory/rule
  reasoning: string; // Why this was extracted
  confidence: number; // 0-1 confidence score
  importance: number; // Calculated importance (0-1)
  factors: ImportanceFactors;
  status: MemoryStatus;
  source: MemorySource;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  approvedAt?: string; // ISO timestamp when approved
  rejectedAt?: string; // ISO timestamp when rejected
  sessionId?: string; // Session where it was extracted
  messageIds?: string[]; // Related message IDs
}

// Log event types for memory-log.jsonl
export type MemoryLogEventType =
  | "extracted" // Memory was auto-extracted from conversation
  | "manual_added" // Memory was manually added by user
  | "approved" // Pending memory was approved
  | "rejected" // Pending memory was rejected
  | "edited" // Memory content was edited
  | "deleted" // Memory was deleted
  | "conflict_resolved"; // Memory replaced/updated due to contradiction

export interface MemoryLogEvent {
  id: string;
  type: MemoryLogEventType;
  memoryId: string;
  timestamp: string; // ISO timestamp
  data: Record<string, unknown>;
}

// Metadata file structure
export interface MemoryMetadata {
  version: number;
  characterId: string;
  totalMemories: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  lastExtractionAt?: string;
  lastApprovalAt?: string;
  categoryStats: Record<MemoryCategory, number>;
  createdAt: string;
  updatedAt: string;
}

// Input for creating a new memory
export interface CreateMemoryInput {
  category: MemoryCategory;
  content: string;
  reasoning?: string;
  confidence?: number;
  importance?: number;
  factors?: ImportanceFactors;
  status?: MemoryStatus;
  source: MemorySource;
  sessionId?: string;
  messageIds?: string[];
}

// Input for updating a memory
export interface UpdateMemoryInput {
  category?: MemoryCategory;
  content?: string;
  reasoning?: string;
  status?: MemoryStatus;
}

// Extracted memory from LLM (before it becomes a MemoryEntry)
export interface ExtractedMemory {
  category: MemoryCategory;
  content: string;
  reasoning: string;
  confidence: number;
  factors: ImportanceFactors;
}

// Memory formatted for prompt injection
export interface FormattedMemory {
  markdown: string;
  tokenEstimate: number;
  memoryCount: number;
}

// API response types
export interface MemoryListResponse {
  memories: MemoryEntry[];
  metadata: MemoryMetadata;
}

export interface MemoryActionResponse {
  success: boolean;
  memory?: MemoryEntry;
  error?: string;
}
