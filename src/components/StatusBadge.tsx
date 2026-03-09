export function StatusBadge({
  status,
  conclusion,
}: {
  status: string | null;
  conclusion: string | null;
}) {
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-amber/15 text-accent-amber text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" />
        running
      </span>
    );
  }
  if (conclusion === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-green/15 text-accent-green text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
        success
      </span>
    );
  }
  if (conclusion === "failure") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent-red/15 text-accent-red text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-red" />
        failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-text-muted/15 text-text-secondary text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
      {status ?? "unknown"}
    </span>
  );
}
