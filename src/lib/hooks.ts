import { useQuery } from "@tanstack/react-query";
import { getOctokit } from "./github";
import { REPOS, type RepoKey, type PluginWorkspace } from "../types";

function useOctokit(token: string) {
  return getOctokit(token);
}

/** Fetch latest semver tag for a repo */
export function useLatestTag(token: string, repoKey: RepoKey) {
  const octokit = useOctokit(token);
  const { owner, repo } = REPOS[repoKey];

  return useQuery({
    queryKey: ["tag", repoKey],
    queryFn: async () => {
      const { data } = await octokit.rest.repos.listTags({
        owner,
        repo,
        per_page: 20,
      });
      const semver = data.find((t) =>
        /^v?\d+\.\d+\.\d+$/.test(t.name)
      );
      return semver?.name ?? null;
    },
  });
}

/** Fetch open PRs */
export function useOpenPRs(token: string, repoKey: RepoKey) {
  const octokit = useOctokit(token);
  const { owner, repo } = REPOS[repoKey];

  return useQuery({
    queryKey: ["prs", repoKey],
    queryFn: async () => {
      const { data } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: "open",
        per_page: 10,
      });
      return data.map((pr) => ({
        number: pr.number,
        title: pr.title,
        state: pr.state,
        html_url: pr.html_url,
        created_at: pr.created_at,
        head: { ref: pr.head.ref },
      }));
    },
  });
}

/** Fetch recent workflow runs */
export function useRecentRuns(token: string, repoKey: RepoKey) {
  const octokit = useOctokit(token);
  const { owner, repo } = REPOS[repoKey];

  return useQuery({
    queryKey: ["runs", repoKey],
    queryFn: async () => {
      const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        per_page: 10,
      });
      return data.workflow_runs.map((run) => ({
        id: run.id,
        name: run.name ?? "unknown",
        status: run.status,
        conclusion: run.conclusion,
        html_url: run.html_url,
        created_at: run.created_at,
        updated_at: run.updated_at,
        head_branch: run.head_branch,
      }));
    },
  });
}

/** Fetch currently running workflows */
export function useRunningWorkflows(token: string, repoKey: RepoKey) {
  const octokit = useOctokit(token);
  const { owner, repo } = REPOS[repoKey];

  return useQuery({
    queryKey: ["running", repoKey],
    queryFn: async () => {
      const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        status: "in_progress",
      });
      return data.workflow_runs.map((run) => ({
        id: run.id,
        name: run.name ?? "unknown",
        status: run.status,
        conclusion: run.conclusion,
        html_url: run.html_url,
        created_at: run.created_at,
        updated_at: run.updated_at,
        head_branch: run.head_branch,
      }));
    },
  });
}

/** Fetch plugin workspace list + versions from repo file listing */
export function usePluginWorkspaces(token: string) {
  const octokit = useOctokit(token);
  const { owner, repo } = REPOS.plugins;

  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const { data: dirs } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: "workspace",
      });

      if (!Array.isArray(dirs)) return [];

      const workspaces: PluginWorkspace[] = [];

      for (const dir of dirs) {
        if (dir.type !== "dir") continue;
        try {
          const { data: makefile } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: `workspace/${dir.name}/Makefile`,
            mediaType: { format: "raw" },
          });
          const content = typeof makefile === "string" ? makefile : "";
          const match = content.match(/^VERSION \?= (.+)$/m);
          workspaces.push({
            name: dir.name,
            version: match?.[1] ?? "unknown",
          });
        } catch {
          workspaces.push({ name: dir.name, version: "unknown" });
        }
      }

      return workspaces;
    },
    staleTime: 60_000,
  });
}

/** Aggregated repo status (convenience hook) */
export function useRepoStatus(token: string, repoKey: RepoKey) {
  const tag = useLatestTag(token, repoKey);
  const prs = useOpenPRs(token, repoKey);
  const runs = useRecentRuns(token, repoKey);
  const running = useRunningWorkflows(token, repoKey);

  return {
    latestTag: tag.data ?? null,
    openPRs: prs.data ?? [],
    recentRuns: runs.data ?? [],
    runningNow: running.data ?? [],
    isLoading: tag.isLoading || prs.isLoading || runs.isLoading || running.isLoading,
  };
}