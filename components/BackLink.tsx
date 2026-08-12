import Link from "next/link";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-beige/70 py-1.5 pl-2.5 pr-4 text-sm font-semibold text-ink-muted transition-colors hover:bg-beige hover:text-ink"
    >
      <span aria-hidden className="text-base leading-none">
        ←
      </span>
      {label}
    </Link>
  );
}
