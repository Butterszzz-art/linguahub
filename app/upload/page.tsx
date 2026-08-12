import { prisma } from "@/lib/prisma";
import { PageContainer } from "@/components/PageContainer";

export default async function UploadPage() {
  const classrooms = await prisma.classroom.findMany({
    orderBy: { language: "asc" },
    include: { units: true },
  });

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold tracking-tight">Upload a Lesson</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Form UI only for now — submitting isn&apos;t wired up yet.
      </p>

      <form className="mt-8 max-w-lg space-y-5">
        <div>
          <label htmlFor="classroom" className="block text-sm font-medium">
            Classroom
          </label>
          <select
            id="classroom"
            name="classroom"
            disabled
            className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm disabled:opacity-60 dark:border-white/20"
          >
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
          <label htmlFor="unit" className="block text-sm font-medium">
            Unit
          </label>
          <select
            id="unit"
            name="unit"
            disabled
            className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm disabled:opacity-60 dark:border-white/20"
          >
            <option value="">Select a unit…</option>
          </select>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Lesson Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            disabled
            placeholder="e.g. Ordering Food at a Restaurant"
            className="mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm placeholder:text-black/30 disabled:opacity-60 dark:border-white/20 dark:placeholder:text-white/30"
          />
        </div>

        <div>
          <label htmlFor="file" className="block text-sm font-medium">
            Lesson HTML File
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".html"
            disabled
            className="mt-1 w-full text-sm disabled:opacity-60"
          />
          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            Content will be sanitized before it&apos;s stored (coming in a later pass).
          </p>
        </div>

        <button
          type="submit"
          disabled
          className="cursor-not-allowed rounded-md bg-black/10 px-4 py-2 text-sm font-medium text-black/40 dark:bg-white/10 dark:text-white/40"
        >
          Upload Lesson
        </button>
      </form>
    </PageContainer>
  );
}
