import type { ReactNode } from "react";
import { Check, Fire } from "@phosphor-icons/react/dist/ssr";

export type BadgeVariant = "neutral" | "accent" | "success" | "danger" | "streak";

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-surface-hover text-ink-muted",
  accent: "bg-accent-soft text-accent-soft-ink",
  success: "bg-success-soft text-success-ink",
  danger: "bg-danger-soft text-danger-ink",
  streak: "bg-streak-soft text-streak-ink",
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
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Standard streak indicator — used on dashboard cards, the classroom header, and the progress stat tile. */
export function StreakBadge({ count, className = "" }: { count: number; className?: string }) {
  return (
    <Badge variant="streak" className={className}>
      <Fire weight="fill" className="size-3" />
      {count}
    </Badge>
  );
}

/** Maps a Lesson.status value to the right Badge variant + label. */
export function statusBadgeProps(status: string): { variant: BadgeVariant; label: ReactNode } {
  switch (status) {
    case "completed":
      return {
        variant: "success",
        label: (
          <>
            <Check weight="bold" className="size-3" />
            Completed
          </>
        ),
      };
    case "in_progress":
      return { variant: "accent", label: "In progress" };
    default:
      return { variant: "neutral", label: "Not started" };
  }
}
