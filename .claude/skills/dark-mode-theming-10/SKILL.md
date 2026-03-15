---
name: dark-mode-theming
description: Implements dark mode and multi-theme systems using CSS custom properties and prefers-color-scheme. Use whenever the user mentions dark mode, light mode, themes, theming, color scheme toggle, or wants to support multiple visual themes.
disable-model-invocation: false
user-invocable: true
---

# Dark Mode & Theming — Multi-Theme Systems

Build robust theme systems that respect user preferences.

## Architecture

### 1. Define Theme Tokens
```css
:root, [data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #f8f9fa;
  --bg-tertiary: #e9ecef;
  --text-primary: #1a1a2e;
  --text-secondary: #495057;
  --text-muted: #868e96;
  --border: #dee2e6;
  --border-focus: #4263eb;
  --accent: #4263eb;
  --accent-hover: #3b5bdb;
  --surface: #ffffff;
  --shadow: rgba(0, 0, 0, 0.08);
  --code-bg: #f1f3f5;
}

[data-theme="dark"] {
  --bg-primary: #0d1117;
  --bg-secondary: #161b22;
  --bg-tertiary: #21262d;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-muted: #6e7681;
  --border: #30363d;
  --border-focus: #58a6ff;
  --accent: #58a6ff;
  --accent-hover: #79c0ff;
  --surface: #161b22;
  --shadow: rgba(0, 0, 0, 0.3);
  --code-bg: #161b22;
}
```

### 2. System Preference Detection
```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* dark theme tokens */
  }
}
```

### 3. JavaScript Toggle
```javascript
function initTheme() {
  const saved = localStorage.getItem('theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (systemDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

// Listen for system changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  }
});

initTheme();
```

### 4. Toggle Button
```html
<button onclick="toggleTheme()" aria-label="Toggle theme" class="theme-toggle">
  <svg class="sun-icon" viewBox="0 0 24 24"><!-- sun path --></svg>
  <svg class="moon-icon" viewBox="0 0 24 24"><!-- moon path --></svg>
</button>
```
```css
[data-theme="light"] .moon-icon,
[data-theme="dark"] .sun-icon { display: none; }
```

## Dark Mode Design Rules

- Don't just invert colors — dark backgrounds should be dark gray (#0d1117), not pure black
- Reduce shadow intensity in dark mode
- Use lower opacity whites for text hierarchy (100%, 70%, 50%)
- Slightly desaturate brand colors for dark mode
- Images may need `filter: brightness(0.9)` in dark mode
- Ensure all status colors (success, error, warning) are readable on dark backgrounds
- Test with both themes during development — don't treat dark mode as an afterthought

## Transition Between Themes

```css
:root {
  transition: background-color 300ms ease, color 200ms ease;
}
/* Prevent transition on page load */
.no-transition * { transition: none !important; }
```

## Skills & Tools Referenced

- **frontend-design** (Anthropic Official Skill)
- **color-typography** (this project — Skill 05)
- **CSS Custom Properties** (native CSS)
- **localStorage API** (native browser API)
