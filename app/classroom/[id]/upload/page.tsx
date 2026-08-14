import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/BackLink";
import { UploadForm } from "@/components/upload/UploadForm";

export default async function UploadLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const classroom = await prisma.classroom.findUnique({
    where: { id },
    include: { units: { orderBy: { order: "asc" }, select: { id: true, title: true } } },
  });

  if (!classroom) {
    notFound();
  }

  return (
    <PageContainer>
      <BackLink href={`/classroom/${id}`} label={`Back to ${classroom.language}`} />

      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
        Upload a Lesson — {classroom.language}
      </h1>
      <p className="mt-1.5 text-ink-muted">
        Pick or create a unit, paste or drop the lesson&apos;s HTML, and preview it before saving.
      </p>

      <div className="mt-8">
        <UploadForm classroomId={classroom.id} units={classroom.units} />
      </div>
    </PageContainer>
  );
}
