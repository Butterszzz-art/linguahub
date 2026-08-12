// Shared bubbly button styling — used on both <button> and <Link> elements,
// so form submits and navigation links look identical.

export type ButtonVariant = "primary" | "secondary" | "success" | "ghost";
export type ButtonSize = "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold " +
  "transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-caramel focus-visible:ring-offset-2 focus-visible:ring-offset-cream " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-caramel text-cream shadow-bubble hover:bg-caramel-dark hover:shadow-bubble-hover hover:-translate-y-0.5 active:translate-y-0",
  secondary:
    "bg-beige text-ink border-2 border-beige-dark hover:bg-beige-hover hover:-translate-y-0.5 active:translate-y-0",
  success:
    "bg-success-light text-success-dark border-2 border-success/40 shadow-none cursor-default",
  ghost: "bg-beige/60 text-ink-muted hover:bg-beige hover:text-ink",
};

const sizes: Record<ButtonSize, string> = {
  md: "px-5 py-2.5 text-sm",
  sm: "px-4 py-1.5 text-xs",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = ""
) {
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");
}
