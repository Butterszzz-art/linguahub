import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { languageEmoji } from "@/lib/languageEmoji";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

// Also has no dynamic route segments — see app/page.tsx for why this needs
// to stay off the build-time static prerender path.
export const dynamic = "force-dynamic";

// Lesson uploads are scoped to a classroom (so the unit picker + live preview
// know what they're working with) — this page is just the "which classroom?"
// jumping-off point into /classroom/[id]/upload.
export default async function UploadChooserPage() {
  const classrooms = await prisma.classroom.findMany({
    orderBy: { language: "asc" },
  });

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Upload a Lesson</h1>
      <p className="mt-1.5 text-sm text-ink-muted">Pick a classroom to upload a lesson into.</p>

      {classrooms.length === 0 ? (
        <Card className="mt-8 max-w-lg border-dashed p-8 text-center">
          <p className="text-sm text-ink-muted">No classrooms yet. Create one first.</p>
          <Link href="/classrooms/new" className="mt-4 inline-block">
            <Button>New Classroom</Button>
          </Link>
        </Card>
      ) : (
        <div className="mt-8 grid max-w-lg grid-cols-1 gap-2.5">
          {classrooms.map((classroom) => (
            <Link key={classroom.id} href={`/classroom/${classroom.id}/upload`} className="group block">
              <Card className="flex items-center gap-3 p-4 transition-shadow duration-150 ease-out group-hover:shadow-sm">
                <span className="flex size-9 items-center justify-center rounded-full bg-surface-hover text-xs font-semibold text-ink">
                  {languageEmoji(classroom.language)}
                </span>
                <span className="text-sm font-medium text-ink">{classroom.language}</span>
                {classroom.level && <Badge variant="accent">{classroom.level}</Badge>}
              </Card>
            </Link>
          ))}
          <Link
            href="/classrooms/new"
            className="text-sm font-medium text-accent hover:text-accent-hover"
          >
            + New Classroom
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
