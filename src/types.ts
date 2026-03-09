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
