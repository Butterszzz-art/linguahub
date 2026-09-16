import { prisma } from "@/lib/prisma";
import { extractPdfText } from "@/lib/pdfImport/extractPdfText";
import { splitIntoUnits } from "@/lib/pdfImport/splitUnits";
import { restructureUnit } from "@/lib/pdfImport/restructureUnit";
import { renderLessonHtml, type LessonSections } from "@/lib/lessonRenderer";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { classroomId, unitTitle, pdfUrl, language, langCode, selectedNumbers } = (body ?? {}) as {
    classroomId?: unknown;
    unitTitle?: unknown;
    pdfUrl?: unknown;
    language?: unknown;
    langCode?: unknown;
    selectedNumbers?: unknown;
  };

  if (typeof classroomId !== "string" || classroomId.trim().length === 0) {
    return Response.json({ error: "classroomId is required" }, { status: 400 });
  }
  if (typeof unitTitle !== "string" || unitTitle.trim().length === 0) {
    return Response.json({ error: "unitTitle is required" }, { status: 400 });
  }
  if (typeof pdfUrl !== "string" || pdfUrl.trim().length === 0) {
    return Response.json({ error: "pdfUrl is required" }, { status: 400 });
  }
  if (typeof language !== "string" || language.trim().length === 0) {
    return Response.json({ error: "language is required" }, { status: 400 });
  }
  if (typeof langCode !== "string" || langCode.trim().length === 0) {
    return Response.json({ error: "langCode is required" }, { status: 400 });
  }
  if (!Array.isArray(selectedNumbers) || !selectedNumbers.every((n) => typeof n === "number")) {
    return Response.json({ error: "selectedNumbers must be an array of numbers" }, { status: 400 });
  }

  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) {
    return Response.json({ error: "Classroom not found" }, { status: 404 });
  }

  // Re-run fetch+extract+split rather than trusting whatever the client
  // remembers from the detect-units call — it's deterministic given the same
  // URL, and this avoids needing a temp-storage layer between the two steps
  // for what's likely a large body of text.
  let rawText: string;
  try {
    rawText = await extractPdfText(pdfUrl.trim());
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: detail }, { status: 502 });
  }
  const allUnits = splitIntoUnits(rawText);
  const selected = allUnits.filter((u) => selectedNumbers.includes(u.number));

  if (selected.length === 0) {
    return Response.json({ error: "None of the selected units matched — try re-running detection." }, { status: 400 });
  }

  const last = await prisma.unit.findFirst({
    where: { classroomId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const unit = await prisma.unit.create({
    data: { classroomId, title: unitTitle.trim(), order: (last?.order ?? 0) + 1 },
  });

  const created: { title: string; lessonId?: string; error?: string }[] = [];

  // Sequential, not Promise.all — this hits an external API once per unit,
  // and running many in parallel risks tripping the endpoint's rate limits
  // with no real time benefit for what's an already-long-running import.
  for (const [i, u] of selected.entries()) {
    const title = u.headingText || `Unit ${u.number}`;
    try {
      const restructured = await restructureUnit(u.rawText, { language, unitTitle: title });
      const sections: LessonSections = {
        OVERVIEW: restructured.overview,
        GRAMMAR: restructured.grammar,
        "CONJUGATION TABLE": restructured.conjugationTable,
        VOCABULARY: restructured.vocabulary,
        EXAMPLES: restructured.examples,
        NOTES: restructured.notes,
        PRACTICE: restructured.practice,
      };
      const html = renderLessonHtml({
        langCode,
        kicker: `${unitTitle.trim()} · Unit ${u.number}`,
        title,
        sections,
      });

      const lesson = await prisma.lesson.create({
        data: { unitId: unit.id, title: `Unit ${u.number}: ${title}`, order: i, contentHtml: html },
      });
      created.push({ title: lesson.title, lessonId: lesson.id });
    } catch (err) {
      // One failed unit shouldn't sink the whole import — record it and move
      // on, so a single bad restructuring call doesn't lose everything else.
      created.push({ title, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return Response.json({ unitId: unit.id, lessons: created });
}
