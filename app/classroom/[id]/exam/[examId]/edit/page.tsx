import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/BackLink";

export default async function ExamEditPage({
  params,
}: {
  params: Promise<{ id: string; examId: string }>;
}) {
  const { id, examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { classroom: true, questions: { orderBy: { order: "asc" } } },
  });

  if (!exam || exam.classroomId !== id) {
    notFound();
  }

  return (
    <PageContainer>
      <BackLink href={`/classroom/${id}/exam/${examId}`} label={`Back to ${exam.title}`} />

      <h1 className="text-2xl font-semibold tracking-tight">Edit: {exam.title}</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Exam builder placeholder — question editing isn&apos;t wired up yet.
      </p>

      <div className="mt-6 space-y-2">
        {exam.questions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-black/15 p-8 text-center text-sm text-black/60 dark:border-white/20 dark:text-white/60">
            No questions yet.
          </div>
        ) : (
          exam.questions.map((question) => (
            <div
              key={question.id}
              className="rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/15"
            >
              <span className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
                {question.type.replace("_", " ")}
              </span>
              <p className="mt-1">{question.prompt}</p>
            </div>
          ))
        )}
      </div>

      <button
        disabled
        className="mt-6 cursor-not-allowed rounded-md bg-black/10 px-4 py-2 text-sm font-medium text-black/40 dark:bg-white/10 dark:text-white/40"
      >
        + Add Question
      </button>
    </PageContainer>
  );
}
