// Shared button styling — used on both <button> and <Link> elements, so
// form submits and navigation links look identical.

export type ButtonVariant = "primary" | "secondary" | "success" | "ghost";
export type ButtonSize = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium " +
  "transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
  "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary:
    "border border-border-strong bg-surface text-ink hover:bg-surface-hover",
  success: "border border-success/30 bg-success-soft text-success-ink cursor-default",
  ghost: "text-ink-muted hover:bg-surface-hover hover:text-ink",
};

const sizes: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-sm",
  sm: "px-3 py-1.5 text-xs",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = ""
) {
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");
}
