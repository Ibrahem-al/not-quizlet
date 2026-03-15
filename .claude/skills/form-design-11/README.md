# Form Design — Accessible Forms (Skill 11)

## What This Skill Does

Teaches Claude Code to create accessible, user-friendly forms with proper validation, error handling, autocomplete, multi-step flows, and polished styling.

## Why You Need It

Forms are one of the hardest UI patterns to get right — labels, validation timing, error messages, accessibility, autocomplete. This skill handles all of it.

## How to Use

1. Copy `form-design-11` into `.claude/skills/`
2. Auto-activates when you mention forms, inputs, validation, or sign-up
3. Or invoke with `/form-design`

## What's Included

- Proper label + input structure with help text and errors
- Validate-on-blur pattern (not on input)
- Inline error messages with ARIA support
- Multi-step form pattern with progress indicator
- Autocomplete attribute reference
- Form styling with focus and error states

## Skills & Tools Used

| Tool | Purpose | Install |
|------|---------|---------|
| frontend-design | UI design foundation | `/plugin install example-skills@anthropic-agent-skills` |
| accessibility | WCAG form accessibility | This project — Skill 08 |
| component-library | Input components | This project — Skill 07 |
| Constraint Validation API | Native form validation | Browser built-in — no install |

## Example Prompt

> "Create a multi-step checkout form with shipping, payment, and review steps"
