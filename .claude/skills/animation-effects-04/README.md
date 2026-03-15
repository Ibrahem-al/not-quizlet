# Animation Effects — Motion Design (Skill 04)

## What This Skill Does

Teaches Claude Code to add polished, purposeful animations to web interfaces. Covers CSS transitions, keyframe animations, scroll-triggered effects, micro-interactions, loading states, and page transitions — all with proper accessibility support.

## Why You Need It

Bad animations are worse than no animations. This skill ensures Claude only animates GPU-friendly properties, uses proper easing curves, respects `prefers-reduced-motion`, and makes every animation serve a UX purpose.

## How to Use

1. Copy `animation-effects-04` into `.claude/skills/`
2. Auto-activates when you mention animations, transitions, hover effects, or scroll effects
3. Or invoke with `/animation-effects`

## Patterns Included

- Hover lift with shadow
- Staggered entrance animations
- Scroll-triggered reveals (Intersection Observer)
- Loading skeleton shimmer
- Custom easing library (spring, bounce, expo)
- Page transition patterns

## Skills & Tools Used

| Tool | Purpose | Install |
|------|---------|---------|
| frontend-design | UI design foundation | `/plugin install example-skills@anthropic-agent-skills` |
| Intersection Observer | Scroll-triggered animations | Native browser API — no install |
| CSS Animations | Keyframe animations | Native CSS — no install |
| Web Animations API | JS-controlled animations | Native browser API — no install |

## Example Prompt

> "Add scroll-triggered fade-in animations to my portfolio sections with staggered card entrances"
