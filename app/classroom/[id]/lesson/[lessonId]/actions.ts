"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { computeStreak } from "@/lib/streak";

/** Bumps a classroom's streak/lastStudiedAt in response to a study interaction. */
async function touchClassroomStreak(classroomId: string) {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: { streakCount: true, lastStudiedAt: true },
  });
  if (!classroom) return;

  const next = computeStreak(classroom.lastStudiedAt, classroom.streakCount);
  await prisma.classroom.update({
    where: { id: classroomId },
    data: { streakCount: next.streakCount, lastStudiedAt: next.lastStudiedAt },
  });
}

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
  await touchClassroomStreak(classroomId);

  revalidatePath(`/classroom/${classroomId}/lesson/${lessonId}`);
  revalidatePath(`/classroom/${classroomId}`);
  revalidatePath("/");
}

/**
 * Fired when a lesson is opened (see LessonOpenTracker). Moves a fresh
 * lesson to "in_progress" and counts the open toward the classroom's streak,
 * so a streak reflects showing up to study, not only finishing lessons.
 */
export async function recordLessonOpen(lessonId: string, classroomId: string) {
  if (typeof lessonId !== "string" || typeof classroomId !== "string") {
    throw new Error("Missing lessonId or classroomId");
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { status: true },
  });
  if (lesson?.status === "not_started") {
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { status: "in_progress" },
    });
  }
  await touchClassroomStreak(classroomId);

  revalidatePath(`/classroom/${classroomId}`);
  revalidatePath("/");
}
