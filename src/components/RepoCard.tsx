import { useTriggerUpdate, useTriggerRelease } from "../lib/actions";
import { useRepoStatus } from "../lib/hooks";
import { StatusBadge } from "./StatusBadge";

export function RepoCard({
  token,
  repoKey,
  title,
}: {
  token: string;
  repoKey: "base" | "distro";
  title: string;
}) {
  const { latestTag, openPRs, runningNow, recentRuns, isLoading } = useRepoStatus(token, repoKey);
  const triggerUpdate = useTriggerUpdate(token, repoKey);
  const triggerRelease = useTriggerRelease(token, repoKey);

  return (
    <div className="bg-gray-900 rounded-lg p-5 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : (
        <>
          {/* Version */}
          <div>
            <span className="text-gray-400 text-sm">Latest release:</span>
            <span className="ml-2 font-mono text-white">{latestTag ?? "none"}</span>
          </div>

          {/* Running workflows */}
          {runningNow.length > 0 && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3 text-sm">
              {runningNow.map((r) => (
                <div key={r.id}>
                  <a href={r.html_url} target="_blank" className="text-yellow-300 hover:underline">
                    {r.name}
                  </a>{" "}
                  — running
                </div>
              ))}
            </div>
          )}

          {/* Open PRs */}
          {openPRs.length > 0 && (
            <div>
              <span className="text-gray-400 text-sm block mb-1">Open PRs:</span>
              {openPRs.map((pr) => (
                <a
                  key={pr.number}
                  href={pr.html_url}
                  target="_blank"
                  className="block text-blue-400 hover:underline text-sm"
                >
                  #{pr.number} {pr.title}
                </a>
              ))}
            </div>
          )}

          {/* Recent runs (last 3) */}
          <div>
            <span className="text-gray-400 text-sm block mb-1">Recent:</span>
            {recentRuns.slice(0, 3).map((run) => (
              <div key={run.id} className="flex items-center gap-2 text-sm mb-1">
                <StatusBadge status={run.status} conclusion={run.conclusion} />
                <a href={run.html_url} target="_blank" className="text-gray-300 hover:text-white truncate">
                  {run.name}
                </a>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-gray-800">
        <button
          onClick={() => triggerUpdate.mutate()}
          disabled={triggerUpdate.isPending}
          className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded text-sm"
        >
          {triggerUpdate.isPending ? "Running..." : "Run Automated Update"}
        </button>
        <button
          onClick={() => {
            if (confirm(`Release ${title}? This creates a new tag and triggers the build pipeline.`)) {
              triggerRelease.mutate();
            }
          }}
          disabled={triggerRelease.isPending}
          className="flex-1 py-2 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded text-sm"
        >
          {triggerRelease.isPending ? "Releasing..." : "Release"}
        </button>
      </div>
    </div>
  );
}
