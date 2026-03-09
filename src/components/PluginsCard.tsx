import { useState } from "react";
import { usePluginWorkspaces, useRepoStatus } from "../lib/hooks";
import { useTriggerUpdate } from "../lib/actions";
import { getStatusColor } from "../types";
import { ConfirmDialog } from "./ConfirmDialog";
import { PublishModal } from "./PublishModal";
import { StatusBadge } from "./StatusBadge";

export function PluginsCard({ token }: { token: string }) {
  const [showModal, setShowModal] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const { data: workspaces, isLoading: wsLoading } = usePluginWorkspaces(token);
  const { runningNow, recentRuns, openPRs, isLoading } = useRepoStatus(token, "plugins");
  const triggerUpdate = useTriggerUpdate(token, "plugins");

  const statusColor = getStatusColor(runningNow, recentRuns);

  return (
    <div className="bg-card rounded-lg overflow-hidden border border-border flex flex-col">
      {/* Status strip - thin colored line at top */}
      <div className={`h-0.5 ${statusColor}`} />
      <div className="p-5 flex flex-col gap-4 flex-1">
        <h2 className="text-base font-semibold text-text-primary">devportal-plugins</h2>

        {wsLoading ? (
          <p className="text-text-muted text-sm">Loading workspaces...</p>
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
        {!isLoading && recentRuns.length > 0 && (
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
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2 border-t border-border">
          <button
            onClick={() => setShowUpdateConfirm(true)}
            disabled={triggerUpdate.isPending}
            className="flex-1 py-2.5 rounded-md text-sm border border-border text-text-secondary cursor-pointer hover:text-text-primary hover:border-text-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {triggerUpdate.isPending ? "Running..." : "Run Automated Update"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 py-2.5 rounded-md text-sm font-medium bg-accent-green/15 text-accent-green border border-accent-green/30 cursor-pointer hover:bg-accent-green/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Publish
          </button>
        </div>

        {showUpdateConfirm && (
          <ConfirmDialog
            title="Run Automated Update"
            message="This will trigger the automated update workflow for devportal-plugins. It will open a PR with dependency bumps."
            confirmLabel="Run Update"
            onConfirm={() => {
              triggerUpdate.mutate();
              setShowUpdateConfirm(false);
            }}
            onCancel={() => setShowUpdateConfirm(false)}
          />
        )}

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
