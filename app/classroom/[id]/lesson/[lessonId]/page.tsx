import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/BackLink";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import LessonFrame from "@/components/LessonFrame";
import { markLessonComplete } from "./actions";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id, lessonId } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { unit: { include: { classroom: true } } },
  });

  if (!lesson || lesson.unit.classroomId !== id) {
    notFound();
  }

  const isCompleted = lesson.status === "completed";

  return (
    <PageContainer>
      <BackLink href={`/classroom/${id}`} label={`Back to ${lesson.unit.classroom.language}`} />

      <p className="font-display text-xs font-bold uppercase tracking-wide text-ink-muted">
        {lesson.unit.title}
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">
        {lesson.title}
      </h1>

      {/*
        Lessons may be self-contained interactive HTML (their own <style>/<script> —
        tabs, quizzes, etc.), so we render them inside a sandboxed iframe rather than
        injecting the markup directly into the page. The iframe has no
        "allow-same-origin", so lesson script can't touch this app's DOM, cookies, or
        storage — it only runs in its own isolated context.
      */}
      <Card className="mt-6 p-3">
        <LessonFrame contentHtml={lesson.contentHtml} title={lesson.title} />
      </Card>

      <form action={markLessonComplete} className="mt-5">
        <input type="hidden" name="lessonId" value={lesson.id} />
        <input type="hidden" name="classroomId" value={id} />
        <Button type="submit" variant={isCompleted ? "success" : "primary"} disabled={isCompleted}>
          {isCompleted ? "✓ Completed" : "Mark as complete"}
        </Button>
      </form>
    </PageContainer>
  );
}
