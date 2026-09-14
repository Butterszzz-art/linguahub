"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Translate, UploadSimple } from "@phosphor-icons/react/dist/ssr";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/upload", label: "Upload", icon: UploadSimple },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
          <Translate weight="bold" className="size-5 text-accent" />
          LinguaHub
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "flex items-center gap-1.5 rounded-lg bg-surface-hover px-3 py-1.5 text-ink"
                    : "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
                }
              >
                {Icon && <Icon weight="bold" className="size-3.5" />}
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
