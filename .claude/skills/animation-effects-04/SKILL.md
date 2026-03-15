---
name: animation-effects
description: Creates polished CSS and JavaScript animations — transitions, keyframes, scroll-triggered animations, micro-interactions, page transitions, loading states. Use whenever the user mentions animations, transitions, motion, hover effects, scroll effects, loading spinners, or wants to add movement to their UI.
disable-model-invocation: false
user-invocable: true
---

# Animation Effects — Motion Design for the Web

Add purposeful motion to interfaces. Every animation should serve UX — never animate just because you can.

## Principles

1. **Purpose** — Animation should guide attention, provide feedback, or show relationships
2. **Performance** — Only animate `transform` and `opacity` (GPU-accelerated). Never animate `width`, `height`, `top`, `left`, `margin`
3. **Duration** — Micro-interactions: 150-300ms. Page transitions: 300-500ms. Complex sequences: 500-1000ms
4. **Easing** — Use `cubic-bezier()` for personality. Avoid plain `linear` or `ease`

## Easing Library

```css
:root {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-bounce: cubic-bezier(0.34, 1.4, 0.64, 1);
}
```

## Patterns

### Hover Lift
```css
.card {
  transition: transform 250ms var(--ease-out-expo), box-shadow 250ms var(--ease-out-expo);
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}
```

### Staggered Entrance
```css
.item { animation: fadeSlideIn 500ms var(--ease-out-expo) both; }
.item:nth-child(1) { animation-delay: 0ms; }
.item:nth-child(2) { animation-delay: 75ms; }
.item:nth-child(3) { animation-delay: 150ms; }

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### Scroll-Triggered (Intersection Observer)
```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
```

### Loading Skeleton
```css
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

## Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

ALWAYS include reduced motion support. This is non-negotiable.

## Skills & Tools Referenced

- **frontend-design** (Anthropic Official Skill)
- **Intersection Observer API** (native browser API)
- **CSS Animations / Transitions** (native CSS)
- **Web Animations API** (native browser API)
