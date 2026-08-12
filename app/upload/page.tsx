import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const fieldStyles =
  "mt-1.5 w-full rounded-2xl border-2 border-beige-dark/50 bg-cream px-4 py-2.5 text-sm text-ink " +
  "placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-60";

export default async function UploadPage() {
  const classrooms = await prisma.classroom.findMany({
    orderBy: { language: "asc" },
    include: { units: true },
  });

  return (
    <PageContainer>
      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
        Upload a Lesson
      </h1>
      <p className="mt-1.5 text-ink-muted">
        Form UI only for now — submitting isn&apos;t wired up yet.
      </p>

      <Card className="mt-8 max-w-lg p-6">
        <form className="space-y-5">
          <div>
            <label htmlFor="classroom" className="text-sm font-semibold text-ink">
              Classroom
            </label>
            <select id="classroom" name="classroom" disabled className={fieldStyles}>
              <option value="">Select a classroom…</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.language}
                  {classroom.level ? ` (${classroom.level})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="unit" className="text-sm font-semibold text-ink">
              Unit
            </label>
            <select id="unit" name="unit" disabled className={fieldStyles}>
              <option value="">Select a unit…</option>
            </select>
          </div>

          <div>
            <label htmlFor="title" className="text-sm font-semibold text-ink">
              Lesson Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              disabled
              placeholder="e.g. Ordering Food at a Restaurant"
              className={fieldStyles}
            />
          </div>

          <div>
            <label htmlFor="file" className="text-sm font-semibold text-ink">
              Lesson HTML File
            </label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".html"
              disabled
              className="mt-1.5 w-full text-sm text-ink-muted disabled:cursor-not-allowed disabled:opacity-60 file:mr-3 file:rounded-full file:border-0 file:bg-beige file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink"
            />
            <p className="mt-1.5 text-xs text-ink-faint">
              Content will be sanitized before it&apos;s stored (coming in a later pass).
            </p>
          </div>

          <Button type="submit" disabled>
            Upload Lesson
          </Button>
        </form>
      </Card>
    </PageContainer>
  );
}
