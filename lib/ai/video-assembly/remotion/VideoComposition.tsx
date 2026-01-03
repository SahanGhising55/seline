/**
 * Video Composition Component
 *
 * Main Remotion composition that renders the complete video
 * from a VideoAssemblyPlan.
 *
 * IMPORTANT: Each scene is wrapped in a Sequence component to ensure
 * proper frame context. Without Sequence wrapping, video assets would
 * use the global composition frame, causing videos to seek to incorrect
 * positions (e.g., frame 200 = 6.67s into a 2s video = black screen).
 *
 * TRANSITION LOGIC:
 * - Scenes overlap during transitions (next scene starts before previous ends)
 * - During crossfade: outgoing scene fades out (1->0), incoming fades in (0->1)
 * - Z-index ensures outgoing scene is on TOP during crossfade for proper blending
 * - This prevents the "dim" effect where combined opacity < 1
 */

import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from "remotion";
import type { VideoAssemblyPlan, SceneAsset } from "../types";
import { calculateSceneTimings, type SceneTiming } from "./types";
import { Scene } from "./Scene";
import { TextOverlayComponent } from "./TextOverlay";

export interface VideoCompositionProps {
  plan: VideoAssemblyPlan;
}

/**
 * Render a single scene with its text overlay.
 * This component is rendered INSIDE a Sequence, so useCurrentFrame()
 * returns the frame relative to the scene start (0-based).
 *
 * For proper crossfade transitions:
 * - Outgoing scene stays at full opacity until transition, then fades out
 * - Incoming scene fades in from 0 to 1 during transition period
 * - Both scenes are visible during overlap, creating smooth crossfade
 */
const SceneContent: React.FC<{
  asset: SceneAsset;
  durationFrames: number;
  transitionOutStartFrame: number; // Relative to scene start
  transitionOutEndFrame: number; // Relative to scene start
  hasTransitionOut: boolean;
  hasTransitionIn: boolean;
  transitionInEndFrame: number; // Relative to scene start (duration of fade-in)
  prevSceneTransition?: SceneAsset["transitionToNext"]; // Transition config from previous scene
}> = ({
  asset,
  durationFrames,
  transitionOutStartFrame,
  transitionOutEndFrame,
  hasTransitionOut,
  hasTransitionIn,
  transitionInEndFrame,
  prevSceneTransition,
}) => {
  const frame = useCurrentFrame(); // Relative to scene start (0-based)
  const { fps } = useVideoConfig();

  // Calculate opacity for smooth crossfade transitions
  // Use easing for smoother visual appearance
  let opacity = 1;

  // Transition IN: fade from 0 to 1 at the start of this scene
  // This happens when the previous scene is transitioning OUT to this scene
  if (hasTransitionIn && frame < transitionInEndFrame && transitionInEndFrame > 0) {
    opacity = interpolate(
      frame,
      [0, transitionInEndFrame],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease),
      }
    );
  }

  // Transition OUT: fade from 1 to 0 at the end of this scene
  // This happens when transitioning to the next scene
  if (hasTransitionOut && frame >= transitionOutStartFrame) {
    const transitionOutOpacity = interpolate(
      frame,
      [transitionOutStartFrame, transitionOutEndFrame],
      [1, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease),
      }
    );
    // If both transitioning in and out (shouldn't happen normally, but handle edge case)
    opacity = Math.min(opacity, transitionOutOpacity);
  }

  // Text overlay timing (relative to scene start)
  // Text should appear after any transition-in completes for better readability
  const textStartDelay = hasTransitionIn ? Math.ceil(transitionInEndFrame * 0.5) : 0;
  const overlayDurationFrames = Math.ceil(
    (asset.textOverlay?.duration || asset.displayDuration * 0.8) * fps
  );

  return (
    <>
      {/* Scene content with calculated opacity - Ken Burns is now LLM-controlled via asset.kenBurnsEffect */}
      <Scene
        asset={asset}
        startFrame={0}
        endFrame={durationFrames}
        opacity={opacity}
      />

      {/* Text overlay - starts slightly after transition-in for readability */}
      {asset.textOverlay && (
        <Sequence from={textStartDelay} durationInFrames={overlayDurationFrames}>
          <TextOverlayComponent
            overlay={asset.textOverlay}
            startFrame={0}
            durationFrames={overlayDurationFrames}
          />
        </Sequence>
      )}
    </>
  );
};

/**
 * Main Video Composition
 *
 * This component renders all scenes using Sequence components for proper
 * frame isolation. Each scene gets its own Sequence so that:
 * 1. Video/Image assets use correct relative frame timing
 * 2. Scenes overlap correctly during transitions
 * 3. Text overlays appear at correct times relative to their scene
 *
 * Z-INDEX STRATEGY:
 * During transitions, the OUTGOING scene should be on top (higher z-index)
 * because it fades OUT while the incoming scene fades IN underneath.
 * This creates a proper crossfade without the "dim" artifact.
 *
 * We reverse the z-index order: later scenes have LOWER z-index so
 * the outgoing scene is always rendered on top of the incoming scene.
 */
export const VideoComposition: React.FC<VideoCompositionProps> = ({ plan }) => {
  // Calculate timing for all scenes
  const timings = calculateSceneTimings(plan);
  const totalScenes = timings.length;

  // Background color
  const backgroundColor = "#000000";

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Render all scenes using Sequence for proper frame context */}
      {timings.map((timing) => {
        const scene = plan.scenes[timing.sceneIndex];
        const prevScene = timing.sceneIndex > 0 ? plan.scenes[timing.sceneIndex - 1] : null;

        // Calculate relative transition frames (relative to scene start)
        const transitionInFrames = timing.transitionInEndFrame - timing.transitionInStartFrame;
        const transitionOutStartRelative =
          timing.transitionOutStartFrame - timing.startFrame;
        const transitionOutEndRelative =
          timing.transitionOutEndFrame - timing.startFrame;

        // Z-index: reverse order so outgoing scenes are on top during crossfade
        // This prevents the "dim" effect where both scenes have partial opacity
        // and neither fully covers the background
        const zIndex = totalScenes - timing.sceneIndex;

        return (
          <Sequence
            key={scene.id}
            from={timing.startFrame}
            durationInFrames={timing.durationFrames}
            layout="none"
          >
            <AbsoluteFill style={{ zIndex }}>
              <SceneContent
                asset={scene}
                durationFrames={timing.durationFrames}
                transitionOutStartFrame={transitionOutStartRelative}
                transitionOutEndFrame={transitionOutEndRelative}
                hasTransitionOut={timing.hasTransitionOut}
                hasTransitionIn={timing.hasTransitionIn}
                transitionInEndFrame={transitionInFrames}
                prevSceneTransition={prevScene?.transitionToNext}
              />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export default VideoComposition;

