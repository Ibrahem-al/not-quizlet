---
name: frontend-design
description: Creates distinctive, high-quality frontend interfaces that avoid generic "AI slop" aesthetics. Use whenever the user mentions UI design, landing pages, dashboards, web components, React components, marketing pages, or any visual web interface work. Forces bold aesthetic direction before coding.
disable-model-invocation: false
user-invocable: true
---

# Frontend Design — Production-Grade UI

Create distinctive, high-quality frontend interfaces. Every design must have a unique identity — no generic templates.

## Before Writing Any Code

1. **Choose an aesthetic direction** — Pick a specific visual mood (e.g., "brutalist editorial", "soft glass morphism", "retro terminal", "luxury minimal")
2. **Select typography** — NEVER use Inter, Roboto, Arial, or system defaults. Choose from: Space Grotesk, Clash Display, Satoshi, Cabinet Grotesk, General Sans, Instrument Serif, Fraunces, Playfair Display, or other distinctive fonts via Google Fonts
3. **Define color palette** — Avoid cliched purple/blue gradients. Use unexpected combinations. Define primary, secondary, accent, surface, and text colors
4. **Plan layout rhythm** — Use an 8px grid system. Define spacing scale (4, 8, 12, 16, 24, 32, 48, 64, 96, 128)

## Design Rules

- **No cookie-cutter layouts** — Every page should feel intentional, not generated
- **Vary light/dark** — Don't default to dark mode. Light themes can be bold too
- **Use contextual textures** — Subtle noise, grain, mesh gradients, or patterns that reinforce the mood
- **Typography hierarchy** — At least 3 distinct sizes with clear visual weight differences
- **Whitespace is a feature** — Use generous padding and margins
- **Micro-interactions** — Hover states, transitions, focus rings that feel polished
- **Mobile-first** — Design for small screens first, enhance for larger

## Implementation

- Use CSS custom properties for all theme values
- Prefer CSS Grid and Flexbox over absolute positioning
- Use `clamp()` for responsive typography
- Load fonts via `<link>` from Google Fonts with `display=swap`
- Include proper `prefers-reduced-motion` media queries
- All interactive elements need visible focus states

## Anti-Patterns (NEVER Do These)

- Generic card grids with rounded corners and drop shadows
- Purple-to-blue gradient backgrounds
- "Hero section + 3 feature cards + CTA" cookie-cutter layout
- Stock illustration style SVGs
- Using more than 2 font families
- Centered text blocks wider than 65ch

## Skills & Tools Referenced

- **frontend-design** (Anthropic Official Skill)
- **Google Fonts** (typography source)
- **CSS Custom Properties** (theming system)
