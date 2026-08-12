import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { languageEmoji } from "@/lib/languageEmoji";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/BackLink";
import { Card } from "@/components/ui/Card";
import { Badge, statusBadgeProps } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default async function ClassroomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    include: {
      units: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
      exams: true,
    },
  });

  if (!classroom) {
    notFound();
  }

  const allLessons = classroom.units.flatMap((unit) => unit.lessons);
  const completedCount = allLessons.filter((l) => l.status === "completed").length;

  return (
    <PageContainer>
      <BackLink href="/" label="Back to Dashboard" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-beige font-display text-sm font-bold text-caramel-dark shadow-bubble">
            {languageEmoji(classroom.language)}
          </span>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
              {classroom.language}
            </h1>
            {classroom.level && <Badge variant="caramel" className="mt-1">{classroom.level}</Badge>}
          </div>
        </div>

        <div className="w-full max-w-56 sm:w-56">
          <ProgressBar value={completedCount} max={allLessons.length} label="Overall progress" size="sm" />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Units and lessons */}
        <div className="space-y-7">
          {classroom.units.length === 0 ? (
            <Card className="border-dashed p-8 text-center text-ink-muted">
              No units yet for this classroom.
            </Card>
          ) : (
            classroom.units.map((unit) => (
              <div key={unit.id}>
                <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-muted">
                  {unit.title}
                </h2>
                <ul className="mt-2.5 space-y-2">
                  {unit.lessons.map((lesson) => {
                    const { variant, label } = statusBadgeProps(lesson.status);
                    return (
                      <li key={lesson.id}>
                        <Link
                          href={`/classroom/${classroom.id}/lesson/${lesson.id}`}
                          className="flex items-center justify-between rounded-2xl border-2 border-beige-dark/40 bg-beige/60 px-4 py-3.5 text-sm font-semibold text-ink shadow-bubble transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-beige-hover hover:shadow-bubble-hover"
                        >
                          <span>{lesson.title}</span>
                          <Badge variant={variant}>{label}</Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Exams */}
        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-muted">
            Exams
          </h2>
          {classroom.exams.length === 0 ? (
            <Card className="mt-2.5 border-dashed p-6 text-center text-sm text-ink-muted">
              No exams yet for this classroom.
            </Card>
          ) : (
            <ul className="mt-2.5 space-y-2.5">
              {classroom.exams.map((exam) => (
                <li key={exam.id}>
                  <Link href={`/classroom/${classroom.id}/exam/${exam.id}`} className="block">
                    <Card className="px-4 py-3.5 text-sm font-semibold text-ink transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-bubble-hover">
                      {exam.title}
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
