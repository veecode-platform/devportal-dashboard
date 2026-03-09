# Dashboard Redesign: Pipeline Control Room

## Concept

Transform the dashboard from "3 cards side-by-side" into a visual orchestration control room. The key addition is a **Pipeline Tracker** that shows the 6-step release flow with human intervention points.

## Pipeline Tracker (new component)

Horizontal bar at the top with 6 stages as connected nodes:

```
[1. Update] ── [PR] ── [2. Publish] ═══ [3. Update] ── [PR] ── [4. Release] ═══ [5. Update] ── [PR] ── [6. Release]
 plugins        merge    plugins          base           merge    base             distro         merge    distro
```

- Each node: status dot (idle/running/done/failed/waiting)
- PR nodes: show "Merge PR #XX" when open, checkmark when merged
- Active stage: highlighted border
- Completed stages: reduced opacity
- Lines: solid if done, dashed if pending
- Mobile: vertical list with connectors

State derived from: open PRs, latest tags, recent workflow runs.

## Card Upgrades

- Top border colored by current status (3px)
- Header: repo name + status dot + version in monospace
- Section labels: uppercase, small, muted (Grafana style)
- Workspaces (plugins): compact grid `name · version`
- PR links: git-merge icon, yellow highlight for action-needed PRs
- Status badges: icon + text + subtle background (not just solid rectangles)
- Buttons: transparent bg with border, primary action has accent fill

## Activity Feed

- Darker background than cards
- Monospace timestamps and workflow names
- Colored dot per repo (plugins=blue, base=green, distro=purple)
- Alternating row hover

## Visual Language

- Grafana control room: very dark backgrounds, neon-ish accent colors for status
- Inter for UI text, JetBrains Mono for data/versions
- Status colors: green (success), amber (running + pulse), red (failed), gray (idle)
- Smooth transitions on all interactive elements
- Running state: pulsing dot animation

## Non-Goals

- No charts or graphs (this is orchestration, not monitoring)
- No external UI library (keep Tailwind-only)
- No structural changes to data fetching or state management
