# Responsive Layout — Modern CSS (Skill 03)

## What This Skill Does

Teaches Claude Code to build responsive layouts using modern CSS features: CSS Grid, Flexbox, Container Queries, `clamp()`, `min()`, and logical properties. No frameworks needed.

## Why You Need It

Responsive design is more than just media queries. Modern CSS has powerful intrinsic sizing features that most AI-generated code doesn't leverage. This skill ensures Claude uses the best tools available.

## How to Use

1. Copy `responsive-layout-03` into `.claude/skills/`
2. Auto-activates when you mention responsive design, mobile-first, breakpoints, or layouts
3. Or invoke with `/responsive-layout`

## Layout Patterns Included

1. **Fluid Grid** — Auto-fitting columns with `minmax()`
2. **Sidebar Layout** — Collapsible sidebar for mobile
3. **Content Container** — Max-width with fluid padding
4. **Stack Layout** — Vertical spacing system
5. **Cluster** — Horizontal wrapping groups
6. **Container Queries** — Component-level responsiveness

## Skills & Tools Used

| Tool | Purpose | Install |
|------|---------|---------|
| frontend-design | Anthropic's UI design skill | `/plugin install example-skills@anthropic-agent-skills` |
| react-nextjs-performance | Vercel rendering patterns | Copy from `vercel-labs/agent-skills` repo |
| CSS Grid / Flexbox | Layout engines | Native CSS — no install |

## Example Prompt

> "Create a portfolio page that shows 3 columns on desktop, 2 on tablet, 1 on mobile with a fixed sidebar navigation"
