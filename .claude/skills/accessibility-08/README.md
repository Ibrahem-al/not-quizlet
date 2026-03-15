# Web Accessibility — WCAG 2.1 AA (Skill 08)

## What This Skill Does

Ensures Claude Code creates accessible web interfaces meeting WCAG 2.1 AA standards. Covers semantic HTML, keyboard navigation, ARIA patterns, color contrast, focus management, reduced motion, and screen reader support.

## Why You Need It

Accessibility isn't optional — it's a legal requirement in many jurisdictions and a moral imperative. This skill makes Claude check accessibility automatically on every UI task.

## How to Use

1. Copy `accessibility-08` into `.claude/skills/`
2. Auto-activates on any accessibility mention AND alongside other UI skills
3. Or invoke with `/accessibility`

## What's Covered

- Semantic HTML element selection
- Keyboard navigation patterns
- Focus trapping for modals
- ARIA live regions and patterns
- Screen-reader-only text utility
- Color contrast requirements
- Reduced motion support
- Testing checklist

## Skills & Tools Used

| Tool | Purpose | Install |
|------|---------|---------|
| frontend-design | UI design foundation | `/plugin install example-skills@anthropic-agent-skills` |
| component-library | Component accessibility | This project — Skill 07 |
| WCAG 2.1 | Accessibility standard | W3C reference — no install |

## Example Prompt

> "Audit my navigation component for accessibility issues and fix them"
