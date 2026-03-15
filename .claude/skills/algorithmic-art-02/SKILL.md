---
name: algorithmic-art
description: Creates generative algorithmic art using p5.js with seeded randomness and interactive controls. Use whenever the user mentions generative art, creative coding, flow fields, particle systems, procedural graphics, visual experiments, or p5.js projects.
disable-model-invocation: false
user-invocable: true
---

# Algorithmic Art — Generative Visuals with p5.js

Create living, algorithmic artwork using p5.js. Every piece should feel like a unique artistic statement.

## Process

1. **Philosophical Direction** — Before coding, write a 2-sentence "artist statement" about what the piece explores (e.g., "emergence from chaos", "the tension between order and entropy")
2. **Choose Algorithm Family** — Flow fields, particle systems, L-systems, cellular automata, Perlin noise landscapes, recursive subdivision, reaction-diffusion, voronoi
3. **Define Parameters** — Identify 3-5 tweakable parameters the user can adjust
4. **Implement with p5.js** — Use the template structure below

## Template Structure

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"></script>
  <style>
    body { margin: 0; overflow: hidden; background: #000; }
    canvas { display: block; }
    #controls { position: fixed; top: 16px; right: 16px; z-index: 10; font-family: monospace; color: #fff; background: rgba(0,0,0,0.7); padding: 16px; border-radius: 8px; }
    #controls label { display: block; margin: 8px 0; }
    #controls input[type="range"] { width: 160px; }
  </style>
</head>
<body>
  <div id="controls"><!-- parameter sliders --></div>
  <script>/* p5.js sketch */</script>
</body>
</html>
```

## Rules

- Use `randomSeed()` and `noiseSeed()` for reproducibility — display the seed value
- Include a "Save" button that exports the canvas as PNG
- Include a "New Seed" button to regenerate
- All parameters should have slider controls
- Use `requestAnimationFrame`-friendly patterns
- Implement `windowResized()` for responsive canvas
- Color palettes should be curated, not random RGB

## Algorithm Reference

- **Flow Fields:** Use Perlin noise to direct particle movement. `noise(x * scale, y * scale, frameCount * timeScale)`
- **Particle Systems:** Class-based particles with position, velocity, acceleration, lifespan
- **L-Systems:** String rewriting rules with turtle graphics interpretation
- **Cellular Automata:** Grid-based with neighbor rules (Game of Life, Rule 110, etc.)
- **Reaction-Diffusion:** Gray-Scott model with feed/kill rate parameters

## Skills & Tools Referenced

- **algorithmic-art** (Anthropic Official Skill)
- **p5.js** (CDN: https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js)
- **canvas-design** (Anthropic Official Skill — for Canvas API alternative)
