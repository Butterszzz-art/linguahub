"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b-2 border-beige-dark/40 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 font-display text-xl font-bold text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-caramel text-lg shadow-bubble">
            🌍
          </span>
          LinguaHub
        </Link>
        <nav className="flex items-center gap-1.5 text-sm font-semibold">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "rounded-full bg-caramel px-4 py-2 text-cream shadow-bubble"
                    : "rounded-full px-4 py-2 text-ink-muted transition-colors hover:bg-beige hover:text-ink"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
