import { prisma } from "@/lib/prisma";

export async function PATCH(
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

  const { order } = (body ?? {}) as { order?: unknown };
  if (typeof order !== "number" || !Number.isInteger(order)) {
    return Response.json({ error: "order must be an integer" }, { status: 400 });
  }

  const lesson = await prisma.lesson.findUnique({ where: { id } });
  if (!lesson) {
    return Response.json({ error: "Lesson not found" }, { status: 404 });
  }

  if (order === lesson.order) {
    return Response.json({ id: lesson.id, order: lesson.order });
  }

  // Swap with whichever sibling lesson in the same unit currently holds the
  // target order — one round trip, no renumbering the whole list.
  const sibling = await prisma.lesson.findFirst({
    where: { unitId: lesson.unitId, order },
  });

  if (!sibling) {
    return Response.json({ error: "No lesson at that position" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.lesson.update({ where: { id: lesson.id }, data: { order: sibling.order } }),
    prisma.lesson.update({ where: { id: sibling.id }, data: { order: lesson.order } }),
  ]);

  return Response.json({ id: lesson.id, order });
}
