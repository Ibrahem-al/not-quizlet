# Algorithmic Art — Generative Visuals (Skill 02)

## What This Skill Does

Teaches Claude Code to create generative algorithmic art using p5.js. It produces interactive, parameterized visual experiments with reproducible seeds, export capability, and slider controls.

## Why You Need It

Generative art requires a different mindset than typical UI work — it's about exploring algorithms visually. This skill provides the framework, algorithm reference, and template structure to produce compelling results.

## How to Use

1. Copy the `algorithmic-art-02` folder into your project's `.claude/skills/` directory
2. Ask Claude to create generative art, and it will auto-activate
3. Or invoke directly with `/algorithmic-art`

## What It Creates

- Interactive p5.js sketches with slider controls
- Reproducible outputs via seed system
- PNG export functionality
- Responsive canvas sizing
- Curated color palettes (not random RGB)

## Algorithm Types Included

- Flow Fields (Perlin noise)
- Particle Systems
- L-Systems (fractal trees, etc.)
- Cellular Automata (Game of Life)
- Reaction-Diffusion patterns

## Skills & Tools Used

| Tool | Purpose | Install |
|------|---------|---------|
| algorithmic-art | Anthropic's generative art skill | `/plugin install example-skills@anthropic-agent-skills` |
| p5.js | Creative coding library | CDN — no install needed |
| canvas-design | Canvas API alternative | `/plugin install example-skills@anthropic-agent-skills` |

## Example Prompt

> "Create a flow field visualization that looks like wind patterns over a terrain"
