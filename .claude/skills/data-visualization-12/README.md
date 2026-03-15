# Data Visualization — Charts & Dashboards (Skill 12)

## What This Skill Does

Teaches Claude Code to create interactive data visualizations using Chart.js, D3.js, or vanilla SVG/Canvas. Includes dashboard layout patterns, metric cards, and accessibility guidelines for charts.

## Why You Need It

Data visualization requires specific design decisions — color encoding, axis formatting, responsive sizing, accessibility. This skill provides ready-to-use patterns and best practices.

## How to Use

1. Copy `data-visualization-12` into `.claude/skills/`
2. Auto-activates when you mention charts, graphs, dashboards, or data visualization
3. Or invoke with `/data-visualization`

## Chart Types Covered

- Bar charts (vertical & horizontal)
- Line charts with gradient fill
- Doughnut/pie charts
- Dashboard layouts with metric cards
- Custom D3 visualizations

## Skills & Tools Used

| Tool | Purpose | Install |
|------|---------|---------|
| frontend-design | UI design foundation | `/plugin install example-skills@anthropic-agent-skills` |
| Chart.js | Standard charts | CDN — no install needed |
| D3.js | Custom visualizations | CDN — no install needed |
| plotly | Scientific plots | K-Dense skills — `pip install plotly` |
| CSV Auto-Analyzer | Auto-analyze data | Community skill |
| Apache Superset | BI dashboards via CLI-Anything | Docker install |

## Example Prompt

> "Build a metrics dashboard with revenue trend line, user growth bar chart, and device breakdown doughnut chart"
