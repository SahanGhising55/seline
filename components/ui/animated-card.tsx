"use client";

import { forwardRef, type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useCardHover, useAmbientCard } from "@/lib/animations/hooks";

interface AnimatedCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Enable ambient floating animation */
  ambient?: boolean;
  /** Enable hover lift effect */
  hoverLift?: boolean;
  /** Custom className */
  className?: string;
  /** Float distance for ambient animation */
  floatDistance?: number;
}

/**
	 * AnimatedCard - A card with Styly Agents-style animations
	 * Use for agent cards, session cards, and interactive elements
	 */
export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  (
    {
      children,
      ambient = false,
      hoverLift = true,
      className,
      floatDistance = 4,
      ...props
    },
    forwardedRef
  ) => {
    const ambientRef = useAmbientCard({ enabled: ambient, floatDistance });
    const { ref: hoverRef, onMouseEnter, onMouseLeave } = useCardHover();

    // Combine refs if needed
    const combinedRef = (node: HTMLDivElement) => {
      if (ambient && ambientRef) {
        (ambientRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
      if (hoverLift && hoverRef) {
        hoverRef.current = node;
      }
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    };

    return (
      <div
        ref={combinedRef}
        className={cn(
          "rounded-lg border bg-card text-card-foreground",
          "transform-gpu will-change-transform",
          className
        )}
        onMouseEnter={hoverLift ? onMouseEnter : undefined}
        onMouseLeave={hoverLift ? onMouseLeave : undefined}
        style={{ perspective: "1000px" }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

AnimatedCard.displayName = "AnimatedCard";

