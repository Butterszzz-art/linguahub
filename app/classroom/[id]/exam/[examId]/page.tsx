import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/BackLink";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ id: string; examId: string }>;
}) {
  const { id, examId } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { classroom: true, questions: true },
  });

  if (!exam || exam.classroomId !== id) {
    notFound();
  }

  return (
    <PageContainer>
      <BackLink href={`/classroom/${id}`} label={`Back to ${exam.classroom.language}`} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{exam.title}</h1>
        <Link
          href={`/classroom/${id}/exam/${examId}/edit`}
          className="text-sm text-black/60 hover:underline dark:text-white/60"
        >
          Edit exam
        </Link>
      </div>

      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        {exam.questions.length} question{exam.questions.length === 1 ? "" : "s"}
      </p>

      <div className="mt-8 rounded-lg border border-dashed border-black/15 p-8 text-center text-sm text-black/60 dark:border-white/20 dark:text-white/60">
        Exam-taking flow coming soon. This is a placeholder page.
      </div>

      <button
        disabled
        className="mt-6 cursor-not-allowed rounded-md bg-black/10 px-4 py-2 text-sm font-medium text-black/40 dark:bg-white/10 dark:text-white/40"
      >
        Start Exam
      </button>
    </PageContainer>
  );
}
