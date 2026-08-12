import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/BackLink";

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

  return (
    <PageContainer>
      <BackLink href={`/classroom/${id}`} label={`Back to ${lesson.unit.classroom.language}`} />

      <p className="text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
        {lesson.unit.title}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{lesson.title}</h1>

      {/*
        TODO(next pass): sanitize contentHtml with sanitize-html before rendering.
        For this skeleton pass we render it as-is since content is only ever
        manually uploaded by the single user.
      */}
      <div
        className="prose prose-neutral mt-6 max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: lesson.contentHtml }}
      />
    </PageContainer>
  );
}
