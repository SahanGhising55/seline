/**
 * Remotion Entry Point
 *
 * This file registers the video composition with Remotion.
 * It's used as the entry point for bundling and rendering.
 */

import React from "react";
import { Composition, registerRoot } from "remotion";
import { VideoComposition, type VideoCompositionProps } from "./VideoComposition";
import { getTotalFrames } from "./types";
import type { VideoAssemblyPlan } from "../types";

// Default props for the Studio preview
const defaultPlan: VideoAssemblyPlan = {
  concept: "Preview",
  narrative: "A preview video",
  scenes: [],
  totalDuration: 5,
  outputWidth: 1920,
  outputHeight: 1080,
  fps: 30,
};

/**
 * Calculate composition props from the plan
 */
export function getCompositionProps(plan: VideoAssemblyPlan) {
  const totalFrames = getTotalFrames(plan);
  
  return {
    id: "VideoAssembly",
    component: VideoComposition,
    durationInFrames: Math.max(totalFrames, 1),
    fps: plan.fps,
    width: plan.outputWidth,
    height: plan.outputHeight,
    defaultProps: { plan } as VideoCompositionProps,
  };
}

/**
 * Root component for Remotion
 *
 * This registers all available compositions.
 * The VideoAssembly composition is the main one used for rendering.
 */
export const RemotionRoot: React.FC = () => {
  // Register the main composition with default props
  // Actual props will be passed during rendering
  // Use type assertion to satisfy Remotion's strict typing
  const TypedComposition = Composition as React.FC<{
    id: string;
    component: React.FC<VideoCompositionProps>;
    durationInFrames: number;
    fps: number;
    width: number;
    height: number;
    defaultProps: VideoCompositionProps;
  }>;

  return (
    <>
      <TypedComposition
        id="VideoAssembly"
        component={VideoComposition}
        durationInFrames={150} // 5 seconds at 30fps default
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ plan: defaultPlan }}
      />
    </>
  );
};

// Register the root component with Remotion
// This is required for Remotion to recognize this file as the entry point
registerRoot(RemotionRoot);

// Export components for external use
export { VideoComposition } from "./VideoComposition";
export { Scene } from "./Scene";
export { TextOverlayComponent } from "./TextOverlay";
export { TransitionWrapper } from "./Transition";
export * from "./types";

