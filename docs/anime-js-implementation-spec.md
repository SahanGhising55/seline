# Anime.js Implementation Specification

## Terminal Wizard Character Creation Flow

**Version:** 1.0  
**Date:** 2024-11-29  
**Anime.js Version:** 4.0.0  
**Framer Motion Version:** 12.23.24

---

## 1. Overview

This document outlines the implementation strategy for using Anime.js v4.0.0 alongside Framer Motion in the new cinematic terminal character creation wizard.

### 1.1 Anime.js v4.0.0 Key Features

| Feature | Description | Use Case |
|---------|-------------|----------|
| `animate()` | Core animation function | Typewriter effects, progress bars, 3D rotations |
| `createTimeline()` | Sequence multiple animations | Page entrance choreography |
| `createScope()` | React integration with cleanup | Scoped animations in components |
| `stagger()` | Sequential effects across targets | Character-by-character text reveal |
| `spring()` | Physics-based easing | Bouncy computer graphic animations |
| WAAPI mode | Hardware-accelerated (3KB) | GPU-optimized transforms |

### 1.2 Import Structure

```typescript
import { 
  animate, 
  createTimeline, 
  createScope, 
  stagger, 
  spring 
} from 'animejs';
```

---

## 2. Anime.js vs Framer Motion: When to Use Each

### Use Anime.js For:

| Animation Type | Reason |
|----------------|--------|
| **Typewriter text effects** | Fine-grained character control with `stagger()` |
| **3D CSS transforms** | Direct DOM manipulation for `rotateX`, `rotateY`, `translateZ` |
| **Progress bar animations** | Precise timing control with `onUpdate` callbacks |
| **ASCII loading animations** | Sequential character reveals |
| **Complex choreographed sequences** | `createTimeline()` for multi-step animations |

### Use Framer Motion For:

| Animation Type | Reason |
|----------------|--------|
| **Page transitions** | `AnimatePresence` handles mount/unmount |
| **React component state** | Declarative `animate` prop integration |
| **Layout animations** | `layout` prop for smooth repositioning |
| **Gesture interactions** | Built-in `whileHover`, `whileTap` |
| **Exit animations** | `exit` prop with `AnimatePresence` |

### Hybrid Approach (Recommended)

```tsx
// Framer Motion: Page-level transitions
<AnimatePresence mode="wait">
  <motion.div
    key={currentPage}
    initial={{ opacity: 0, x: 100 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -100 }}
  >
    {/* Anime.js: Internal element animations */}
    <TypewriterText text="Enter your character name..." />
  </motion.div>
</AnimatePresence>
```

---

## 3. React Integration Pattern

### 3.1 useAnimeScope Hook

```typescript
import { useEffect, useRef } from 'react';
import { createScope, Scope } from 'animejs';

export function useAnimeScope() {
  const root = useRef<HTMLDivElement>(null);
  const scope = useRef<Scope | null>(null);

  useEffect(() => {
    if (!root.current) return;
    
    scope.current = createScope({ root });
    
    return () => {
      scope.current?.revert(); // Cleanup all animations
    };
  }, []);

  return { root, scope };
}
```

### 3.2 Component Usage

```tsx
function TerminalPage() {
  const { root, scope } = useAnimeScope();

  useEffect(() => {
    if (!scope.current) return;
    
    scope.current.add(() => {
      animate('.terminal-text', {
        opacity: [0, 1],
        translateY: [20, 0],
        delay: stagger(50),
        duration: 600,
        ease: 'out(3)',
      });
    });
  }, []);

  return <div ref={root}>{/* content */}</div>;
}
```

---

## 4. Code Examples

### 4.1 Typewriter Effect

```typescript
import { animate, stagger } from 'animejs';

function typewriterEffect(element: HTMLElement, text: string) {
  // Split text into spans
  element.innerHTML = text
    .split('')
    .map(char => `<span class="char">${char === ' ' ? '&nbsp;' : char}</span>`)
    .join('');

  return animate('.char', {
    opacity: [0, 1],
    delay: stagger(40, { start: 0 }),
    duration: 1,
    ease: 'linear',
  });
}
```

### 4.2 3D Computer Rotation

```typescript
import { animate, spring } from 'animejs';

function animateComputer(element: string) {
  return animate(element, {
    rotateY: [0, 360],
    rotateX: [-5, 5, -5],
    scale: [0.95, 1, 0.95],
    duration: 8000,
    loop: true,
    ease: 'linear',
  });
}

// Hover effect with spring physics
function hoverBounce(element: string) {
  return animate(element, {
    scale: [1, 1.05, 1],
    duration: 400,
    ease: spring({ stiffness: 300, damping: 10 }),
  });
}
```

### 4.3 Progress Bar Animation

```typescript
import { animate } from 'animejs';

function animateProgressBar(
  element: string,
  progress: number,
  onProgress?: (value: number) => void
) {
  return animate(element, {
    width: `${progress}%`,
    duration: 800,
    ease: 'out(3)',
    onUpdate: (anim) => {
      onProgress?.(Math.round(anim.progress));
    },
  });
}
```

### 4.4 Page Slide Transition (Timeline)

```typescript
import { createTimeline, stagger } from 'animejs';

function pageEnterAnimation(containerSelector: string) {
  const tl = createTimeline({
    autoplay: true,
    defaults: { ease: 'out(3)' },
  });

  tl.add(`${containerSelector} .computer-graphic`, {
    opacity: [0, 1],
    scale: [0.8, 1],
    rotateY: [-15, 0],
    duration: 800,
  })
  .add(`${containerSelector} .terminal-title`, {
    opacity: [0, 1],
    translateY: [30, 0],
    duration: 600,
  }, '-=400') // Overlap by 400ms
  .add(`${containerSelector} .terminal-prompt`, {
    opacity: [0, 1],
    translateX: [-20, 0],
    delay: stagger(100),
    duration: 400,
  }, '-=200');

  return tl;
}
```

### 4.5 ASCII Loading Animation

```typescript
import { animate, stagger } from 'animejs';

const ASCII_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function asciiSpinner(element: HTMLElement, onFrame: (char: string) => void) {
  let frameIndex = 0;

  return animate({
    duration: 100,
    loop: true,
    onLoop: () => {
      frameIndex = (frameIndex + 1) % ASCII_FRAMES.length;
      onFrame(ASCII_FRAMES[frameIndex]);
    },
  });
}

// Staggered dots loading
function dotsLoading(selector: string) {
  return animate(selector, {
    opacity: [0.3, 1, 0.3],
    delay: stagger(150),
    duration: 600,
    loop: true,
    ease: 'inOut(2)',
  });
}
```

---

## 5. Recommended Animation Timing

### 5.1 Duration Guidelines

| Animation Type | Duration | Easing |
|----------------|----------|--------|
| Page transitions | 500-700ms | `out(3)` or `inOut(3)` |
| Typewriter (per char) | 30-50ms | `linear` |
| Button hover | 200-300ms | `out(2)` |
| 3D rotation (continuous) | 6000-10000ms | `linear` |
| Progress bar | 600-1000ms | `out(3)` |
| Fade in/out | 300-500ms | `out(2)` |
| Spring bounce | 400-600ms | `spring({ stiffness: 300, damping: 15 })` |

### 5.2 Easing Reference

```typescript
// Smooth deceleration (most common)
ease: 'out(3)'

// Smooth acceleration + deceleration
ease: 'inOut(3)'

// Bouncy physics
ease: spring({ stiffness: 300, damping: 10, mass: 1 })

// Custom cubic bezier
ease: 'cubicBezier(0.4, 0, 0.2, 1)'

// Stepped (for ASCII effects)
ease: 'steps(10)'
```

---

## 6. Performance Best Practices

### 6.1 GPU-Accelerated Properties Only

```typescript
// ✅ GOOD - GPU accelerated
animate(element, {
  transform: 'translateX(100px)',
  opacity: 0.5,
  scale: 1.1,
  rotate: 45,
});

// ❌ BAD - Causes layout reflow
animate(element, {
  width: '200px',      // Avoid
  height: '100px',     // Avoid
  top: '50px',         // Avoid
  marginLeft: '20px',  // Avoid
});
```

### 6.2 Use WAAPI for Simple Transforms

```typescript
// For simple GPU-accelerated animations, use WAAPI mode (3KB vs 10KB)
import { wapiAnimate } from 'animejs';

wapiAnimate(element, {
  translateX: 100,
  opacity: [0, 1],
  duration: 500,
});
```

### 6.3 Cleanup Pattern

```typescript
useEffect(() => {
  const scope = createScope({ root });

  scope.add(() => {
    animate('.element', { /* ... */ });
  });

  // CRITICAL: Always cleanup to prevent memory leaks
  return () => scope.revert();
}, []);
```

### 6.4 Reduced Motion Support

```typescript
function useReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

// Usage
const prefersReduced = useReducedMotion();
const duration = prefersReduced ? 0 : 500;
```

---

## 7. Terminal Wizard Animation Choreography

### 7.1 Page Flow Timing

```
┌─────────────────────────────────────────────────────────────┐
│ INTRO PAGE                                                   │
│ ├─ 0ms:    Computer graphic fades in + rotates              │
│ ├─ 400ms:  Title typewriter starts                          │
│ ├─ 1200ms: Subtitle fades in                                │
│ └─ 1800ms: "Press Enter" prompt blinks                      │
├─────────────────────────────────────────────────────────────┤
│ NAME PAGE                                                    │
│ ├─ 0ms:    Page slides in from right                        │
│ ├─ 300ms:  Prompt typewriter: "Enter name..."               │
│ ├─ 800ms:  Input field appears with cursor blink            │
│ └─ User types → instant character echo                      │
├─────────────────────────────────────────────────────────────┤
│ LOADING PAGE                                                 │
│ ├─ 0ms:    ASCII spinner starts                             │
│ ├─ 0ms:    Progress bar begins (0% → 100%)                  │
│ ├─ 500ms:  Status text updates staggered                    │
│ └─ 3000ms: Complete → auto-advance                          │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Continuous Animations

```typescript
// Computer graphic: Subtle continuous rotation
const computerAnimation = animate('.computer-graphic', {
  rotateY: [0, 360],
  duration: 20000,
  loop: true,
  ease: 'linear',
});

// Cursor blink
const cursorBlink = animate('.cursor', {
  opacity: [1, 0],
  duration: 530,
  loop: true,
  ease: 'steps(1)',
});

// Scanline effect
const scanline = animate('.scanline', {
  translateY: ['0%', '100%'],
  duration: 8000,
  loop: true,
  ease: 'linear',
});
```

---

## 8. File Structure

```
components/
├── character-creation/
│   ├── terminal-wizard.tsx          # Main wizard container
│   ├── computer-graphic.tsx         # 3D computer with Anime.js
│   ├── hooks/
│   │   ├── use-anime-scope.ts       # React integration hook
│   │   └── use-reduced-motion.ts    # Accessibility hook
│   └── terminal-pages/
│       ├── intro-page.tsx
│       ├── name-page.tsx
│       ├── concept-page.tsx
│       ├── style-page.tsx
│       ├── loading-page.tsx
│       ├── preview-page.tsx
│       └── success-page.tsx
└── ui/
    ├── typewriter-text.tsx          # Anime.js typewriter
    ├── terminal-input.tsx           # Styled input with cursor
    └── terminal-prompt.tsx          # Command prompt styling
```

---

## 9. Installation

```bash
npm install animejs@^4.0.0
npm install @types/animejs --save-dev  # TypeScript types
```

---

## 10. Summary

| Library | Role | Bundle Size |
|---------|------|-------------|
| **Anime.js** | DOM animations, typewriter, 3D transforms | ~10KB (full) / ~3KB (WAAPI) |
| **Framer Motion** | React component transitions, gestures | Already installed |

**Key Principle:** Use Framer Motion for React component lifecycle (mount/unmount/layout), use Anime.js for fine-grained DOM animations within components.

