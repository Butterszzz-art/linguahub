import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/BackLink";
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

      <p className="text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
        {lesson.unit.title}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{lesson.title}</h1>

      {/*
        Lessons may be self-contained interactive HTML (their own <style>/<script> —
        tabs, quizzes, etc.), so we render them inside a sandboxed iframe rather than
        injecting the markup directly into the page. The iframe has no
        "allow-same-origin", so lesson script can't touch this app's DOM, cookies, or
        storage — it only runs in its own isolated context.
      */}
      <div className="mt-6">
        <LessonFrame contentHtml={lesson.contentHtml} title={lesson.title} />
      </div>

      <form action={markLessonComplete} className="mt-4">
        <input type="hidden" name="lessonId" value={lesson.id} />
        <input type="hidden" name="classroomId" value={id} />
        <button
          type="submit"
          disabled={isCompleted}
          className={
            isCompleted
              ? "cursor-default rounded-md bg-green-600/10 px-4 py-2 text-sm font-medium text-green-700 dark:bg-green-400/10 dark:text-green-400"
              : "rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
          }
        >
          {isCompleted ? "✓ Completed" : "Mark as complete"}
        </button>
      </form>
    </PageContainer>
  );
}
