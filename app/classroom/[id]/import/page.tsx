import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/BackLink";
import { ImportForm } from "@/components/import/ImportForm";

export default async function ImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const classroom = await prisma.classroom.findUnique({ where: { id } });
  if (!classroom) {
    notFound();
  }

  return (
    <PageContainer>
      <BackLink href={`/classroom/${id}`} label={`Back to ${classroom.language}`} />

      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
        Import a course from a PDF URL
      </h1>
      <p className="mt-1.5 text-ink-muted">
        Fetches a public-domain course PDF, splits it into units, and runs each through the same
        content pipeline as every other lesson. Point this at genuinely open-license/public-domain
        sources only (e.g. FSI course volumes) — it&apos;s built for that, not for scraping copyrighted
        material off the web.
      </p>

      <div className="mt-6">
        <ImportForm classroomId={id} language={classroom.language} />
      </div>
    </PageContainer>
  );
}
