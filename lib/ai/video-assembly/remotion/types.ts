/**
 * Remotion Composition Types
 *
 * Type definitions for Remotion video compositions.
 * These types define the props passed to Remotion components.
 */

import type { VideoAssemblyPlan, SceneAsset, TextOverlay, TransitionConfig } from "../types";

/**
 * Props for the main video composition
 */
export interface VideoCompositionProps {
  plan: VideoAssemblyPlan;
}

/**
 * Props for individual scene components
 */
export interface SceneProps {
  asset: SceneAsset;
  /** Current frame number (absolute) */
  currentFrame: number;
  /** Frame when this scene starts */
  startFrame: number;
  /** Frame when this scene ends */
  endFrame: number;
  /** FPS of the video */
  fps: number;
  /** Whether scene is in transition out */
  isTransitioningOut: boolean;
  /** Transition progress (0-1) when transitioning */
  transitionProgress: number;
}

/**
 * Props for text overlay components
 */
export interface TextOverlayProps {
  overlay: TextOverlay;
  /** Current frame relative to overlay start */
  frame: number;
  /** Total frames for this overlay */
  totalFrames: number;
  /** FPS of the video */
  fps: number;
}

/**
 * Calculate frame timing for a scene
 */
export interface SceneTiming {
  sceneIndex: number;
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  transitionInStartFrame: number;
  transitionInEndFrame: number;
  transitionOutStartFrame: number;
  transitionOutEndFrame: number;
  hasTransitionIn: boolean;
  hasTransitionOut: boolean;
}

/**
 * Calculate all scene timings from a plan
 */
export function calculateSceneTimings(plan: VideoAssemblyPlan): SceneTiming[] {
  const timings: SceneTiming[] = [];
  let currentFrame = 0;

  for (let i = 0; i < plan.scenes.length; i++) {
    const scene = plan.scenes[i];
    const prevScene = i > 0 ? plan.scenes[i - 1] : null;

    const durationFrames = Math.ceil(scene.displayDuration * plan.fps);

    // Transition in from previous scene
    const transitionInFrames = prevScene?.transitionToNext
      ? Math.ceil(prevScene.transitionToNext.duration * plan.fps)
      : 0;

    // Transition out to next scene
    const transitionOutFrames = scene.transitionToNext
      ? Math.ceil(scene.transitionToNext.duration * plan.fps)
      : 0;

    const startFrame = currentFrame;
    const endFrame = startFrame + durationFrames;

    const timing: SceneTiming = {
      sceneIndex: i,
      startFrame,
      endFrame,
      durationFrames,
      transitionInStartFrame: startFrame,
      transitionInEndFrame: startFrame + transitionInFrames,
      transitionOutStartFrame: endFrame - transitionOutFrames,
      transitionOutEndFrame: endFrame,
      hasTransitionIn: transitionInFrames > 0,
      hasTransitionOut: transitionOutFrames > 0,
    };

    timings.push(timing);

    // Next scene starts where transition out begins (overlap)
    currentFrame = timing.transitionOutStartFrame;
  }

  return timings;
}

/**
 * Get the total duration in frames
 */
export function getTotalFrames(plan: VideoAssemblyPlan): number {
  const timings = calculateSceneTimings(plan);
  if (timings.length === 0) return 0;
  return timings[timings.length - 1].endFrame;
}

/**
 * Find which scenes are visible at a given frame
 */
export function getVisibleScenes(
  frame: number,
  timings: SceneTiming[]
): { timing: SceneTiming; opacity: number }[] {
  const visible: { timing: SceneTiming; opacity: number }[] = [];

  for (const timing of timings) {
    if (frame >= timing.startFrame && frame < timing.endFrame) {
      let opacity = 1;

      // Calculate transition in opacity
      if (timing.hasTransitionIn && frame < timing.transitionInEndFrame) {
        const progress = (frame - timing.transitionInStartFrame) /
          (timing.transitionInEndFrame - timing.transitionInStartFrame);
        opacity = Math.min(opacity, progress);
      }

      // Calculate transition out opacity
      if (timing.hasTransitionOut && frame >= timing.transitionOutStartFrame) {
        const progress = (frame - timing.transitionOutStartFrame) /
          (timing.transitionOutEndFrame - timing.transitionOutStartFrame);
        opacity = Math.min(opacity, 1 - progress);
      }

      visible.push({ timing, opacity: Math.max(0, Math.min(1, opacity)) });
    }
  }

  return visible;
}

