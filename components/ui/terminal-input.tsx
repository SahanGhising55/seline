"use client";

import { forwardRef, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TerminalInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "onSubmit"> {
  /** The prompt symbol (default: ">") */
  prompt?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
  /** Callback when Enter is pressed */
  onSubmit?: (value: string) => void;
  /** Whether to show the blinking cursor */
  showCursor?: boolean;
  /** Whether the input is in focus mode */
  autoFocusOnMount?: boolean;
  /** CSS class for the container */
  containerClassName?: string;
}

export const TerminalInput = forwardRef<HTMLInputElement, TerminalInputProps>(
  (
    {
      prompt = ">",
      onChange,
      onSubmit,
      showCursor = true,
      autoFocusOnMount = true,
      className,
      containerClassName,
      value: controlledValue,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useState(
      (controlledValue as string) ?? ""
    );
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const combinedRef = (ref as React.RefObject<HTMLInputElement>) || inputRef;

    // Sync with controlled value
    useEffect(() => {
      if (controlledValue !== undefined) {
        setValue(controlledValue as string);
      }
    }, [controlledValue]);

    // Auto-focus on mount
    useEffect(() => {
      if (autoFocusOnMount && combinedRef.current) {
        combinedRef.current.focus();
      }
    }, [autoFocusOnMount, combinedRef]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      onChange?.(newValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && value.trim()) {
        onSubmit?.(value);
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "flex items-center gap-2 font-mono",
          containerClassName
        )}
        onClick={() => combinedRef.current?.focus()}
      >
        <span className="text-terminal-green shrink-0">{prompt}</span>
        <div className="relative flex-1">
          <input
            ref={combinedRef}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              "w-full bg-transparent text-terminal-text caret-transparent",
              "outline-none border-none focus:ring-0",
              "placeholder:text-terminal-muted",
              className
            )}
            {...props}
          />
          {/* Custom blinking cursor */}
          {showCursor && isFocused && (
            <span
              className="absolute top-0 h-full animate-blink pointer-events-none text-terminal-green"
              style={{
                left: `${value.length}ch`,
              }}
            >
              ▋
            </span>
          )}
        </div>
      </motion.div>
    );
  }
);

TerminalInput.displayName = "TerminalInput";

interface TerminalTextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "onSubmit"> {
  /** The prompt symbol */
  prompt?: string;
  /** Callback when value changes */
  onChange?: (value: string) => void;
  /** Callback when submitted (Cmd/Ctrl + Enter) */
  onSubmit?: (value: string) => void;
  /** CSS class for the container */
  containerClassName?: string;
}

export const TerminalTextArea = forwardRef<
  HTMLTextAreaElement,
  TerminalTextAreaProps
>(
  (
    {
      prompt = ">",
      onChange,
      onSubmit,
      className,
      containerClassName,
      value: controlledValue,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = useState((controlledValue as string) ?? "");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync with controlled value
    useEffect(() => {
      if (controlledValue !== undefined) {
        setValue(controlledValue as string);
      }
    }, [controlledValue]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      onChange?.(newValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && value.trim()) {
        onSubmit?.(value);
      }
    };

    return (
      <div className={cn("font-mono", containerClassName)}>
        <div className="flex items-start gap-2">
          <span className="text-terminal-green shrink-0 pt-0.5">{prompt}</span>
          <textarea
            ref={ref || textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={cn(
              "w-full bg-transparent text-terminal-text resize-none",
              "outline-none border-none focus:ring-0",
              "placeholder:text-terminal-muted min-h-[100px]",
              className
            )}
            {...props}
          />
        </div>
      </div>
    );
  }
);

TerminalTextArea.displayName = "TerminalTextArea";

