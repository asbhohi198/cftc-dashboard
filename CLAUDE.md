# CFTC Dashboard - Claude Code Memory

## Chart Requirements (CRITICAL)

### Click to Expand
- **ALL charts must have click-to-expand functionality** - clicking a chart opens it in a modal/overlay for larger viewing

### Data Labels
- Bar charts should have small data labels above each bar showing the value
- Keep labels small and tidy to avoid clutter

### Y-Axis Consistency
- When displaying related charts side-by-side (e.g., Positions vs Changes), use the same Y-axis scale for visual comparability

### X-Axis Labels
- **ALL charts must have vertical x-axis labels** (angle: -90 degrees, textAnchor: "end")
- X-axis labels must always be visible (never use tick={false})
- Format dates as "Mon YY" (e.g., "Jan 24")
