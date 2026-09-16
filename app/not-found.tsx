import Link from "next/link";
import { Compass } from "@phosphor-icons/react/dist/ssr";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/buttonStyles";

export default function NotFound() {
  return (
    <PageContainer>
      <Card className="mx-auto mt-10 max-w-md p-10 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-danger-soft">
          <Compass weight="bold" className="size-6 text-danger" />
        </span>
        <Badge variant="danger" className="mt-4">
          404 · Not found
        </Badge>
        <h1 className="mt-3 text-xl font-semibold text-ink">This page wandered off.</h1>
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
