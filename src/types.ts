export const REPOS = {
  plugins: { owner: "veecode-platform", repo: "devportal-plugins" },
  base: { owner: "veecode-platform", repo: "devportal-base" },
  distro: { owner: "veecode-platform", repo: "devportal-distro" },
} as const;

export type RepoKey = keyof typeof REPOS;

export interface WorkflowRun {
  id: number;
  name: string;
  status: string | null;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  head_branch: string | null;
}

export interface PullRequest {
  number: number;
  title: string;
  state: string;
  html_url: string;
  created_at: string;
  head: { ref: string };
}

export interface RepoStatus {
  latestTag: string | null;
  openPRs: PullRequest[];
  recentRuns: WorkflowRun[];
  runningNow: WorkflowRun[];
}

export interface PluginWorkspace {
  name: string;
  version: string;
}

export type BumpType = "patch" | "minor" | "major";

/** Derive the card status-strip color from repo status */
export function getStatusColor(runningNow: WorkflowRun[], recentRuns: WorkflowRun[]): string {
  if (runningNow.length > 0) return "bg-accent-amber";
  if (recentRuns[0]?.conclusion === "failure") return "bg-accent-red";
  if (recentRuns[0]?.conclusion === "success") return "bg-accent-green";
  return "bg-border";
}

export type StageStatus = "idle" | "running" | "done" | "failed" | "waiting";

export interface PipelineStage {
  id: string;
  label: string;
  repo: RepoKey;
  type: "workflow" | "pr" | "publish" | "release";
  status: StageStatus;
  detail?: string;
  url?: string;
}
