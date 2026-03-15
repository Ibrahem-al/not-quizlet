---
name: color-typography
description: Defines professional color systems and typography hierarchies. Use whenever the user mentions colors, color palette, typography, fonts, type scale, theming, design tokens, or brand colors. Produces CSS custom property systems for consistent design.
disable-model-invocation: false
user-invocable: true
---

# Color & Typography Systems

Build cohesive color palettes and typography hierarchies using CSS custom properties.

## Color System

### Generate a Palette from a Single Hue
Use HSL for programmatic palette generation:

```css
:root {
  --hue: 220;
  --primary-50:  hsl(var(--hue), 90%, 95%);
  --primary-100: hsl(var(--hue), 85%, 90%);
  --primary-200: hsl(var(--hue), 80%, 80%);
  --primary-300: hsl(var(--hue), 75%, 65%);
  --primary-400: hsl(var(--hue), 70%, 50%);
  --primary-500: hsl(var(--hue), 65%, 40%);
  --primary-600: hsl(var(--hue), 60%, 30%);
  --primary-700: hsl(var(--hue), 55%, 22%);
  --primary-800: hsl(var(--hue), 50%, 15%);
  --primary-900: hsl(var(--hue), 45%, 10%);
}
```

### Semantic Color Tokens
```css
:root {
  --color-text-primary: var(--neutral-900);
  --color-text-secondary: var(--neutral-600);
  --color-text-muted: var(--neutral-400);
  --color-surface: var(--neutral-50);
  --color-surface-raised: #fff;
  --color-border: var(--neutral-200);
  --color-border-focus: var(--primary-400);
  --color-accent: var(--primary-500);
  --color-success: hsl(142, 70%, 40%);
  --color-warning: hsl(38, 92%, 50%);
  --color-error: hsl(0, 72%, 51%);
}
```

### Contrast Requirements
- Body text: minimum 4.5:1 contrast ratio (WCAG AA)
- Large text (18px+): minimum 3:1 contrast ratio
- Interactive elements: minimum 3:1 against adjacent colors
- Always test with a contrast checker

## Typography System

### Type Scale (Major Third — 1.25 ratio)
```css
:root {
  --text-xs:   clamp(0.7rem, 0.65rem + 0.25vw, 0.75rem);
  --text-sm:   clamp(0.8rem, 0.75rem + 0.3vw, 0.875rem);
  --text-base: clamp(0.95rem, 0.9rem + 0.35vw, 1rem);
  --text-lg:   clamp(1.1rem, 1rem + 0.5vw, 1.25rem);
  --text-xl:   clamp(1.3rem, 1.15rem + 0.75vw, 1.563rem);
  --text-2xl:  clamp(1.6rem, 1.35rem + 1.2vw, 1.953rem);
  --text-3xl:  clamp(2rem, 1.6rem + 1.8vw, 2.441rem);
  --text-4xl:  clamp(2.4rem, 1.9rem + 2.5vw, 3.052rem);
}
```

### Font Loading
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=FONT_NAME:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Recommended Font Pairings
1. **Space Grotesk** (headings) + **Inter** (body) — Clean technical
2. **Clash Display** (headings) + **Satoshi** (body) — Bold modern
3. **Playfair Display** (headings) + **Source Sans 3** (body) — Editorial
4. **Cabinet Grotesk** (headings) + **General Sans** (body) — Contemporary
5. **Fraunces** (headings) + **Commissioner** (body) — Warm personality

### Line Height & Spacing
- Headings: `line-height: 1.1` to `1.2`
- Body text: `line-height: 1.5` to `1.7`
- Max line width: `max-width: 65ch`
- Paragraph spacing: `margin-bottom: 1.5em`

## Skills & Tools Referenced

- **frontend-design** (Anthropic Official Skill)
- **Google Fonts** (font source)
- **WCAG 2.1** (accessibility contrast guidelines)
