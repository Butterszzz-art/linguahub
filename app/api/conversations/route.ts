import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { classroomId, title, lessonId } = (body ?? {}) as {
    classroomId?: unknown;
    title?: unknown;
    lessonId?: unknown;
  };

  if (typeof classroomId !== "string" || classroomId.trim().length === 0) {
    return Response.json({ error: "classroomId is required" }, { status: 400 });
  }
  if (title !== undefined && title !== null && typeof title !== "string") {
    return Response.json({ error: "title must be a string" }, { status: 400 });
  }
  if (lessonId !== undefined && lessonId !== null && typeof lessonId !== "string") {
    return Response.json({ error: "lessonId must be a string" }, { status: 400 });
  }

  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) {
    return Response.json({ error: "Classroom not found" }, { status: 404 });
  }

  if (typeof lessonId === "string" && lessonId.trim().length > 0) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { unit: { select: { classroomId: true } } },
    });
    if (!lesson || lesson.unit.classroomId !== classroomId) {
      return Response.json({ error: "Lesson not found in this classroom" }, { status: 404 });
    }
  }

  const conversation = await prisma.conversation.create({
    data: {
      classroomId,
      lessonId: typeof lessonId === "string" && lessonId.trim().length > 0 ? lessonId : null,
      title: typeof title === "string" && title.trim().length > 0 ? title.trim() : null,
    },
  });

  return Response.json({ id: conversation.id }, { status: 201 });
}
