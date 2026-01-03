/**
 * Text Overlay Component
 *
 * Renders animated text overlays with various styles and animations.
 */

import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { TextOverlay as TextOverlayType } from "../types";

export interface TextOverlayComponentProps {
  overlay: TextOverlayType;
  startFrame: number;
  durationFrames: number;
}

/**
 * Get position styles based on overlay position
 */
function getPositionStyles(
  position: TextOverlayType["position"]
): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px",
  };

  switch (position) {
    case "top":
      return { ...base, alignItems: "flex-start", paddingTop: "80px" };
    case "bottom":
      return { ...base, alignItems: "flex-end", paddingBottom: "80px" };
    case "center":
    default:
      return base;
  }
}

/**
 * Get text styles based on overlay style
 */
function getTextStyles(style: TextOverlayType["style"]): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    textAlign: "center",
    color: "white",
    textShadow: "2px 2px 8px rgba(0, 0, 0, 0.8)",
    maxWidth: "80%",
    wordWrap: "break-word",
  };

  switch (style) {
    case "title":
      return {
        ...base,
        fontSize: "72px",
        fontWeight: 700,
        letterSpacing: "-1px",
      };
    case "subtitle":
      return {
        ...base,
        fontSize: "48px",
        fontWeight: 500,
      };
    case "caption":
      return {
        ...base,
        fontSize: "32px",
        fontWeight: 400,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        padding: "16px 32px",
        borderRadius: "8px",
      };
    case "streaming":
      return {
        ...base,
        fontSize: "36px",
        fontWeight: 400,
        fontFamily: "'Courier New', monospace",
      };
    default:
      return base;
  }
}

/**
 * TextOverlay component with animations
 */
export const TextOverlayComponent: React.FC<TextOverlayComponentProps> = ({
  overlay,
  startFrame,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;

  // Animation parameters
  const fadeInDuration = Math.min(15, durationFrames * 0.2);
  const fadeOutDuration = Math.min(15, durationFrames * 0.2);
  const fadeOutStart = durationFrames - fadeOutDuration;

  // Calculate opacity based on animation type
  let opacity = 1;
  let transform = "";
  let displayText = overlay.text;

  switch (overlay.animationType) {
    case "fade":
      opacity = interpolate(
        relativeFrame,
        [0, fadeInDuration, fadeOutStart, durationFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      break;

    case "slide":
      opacity = interpolate(
        relativeFrame,
        [0, fadeInDuration, fadeOutStart, durationFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      const slideY = interpolate(
        relativeFrame,
        [0, fadeInDuration],
        [30, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      transform = `translateY(${slideY}px)`;
      break;

    case "typewriter":
      const charsToShow = Math.floor(
        interpolate(relativeFrame, [0, durationFrames * 0.7], [0, overlay.text.length], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      );
      displayText = overlay.text.substring(0, charsToShow);
      opacity = interpolate(
        relativeFrame,
        [fadeOutStart, durationFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
      break;

    default:
      // Default fade
      opacity = interpolate(
        relativeFrame,
        [0, fadeInDuration, fadeOutStart, durationFrames],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );
  }

  const positionStyles = getPositionStyles(overlay.position);
  const textStyles = getTextStyles(overlay.style);

  return (
    <AbsoluteFill style={{ ...positionStyles, opacity }}>
      <div style={{ ...textStyles, transform }}>{displayText}</div>
    </AbsoluteFill>
  );
};

export default TextOverlayComponent;

