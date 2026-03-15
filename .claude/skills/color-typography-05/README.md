# Color & Typography Systems (Skill 05)

## What This Skill Does

Teaches Claude Code to create professional color palettes and typography hierarchies using CSS custom properties. Produces design token systems that are easy to maintain and theme.

## Why You Need It

Color and type are the foundation of good design. This skill ensures systematic, accessible color generation and responsive typography with proper scales and contrast ratios.

## How to Use

1. Copy `color-typography-05` into `.claude/skills/`
2. Auto-activates when you mention colors, fonts, typography, or design tokens
3. Or invoke with `/color-typography`

## What's Included

- HSL-based programmatic palette generation
- Semantic color tokens (surface, text, border, accent, status)
- Fluid type scale using `clamp()`
- 5 curated font pairings
- WCAG contrast requirements
- Line height and spacing guidelines

## Skills & Tools Used

| Tool | Purpose | Install |
|------|---------|---------|
| frontend-design | UI design foundation | `/plugin install example-skills@anthropic-agent-skills` |
| Google Fonts | Typography source | Built into browsers — no install |
| WCAG 2.1 | Contrast guidelines | Standard reference — no install |

## Example Prompt

> "Create a warm, earthy color system with an editorial feel for a blog platform"
