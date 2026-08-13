import { prisma } from "@/lib/prisma";

// Keep a bad paste from silently saving something broken — content is
// stored as-is otherwise (no server-side script-stripping); safety comes
// from the sandboxed iframe at render time, not from mangling the upload.
const MAX_CONTENT_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { unitId, title, order, contentHtml } = (body ?? {}) as {
    unitId?: unknown;
    title?: unknown;
    order?: unknown;
    contentHtml?: unknown;
  };

  if (typeof unitId !== "string" || unitId.trim().length === 0) {
    return Response.json({ error: "unitId is required" }, { status: 400 });
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (typeof contentHtml !== "string" || contentHtml.trim().length === 0) {
    return Response.json({ error: "contentHtml must not be empty" }, { status: 400 });
  }
  if (Buffer.byteLength(contentHtml, "utf8") > MAX_CONTENT_BYTES) {
    return Response.json({ error: "contentHtml exceeds the 2MB limit" }, { status: 413 });
  }
  if (order !== undefined && (typeof order !== "number" || !Number.isInteger(order))) {
    return Response.json({ error: "order must be an integer" }, { status: 400 });
  }

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) {
    return Response.json({ error: "Unit not found" }, { status: 404 });
  }

  let resolvedOrder = order;
  if (resolvedOrder === undefined) {
    const last = await prisma.lesson.findFirst({
      where: { unitId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    resolvedOrder = (last?.order ?? 0) + 1;
  }

  const lesson = await prisma.lesson.create({
    data: {
      unitId,
      title: title.trim(),
      order: resolvedOrder,
      contentHtml,
      status: "not_started",
    },
  });

  return Response.json({ id: lesson.id, order: lesson.order }, { status: 201 });
}
