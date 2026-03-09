import { useRepoStatus } from "../lib/hooks";
import type {
  RepoKey,
  RepoStatus,
  StageStatus,
  PipelineStage,
  WorkflowRun,
  PullRequest,
} from "../types";

// ---------------------------------------------------------------------------
// Stage definitions (static blueprint — status is derived at render time)
// ---------------------------------------------------------------------------

interface StageDef {
  id: string;
  label: string;
  abbr: string;
  repo: RepoKey;
  type: PipelineStage["type"];
}

const STAGE_GROUPS: { label: string; repo: RepoKey; stages: StageDef[] }[] = [
  {
    label: "Plugins",
    repo: "plugins",
    stages: [
      { id: "plugins-update", label: "Update", abbr: "U", repo: "plugins", type: "workflow" },
      { id: "plugins-pr", label: "PR", abbr: "PR", repo: "plugins", type: "pr" },
      { id: "plugins-publish", label: "Publish", abbr: "P", repo: "plugins", type: "publish" },
    ],
  },
  {
    label: "Base",
    repo: "base",
    stages: [
      { id: "base-update", label: "Update", abbr: "U", repo: "base", type: "workflow" },
      { id: "base-pr", label: "PR", abbr: "PR", repo: "base", type: "pr" },
      { id: "base-release", label: "Release", abbr: "R", repo: "base", type: "release" },
    ],
  },
  {
    label: "Distro",
    repo: "distro",
    stages: [
      { id: "distro-update", label: "Update", abbr: "U", repo: "distro", type: "workflow" },
      { id: "distro-pr", label: "PR", abbr: "PR", repo: "distro", type: "pr" },
      { id: "distro-release", label: "Release", abbr: "R", repo: "distro", type: "release" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers — derive stage status from live hook data
// ---------------------------------------------------------------------------

function matchesWorkflow(run: WorkflowRun, stageType: PipelineStage["type"]): boolean {
  const name = run.name.toLowerCase();
  switch (stageType) {
    case "workflow":
      return name.includes("automated update") || name.includes("automated-update");
    case "publish":
      return name.includes("publish");
    case "release":
      return name.includes("release");
    default:
      return false;
  }
}

function findAutomatedPR(openPRs: PullRequest[]): PullRequest | undefined {
  return openPRs.find((pr) => {
    const t = pr.title.toLowerCase();
    return t.includes("chore:") || t.includes("automated");
  });
}

function deriveStage(def: StageDef, status: RepoStatus): PipelineStage {
  // --- PR-type nodes ---
  if (def.type === "pr") {
    const automatedPR = findAutomatedPR(status.openPRs);
    if (automatedPR) {
      return {
        ...def,
        status: "waiting",
        detail: `PR #${automatedPR.number}`,
        url: automatedPR.html_url,
      };
    }
    return { ...def, status: "idle" };
  }

  // --- Workflow / Publish / Release nodes ---
  // Check if currently running
  const runningMatch = status.runningNow.find((r) => matchesWorkflow(r, def.type));
  if (runningMatch) {
    return {
      ...def,
      status: "running",
      detail: runningMatch.name,
      url: runningMatch.html_url,
    };
  }

  // Check most recent completed run
  const latestRun = status.recentRuns.find((r) => matchesWorkflow(r, def.type));
  if (latestRun) {
    const s: StageStatus =
      latestRun.conclusion === "success"
        ? "done"
        : latestRun.conclusion === "failure"
          ? "failed"
          : "idle";
    return {
      ...def,
      status: s,
      detail: latestRun.name,
      url: latestRun.html_url,
    };
  }

  return { ...def, status: "idle" };
}

// ---------------------------------------------------------------------------
// Visual helpers
// ---------------------------------------------------------------------------

const STATUS_CLASSES: Record<StageStatus, string> = {
  idle: "border-border bg-transparent text-text-muted",
  running: "border-accent-amber bg-accent-amber/15 text-accent-amber animate-pulse",
  done: "border-accent-green bg-accent-green/15 text-accent-green",
  failed: "border-accent-red bg-accent-red/15 text-accent-red",
  waiting: "border-accent-amber border-dashed bg-accent-amber/10 text-accent-amber",
};

function StageNode({ stage }: { stage: PipelineStage }) {
  const circle = (
    <div
      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${STATUS_CLASSES[stage.status]}`}
    >
      {stage.type === "pr"
        ? "PR"
        : stage.type === "publish"
          ? "P"
          : stage.type === "release"
            ? "R"
            : "U"}
    </div>
  );

  const label =
    stage.status === "waiting" && stage.detail
      ? stage.detail
      : stage.label;

  const inner = (
    <div className="flex flex-col items-center gap-1">
      {circle}
      <span className="text-xs text-text-muted leading-none">{label}</span>
    </div>
  );

  if (stage.url) {
    return (
      <a
        href={stage.url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
      >
        {inner}
      </a>
    );
  }

  return inner;
}

function Connector({ done }: { done: boolean }) {
  return (
    <div
      className={`flex-1 min-w-3 h-px self-center -translate-y-2 ${
        done ? "bg-accent-green" : "bg-border"
      }`}
    />
  );
}

function GroupSeparator() {
  return (
    <div className="hidden lg:flex items-center px-1 -translate-y-2">
      <div className="w-6 h-0.5 bg-border rounded" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PipelineTracker({ token }: { token: string }) {
  const pluginsStatus = useRepoStatus(token, "plugins");
  const baseStatus = useRepoStatus(token, "base");
  const distroStatus = useRepoStatus(token, "distro");

  const statusMap: Record<RepoKey, RepoStatus> = {
    plugins: pluginsStatus,
    base: baseStatus,
    distro: distroStatus,
  };

  const isLoading =
    pluginsStatus.isLoading || baseStatus.isLoading || distroStatus.isLoading;

  // Derive all stages
  const groups = STAGE_GROUPS.map((group) => ({
    ...group,
    stages: group.stages.map((def) => deriveStage(def, statusMap[def.repo])),
  }));

  return (
    <div className="px-1 py-2">
      {isLoading ? (
        <div className="flex items-center justify-center py-4 text-text-muted text-sm">
          Loading pipeline status...
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-0">
          {groups.map((group, gi) => (
            <div key={group.label} className="flex items-start">
              {/* Group */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  {group.label}
                </span>
                <div className="flex items-start gap-2">
                  {group.stages.map((stage, si) => (
                    <div key={stage.id} className="flex items-start gap-2">
                      <StageNode stage={stage} />
                      {si < group.stages.length - 1 && (
                        <Connector done={stage.status === "done"} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Separator between groups */}
              {gi < groups.length - 1 && <GroupSeparator />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
