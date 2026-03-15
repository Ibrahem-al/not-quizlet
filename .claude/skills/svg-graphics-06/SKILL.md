---
name: svg-graphics
description: Creates and optimizes SVG graphics — icons, illustrations, animated SVGs, decorative backgrounds, and logo design. Use whenever the user mentions SVG, icons, vector graphics, illustrations, animated graphics, or logo creation. Includes SVGO optimization pipeline.
disable-model-invocation: false
user-invocable: true
---

# SVG Graphics — Vector Art & Icons

Create, animate, and optimize SVG graphics for the web.

## Creating SVGs

### Icon Template (24x24 viewBox)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <!-- paths here -->
</svg>
```

### Illustration Template
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <defs>
    <!-- gradients, patterns, filters -->
  </defs>
  <!-- artwork layers -->
</svg>
```

## SVG Animation

### CSS Animation in SVG
```svg
<style>
  .path {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    animation: draw 2s ease-out forwards;
  }
  @keyframes draw {
    to { stroke-dashoffset: 0; }
  }
</style>
```

### SMIL Animation (inline)
```svg
<circle r="10">
  <animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite"/>
</circle>
```

## Decorative Backgrounds

### Dot Grid
```svg
<svg width="20" height="20" xmlns="http://www.w3.org/2000/svg">
  <circle cx="10" cy="10" r="1" fill="rgba(0,0,0,0.1)"/>
</svg>
```
Use as: `background-image: url("data:image/svg+xml,...");`

### Mesh Gradient (via filter)
```svg
<filter id="mesh">
  <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3"/>
  <feColorMatrix type="saturate" values="3"/>
</filter>
```

## Optimization Rules

- Remove unnecessary metadata, comments, editor artifacts
- Simplify paths (reduce decimal precision to 1-2 places)
- Remove empty groups and unused defs
- Merge overlapping paths where possible
- Use `currentColor` for themeable icons
- Inline small SVGs (< 1KB) directly in HTML
- Use `<symbol>` + `<use>` for icon sprite sheets

## CLI Tool: SVGO

Install: `npm install -g svgo`
Usage: `svgo input.svg -o output.svg`
Config (.svgo.config.js):
```javascript
module.exports = {
  plugins: [
    'preset-default',
    'removeDimensions',
    { name: 'removeAttrs', params: { attrs: '(data-.*)' } },
  ],
};
```

## CLI Tool: Inkscape (via CLI-Anything)

For complex vector work, use Inkscape via CLI-Anything:
- Install Inkscape: system package manager
- Install CLI-Anything: `/plugin marketplace add HKUDS/CLI-Anything` then `/plugin install cli-anything`
- Generate CLI: `/cli-anything` pointed at Inkscape's source
- Use case: Convert formats, batch export, trace bitmaps

## Skills & Tools Referenced

- **canvas-design** (Anthropic Official Skill)
- **SVGO** (npm: `npm install -g svgo`)
- **Inkscape** (via CLI-Anything — `brew install --cask inkscape`)
- **mermaid-diagrams** (dashed/claude-marketplace — for diagram SVGs)
