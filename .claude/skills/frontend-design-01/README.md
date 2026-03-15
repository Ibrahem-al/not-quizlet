# Frontend Design — Production-Grade UI (Skill 01)

## What This Skill Does

This skill teaches Claude Code how to create distinctive, high-quality frontend interfaces that avoid the generic "AI-generated" look. It enforces a design-first approach where Claude must choose a specific aesthetic direction, typography, and color palette before writing any code.

## Why You Need It

Most AI-generated UIs look the same — purple gradients, Inter font, card grids. This skill breaks that pattern by forcing unique design decisions upfront.

## How to Use

1. Copy the `frontend-design-01` folder into your project's `.claude/skills/` directory
2. The skill auto-activates when you mention UI design, landing pages, dashboards, or web components
3. You can also invoke it directly with `/frontend-design`

## What It Changes

- Forces aesthetic direction before any code is written
- Bans generic fonts (Inter, Roboto, Arial)
- Requires unique color palettes (no purple gradients)
- Enforces 8px grid system and proper spacing scale
- Mandates mobile-first responsive design
- Adds micro-interactions and proper focus states

## Skills & Tools Used

| Tool | Purpose | Install |
|------|---------|---------|
| frontend-design | Anthropic's official UI design skill | `/plugin install example-skills@anthropic-agent-skills` |
| Google Fonts | Distinctive typography | Built into browsers via `<link>` tag |
| CSS Custom Properties | Theming system | Native CSS — no install needed |

## Example Prompt

> "Build me a landing page for a developer tool that helps with code reviews"

Without this skill, you'd get a generic template. With it, Claude will first propose a specific aesthetic (e.g., "monospace editorial with warm cream backgrounds and code-block-inspired section dividers") before writing any code.
