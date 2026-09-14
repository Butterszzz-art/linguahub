import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
    >
      <ArrowLeft weight="bold" className="size-3.5" />
      {label}
    </Link>
  );
}
