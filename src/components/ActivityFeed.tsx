import { useRecentRuns } from "../lib/hooks";
import type { RepoKey } from "../types";
import { StatusBadge } from "./StatusBadge";

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const REPO_DOT: Record<RepoKey, string> = {
  plugins: "bg-neon-blue",
  base: "bg-neon-green",
  distro: "bg-neon-purple",
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
    <div className="bg-feed rounded-lg border border-border overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Recent Activity
        </h2>
      </div>
      <div className="divide-y divide-border-subtle max-h-72 overflow-y-auto">
        {allRuns.slice(0, 20).map((run) => (
          <div
            key={`${run.repo}-${run.id}`}
            className="flex items-center gap-3 px-5 py-2 text-sm hover:bg-card-hover/50 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${REPO_DOT[run.repo]}`} />
            <span className="font-mono text-text-muted w-16 shrink-0 text-xs">
              {timeAgo(run.created_at)}
            </span>
            <span className="text-text-muted w-16 shrink-0 text-xs">{run.repo}</span>
            <a
              href={run.html_url}
              target="_blank"
              className="text-text-secondary hover:text-text-primary truncate"
            >
              {run.name}
            </a>
            <span className="ml-auto shrink-0">
              <StatusBadge status={run.status} conclusion={run.conclusion} />
            </span>
          </div>
        ))}
        {allRuns.length === 0 && (
          <p className="text-text-muted text-sm px-5 py-4">No recent activity.</p>
        )}
      </div>
    </div>
  );
}
