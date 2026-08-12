import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/PageContainer";

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
      <h1 className="text-2xl font-semibold tracking-tight">Your Classrooms</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Pick a language to keep learning.
      </p>

      {classrooms.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-black/15 p-8 text-center text-sm text-black/60 dark:border-white/20 dark:text-white/60">
          No classrooms yet. Run <code>npx prisma db seed</code> to add sample data.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => {
            const lessonCount = classroom.units.reduce(
              (sum, unit) => sum + unit.lessons.length,
              0
            );
            return (
              <Link
                key={classroom.id}
                href={`/classroom/${classroom.id}`}
                className="rounded-lg border border-black/10 p-5 transition-colors hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
              >
                <h2 className="text-lg font-medium">{classroom.language}</h2>
                {classroom.level && (
                  <span className="mt-1 inline-block rounded-full bg-black/5 px-2 py-0.5 text-xs text-black/60 dark:bg-white/10 dark:text-white/60">
                    {classroom.level}
                  </span>
                )}
                <p className="mt-3 text-sm text-black/60 dark:text-white/60">
                  {classroom.units.length} unit{classroom.units.length === 1 ? "" : "s"} ·{" "}
                  {lessonCount} lesson{lessonCount === 1 ? "" : "s"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
