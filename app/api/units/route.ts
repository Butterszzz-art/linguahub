import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { classroomId, title } = (body ?? {}) as { classroomId?: unknown; title?: unknown };

  if (typeof classroomId !== "string" || classroomId.trim().length === 0) {
    return Response.json({ error: "classroomId is required" }, { status: 400 });
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }

  const classroom = await prisma.classroom.findUnique({ where: { id: classroomId } });
  if (!classroom) {
    return Response.json({ error: "Classroom not found" }, { status: 404 });
  }

  const last = await prisma.unit.findFirst({
    where: { classroomId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const unit = await prisma.unit.create({
    data: {
      classroomId,
      title: title.trim(),
      order: (last?.order ?? 0) + 1,
    },
  });

  return Response.json({ id: unit.id, order: unit.order }, { status: 201 });
}
