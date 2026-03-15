---
name: data-visualization
description: Creates interactive data visualizations — charts, graphs, dashboards, and data-driven UI. Use whenever the user mentions charts, graphs, data visualization, dashboards, metrics, analytics display, bar chart, line chart, pie chart, or any data-driven visual.
disable-model-invocation: false
user-invocable: true
---

# Data Visualization — Charts & Dashboards

Create clear, interactive data visualizations for the web.

## Library Options

### 1. Chart.js (Recommended for most use cases)
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
```
Best for: Standard charts (bar, line, pie, doughnut, radar, scatter)

### 2. D3.js (For custom/complex visualizations)
```html
<script src="https://cdn.jsdelivr.net/npm/d3@7.8.5/dist/d3.min.js"></script>
```
Best for: Custom layouts, maps, force-directed graphs, treemaps, complex interactions

### 3. Lightweight: Vanilla SVG/Canvas
Best for: Simple, bespoke charts where you don't want a library dependency

## Chart.js Quick Patterns

### Bar Chart
```javascript
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [{
      label: 'Revenue ($k)',
      data: [12, 19, 3, 5, 2],
      backgroundColor: 'hsl(220, 70%, 55%)',
      borderRadius: 6,
    }]
  },
  options: {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } }
  }
});
```

### Line Chart with Gradient
```javascript
const gradient = ctx.createLinearGradient(0, 0, 0, 400);
gradient.addColorStop(0, 'rgba(66, 99, 235, 0.3)');
gradient.addColorStop(1, 'rgba(66, 99, 235, 0)');

new Chart(ctx, {
  type: 'line',
  data: {
    labels: months,
    datasets: [{
      data: values,
      borderColor: '#4263eb',
      backgroundColor: gradient,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHitRadius: 10,
    }]
  }
});
```

### Doughnut Chart
```javascript
new Chart(ctx, {
  type: 'doughnut',
  data: {
    labels: ['Desktop', 'Mobile', 'Tablet'],
    datasets: [{
      data: [65, 30, 5],
      backgroundColor: ['#4263eb', '#f76707', '#20c997'],
      borderWidth: 0,
      cutout: '70%',
    }]
  },
  options: {
    plugins: {
      legend: { position: 'bottom' }
    }
  }
});
```

## Dashboard Layout

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(400px, 100%), 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
}
.dashboard-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1.5rem;
}
.metric-value {
  font-size: var(--text-3xl);
  font-weight: 700;
  line-height: 1;
}
.metric-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  margin-top: 0.25rem;
}
.metric-change {
  font-size: var(--text-sm);
  font-weight: 500;
}
.metric-change.up { color: var(--color-success); }
.metric-change.down { color: var(--color-error); }
```

## Accessibility for Charts

- Provide a data table alternative (hidden or toggleable)
- Use `aria-label` on chart containers
- Don't rely on color alone — use patterns, labels, or direct annotation
- Ensure interactive elements are keyboard accessible
- Use sufficient contrast for data series

## Design Rules

- Use a consistent color palette across all charts
- Label axes and provide units
- Start y-axis at zero for bar charts
- Use horizontal bar charts for long category labels
- Limit pie/doughnut to 5-7 segments
- Add hover tooltips with exact values
- Use number formatting (commas, abbreviations like $1.2M)

## Skills & Tools Referenced

- **frontend-design** (Anthropic Official Skill)
- **Chart.js** (CDN: chart.js@4.4.0)
- **D3.js** (CDN: d3@7.8.5)
- **plotly** (K-Dense Scientific Skills — for scientific plots)
- **scientific-visualization** (K-Dense Scientific Skills)
- **CSV Auto-Analyzer** (Community Skill — auto-analyze data files)
- **Apache Superset** (via CLI-Anything — for BI dashboards)
- **Metabase** (via CLI-Anything — for analytics)
