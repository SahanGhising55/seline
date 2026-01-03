/**
 * Shopping Search Types
 *
 * Type definitions for the interactive shopping search flow with
 * human-in-the-loop question/answer and product selection capabilities.
 */

// ============================================================================
// Question Types
// ============================================================================

export interface QuestionOption {
  id: string;
  label: string;
  icon?: string; // Optional emoji or lucide icon name
}

export interface ShoppingQuestion {
  id: string;
  question: string;
  options: QuestionOption[];
  allowCustom: boolean; // "Something else..." option
  allowSkip: boolean;
  type: "single" | "multi"; // Single or multiple selection
}

export interface UserAnswers {
  [questionId: string]: string | string[] | null; // null = skipped
}

// ============================================================================
// Product Types
// ============================================================================

export interface ProductPreview {
  id: string;
  title: string;
  description?: string;
  price: string; // e.g., "1,299 TL" or "₺1,299"
  originalPrice?: string; // For showing discounts
  currency: string; // "TRY", "USD", etc.
  imageUrl: string;
  additionalImages?: string[];
  sourceUrl: string;
  store: string; // "Trendyol", "Hepsiburada", etc.
  rating?: number; // 0-5
  reviewCount?: number;
  colors?: string[];
  sizes?: string[];
  inStock?: boolean;
  discount?: string; // e.g., "20% off"
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchCriteria {
  query: string;
  category: string;
  country?: string;
  refinements: UserAnswers;
  maxResults?: number;
}

// ============================================================================
// Human Interrupt Payload Types
// ============================================================================

export interface ClarificationQuestionsPayload {
  type: "clarification-questions";
  category: string;
  query: string;
  questions: ShoppingQuestion[];
}

export interface ProductSelectionPayload {
  type: "product-selection";
  products: ProductPreview[];
  maxSelections: number;
  searchQuery: string;
}

export type ShoppingInterruptPayload =
  | ClarificationQuestionsPayload
  | ProductSelectionPayload;

// ============================================================================
// Tool Result Types
// ============================================================================

export interface ShoppingSearchResult {
  status: "selected" | "no_products" | "skipped" | "error";
  selectedProducts?: ProductPreview[];
  searchCriteria?: SearchCriteria;
  message: string;
  error?: string;
}

// ============================================================================
// Phase Types (for UI state tracking)
// ============================================================================

export type ShoppingPhase =
  | "idle"
  | "asking-questions"
  | "searching"
  | "browsing"
  | "showing-products"
  | "selected"
  | "complete"
  | "error";

export interface ShoppingFlowState {
  phase: ShoppingPhase;
  questions: ShoppingQuestion[];
  currentQuestionIndex: number;
  answers: UserAnswers;
  searchQuery: string;
  products: ProductPreview[];
  selectedProducts: ProductPreview[];
  error?: string;
}

