"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function markLessonComplete(formData: FormData) {
  const lessonId = formData.get("lessonId");
  const classroomId = formData.get("classroomId");

  if (typeof lessonId !== "string" || typeof classroomId !== "string") {
    throw new Error("Missing lessonId or classroomId");
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { status: "completed" },
  });

  revalidatePath(`/classroom/${classroomId}/lesson/${lessonId}`);
  revalidatePath(`/classroom/${classroomId}`);
  revalidatePath("/");
}
