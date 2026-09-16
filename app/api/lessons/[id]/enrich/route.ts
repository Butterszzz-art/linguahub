import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/prisma";
import { enrichLessonContent } from "@/lib/contentEnrichment";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: { unit: { include: { classroom: true } } },
  });
  if (!lesson) {
    return Response.json({ error: "Lesson not found" }, { status: 404 });
  }

  // Lessons are self-contained HTML (their own <style>/<script> — see
  // components/LessonFrame.tsx). For enrichment we only want the readable
  // text, not markup/CSS/JS, so strip everything down to plain text rather
  // than sending the raw file to the API.
  const plainText = sanitizeHtml(lesson.contentHtml, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.length === 0) {
    return Response.json({ error: "Lesson has no readable text content to enrich" }, { status: 400 });
  }

  let enrichment;
  try {
    enrichment = await enrichLessonContent(plainText, {
      language: lesson.unit.classroom.language,
      lessonTitle: lesson.title,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Enrichment API error: ${detail}` }, { status: 502 });
  }

  const updated = await prisma.lesson.update({
    where: { id },
    data: {
      summary: enrichment.summary,
      keyVocabulary: JSON.stringify(enrichment.keyVocabulary),
      keyGrammarPoints: JSON.stringify(enrichment.keyGrammarPoints),
      enrichedAt: new Date(),
    },
  });

  return Response.json({
    summary: updated.summary,
    keyVocabulary: enrichment.keyVocabulary,
    keyGrammarPoints: enrichment.keyGrammarPoints,
    enrichedAt: updated.enrichedAt,
  });
}
