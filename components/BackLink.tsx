import Link from "next/link";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm text-black/60 hover:text-black hover:underline dark:text-white/60 dark:hover:text-white"
    >
      ← {label}
    </Link>
  );
}
