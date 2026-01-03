/**
 * Transition Components
 *
 * Various transition effects between scenes.
 */

import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import type { TransitionConfig } from "../types";

export interface TransitionComponentProps {
  transition: TransitionConfig;
  /** Progress of the transition (0-1) */
  progress: number;
  children: React.ReactNode;
  /** Whether this is the outgoing (from) or incoming (to) scene */
  direction: "from" | "to";
}

/**
 * Apply transition effect to a scene
 */
export const TransitionWrapper: React.FC<TransitionComponentProps> = ({
  transition,
  progress,
  children,
  direction,
}) => {
  const { type } = transition;

  // Calculate opacity and transform based on transition type and direction
  let opacity = 1;
  let transform = "";

  switch (type) {
    case "fade":
      opacity = direction === "from" ? 1 - progress : progress;
      break;

    case "crossfade":
      // Crossfade: both scenes visible during transition
      opacity = direction === "from" ? 1 - progress : progress;
      break;

    case "slide":
      opacity = 1;
      const slideDistance = 100; // percentage
      const slideDir = transition.direction || "left";
      
      if (direction === "from") {
        // Outgoing scene slides out
        switch (slideDir) {
          case "left":
            transform = `translateX(${-progress * slideDistance}%)`;
            break;
          case "right":
            transform = `translateX(${progress * slideDistance}%)`;
            break;
          case "up":
            transform = `translateY(${-progress * slideDistance}%)`;
            break;
          case "down":
            transform = `translateY(${progress * slideDistance}%)`;
            break;
        }
      } else {
        // Incoming scene slides in from opposite direction
        switch (slideDir) {
          case "left":
            transform = `translateX(${(1 - progress) * slideDistance}%)`;
            break;
          case "right":
            transform = `translateX(${-(1 - progress) * slideDistance}%)`;
            break;
          case "up":
            transform = `translateY(${(1 - progress) * slideDistance}%)`;
            break;
          case "down":
            transform = `translateY(${-(1 - progress) * slideDistance}%)`;
            break;
        }
      }
      break;

    case "wipe":
      // Wipe transition using clip-path
      opacity = 1;
      const wipeDir = transition.direction || "left";
      if (direction === "from") {
        // Outgoing scene gets clipped
        switch (wipeDir) {
          case "left":
            transform = `clipPath: inset(0 ${progress * 100}% 0 0)`;
            break;
          case "right":
            transform = `clipPath: inset(0 0 0 ${progress * 100}%)`;
            break;
          case "up":
            transform = `clipPath: inset(0 0 ${progress * 100}% 0)`;
            break;
          case "down":
            transform = `clipPath: inset(${progress * 100}% 0 0 0)`;
            break;
        }
      }
      break;

    case "zoom":
      if (direction === "from") {
        const scale = interpolate(progress, [0, 1], [1, 1.2]);
        opacity = 1 - progress;
        transform = `scale(${scale})`;
      } else {
        const scale = interpolate(progress, [0, 1], [0.8, 1]);
        opacity = progress;
        transform = `scale(${scale})`;
      }
      break;

    case "none":
    default:
      // No transition effect
      opacity = direction === "from" ? (progress < 1 ? 1 : 0) : (progress > 0 ? 1 : 0);
      break;
  }

  const style: React.CSSProperties = {
    opacity,
    transform: transform || undefined,
    width: "100%",
    height: "100%",
  };

  // Handle wipe transition with clip-path
  if (type === "wipe" && direction === "from") {
    const wipeDir = transition.direction || "left";
    switch (wipeDir) {
      case "left":
        style.clipPath = `inset(0 ${progress * 100}% 0 0)`;
        break;
      case "right":
        style.clipPath = `inset(0 0 0 ${progress * 100}%)`;
        break;
      case "up":
        style.clipPath = `inset(0 0 ${progress * 100}% 0)`;
        break;
      case "down":
        style.clipPath = `inset(${progress * 100}% 0 0 0)`;
        break;
    }
  }

  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

export default TransitionWrapper;

