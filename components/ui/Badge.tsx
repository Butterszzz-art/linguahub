import type { ReactNode } from "react";

export type BadgeVariant = "neutral" | "caramel" | "success" | "danger";

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-beige text-ink-muted",
  caramel: "bg-caramel-light text-caramel-dark",
  success: "bg-success-light text-success-dark",
  danger: "bg-danger-light text-danger-dark",
};

export function Badge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Maps a Lesson.status value to the right Badge variant + label. */
export function statusBadgeProps(status: string): { variant: BadgeVariant; label: string } {
  switch (status) {
    case "completed":
      return { variant: "success", label: "✓ Completed" };
    case "in_progress":
      return { variant: "caramel", label: "In progress" };
    default:
      return { variant: "neutral", label: "Not started" };
  }
}
