import Link from "next/link";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/buttonStyles";

export default function NotFound() {
  return (
    <PageContainer>
      <Card className="mx-auto mt-10 max-w-md p-10 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-light text-3xl">
          🧭
        </span>
        <Badge variant="danger" className="mt-4">
          404 — Not found
        </Badge>
        <h1 className="mt-3 font-display text-2xl font-bold text-ink">
          This page wandered off.
        </h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Whatever you were looking for isn&apos;t here. Let&apos;s get you back on track.
        </p>
        <Link href="/" className={buttonStyles("primary", "md", "mt-6")}>
          Back to Dashboard
        </Link>
      </Card>
    </PageContainer>
  );
}
