import { useTriggerUpdate, useTriggerRelease } from "../lib/actions";
import { useRepoStatus } from "../lib/hooks";
import { getStatusColor } from "../types";
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

  const statusColor = getStatusColor(runningNow, recentRuns);

  return (
    <div className="bg-card rounded-lg overflow-hidden border border-border">
      {/* Status strip - thin colored line at top */}
      <div className={`h-0.5 ${statusColor}`} />
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <span className="font-mono text-sm text-text-secondary">{latestTag ?? "—"}</span>
        </div>

        {isLoading ? (
          <p className="text-text-muted text-sm">Loading...</p>
        ) : (
          <>
            {/* Running workflows */}
            {runningNow.length > 0 && (
              <div className="bg-accent-amber/10 border border-accent-amber/30 rounded p-3 text-sm">
                {runningNow.map((r) => (
                  <div key={r.id}>
                    <a href={r.html_url} target="_blank" rel="noopener noreferrer" className="text-accent-amber hover:underline">
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
                <span className="text-xs font-medium uppercase tracking-wider text-text-muted block mb-1.5">Open PRs:</span>
                {openPRs.map((pr) => (
                  <a
                    key={pr.number}
                    href={pr.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block text-sm hover:underline ${
                      pr.title.includes("chore:") || pr.title.toLowerCase().includes("automated")
                        ? "text-accent-amber"
                        : "text-accent-blue"
                    }`}
                  >
                    #{pr.number} {pr.title}
                  </a>
                ))}
              </div>
            )}

            {/* Recent runs (last 3) */}
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted block mb-1.5">Recent:</span>
              {recentRuns.slice(0, 3).map((run) => (
                <div key={run.id} className="flex items-center gap-2 text-sm mb-1">
                  <StatusBadge status={run.status} conclusion={run.conclusion} />
                  <a href={run.html_url} target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-text-primary truncate">
                    {run.name}
                  </a>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2 border-t border-border">
          <button
            onClick={() => triggerUpdate.mutate()}
            disabled={triggerUpdate.isPending}
            className="flex-1 py-2 rounded text-sm border border-border text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors disabled:opacity-50"
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
            className="flex-1 py-2 rounded text-sm font-medium bg-accent-blue/15 text-accent-blue border border-accent-blue/30 hover:bg-accent-blue/25 transition-colors disabled:opacity-50"
          >
            {triggerRelease.isPending ? "Releasing..." : "Release"}
          </button>
        </div>
      </div>
    </div>
  );
}
