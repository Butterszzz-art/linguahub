import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { languageEmoji } from "@/lib/languageEmoji";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

// Lesson uploads are scoped to a classroom (so the unit picker + live preview
// know what they're working with) — this page is just the "which classroom?"
// jumping-off point into /classroom/[id]/upload.
export default async function UploadChooserPage() {
  const classrooms = await prisma.classroom.findMany({
    orderBy: { language: "asc" },
  });

  return (
    <PageContainer>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Upload a Lesson</h1>
      <p className="mt-1.5 text-ink-muted">Pick a classroom to upload a lesson into.</p>

      {classrooms.length === 0 ? (
        <Card className="mt-8 max-w-lg border-dashed p-8 text-center">
          <p className="text-ink-muted">No classrooms yet — create one first.</p>
          <Link href="/classrooms/new" className="mt-4 inline-block">
            <Button>+ New Classroom</Button>
          </Link>
        </Card>
      ) : (
        <div className="mt-8 grid max-w-lg grid-cols-1 gap-3">
          {classrooms.map((classroom) => (
            <Link key={classroom.id} href={`/classroom/${classroom.id}/upload`} className="group block">
              <Card className="flex items-center gap-3 p-4 transition-all duration-150 ease-out group-hover:-translate-y-0.5 group-hover:shadow-bubble-hover">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cream font-display text-xs font-bold text-caramel-dark shadow-bubble">
                  {languageEmoji(classroom.language)}
                </span>
                <span className="font-display font-semibold text-ink">{classroom.language}</span>
                {classroom.level && <Badge variant="caramel">{classroom.level}</Badge>}
              </Card>
            </Link>
          ))}
          <Link href="/classrooms/new" className="text-sm font-semibold text-caramel hover:text-caramel-dark hover:underline">
            + New Classroom
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
