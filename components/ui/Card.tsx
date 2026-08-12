import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border-2 border-beige-dark/40 bg-beige/60 shadow-bubble ${className}`}
    >
      {children}
    </div>
  );
}
