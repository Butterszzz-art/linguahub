import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { language, level } = (body ?? {}) as { language?: unknown; level?: unknown };

  if (typeof language !== "string" || language.trim().length === 0) {
    return Response.json({ error: "language is required" }, { status: 400 });
  }
  if (level !== undefined && level !== null && typeof level !== "string") {
    return Response.json({ error: "level must be a string" }, { status: 400 });
  }

  const classroom = await prisma.classroom.create({
    data: {
      language: language.trim(),
      level: typeof level === "string" && level.trim().length > 0 ? level.trim() : null,
    },
  });

  return Response.json({ id: classroom.id }, { status: 201 });
}
