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

  return (
    <div className="bg-gray-900 rounded-lg p-5 flex flex-col gap-4">
      <h2 className="text-lg font-semibold">devportal-plugins</h2>

      {wsLoading ? (
        <p className="text-gray-500 text-sm">Loading workspaces...</p>
      ) : (
        <div>
          <span className="text-gray-400 text-sm block mb-1">Workspaces:</span>
          {workspaces?.map((ws) => (
            <div key={ws.name} className="flex justify-between text-sm py-0.5">
              <span className="text-gray-300">{ws.name}</span>
              <span className="font-mono text-gray-500">{ws.version}</span>
            </div>
          ))}
        </div>
      )}

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
      {!isLoading && recentRuns.length > 0 && (
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
          onClick={() => setShowModal(true)}
          className="flex-1 py-2 bg-green-700 hover:bg-green-600 rounded text-sm font-medium"
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
  );
}
