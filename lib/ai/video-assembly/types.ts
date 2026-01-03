/**
 * Video Assembly Types
 *
 * Type definitions for the AI-driven video assembly tool.
 * Follows the Deep Research pattern for multi-phase orchestration with SSE streaming.
 */

// ============================================================================
// Asset Types
// ============================================================================

export interface MediaAsset {
  id: string;
  type: "image" | "video";
  url: string;
  localPath: string;
  width?: number;
  height?: number;
  format?: string;
  duration?: number; // For videos, in seconds
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface SceneAsset extends MediaAsset {
  /** Scene index in the final video (0-based) */
  sceneIndex: number;
  /** Duration this asset should be displayed (seconds) */
  displayDuration: number;
  /** Text overlay for this scene */
  textOverlay?: TextOverlay;
  /** Transition to next scene */
  transitionToNext?: TransitionConfig;
  /** Ken Burns zoom/pan effect configuration (LLM-controlled) */
  kenBurnsEffect?: KenBurnsConfig;
}

export interface TextOverlay {
  text: string;
  position: "top" | "center" | "bottom";
  style: "title" | "subtitle" | "caption" | "streaming";
  animationType?: "fade" | "typewriter" | "slide";
  startTime?: number; // Relative to scene start
  duration?: number;
}

export interface TransitionConfig {
  type: "fade" | "crossfade" | "slide" | "wipe" | "zoom" | "none";
  duration: number; // In seconds
  direction?: "left" | "right" | "up" | "down";
}

/**
 * Ken Burns effect configuration for subtle zoom/pan animations on images.
 * LLM generates these parameters based on user instructions about zoom behavior.
 */
export interface KenBurnsConfig {
  /** Whether to apply the Ken Burns effect (default: true for images) */
  enabled: boolean;
  /** Zoom direction: "in" zooms from 1.0 to endScale, "out" zooms from endScale to 1.0 */
  direction: "in" | "out";
  /** End scale factor (1.0 = no zoom, 1.5 = 50% larger). Range: 1.0 - 2.0 */
  endScale: number;
  /** Focal point for the zoom - where the camera focuses */
  focalPoint: {
    /** Horizontal position: 0.0 = left edge, 0.5 = center, 1.0 = right edge */
    x: number;
    /** Vertical position: 0.0 = top edge, 0.5 = center, 1.0 = bottom edge */
    y: number;
  };
  /** Easing style for the animation */
  easing: "linear" | "ease-in" | "ease-out" | "ease-in-out";
}

// ============================================================================
// Video Assembly State Types
// ============================================================================

export interface VideoAssemblyPlan {
  /** Original user concept/theme */
  concept: string;
  /** AI-refined narrative structure */
  narrative: string;
  /** Ordered list of scenes with timing */
  scenes: SceneAsset[];
  /** Total video duration in seconds */
  totalDuration: number;
  /** Output dimensions */
  outputWidth: number;
  outputHeight: number;
  /** Frames per second */
  fps: number;
}

export interface VideoAssemblyState {
  // Input
  sessionId: string;
  concept: string;
  assetIds?: string[];
  /** Complete input object for reference during workflow */
  input: VideoAssemblyInput;

  // Analysis phase
  availableAssets: MediaAsset[];

  // Planning phase
  plan?: VideoAssemblyPlan;

  // Rendering phase
  renderProgress: number; // 0-100
  renderedFrames: number;
  totalFrames: number;

  // Output
  outputUrl?: string;
  outputLocalPath?: string;

  // Workflow state
  currentPhase: VideoAssemblyPhase;
  error?: string;
}

export type VideoAssemblyPhase =
  | "idle"
  | "analyzing"
  | "planning"
  | "composing"
  | "rendering"
  | "delivering"
  | "complete"
  | "error";

// ============================================================================
// Streaming Event Types
// ============================================================================

export type VideoAssemblyEventType =
  | "phase_change"
  | "assets_analyzed"
  | "plan_created"
  | "render_progress"
  | "video_complete"
  | "error"
  | "complete";

export interface BaseVideoAssemblyEvent {
  type: VideoAssemblyEventType;
  timestamp: Date;
}

export interface PhaseChangeEvent extends BaseVideoAssemblyEvent {
  type: "phase_change";
  phase: VideoAssemblyPhase;
  message: string;
}

export interface AssetsAnalyzedEvent extends BaseVideoAssemblyEvent {
  type: "assets_analyzed";
  assetCount: number;
  assets: MediaAsset[];
}

export interface PlanCreatedEvent extends BaseVideoAssemblyEvent {
  type: "plan_created";
  plan: VideoAssemblyPlan;
}

export interface RenderProgressEvent extends BaseVideoAssemblyEvent {
  type: "render_progress";
  progress: number; // 0-100
  renderedFrames: number;
  totalFrames: number;
  estimatedTimeRemaining?: number; // seconds
}

export interface VideoCompleteEvent extends BaseVideoAssemblyEvent {
  type: "video_complete";
  videoUrl: string;
  duration: number;
  width: number;
  height: number;
}

export interface ErrorEvent extends BaseVideoAssemblyEvent {
  type: "error";
  error: string;
  phase: VideoAssemblyPhase;
}

export interface CompleteEvent extends BaseVideoAssemblyEvent {
  type: "complete";
  state: VideoAssemblyState;
}

export type VideoAssemblyEvent =
  | PhaseChangeEvent
  | AssetsAnalyzedEvent
  | PlanCreatedEvent
  | RenderProgressEvent
  | VideoCompleteEvent
  | ErrorEvent
  | CompleteEvent;

// ============================================================================
// Configuration Types
// ============================================================================

export interface VideoAssemblyConfig {
  /** Target video duration in seconds (auto-calculated if not provided) */
  targetDuration?: number;
  /** Output width (default: 1920) */
  outputWidth: number;
  /** Output height (default: 1080) */
  outputHeight: number;
  /** Frames per second (default: 30) */
  fps: number;
  /** Default scene duration in seconds (default: 3) */
  defaultSceneDuration: number;
  /** Default transition type */
  defaultTransition: TransitionConfig["type"];
  /** Default transition duration in seconds */
  defaultTransitionDuration: number;
  /** Video codec (default: h264) */
  codec: "h264" | "h265" | "vp8" | "vp9";
  /** Output format */
  outputFormat: "mp4" | "webm";
}

export const DEFAULT_VIDEO_ASSEMBLY_CONFIG: VideoAssemblyConfig = {
  outputWidth: 1920,
  outputHeight: 1080,
  fps: 30,
  defaultSceneDuration: 3,
  defaultTransition: "crossfade",
  defaultTransitionDuration: 0.5,
  codec: "h264",
  outputFormat: "mp4",
};

// ============================================================================
// Tool Input Types
// ============================================================================

export interface VideoAssemblyInput {
  /** Video concept/theme description */
  concept?: string;
  /** Theme for the video (used to derive concept if concept not provided) */
  theme?: string;
  /** Visual style preference */
  style?: string;
  /** Optional specific asset IDs to include (if not provided, uses all session assets) */
  assetIds?: string[];
  /** Optional text overlays for specific scenes */
  textOverlays?: Array<{
    sceneIndex: number;
    text: string;
    position?: TextOverlay["position"];
    style?: TextOverlay["style"];
  }>;
  /** Desired total duration in seconds */
  targetDuration?: number;
  /** Transition style preference */
  transitionStyle?: TransitionConfig["type"];
  /** Output dimensions */
  outputWidth?: number;
  outputHeight?: number;
  /** Whether to include AI-generated text overlays */
  includeTextOverlays?: boolean;
  /** Additional user instructions for AI planning */
  userInstructions?: string;
  /** Call-to-action overlay for the final scene */
  ctaOverlay?: {
    text: string;
    position?: "top" | "center" | "bottom";
    style?: "title" | "subtitle" | "caption" | "streaming";
    duration?: number;
  };
}

