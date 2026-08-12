export function ProgressBar({
  value,
  max,
  label,
  size = "md",
}: {
  value: number;
  max: number;
  label?: string;
  size?: "sm" | "md";
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const height = size === "sm" ? "h-2" : "h-3";

  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink-muted">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full overflow-hidden rounded-full bg-beige-dark/50 ${height}`}
      >
        <div
          className="h-full rounded-full bg-caramel transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
