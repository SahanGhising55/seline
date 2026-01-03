"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMagnetic, useReducedMotion } from "@/lib/animations/hooks";
import { animate } from "animejs";
import { ZLUTTY_EASINGS, ZLUTTY_DURATIONS, ZLUTTY_VALUES } from "@/lib/animations/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

interface AnimatedButtonProps extends ButtonProps {
  /** Enable magnetic cursor effect */
  magnetic?: boolean;
  /** Magnetic effect strength (0-1) */
  magneticStrength?: number;
}

/**
	 * AnimatedButton - Button with Styly Agents-style press and magnetic effects
	 */
export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ children, className, magnetic = false, magneticStrength = 0.2, ...props }, forwardedRef) => {
    const prefersReducedMotion = useReducedMotion();
    const { ref: magneticRef, onMouseMove, onMouseLeave: magneticLeave } = useMagnetic(magneticStrength);

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (prefersReducedMotion) return;
      const target = e.currentTarget;
      animate(target, {
        scale: ZLUTTY_VALUES.scalePress,
        duration: ZLUTTY_DURATIONS.instant,
        ease: ZLUTTY_EASINGS.snap,
      });
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (prefersReducedMotion) return;
      const target = e.currentTarget;
      animate(target, {
        scale: 1,
        duration: ZLUTTY_DURATIONS.fast,
        ease: ZLUTTY_EASINGS.pop,
      });
    };

    const combinedRef = (node: HTMLButtonElement) => {
      if (magnetic && magneticRef) {
        (magneticRef as React.MutableRefObject<HTMLDivElement | null>).current = node as unknown as HTMLDivElement;
      }
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    };

    return (
      <Button
        ref={combinedRef}
        className={cn("transform-gpu will-change-transform", className)}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={(e) => {
          handleMouseUp(e);
          if (magnetic) magneticLeave();
        }}
        onMouseMove={magnetic ? (e) => onMouseMove(e as React.MouseEvent) : undefined}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

