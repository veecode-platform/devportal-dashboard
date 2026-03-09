# DevPortal Release Dashboard

Internal dashboard for coordinating releases across the DevPortal ecosystem.

Monitors and triggers GitHub Actions workflows for three repositories:

| Repo | Purpose | Artifact |
|------|---------|----------|
| `devportal-plugins` | Backstage plugins | npm packages |
| `devportal-base` | Base application image | `veecode/devportal-base` Docker image |
| `devportal-distro` | Distribution image (final) | `veecode/devportal` Docker image |

## Release Process

The release follows a strict sequential pipeline. Each step depends on the
previous one completing successfully.

```
Plugins Update → Plugins Publish → Base Update → Base Release → Distro Update → Distro Release
```

### Step 1: Plugins Update

**Repo**: `devportal-plugins`
**Workflow**: `automated-update.yml`
**Trigger**: Scheduled (weekdays 22:00 UTC) or manual via dashboard

Runs a Claude Code agent per workspace in parallel to upgrade Backstage
dependencies. Each workspace is validated independently (tsc, build,
export-dynamic, test). Results are consolidated into a single PR.

- **Agent model**: claude-sonnet-4-6
- **Matrix**: one job per workspace (about, github-workflows, homepage, etc.)
- **Validation**: tsc and build are blocking; test and export-dynamic are non-blocking
- **Error handling**: up to 3 fix-retry cycles per step, auto-revert on failure
- **Output**: PR with per-workspace version deltas and validation table

**Human action required**: review and merge the PR.

### Step 2: Plugins Publish

**Repo**: `devportal-plugins`
**Workflow**: `publish.yml`
**Trigger**: Manual via dashboard (PublishModal)

Publishes updated plugins to npm with per-workspace semantic version bumps.
The dashboard presents a modal where you select the bump type (patch/minor/major)
for each workspace.

- **Input**: JSON config e.g. `{"about":"patch","homepage":"minor"}`
- **Per workspace**: computes new version from Makefile, runs `make publish` + `make publish-dynamic`
- **Auth**: npm Trusted Publishing (OIDC) — no tokens stored
- **Post-publish**: commits updated Makefile versions back to main

**Skip this step** if the plugins update only changed lockfiles (no code changes).

### Step 3: Base Update

**Repo**: `devportal-base`
**Workflow**: `automated-update.yml`
**Trigger**: Scheduled (weekdays 22:00 UTC) or manual via dashboard

Runs a Claude Code agent that applies updates in sequence:

1. **UBI10 base image** — checks Red Hat registry for new tag via skopeo
2. **Backstage core** — runs `yarn backstage-cli versions:bump`
3. **Static plugins** — upgrades community and internal plugin packages
4. **Dynamic plugins** — upgrades dynamic plugin wrappers

After updates, runs full validation (install, tsc, lint, build, test) and
compares against a baseline captured from clean main. Regressions are
auto-fixed or reverted.

If build succeeds, runs **visual regression**: starts the backend server,
captures screenshots of Home, Catalog, and APIs pages using agent-browser.

- **Agent model**: claude-sonnet-4-6
- **Baseline comparison**: diff of exit codes before/after changes
- **Visual regression**: screenshots uploaded as workflow artifacts
- **Output**: PR with update changelog, validation results, and visual assessment

**Human action required**: review and merge the PR.

### Step 4: Base Release

**Repo**: `devportal-base`
**Workflow**: `release.yml` → triggers `publish.yml`
**Trigger**: Manual via dashboard

Two-phase process:

1. **release.yml** — increments patch version in `package.json`, commits, creates
   annotated git tag, pushes to main
2. **publish.yml** — triggered automatically by tag push, builds multi-arch
   Docker images (amd64 + arm64), pushes to Docker Hub

- **Version**: patch increment only (X.Y.Z → X.Y.Z+1)
- **Tag validation**: publish.yml verifies tag commit is on main
- **Docker image**: `veecode/devportal-base:X.Y.Z` + `latest`
- **Security scan**: `security-scan.yml` runs automatically after publish,
  scans image with trivy, opens fix PR if vulnerabilities found

### Step 5: Distro Update

**Repo**: `devportal-distro`
**Workflow**: `automated-update.yml`
**Trigger**: Scheduled (Tue-Sat 00:00 UTC) or manual via dashboard

Runs a Claude Code agent that applies updates in sequence:

1. **Base image tag** — updates the base image reference to latest `devportal-base` tag
2. **Wrapper plugins** — upgrades wrapper plugin dependencies
3. **Downloaded plugins** — upgrades downloaded plugin versions
4. **Build tools** — upgrades build tooling

After updates, runs validation (install, build, export-dynamic) and compares
against baseline. Regressions are auto-fixed or reverted.

- **Agent model**: claude-sonnet-4-6
- **Output**: PR with update changelog and validation results

**Human action required**: review and merge the PR.

### Step 6: Distro Release

**Repo**: `devportal-distro`
**Workflow**: `release.yml` → triggers `docker-build.yml`
**Trigger**: Manual via dashboard

Two-phase process:

1. **release.yml** — finds latest semver tag, increments patch, creates
   annotated git tag, pushes
2. **docker-build.yml** — triggered by tag push, validates tag is on main,
   builds multi-arch Docker images, pushes to Docker Hub

- **Version**: patch increment only (X.Y.Z → X.Y.Z+1)
- **Docker image**: `veecode/devportal:X.Y.Z` + `latest`

This is the **final artifact** consumed by production deployments.

## Dashboard → Workflow Mapping

| Dashboard Action | Workflow | Repo |
|-----------------|----------|------|
| Run Automated Update | `automated-update.yml` | plugins, base, distro |
| Publish | `publish.yml` | plugins |
| Release | `release.yml` | base, distro |
| PR Validation | `pr-check.yml` | base (auto-triggered on PRs) |

## CI/CD Architecture

### Automated Maintenance (Daily)

```
22:00 UTC (Mon-Fri)
├── devportal-plugins: automated-update.yml
│   └── Claude agent upgrades each workspace (parallel matrix)
│   └── Consolidate job creates single PR
│
├── devportal-base: automated-update.yml
│   └── Claude agent updates base image + deps (sequential)
│   └── Visual regression with agent-browser
│   └── Creates PR with screenshots
│
00:00 UTC (Tue-Sat)
└── devportal-distro: automated-update.yml
    └── Claude agent updates base tag + plugins
    └── Creates PR
```

### Security Scanning

```
devportal-base: security-scan.yml
├── Trigger: weekdays 10:00 UTC + after every publish
├── Scans Docker image with trivy
├── Claude agent applies fixes (Critical/High/Medium)
└── Opens PR if fixes applied
```

### Release Pipeline

```
publish.yml (plugins)          Manual trigger from dashboard
    │
    ▼
release.yml (base)             Manual trigger from dashboard
    │ creates tag
    ▼
publish.yml (base)             Auto-trigger on tag push
    │ builds Docker image
    ▼
security-scan.yml (base)       Auto-trigger after publish
    │
    ▼
release.yml (distro)           Manual trigger from dashboard
    │ creates tag
    ▼
docker-build.yml (distro)      Auto-trigger on tag push
    │ builds Docker image
    ▼
veecode/devportal:latest       Production artifact
```

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
- Token re-validated against GitHub API on page refresh
- Org membership validated on login (`veecode-platform`)
- No secrets in code — all auth via user's PAT
- CSP meta tag restricts scripts to self, connections to `api.github.com`
- npm publishing uses Trusted Publishing (OIDC) — zero tokens in CI

## Deploy

Deployed via GitHub Pages: https://veecode-platform.github.io/devportal-dashboard/

Auto-deploys on push to main via `.github/workflows/deploy.yml`.
