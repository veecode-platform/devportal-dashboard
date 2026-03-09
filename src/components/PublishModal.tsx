import { useState } from "react";
import { usePublishPlugins } from "../lib/actions";
import type { PluginWorkspace, BumpType } from "../types";

export function PublishModal({
  token,
  workspaces,
  onClose,
}: {
  token: string;
  workspaces: PluginWorkspace[];
  onClose: () => void;
}) {
  const [config, setConfig] = useState<Record<string, BumpType>>({});
  const publish = usePublishPlugins(token);

  const selectedCount = Object.keys(config).length;

  function toggle(name: string) {
    setConfig((prev) => {
      const next = { ...prev };
      if (name in next) {
        delete next[name];
      } else {
        next[name] = "patch";
      }
      return next;
    });
  }

  function setBump(name: string, bump: BumpType) {
    setConfig((prev) => ({ ...prev, [name]: bump }));
  }

  function toggleAll() {
    if (selectedCount === workspaces.length) {
      setConfig({});
    } else {
      setConfig(
        Object.fromEntries(
          workspaces.map((w) => [w.name, config[w.name] ?? "patch"])
        )
      );
    }
  }

  function setAllBump(bump: BumpType) {
    setConfig((prev) => {
      const next: Record<string, BumpType> = {};
      for (const key of Object.keys(prev)) {
        next[key] = bump;
      }
      return next;
    });
  }

  function handlePublish() {
    if (selectedCount === 0) return;
    publish.mutate({ config }, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-[540px] max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Publish Plugins</h3>

        {/* Bulk actions */}
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={toggleAll}
            className="text-xs text-neon-blue hover:text-neon-blue/80 transition-colors"
          >
            {selectedCount === workspaces.length ? "Deselect all" : "Select all"}
          </button>
          {selectedCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Set all to:</span>
              {(["patch", "minor", "major"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setAllBump(b)}
                  className="text-xs px-2 py-0.5 rounded bg-page text-text-muted hover:bg-card-hover hover:text-text-primary transition-colors"
                >
                  {b}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Workspace rows */}
        <div className="space-y-1 mb-6">
          {workspaces.map((ws) => {
            const isSelected = ws.name in config;
            return (
              <div
                key={ws.name}
                className={`flex items-center gap-3 p-2 rounded ${
                  isSelected ? "bg-card-hover" : "hover:bg-card-hover/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(ws.name)}
                  className="rounded cursor-pointer"
                />
                <span
                  className={`flex-1 cursor-pointer ${isSelected ? "text-text-primary" : "text-text-secondary"}`}
                  onClick={() => toggle(ws.name)}
                >
                  {ws.name}
                </span>
                <span className="text-text-muted text-sm font-mono w-16 text-right">
                  {ws.version}
                </span>
                {isSelected ? (
                  <select
                    value={config[ws.name]}
                    onChange={(e) => setBump(ws.name, e.target.value as BumpType)}
                    className="bg-page border border-border rounded px-2 py-1 text-sm text-text-primary w-20 cursor-pointer"
                  >
                    <option value="patch">patch</option>
                    <option value="minor">minor</option>
                    <option value="major">major</option>
                  </select>
                ) : (
                  <div className="w-20" />
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-page border border-border text-text-secondary hover:bg-card-hover hover:text-text-primary rounded text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={selectedCount === 0 || publish.isPending}
            className="flex-1 py-2 bg-neon-green/15 text-neon-green border border-neon-green/30 hover:bg-neon-green/25 disabled:opacity-50 rounded text-sm font-medium transition-colors"
          >
            {publish.isPending
              ? "Dispatching..."
              : `Publish ${selectedCount} workspace${selectedCount !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
