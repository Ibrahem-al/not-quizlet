---
name: component-library
description: Builds reusable UI component libraries with consistent APIs, proper accessibility, and design token integration. Use whenever the user mentions components, design system, component library, reusable UI, buttons, cards, modals, or building a UI kit.
disable-model-invocation: false
user-invocable: true
---

# Component Library — Reusable UI Systems

Build consistent, accessible, reusable UI components.

## Component Architecture

Every component should follow this structure:

### 1. Design Tokens (CSS Custom Properties)
```css
.btn {
  --btn-height: 2.5rem;
  --btn-px: 1rem;
  --btn-radius: 0.5rem;
  --btn-font-size: var(--text-sm);
  --btn-font-weight: 500;
  --btn-bg: var(--color-accent);
  --btn-color: white;
  --btn-border: none;
}
```

### 2. Variants via Modifiers
```css
.btn--secondary { --btn-bg: transparent; --btn-color: var(--color-accent); --btn-border: 1px solid var(--color-border); }
.btn--ghost { --btn-bg: transparent; --btn-color: var(--color-text-primary); }
.btn--danger { --btn-bg: var(--color-error); }
.btn--sm { --btn-height: 2rem; --btn-px: 0.75rem; --btn-font-size: var(--text-xs); }
.btn--lg { --btn-height: 3rem; --btn-px: 1.5rem; --btn-font-size: var(--text-base); }
```

### 3. States
```css
.btn:hover { filter: brightness(1.1); }
.btn:active { transform: scale(0.98); }
.btn:focus-visible { outline: 2px solid var(--color-border-focus); outline-offset: 2px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
```

## Core Components Checklist

When building a component library, include at minimum:

1. **Button** — primary, secondary, ghost, danger, sizes, icon support, loading state
2. **Input** — text, email, password, with labels, help text, error states, icons
3. **Card** — header, body, footer, image, hover state, variants (outlined, elevated, flat)
4. **Modal/Dialog** — overlay, close button, focus trap, ESC to close, scroll lock
5. **Badge** — status colors, sizes, dot variant, dismissible
6. **Avatar** — image, initials fallback, sizes, status indicator, group
7. **Toast/Alert** — success, warning, error, info, dismissible, auto-dismiss timer
8. **Tabs** — horizontal, vertical, with icons, accessible keyboard navigation
9. **Dropdown** — trigger, menu, items, keyboard navigation, search/filter
10. **Tooltip** — positioning, delay, arrow, accessible

## Accessibility Requirements (Non-Negotiable)

- All interactive elements need `role` attributes if not semantic HTML
- Keyboard navigation: Tab, Enter, Space, Escape, Arrow keys
- `aria-label` or `aria-labelledby` for elements without visible text
- Focus must be visible and trapped in modals
- Color must not be the only indicator (add icons or text)
- Test with screen reader (VoiceOver, NVDA)

## Naming Convention

Use BEM-inspired flat naming:
- `.component` — block
- `.component--variant` — modifier
- `.component__element` — child element

## Skills & Tools Referenced

- **frontend-design** (Anthropic Official Skill)
- **ui-generation** (dashed/claude-marketplace — enterprise UI patterns)
- **accessibility** (WCAG 2.1 AA standard)
