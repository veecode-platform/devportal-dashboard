import { useState } from "react";
import { usePluginWorkspaces, useRepoStatus } from "../lib/hooks";
import { useTriggerUpdate } from "../lib/actions";
import { PublishModal } from "./PublishModal";
import { StatusBadge } from "./StatusBadge";

export function PluginsCard({ token }: { token: string }) {
  const [showModal, setShowModal] = useState(false);
  const { data: workspaces, isLoading: wsLoading } = usePluginWorkspaces(token);
  const { runningNow, recentRuns, openPRs, isLoading } = useRepoStatus(token, "plugins");
  const triggerUpdate = useTriggerUpdate(token, "plugins");

  const statusColor =
    runningNow.length > 0
      ? "bg-neon-amber"
      : recentRuns[0]?.conclusion === "failure"
        ? "bg-neon-red"
        : recentRuns[0]?.conclusion === "success"
          ? "bg-neon-green"
          : "bg-border";

  return (
    <div className="bg-card rounded-lg overflow-hidden border border-border">
      {/* Status strip - thin colored line at top */}
      <div className={`h-0.5 ${statusColor}`} />
      <div className="p-5 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-text-primary">devportal-plugins</h2>

        {wsLoading ? (
          <p className="text-gray-500 text-sm">Loading workspaces...</p>
        ) : (
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted block mb-1.5">Workspaces:</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {workspaces?.map((ws) => (
                <div key={ws.name} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{ws.name}</span>
                  <span className="font-mono text-text-muted">{ws.version}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Running workflows */}
        {runningNow.length > 0 && (
          <div className="bg-neon-amber/10 border border-neon-amber/30 rounded p-3 text-sm">
            {runningNow.map((r) => (
              <div key={r.id}>
                <a href={r.html_url} target="_blank" className="text-neon-amber hover:underline">
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
                className={`block text-sm hover:underline ${
                  pr.title.includes("chore:") || pr.title.toLowerCase().includes("automated")
                    ? "text-neon-amber"
                    : "text-neon-blue"
                }`}
              >
                #{pr.number} {pr.title}
              </a>
            ))}
          </div>
        )}

        {/* Recent runs (last 3) */}
        {!isLoading && recentRuns.length > 0 && (
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted block mb-1.5">Recent:</span>
            {recentRuns.slice(0, 3).map((run) => (
              <div key={run.id} className="flex items-center gap-2 text-sm mb-1">
                <StatusBadge status={run.status} conclusion={run.conclusion} />
                <a href={run.html_url} target="_blank" className="text-text-secondary hover:text-text-primary truncate">
                  {run.name}
                </a>
              </div>
            ))}
          </div>
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
            onClick={() => setShowModal(true)}
            className="flex-1 py-2 rounded text-sm font-medium bg-neon-green/15 text-neon-green border border-neon-green/30 hover:bg-neon-green/25 transition-colors"
          >
            Publish
          </button>
        </div>

        {showModal && workspaces && (
          <PublishModal
            token={token}
            workspaces={workspaces}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </div>
  );
}
