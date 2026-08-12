import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/BackLink";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{exam.title}</h1>
        <Link
          href={`/classroom/${id}/exam/${examId}/edit`}
          className="text-sm font-semibold text-caramel hover:text-caramel-dark hover:underline"
        >
          Edit exam
        </Link>
      </div>

      <p className="mt-1 text-sm text-ink-muted">
        {exam.questions.length} question{exam.questions.length === 1 ? "" : "s"}
      </p>

      <Card className="mt-8 border-dashed p-10 text-center text-sm text-ink-muted">
        Exam-taking flow coming soon. This is a placeholder page.
      </Card>

      <Button disabled className="mt-6">
        Start Exam
      </Button>
    </PageContainer>
  );
}
