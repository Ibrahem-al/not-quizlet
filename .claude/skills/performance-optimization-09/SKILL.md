---
name: performance-optimization
description: Optimizes frontend performance — Core Web Vitals, bundle size, lazy loading, image optimization, caching, render performance. Use whenever the user mentions performance, speed, loading time, Core Web Vitals, lighthouse score, bundle size, optimization, or wants their site to load faster.
disable-model-invocation: false
user-invocable: true
---

# Performance Optimization — Fast Frontend

Make every page load fast and feel instant.

## Core Web Vitals Targets

- **LCP** (Largest Contentful Paint): < 2.5s
- **INP** (Interaction to Next Paint): < 200ms
- **CLS** (Cumulative Layout Shift): < 0.1

## Critical Rendering Path

### 1. Resource Loading
```html
<!-- Preload critical resources -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/hero.webp" as="image">

<!-- Preconnect to third-party origins -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Defer non-critical CSS -->
<link rel="stylesheet" href="/non-critical.css" media="print" onload="this.media='all'">

<!-- Defer non-critical JS -->
<script src="/analytics.js" defer></script>
```

### 2. Image Optimization
```html
<!-- Modern format with fallback -->
<picture>
  <source srcset="/image.avif" type="image/avif">
  <source srcset="/image.webp" type="image/webp">
  <img src="/image.jpg" alt="Description" width="800" height="600" loading="lazy" decoding="async">
</picture>
```

Rules:
- ALWAYS set `width` and `height` attributes (prevents CLS)
- Use `loading="lazy"` for below-fold images
- Use `loading="eager"` and `fetchpriority="high"` for LCP image
- Serve WebP/AVIF with fallbacks
- Use `srcset` and `sizes` for responsive images

### 3. Font Loading
```css
@font-face {
  font-family: 'MainFont';
  src: url('/fonts/main.woff2') format('woff2');
  font-display: swap;
  font-weight: 400;
  unicode-range: U+0000-00FF; /* Latin only if that's all you need */
}
```

### 4. CSS Performance
- Avoid `@import` in CSS (blocks parallel loading)
- Inline critical CSS (above-the-fold styles) in `<style>` tag
- Use `content-visibility: auto` for off-screen content
- Avoid expensive selectors (universal `*`, deep nesting)
- Use `will-change` sparingly and only right before animation
- Prefer `transform` and `opacity` for animations

### 5. JavaScript Performance
- Code-split routes (dynamic `import()`)
- Debounce scroll/resize handlers: `requestAnimationFrame` or 150ms debounce
- Use `requestIdleCallback` for non-urgent work
- Virtualize long lists (only render visible items)
- Avoid layout thrashing (batch DOM reads before writes)

## Caching Strategy
```
<!-- Cache-Control headers -->
Static assets (JS/CSS/fonts): max-age=31536000, immutable
HTML: no-cache (always revalidate)
API responses: max-age=0, s-maxage=60
Images: max-age=86400
```

## Bundle Optimization

- Tree-shake unused exports
- Split vendor chunks from app code
- Compress with Brotli (better than gzip)
- Analyze with `webpack-bundle-analyzer` or `source-map-explorer`
- Set performance budgets: JS < 200KB gzipped, CSS < 50KB gzipped

## Tools

- **Lighthouse** (Chrome DevTools → Lighthouse tab)
- **WebPageTest** (webpagetest.org)
- **Bundle analyzer** (`npx webpack-bundle-analyzer` or `npx source-map-explorer`)

## Skills & Tools Referenced

- **react-nextjs-performance** (Vercel Labs — 62 rules)
- **frontend-design** (Anthropic Official Skill)
- **ImageMagick** (via CLI-Anything — image format conversion)
- **FFmpeg** (via CLI-Anything — video optimization)
