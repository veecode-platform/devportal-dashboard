import { useRecentRuns } from "../lib/hooks";
import type { RepoKey } from "../types";

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const STATUS_COLORS: Record<string, string> = {
  success: "text-green-400",
  failure: "text-red-400",
  in_progress: "text-yellow-400",
  queued: "text-gray-400",
};

export function ActivityFeed({ token }: { token: string }) {
  const plugins = useRecentRuns(token, "plugins");
  const base = useRecentRuns(token, "base");
  const distro = useRecentRuns(token, "distro");

  // Merge and sort by created_at desc
  const allRuns = [
    ...(plugins.data ?? []).map((r) => ({ ...r, repo: "plugins" as RepoKey })),
    ...(base.data ?? []).map((r) => ({ ...r, repo: "base" as RepoKey })),
    ...(distro.data ?? []).map((r) => ({ ...r, repo: "distro" as RepoKey })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="bg-gray-900 rounded-lg p-5">
      <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {allRuns.slice(0, 20).map((run) => (
          <div key={`${run.repo}-${run.id}`} className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 w-16 shrink-0">{timeAgo(run.created_at)}</span>
            <span className="text-gray-400 w-20 shrink-0">{run.repo}</span>
            <a
              href={run.html_url}
              target="_blank"
              className="text-gray-300 hover:text-white truncate"
            >
              {run.name}
            </a>
            <span className={`ml-auto shrink-0 ${STATUS_COLORS[run.conclusion ?? run.status ?? ""] ?? "text-gray-500"}`}>
              {run.conclusion ?? run.status}
            </span>
          </div>
        ))}
        {allRuns.length === 0 && (
          <p className="text-gray-500 text-sm">No recent activity.</p>
        )}
      </div>
    </div>
  );
}
