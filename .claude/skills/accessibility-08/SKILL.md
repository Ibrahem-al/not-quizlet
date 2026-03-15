---
name: accessibility
description: Ensures web content meets WCAG 2.1 AA accessibility standards. Use whenever the user mentions accessibility, a11y, screen readers, keyboard navigation, ARIA, color contrast, focus management, or inclusive design. Also auto-activate on any UI component work to check accessibility.
disable-model-invocation: false
user-invocable: true
---

# Web Accessibility — WCAG 2.1 AA Compliance

Make every interface usable by everyone.

## Semantic HTML First

Before adding ARIA, use the correct HTML element:
- `<button>` not `<div onclick>`
- `<a href>` for navigation
- `<nav>`, `<main>`, `<aside>`, `<footer>` for landmarks
- `<h1>`-`<h6>` in order (never skip levels)
- `<ul>`/`<ol>` for lists
- `<table>` for tabular data (with `<caption>`, `<th scope>`)
- `<label for>` for form inputs (ALWAYS)
- `<fieldset>` + `<legend>` for related form groups

## Keyboard Navigation

Every interactive element must be:
- Focusable (in tab order or via `tabindex="0"`)
- Operable with keyboard (Enter, Space, Escape, Arrow keys)
- Visually indicated when focused (`:focus-visible` styles)

### Focus Trap for Modals
```javascript
function trapFocus(element) {
  const focusable = element.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  element.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if (e.key === 'Escape') element.close?.();
  });
  first.focus();
}
```

## ARIA Patterns

### Live Regions (Announcements)
```html
<div aria-live="polite" aria-atomic="true" class="sr-only" id="announcer"></div>
```

### Screen Reader Only Text
```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Common ARIA Patterns
- `aria-expanded` — collapsible sections, dropdowns
- `aria-selected` — tabs, list selections
- `aria-current="page"` — current nav item
- `aria-describedby` — help text for inputs
- `aria-invalid="true"` — form validation errors
- `role="alert"` — important status messages
- `role="status"` — non-urgent updates

## Color & Contrast

- Text on backgrounds: 4.5:1 minimum (AA), 7:1 ideal (AAA)
- Large text (18px+ or 14px+ bold): 3:1 minimum
- UI components and graphical objects: 3:1 minimum
- Never use color alone to convey information

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Testing Checklist

1. Tab through entire page — can you reach everything?
2. Use Enter/Space on all interactive elements
3. Check with screen reader (VoiceOver: Cmd+F5 on Mac)
4. Zoom to 200% — does layout break?
5. Test with high contrast mode
6. Validate heading hierarchy (no skipped levels)
7. Check all images have meaningful `alt` text (or `alt=""` for decorative)

## Skills & Tools Referenced

- **frontend-design** (Anthropic Official Skill)
- **component-library** (this project — Skill 07)
- **WCAG 2.1 AA** (W3C standard)
