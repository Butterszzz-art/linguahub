import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { languageEmoji } from "@/lib/languageEmoji";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default async function DashboardPage() {
  const classrooms = await prisma.classroom.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      units: {
        include: { lessons: true },
      },
    },
  });

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Your Classrooms
          </h1>
          <p className="mt-1.5 text-ink-muted">Pick a language to keep learning.</p>
        </div>
        <Link href="/classrooms/new">
          <Button variant="secondary">+ New Classroom</Button>
        </Link>
      </div>

      {classrooms.length === 0 ? (
        <Card className="mt-8 border-dashed p-10 text-center">
          <p className="text-ink-muted">
            No classrooms yet. Run <code className="rounded bg-beige px-1.5 py-0.5">npx prisma db seed</code> to
            add sample data.
          </p>
        </Card>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => {
            const lessons = classroom.units.flatMap((unit) => unit.lessons);
            const lessonCount = lessons.length;
            const completedCount = lessons.filter((l) => l.status === "completed").length;

            return (
              <Link key={classroom.id} href={`/classroom/${classroom.id}`} className="group block">
                <Card className="h-full p-6 transition-all duration-150 ease-out group-hover:-translate-y-1 group-hover:shadow-bubble-hover">
                  <div className="flex items-start justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cream font-display text-sm font-bold text-caramel-dark shadow-bubble">
                      {languageEmoji(classroom.language)}
                    </span>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {classroom.streakCount > 0 && (
                        <Badge variant="caramel">🔥 {classroom.streakCount}</Badge>
                      )}
                      {classroom.level && <Badge variant="caramel">{classroom.level}</Badge>}
                    </div>
                  </div>

                  <h2 className="mt-4 font-display text-xl font-bold text-ink">
                    {classroom.language}
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {classroom.units.length} unit{classroom.units.length === 1 ? "" : "s"} ·{" "}
                    {lessonCount} lesson{lessonCount === 1 ? "" : "s"}
                  </p>

                  <div className="mt-5">
                    <ProgressBar value={completedCount} max={lessonCount} label="Progress" size="sm" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
