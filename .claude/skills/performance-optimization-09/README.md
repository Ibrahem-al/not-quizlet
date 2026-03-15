# Performance Optimization (Skill 09)

## What This Skill Does

Teaches Claude Code to optimize frontend performance targeting Core Web Vitals. Covers resource loading, image optimization, font loading, CSS/JS performance, caching strategies, and bundle optimization.

## Why You Need It

Performance directly impacts user experience and SEO. This skill ensures Claude writes performance-conscious code by default — lazy loading images, preloading critical resources, and avoiding layout shift.

## How to Use

1. Copy `performance-optimization-09` into `.claude/skills/`
2. Auto-activates when you mention performance, speed, or Core Web Vitals
3. Or invoke with `/performance-optimization`

## Key Targets

- LCP < 2.5s, INP < 200ms, CLS < 0.1
- JS bundle < 200KB gzipped
- CSS < 50KB gzipped

## Skills & Tools Used

| Tool | Purpose | Install |
|------|---------|---------|
| react-nextjs-performance | 62 Vercel performance rules | Copy from `vercel-labs/agent-skills` |
| frontend-design | UI design foundation | `/plugin install example-skills@anthropic-agent-skills` |
| ImageMagick | Image format conversion | `brew install imagemagick` + CLI-Anything |
| FFmpeg | Video optimization | `brew install ffmpeg` |
| Lighthouse | Performance auditing | Built into Chrome DevTools |

## Example Prompt

> "Optimize my landing page — it scores 45 on Lighthouse and the hero image takes 6 seconds to load"
