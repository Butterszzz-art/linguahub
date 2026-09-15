import { prisma } from "@/lib/prisma";
import { getAssistantReply, type ConversationTurn } from "@/lib/conversationProvider";

function parseVocab(json: string | null): { term: string; translation: string }[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseGrammarPoints(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { content } = (body ?? {}) as { content?: unknown };
  if (typeof content !== "string" || content.trim().length === 0) {
    return Response.json({ error: "content is required" }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      classroom: true,
      lesson: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Saved before calling the provider, so a failed/slow API response never
  // loses the learner's turn — only the assistant's reply is missing until
  // they retry.
  const userMessage = await prisma.conversationMessage.create({
    data: { conversationId: id, role: "user", content: content.trim() },
  });

  const turns: ConversationTurn[] = [
    ...conversation.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage.content },
  ];

  // Ground the "teacher" persona in real classroom material: either the one
  // lesson this conversation is scoped to (if started via "practice this
  // lesson"), or everything the student has studied so far in this
  // classroom. See buildSystemPrompt in lib/conversationProvider.ts.
  let focusLesson = null;
  let coveredMaterial: { title: string; summary: string | null }[] = [];

  if (conversation.lesson) {
    focusLesson = {
      title: conversation.lesson.title,
      summary: conversation.lesson.summary,
      keyVocabulary: parseVocab(conversation.lesson.keyVocabulary),
      keyGrammarPoints: parseGrammarPoints(conversation.lesson.keyGrammarPoints),
    };
  } else {
    const studiedLessons = await prisma.lesson.findMany({
      where: {
        status: { in: ["completed", "in_progress"] },
        unit: { classroomId: conversation.classroomId },
      },
      orderBy: [{ unit: { order: "asc" } }, { order: "asc" }],
      select: { title: true, summary: true },
    });
    coveredMaterial = studiedLessons;
  }

  let replyContent: string;
  try {
    replyContent = await getAssistantReply(turns, {
      language: conversation.classroom.language,
      level: conversation.classroom.level,
      scenario: conversation.title,
      coveredMaterial,
      focusLesson,
    });
  } catch (err) {
    // The user's message is already saved even if the reply fails, so a retry
    // won't duplicate it — only the assistant's turn is missing.
    const detail = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { userMessage, error: `Assistant reply failed: ${detail}` },
      { status: 502 }
    );
  }

  const assistantMessage = await prisma.conversationMessage.create({
    data: { conversationId: id, role: "assistant", content: replyContent },
  });

  return Response.json({ userMessage, assistantMessage });
}
