import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getOctokit } from "./github";
import { REPOS, type RepoKey, type BumpType } from "../types";

/** Trigger the Publish Plugins workflow with per-workspace bump config */
export function usePublishPlugins(token: string) {
  const octokit = getOctokit(token);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { config: Record<string, BumpType> }) => {
      await octokit.rest.actions.createWorkflowDispatch({
        ...REPOS.plugins,
        workflow_id: "publish.yml",
        ref: "main",
        inputs: {
          config: JSON.stringify(params.config),
        },
      });
    },
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ["runs", "plugins"] }), 3000);
    },
  });
}

/** Trigger automated-update on any repo */
export function useTriggerUpdate(token: string, repoKey: RepoKey) {
  const octokit = getOctokit(token);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await octokit.rest.actions.createWorkflowDispatch({
        ...REPOS[repoKey],
        workflow_id: "automated-update.yml",
        ref: "main",
      });
    },
    onSuccess: () => {
      setTimeout(() => qc.invalidateQueries({ queryKey: ["runs", repoKey] }), 3000);
    },
  });
}

/** Trigger release workflow on base or distro */
export function useTriggerRelease(token: string, repoKey: "base" | "distro") {
  const octokit = getOctokit(token);
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await octokit.rest.actions.createWorkflowDispatch({
        ...REPOS[repoKey],
        workflow_id: "release.yml",
        ref: "main",
      });
    },
    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["runs", repoKey] });
        qc.invalidateQueries({ queryKey: ["tag", repoKey] });
      }, 3000);
    },
  });
}
