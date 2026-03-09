import { useMemo } from "react";
import {
  ReactFlow,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
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

  const runningMatch = status.runningNow.find((r) => matchesWorkflow(r, def.type));
  if (runningMatch) {
    return {
      ...def,
      status: "running",
      detail: runningMatch.name,
      url: runningMatch.html_url,
    };
  }

  const latestRun = status.recentRuns.find((r) => matchesWorkflow(r, def.type));
  if (latestRun) {
    const s: StageStatus =
      latestRun.conclusion === "success"
        ? "done"
        : latestRun.conclusion === "failure"
          ? "failed"
          : "idle";
    return { ...def, status: s, detail: latestRun.name, url: latestRun.html_url };
  }

  return { ...def, status: "idle" };
}

// ---------------------------------------------------------------------------
// React Flow — typed node data & custom components
// ---------------------------------------------------------------------------

type StageNodeData = {
  status: StageStatus;
  label: string;
  type: PipelineStage["type"];
  abbr: string;
  detail?: string;
  url?: string;
  id: string;
  repo: RepoKey;
  [key: string]: unknown;
};

type StageNodeType = Node<StageNodeData, "stage">;

type GroupLabelData = {
  label: string;
  [key: string]: unknown;
};

type GroupLabelType = Node<GroupLabelData, "groupLabel">;

const STATUS_CLASSES: Record<StageStatus, string> = {
  idle: "border-border bg-transparent text-text-muted",
  running: "border-accent-amber bg-accent-amber/15 text-accent-amber animate-pulse",
  done: "border-accent-green bg-accent-green/15 text-accent-green",
  failed: "border-accent-red bg-accent-red/15 text-accent-red",
  waiting: "border-accent-amber border-dashed bg-accent-amber/10 text-accent-amber",
};

// Edge colors — mirrors CSS custom properties from index.css
const EDGE_COLORS: Record<StageStatus, string> = {
  idle: "#30363d",
  running: "#d29922",
  done: "#3fb950",
  failed: "#f85149",
  waiting: "#d29922",
};

const ABBR_LABELS: Record<string, string> = {
  U: "Update", PR: "Pull Request", P: "Publish", R: "Release",
};

// Position handles at the vertical center of the circle (h-8 = 32px → top: 16)
const HANDLE_STYLE_L = { opacity: 0, width: 0, height: 0, minWidth: 0, minHeight: 0, top: 16, left: 0 } as const;
const HANDLE_STYLE_R = { opacity: 0, width: 0, height: 0, minWidth: 0, minHeight: 0, top: 16, right: 0 } as const;

function StageCircle({ data }: NodeProps<StageNodeType>) {
  const abbr =
    data.type === "pr" ? "PR"
      : data.type === "publish" ? "P"
        : data.type === "release" ? "R"
          : "U";
  const label =
    data.status === "waiting" && data.detail ? data.detail : data.label;
  const tooltip = data.detail ?? ABBR_LABELS[abbr] ?? data.label;

  const content = (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${STATUS_CLASSES[data.status]}`}
        title={tooltip}
        aria-label={tooltip}
      >
        {abbr}
      </div>
      <span className="text-xs text-text-muted leading-none whitespace-nowrap">
        {label}
      </span>
    </div>
  );

  return (
    <div className="nodrag nopan" style={{ pointerEvents: "all" }}>
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE_L} />
      {data.url ? (
        <a
          href={data.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity cursor-pointer"
          title={tooltip}
        >
          {content}
        </a>
      ) : (
        content
      )}
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE_R} />
    </div>
  );
}

function GroupLabel({ data }: NodeProps<GroupLabelType>) {
  return (
    <div
      className="text-xs font-medium uppercase tracking-wider text-text-muted select-none pointer-events-none"
      style={{ transform: "translateX(-50%)" }}
    >
      {data.label}
    </div>
  );
}

// IMPORTANT: defined outside component to prevent re-render loop
const nodeTypes = { stage: StageCircle, groupLabel: GroupLabel };

// ---------------------------------------------------------------------------
// Layout — generate nodes & edges from derived data
// ---------------------------------------------------------------------------

const STAGE_SPACING = 90;
const GROUP_GAP = 60;
const STAGE_Y = 28;

function buildLayout(groups: { label: string; stages: PipelineStage[] }[]) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let x = 0;

  groups.forEach((group, gi) => {
    if (gi > 0) x += GROUP_GAP;

    const groupStartX = x;

    group.stages.forEach((stage, si) => {
      nodes.push({
        id: stage.id,
        type: "stage",
        position: { x, y: STAGE_Y },
        data: { ...stage },
        draggable: false,
        selectable: false,
        connectable: false,
      });

      // Intra-group edge
      if (si > 0) {
        const prev = group.stages[si - 1];
        edges.push({
          id: `e-${prev.id}-${stage.id}`,
          source: prev.id,
          target: stage.id,
          type: "straight",
          style: { stroke: EDGE_COLORS[prev.status] || EDGE_COLORS.idle, strokeWidth: 2 },
        });
      }

      x += STAGE_SPACING;
    });

    // Group label — centered above stages
    const groupEndX = x - STAGE_SPACING;
    const labelCenterX = (groupStartX + groupEndX) / 2 + 16; // +16 = half node width
    nodes.push({
      id: `label-${group.label}`,
      type: "groupLabel",
      position: { x: labelCenterX, y: 0 },
      data: { label: group.label },
      draggable: false,
      selectable: false,
      connectable: false,
    });

    // Inter-group edge — color reflects upstream completion
    if (gi > 0) {
      const prevGroup = groups[gi - 1];
      const prevLast = prevGroup.stages[prevGroup.stages.length - 1];
      const currFirst = group.stages[0];
      const upstreamColor = EDGE_COLORS[prevLast.status] || EDGE_COLORS.idle;
      edges.push({
        id: `e-${prevLast.id}-${currFirst.id}`,
        source: prevLast.id,
        target: currFirst.id,
        type: "straight",
        style: { stroke: upstreamColor, strokeWidth: 1, strokeDasharray: "6 4" },
      });
    }
  });

  return { nodes, edges };
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
  const isError =
    pluginsStatus.isError || baseStatus.isError || distroStatus.isError;

  const groups = useMemo(
    () =>
      STAGE_GROUPS.map((group) => ({
        ...group,
        stages: group.stages.map((def) => deriveStage(def, statusMap[def.repo])),
      })),
    [pluginsStatus, baseStatus, distroStatus],
  );

  const { nodes, edges } = useMemo(() => buildLayout(groups), [groups]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-text-muted text-sm">
        Loading pipeline status...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-4 text-accent-red text-sm">
        Failed to load pipeline status
      </div>
    );
  }

  return (
    <div style={{ height: 120 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      />
    </div>
  );
}
