import Link from "next/link";

export function NavBar() {
  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          LinguaHub
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Dashboard
          </Link>
          <Link href="/upload" className="hover:underline">
            Upload
          </Link>
        </nav>
      </div>
    </header>
  );
}
