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

  const unit = await prisma.unit.findUnique({ where: { id } });
  if (!unit) {
    return Response.json({ error: "Unit not found" }, { status: 404 });
  }

  if (order === unit.order) {
    return Response.json({ id: unit.id, order: unit.order });
  }

  // Swap with whichever sibling unit in the same classroom currently holds
  // the target order — keeps every unit's order value unique with a single
  // round trip, rather than renumbering the whole list.
  const sibling = await prisma.unit.findFirst({
    where: { classroomId: unit.classroomId, order },
  });

  if (!sibling) {
    return Response.json({ error: "No unit at that position" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.unit.update({ where: { id: unit.id }, data: { order: sibling.order } }),
    prisma.unit.update({ where: { id: sibling.id }, data: { order: unit.order } }),
  ]);

  return Response.json({ id: unit.id, order });
}
