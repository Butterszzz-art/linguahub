import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/BackLink";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

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

      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
        Edit: {exam.title}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Exam builder placeholder — question editing isn&apos;t wired up yet.
      </p>

      <div className="mt-6 space-y-2.5">
        {exam.questions.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-sm text-ink-muted">
            No questions yet.
          </Card>
        ) : (
          exam.questions.map((question) => (
            <Card key={question.id} className="px-4 py-3.5">
              <Badge variant="neutral">{question.type.replace("_", " ")}</Badge>
              <p className="mt-2 text-sm font-semibold text-ink">{question.prompt}</p>
            </Card>
          ))
        )}
      </div>

      <Button disabled className="mt-6">
        + Add Question
      </Button>
    </PageContainer>
  );
}
