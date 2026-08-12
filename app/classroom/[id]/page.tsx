import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/BackLink";

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

  return (
    <PageContainer>
      <BackLink href="/" label="Back to Dashboard" />

      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{classroom.language}</h1>
        {classroom.level && (
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-black/60 dark:bg-white/10 dark:text-white/60">
            {classroom.level}
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Sidebar: units and lessons */}
        <div className="space-y-6">
          {classroom.units.length === 0 ? (
            <p className="text-sm text-black/60 dark:text-white/60">
              No units yet for this classroom.
            </p>
          ) : (
            classroom.units.map((unit) => (
              <div key={unit.id}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
                  {unit.title}
                </h2>
                <ul className="mt-2 divide-y divide-black/10 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
                  {unit.lessons.map((lesson) => (
                    <li key={lesson.id}>
                      <Link
                        href={`/classroom/${classroom.id}/lesson/${lesson.id}`}
                        className="flex items-center justify-between px-4 py-3 text-sm hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <span>{lesson.title}</span>
                        <span className="text-xs text-black/40 dark:text-white/40">
                          {lesson.status.replace("_", " ")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Panel: exams */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
            Exams
          </h2>
          {classroom.exams.length === 0 ? (
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              No exams yet for this classroom.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {classroom.exams.map((exam) => (
                <li key={exam.id}>
                  <Link
                    href={`/classroom/${classroom.id}/exam/${exam.id}`}
                    className="block rounded-lg border border-black/10 px-4 py-3 text-sm hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
                  >
                    {exam.title}
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
