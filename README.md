# DevPortal Release Dashboard

Internal dashboard for coordinating releases across the DevPortal ecosystem.

Monitors and triggers GitHub Actions workflows for three repositories:

| Repo | Purpose |
|------|---------|
| `devportal-plugins` | Backstage plugins (npm packages) |
| `devportal-base` | Base application image |
| `devportal-distro` | Distribution image (final artifact) |

## Release Flow

```
1. Run Automated Update (plugins) → PR → merge
2. Publish plugins (per-workspace bump: patch/minor/major)
3. Run Automated Update (base) → PR → merge
4. Release base (bumps version, creates tag)
5. Run Automated Update (distro) → PR → merge
6. Release distro (creates tag, triggers build)
```

Each step is a manual action in the dashboard. PRs require human review and merge.

## Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS v4
- TanStack Query v5 (polling every 30s)
- @octokit/rest (GitHub API)

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and enter a GitHub fine-grained PAT.

### PAT Permissions

Create at: `github.com/settings/tokens?type=beta`

**Resource access**: select `devportal-plugins`, `devportal-base`, `devportal-distro`

**Repository permissions:**
| Permission | Access |
|-----------|--------|
| Actions | Read and write |
| Contents | Read |
| Pull requests | Read |
| Metadata | Read (default) |

**Organization permissions:**
| Permission | Access |
|-----------|--------|
| Members | Read |

## Architecture

```
src/
├── App.tsx                     # Root, token state (sessionStorage)
├── types.ts                    # REPOS config, interfaces, BumpType
├── lib/
│   ├── github.ts               # Octokit singleton, token + org validation
│   ├── hooks.ts                # Query hooks (tags, PRs, runs, workspaces)
│   └── actions.ts              # Mutations (publish, update, release)
└── components/
    ├── AuthGate.tsx             # PAT input + validation
    ├── Pipeline.tsx             # 3-column layout
    ├── PluginsCard.tsx          # Workspaces list + publish/update buttons
    ├── PublishModal.tsx         # Per-workspace bump type selector
    ├── RepoCard.tsx             # Base/Distro card (status + actions)
    └── ActivityFeed.tsx         # Merged run history across all repos
```

## Security

- Token stored in `sessionStorage` (cleared on tab close)
- Org membership validated on login (`veecode-platform`)
- No secrets in code — all auth via user's PAT
- npm publishing uses Trusted Publishing (OIDC) — zero tokens in CI

## Dashboard → Workflow Mapping

| Dashboard Action | Workflow | Repo |
|-----------------|----------|------|
| Run Automated Update | `automated-update.yml` | plugins, base, distro |
| Publish | `publish.yml` | plugins |
| Release | `release.yml` | base, distro |

## Deploy

Build for production:

```bash
npm run build
```

Output goes to `dist/`. Can be deployed to GitHub Pages (private repo) or any static hosting.
