# SVG Graphics — Vector Art & Icons (Skill 06)

## What This Skill Does

Teaches Claude Code to create, animate, and optimize SVG graphics. Covers icon creation, illustrations, animated SVGs, decorative background patterns, and SVG optimization with SVGO.

## Why You Need It

SVGs are the backbone of modern web graphics — icons, illustrations, backgrounds, and animations. This skill ensures Claude creates clean, optimized, accessible SVGs with proper animation and theming support.

## How to Use

1. Copy `svg-graphics-06` into `.claude/skills/`
2. Auto-activates when you mention SVG, icons, vector graphics, or illustrations
3. Or invoke with `/svg-graphics`

## What's Included

- Icon template (24x24 standard)
- Illustration template with defs
- CSS and SMIL animation patterns
- Decorative background patterns (dot grid, mesh gradient)
- SVGO optimization configuration
- Icon sprite sheet pattern (`<symbol>` + `<use>`)

## Skills & Tools Used

| Tool | Purpose | Install |
|------|---------|---------|
| canvas-design | Anthropic's canvas design skill | `/plugin install example-skills@anthropic-agent-skills` |
| SVGO | SVG optimization | `npm install -g svgo` |
| Inkscape | Complex vector editing via CLI-Anything | `brew install --cask inkscape` + CLI-Anything plugin |
| mermaid-diagrams | Diagram SVGs | `dashed/claude-marketplace` |

## Example Prompt

> "Create an animated SVG hero illustration of a rocket launching with particle trail effects"
