# Component Library — Reusable UI (Skill 07)

## What This Skill Does

Teaches Claude Code to build consistent, accessible UI component libraries with design token integration, proper variants, states, and accessibility. Includes a checklist of 10 core components every library needs.

## Why You Need It

Reusable components are the foundation of scalable UIs. This skill ensures consistent APIs, proper keyboard navigation, ARIA attributes, and design token integration across all components.

## How to Use

1. Copy `component-library-07` into `.claude/skills/`
2. Auto-activates when you mention components, design systems, or UI kits
3. Or invoke with `/component-library`

## Core Components

Button, Input, Card, Modal, Badge, Avatar, Toast, Tabs, Dropdown, Tooltip — each with variants, sizes, states, and accessibility.

## Skills & Tools Used

| Tool | Purpose | Install |
|------|---------|---------|
| frontend-design | UI design foundation | `/plugin install example-skills@anthropic-agent-skills` |
| ui-generation | Enterprise UI patterns | `dashed/claude-marketplace` |
| WCAG 2.1 | Accessibility standard | Reference — no install |

## Example Prompt

> "Build me a complete button component with primary, secondary, ghost, danger variants, three sizes, loading state, and icon support"
