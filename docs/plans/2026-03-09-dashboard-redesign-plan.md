# Dashboard Redesign: Pipeline Control Room — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the dashboard from flat card layout into a visual orchestration control room with pipeline tracker, enhanced status indicators, and Grafana-inspired dark aesthetic.

**Architecture:** Pure visual redesign — no data layer changes. New PipelineTracker component derives state from existing React Query hooks. Shared StatusBadge extracted from duplicated code. Custom Tailwind v4 theme via `@theme` directive in CSS.

**Tech Stack:** React 19, Tailwind CSS v4 (`@theme` for custom tokens), Inter + JetBrains Mono fonts via Google Fonts CDN.

---

### Task 1: Theme Foundation — Custom Colors + Fonts

**Files:**
- Modify: `index.html` (add font links)
- Modify: `src/index.css` (add `@theme` block with custom tokens)

**Step 1: Add Google Fonts to index.html**

Add inside `<head>`, before the CSP meta tag. Also update CSP to allow fonts.googleapis.com and fonts.gstatic.com:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
```

Update CSP `style-src` to include `https://fonts.googleapis.com` and add `font-src https://fonts.gstatic.com`.

**Step 2: Add Tailwind v4 custom theme in index.css**

```css
@import "tailwindcss";

@theme {
  --color-page: #0b0e13;
  --color-card: #12161c;
  --color-card-hover: #171c24;
  --color-feed: #0d1117;
  --color-border: #1e2530;
  --color-border-subtle: #161b22;

  --color-neon-green: #22c55e;
  --color-neon-amber: #f59e0b;
  --color-neon-red: #ef4444;
  --color-neon-blue: #3b82f6;
  --color-neon-purple: #a855f7;

  --color-text-primary: #e2e8f0;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #475569;

  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

**Step 3: Verify fonts load**

Run: `npm run dev`
Open browser, inspect body — confirm Inter is the default font, code elements use JetBrains Mono.

**Step 4: Commit**

```bash
git add index.html src/index.css
git commit -m "feat: add custom theme tokens and fonts for redesign"
```

---

### Task 2: Extract Shared StatusBadge Component

**Files:**
- Create: `src/components/StatusBadge.tsx`
- Modify: `src/components/RepoCard.tsx` (remove local StatusBadge, import shared)
- Modify: `src/components/PluginsCard.tsx` (remove local StatusBadge, import shared)

**Step 1: Create enhanced StatusBadge**

```tsx
// src/components/StatusBadge.tsx

export function StatusBadge({
  status,
  conclusion,
}: {
  status: string | null;
  conclusion: string | null;
}) {
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neon-amber/15 text-neon-amber text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-neon-amber animate-pulse" />
        running
      </span>
    );
  }
  if (conclusion === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neon-green/15 text-neon-green text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
        success
      </span>
    );
  }
  if (conclusion === "failure") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neon-red/15 text-neon-red text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-neon-red" />
        failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-text-muted/15 text-text-secondary text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
      {status ?? "unknown"}
    </span>
  );
}
```

**Step 2: Replace in RepoCard.tsx and PluginsCard.tsx**

Remove the local `StatusBadge` function from both files. Add import:
```tsx
import { StatusBadge } from "./StatusBadge";
```

**Step 3: Verify badges render correctly**

Run dev server, check all 3 cards show status badges with new pill style + dot indicators.

**Step 4: Commit**

```bash
git add src/components/StatusBadge.tsx src/components/RepoCard.tsx src/components/PluginsCard.tsx
git commit -m "refactor: extract shared StatusBadge with enhanced design"
```

---

### Task 3: Create PipelineTracker Component

**Files:**
- Create: `src/components/PipelineTracker.tsx`
- Modify: `src/lib/hooks.ts` (add `usePipelineStages` hook if needed, or derive in component)
- Modify: `src/types.ts` (add PipelineStage type)

**Step 1: Add types**

In `src/types.ts`, add:

```ts
export type StageStatus = "idle" | "running" | "done" | "failed" | "waiting";

export interface PipelineStage {
  id: string;
  label: string;
  repo: RepoKey;
  type: "workflow" | "pr" | "publish" | "release";
  status: StageStatus;
  detail?: string; // e.g. "PR #15" or "v1.2.6"
  url?: string;
}
```

**Step 2: Create PipelineTracker component**

The component receives `token` and uses existing hooks (`useRepoStatus` for all 3 repos) to derive the 6 stages + 3 PR checkpoints.

Pipeline stages (9 nodes total):
1. Plugins Update (workflow) — check if automated-update ran recently and succeeded
2. Plugins PR (pr) — check for open PR from automated-update on plugins
3. Plugins Publish (publish) — check if publish.yml ran recently
4. Base Update (workflow) — check if automated-update ran on base
5. Base PR (pr) — check for open PR from automated-update on base
6. Base Release (release) — check if release.yml ran on base
7. Distro Update (workflow) — check if automated-update ran on distro
8. Distro PR (pr) — check for open PR from automated-update on distro
9. Distro Release (release) — check if release.yml ran on distro

Stage status derivation logic:
- If workflow for this stage is currently `in_progress` → `running`
- If stage is PR type and there's an open PR with "automated update" or "chore:" in title → `waiting` (needs merge)
- If stage is PR type and no open PR → `done` (already merged or not needed)
- If latest run for this workflow concluded `success` → `done`
- If latest run concluded `failure` → `failed`
- Otherwise → `idle`

Visual layout:
- Horizontal on `lg+`: 9 nodes connected by lines, grouped in 3 sections (Plugins / Base / Distro)
- Each node: circle with status color + label below
- Lines: solid `bg-neon-green` if source node is done, dashed `border-border` if pending
- Group labels above each section in `text-xs uppercase tracking-wider text-text-muted`
- Mobile: 3 rows (one per repo group), or vertical list

```
┌─ PLUGINS ─────────────┐   ┌─ BASE ────────────────┐   ┌─ DISTRO ─────────────┐
│ (Update)──(PR)──(Pub)  │══│ (Update)──(PR)──(Rel) │══│ (Update)──(PR)──(Rel) │
└────────────────────────┘   └────────────────────────┘   └───────────────────────┘
```

Each node is a `<div>` with:
- `w-8 h-8 rounded-full` (or `w-3 h-3` for the compact dot variant)
- Border color based on status
- Inner fill for active/done states
- `animate-pulse` for running state
- Tooltip or text below for label

The connecting lines are `<div className="flex-1 h-px">` between nodes.

Section separators (═) are thicker lines with a small gap.

**Step 3: Verify component renders**

Temporarily add to Pipeline.tsx above the cards grid. Check all 9 nodes render, status colors match reality.

**Step 4: Commit**

```bash
git add src/components/PipelineTracker.tsx src/types.ts
git commit -m "feat: add PipelineTracker component with 9-stage visualization"
```

---

### Task 4: Upgrade App Layout + Header

**Files:**
- Modify: `src/App.tsx` (new page background, updated header styling)
- Modify: `src/components/Pipeline.tsx` (integrate PipelineTracker, spacing)

**Step 1: Update App.tsx**

Replace `bg-gray-950` with `bg-page`, `text-gray-100` with `text-text-primary`. Update header typography.

**Step 2: Update Pipeline.tsx**

Add PipelineTracker between header and cards:

```tsx
import { PipelineTracker } from "./PipelineTracker";

export function Pipeline({ token }: { token: string }) {
  return (
    <div className="space-y-6">
      <PipelineTracker token={token} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PluginsCard token={token} />
        <RepoCard token={token} repoKey="base" title="devportal-base" />
        <RepoCard token={token} repoKey="distro" title="devportal-distro" />
      </div>
      <ActivityFeed token={token} />
    </div>
  );
}
```

**Step 3: Verify layout**

Check pipeline tracker shows above cards, spacing is correct, responsive on mobile.

**Step 4: Commit**

```bash
git add src/App.tsx src/components/Pipeline.tsx
git commit -m "feat: integrate PipelineTracker and update layout colors"
```

---

### Task 5: Upgrade Card Visuals (PluginsCard + RepoCard)

**Files:**
- Modify: `src/components/PluginsCard.tsx`
- Modify: `src/components/RepoCard.tsx`

**Step 1: Apply card shell changes to both**

Replace `bg-gray-900` with `bg-card`. Add top border strip:
```tsx
<div className="bg-card rounded-lg overflow-hidden border border-border">
  {/* Status strip */}
  <div className={`h-0.5 ${statusColor}`} />
  <div className="p-5 flex flex-col gap-4">
    ...
  </div>
</div>
```

Where `statusColor` is derived from current running/latest status:
- Running workflow → `bg-neon-amber`
- Latest run failed → `bg-neon-red`
- All good → `bg-neon-green`
- No data → `bg-border`

**Step 2: Update header section**

```tsx
<div className="flex items-center justify-between">
  <h2 className="text-base font-semibold text-text-primary">{title}</h2>
  <span className="font-mono text-sm text-text-secondary">{latestTag}</span>
</div>
```

**Step 3: Update section labels**

Replace `text-gray-400 text-sm` labels with:
```tsx
<span className="text-xs font-medium uppercase tracking-wider text-text-muted">
```

**Step 4: Update workspace list in PluginsCard**

More compact grid:
```tsx
<div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
  {workspaces.map(ws => (
    <div key={ws.name} className="flex justify-between text-sm">
      <span className="text-text-secondary">{ws.name}</span>
      <span className="font-mono text-text-muted">{ws.version}</span>
    </div>
  ))}
</div>
```

**Step 5: Update PR links**

Highlight automated-update PRs (title contains "chore:" or "automated update"):
```tsx
<a className={`block text-sm hover:underline ${
  pr.title.includes("chore:") || pr.title.includes("automated")
    ? "text-neon-amber"
    : "text-neon-blue"
}`}>
```

**Step 6: Update action buttons**

```tsx
{/* Secondary button */}
<button className="flex-1 py-2 rounded text-sm border border-border text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors">

{/* Primary button (Publish/Release) */}
<button className="flex-1 py-2 rounded text-sm font-medium bg-neon-green/15 text-neon-green border border-neon-green/30 hover:bg-neon-green/25 transition-colors">
```

**Step 7: Verify cards look correct**

Check all 3 cards render with new styling, status strips, updated typography, button styles.

**Step 8: Commit**

```bash
git add src/components/PluginsCard.tsx src/components/RepoCard.tsx
git commit -m "feat: upgrade card visuals with status strips and refined typography"
```

---

### Task 6: Upgrade ActivityFeed

**Files:**
- Modify: `src/components/ActivityFeed.tsx`

**Step 1: Apply terminal/logs styling**

```tsx
<div className="bg-feed rounded-lg border border-border overflow-hidden">
  <div className="px-5 py-3 border-b border-border">
    <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted">Recent Activity</h2>
  </div>
  <div className="divide-y divide-border-subtle max-h-72 overflow-y-auto">
    {allRuns.slice(0, 20).map(run => (
      <div key={...} className="flex items-center gap-3 px-5 py-2 text-sm hover:bg-card-hover/50 transition-colors">
        {/* Repo dot */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${REPO_COLORS[run.repo]}`} />
        {/* Timestamp in monospace */}
        <span className="font-mono text-text-muted w-16 shrink-0 text-xs">{timeAgo(run.created_at)}</span>
        {/* Repo name */}
        <span className="text-text-muted w-16 shrink-0 text-xs">{run.repo}</span>
        {/* Workflow name */}
        <a href={run.html_url} target="_blank" className="text-text-secondary hover:text-text-primary truncate">
          {run.name}
        </a>
        {/* Status */}
        <StatusBadge status={run.status} conclusion={run.conclusion} />
      </div>
    ))}
  </div>
</div>
```

Repo dot colors:
```ts
const REPO_COLORS: Record<RepoKey, string> = {
  plugins: "bg-neon-blue",
  base: "bg-neon-green",
  distro: "bg-neon-purple",
};
```

**Step 2: Import StatusBadge**

Replace the inline status text with the shared StatusBadge component.

**Step 3: Verify feed renders**

Check terminal-style appearance, repo dots, monospace timestamps, hover states.

**Step 4: Commit**

```bash
git add src/components/ActivityFeed.tsx
git commit -m "feat: upgrade ActivityFeed to terminal-style logs"
```

---

### Task 7: Upgrade AuthGate + PublishModal

**Files:**
- Modify: `src/components/AuthGate.tsx`
- Modify: `src/components/PublishModal.tsx`

**Step 1: AuthGate — apply new palette**

Replace `bg-gray-950` → `bg-page`, `bg-gray-900` → `bg-card`, borders → `border-border`, button accent → `bg-neon-blue`. Add card border: `border border-border`.

**Step 2: PublishModal — apply new palette**

Replace background colors, borders, button styles to match new tokens. Update select dropdowns and checkbox styles.

**Step 3: Verify both screens**

Log out and check AuthGate styling. Open publish modal from PluginsCard and check styling.

**Step 4: Commit**

```bash
git add src/components/AuthGate.tsx src/components/PublishModal.tsx
git commit -m "feat: update AuthGate and PublishModal to match redesign"
```

---

### Task 8: Final Polish Pass

**Files:**
- All component files (minor tweaks)

**Step 1: Add transition-colors to all interactive elements**

Grep for `hover:` and ensure matching elements have `transition-colors` or `transition-all duration-200`.

**Step 2: Check responsive layout**

Resize to mobile width. Ensure:
- PipelineTracker wraps gracefully
- Cards stack in single column
- ActivityFeed is full width
- PublishModal is scrollable

**Step 3: Check color consistency**

Ensure no remaining `gray-900`, `gray-950`, `gray-700` etc. — all replaced with custom tokens.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final polish pass — transitions, responsiveness, color consistency"
```

---

## Execution Notes

- **No tests**: This is a visual redesign. Verification is visual inspection via dev server.
- **No data layer changes**: All hooks, mutations, and API calls remain unchanged.
- **Font CDN**: Google Fonts via `<link>` tag. If CSP blocks it, update the CSP meta tag.
- **Tailwind v4**: Custom theme uses `@theme` directive in CSS, not `tailwind.config.js`.
- After completing all tasks, invoke `react-best-practices` and `frontend-design` skills for review.
