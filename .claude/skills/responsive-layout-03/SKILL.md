---
name: responsive-layout
description: Creates responsive layouts using modern CSS (Grid, Flexbox, Container Queries, clamp()). Use whenever the user mentions responsive design, mobile-first, breakpoints, layout, grid systems, or needs a page to work across screen sizes.
disable-model-invocation: false
user-invocable: true
---

# Responsive Layout — Modern CSS Layout Systems

Build layouts that work beautifully across all screen sizes using modern CSS.

## Approach: Mobile-First

Always start with the smallest screen and add complexity upward.

## Breakpoint System

```css
/* Mobile first — no media query needed for base styles */
/* Tablet */  @media (min-width: 768px) { }
/* Desktop */ @media (min-width: 1024px) { }
/* Wide */    @media (min-width: 1440px) { }
```

## Layout Patterns

### 1. Fluid Grid
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: clamp(1rem, 3vw, 2rem);
}
```

### 2. Sidebar Layout
```css
.sidebar-layout {
  display: grid;
  grid-template-columns: 1fr;
}
@media (min-width: 768px) {
  .sidebar-layout {
    grid-template-columns: minmax(200px, 280px) 1fr;
  }
}
```

### 3. Content Width Container
```css
.container {
  width: min(90%, 1200px);
  margin-inline: auto;
  padding-inline: clamp(1rem, 5vw, 3rem);
}
```

### 4. Stack Layout (Vertical Spacing)
```css
.stack > * + * {
  margin-block-start: var(--space, 1.5rem);
}
```

### 5. Cluster (Horizontal Wrapping)
```css
.cluster {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space, 1rem);
  align-items: center;
}
```

## Rules

- Use `clamp()` for fluid typography: `font-size: clamp(1rem, 0.5rem + 1.5vw, 1.5rem)`
- Use `min()` for max-width containers: `width: min(90%, 1200px)`
- Prefer `gap` over margins for spacing between siblings
- Use Container Queries (`@container`) for component-level responsiveness
- Use `aspect-ratio` for media elements
- Test at 320px, 768px, 1024px, 1440px widths
- Never use `px` for font sizes — use `rem` or `clamp()`
- Use logical properties (`margin-inline`, `padding-block`) for internationalization

## Container Queries

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}
@container card (min-width: 400px) {
  .card { flex-direction: row; }
}
```

## Skills & Tools Referenced

- **frontend-design** (Anthropic Official Skill)
- **react-nextjs-performance** (Vercel Labs — rendering patterns)
- **CSS Grid / Flexbox / Container Queries** (native CSS)
