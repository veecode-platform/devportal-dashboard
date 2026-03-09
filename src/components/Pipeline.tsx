import { PluginsCard } from "./PluginsCard";
import { RepoCard } from "./RepoCard";
import { ActivityFeed } from "./ActivityFeed";

export function Pipeline({ token }: { token: string }) {
  return (
    <div className="space-y-6">
      {/* Three-column pipeline view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PluginsCard token={token} />
        <RepoCard token={token} repoKey="base" title="devportal-base" />
        <RepoCard token={token} repoKey="distro" title="devportal-distro" />
      </div>

      {/* Activity feed below */}
      <ActivityFeed token={token} />
    </div>
  );
}
