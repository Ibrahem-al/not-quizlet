# Dark Mode & Theming (Skill 10)

## What This Skill Does

Teaches Claude Code to implement robust dark mode and multi-theme systems. Uses CSS custom properties, `prefers-color-scheme`, and localStorage for theme persistence with system preference detection.

## Why You Need It

Dark mode is expected by users and improves accessibility. This skill ensures proper implementation — not just color inversion, but thoughtful dark design with smooth transitions and user preference persistence.

## How to Use

1. Copy `dark-mode-theming-10` into `.claude/skills/`
2. Auto-activates when you mention dark mode, themes, or color scheme
3. Or invoke with `/dark-mode-theming`

## What's Included

- Complete light/dark theme token sets
- System preference detection (`prefers-color-scheme`)
- JavaScript toggle with localStorage persistence
- Theme toggle button with sun/moon icons
- Smooth transition between themes
- Dark mode design rules (not just inversion)

## Skills & Tools Used

| Tool | Purpose | Install |
|------|---------|---------|
| frontend-design | UI design foundation | `/plugin install example-skills@anthropic-agent-skills` |
| color-typography | Color system foundation | This project — Skill 05 |
| CSS Custom Properties | Theme variable system | Native CSS — no install |

## Example Prompt

> "Add dark mode to my portfolio site with a toggle button that remembers the user's preference"
