import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/prisma";
import { languageEmoji } from "@/lib/languageEmoji";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/BackLink";
import { Card } from "@/components/ui/Card";
import { Badge, StreakBadge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ClassworkTab } from "@/components/classroom/ClassworkTab";
import { ProgressTab } from "@/components/classroom/ProgressTab";

const TABS = [
  { key: "classwork", label: "Classwork" },
  { key: "progress", label: "Progress" },
] as const;

export default async function ClassroomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "progress" ? "progress" : "classwork";

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
          <span className="flex size-11 items-center justify-center rounded-full bg-surface-hover text-xs font-semibold text-ink">
            {languageEmoji(classroom.language)}
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">{classroom.language}</h1>
            {classroom.level && <Badge variant="accent" className="mt-1">{classroom.level}</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {classroom.streakCount > 0 && (
            <StreakBadge count={classroom.streakCount} className="px-3 py-1.5 text-sm" />
          )}
          <div className="w-full max-w-56 sm:w-56">
            <ProgressBar value={completedCount} max={allLessons.length} label="Overall progress" size="sm" />
          </div>
        </div>
      </div>

      <div className="mt-7 flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/classroom/${id}?tab=${t.key}`}
              className={
                active
                  ? "-mb-px border-b-2 border-accent px-3 py-2.5 text-sm font-semibold text-ink"
                  : "-mb-px border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
              }
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-7 grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          {tab === "classwork" ? (
            <ClassworkTab classroomId={classroom.id} units={classroom.units} />
          ) : (
            <ProgressTab streakCount={classroom.streakCount} units={classroom.units} />
          )}
        </div>

        {/* Exams + shortcuts sidebar — shared across both tabs */}
        <div className="space-y-7">
          {tab === "classwork" && (
            <Link
              href={`/classroom/${id}/upload`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong px-4 py-3.5 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent"
            >
              <Plus weight="bold" className="size-3.5" />
              Upload a lesson
            </Link>
          )}

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Exams</h2>
            {classroom.exams.length === 0 ? (
              <Card className="mt-2.5 border-dashed p-6 text-center text-sm text-ink-muted">
                No exams yet for this classroom.
              </Card>
            ) : (
              <ul className="mt-2.5 space-y-2">
                {classroom.exams.map((exam) => (
                  <li key={exam.id}>
                    <Link href={`/classroom/${classroom.id}/exam/${exam.id}`} className="block">
                      <Card className="px-4 py-3.5 text-sm font-medium text-ink transition-shadow duration-150 ease-out hover:shadow-sm">
                        {exam.title}
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
