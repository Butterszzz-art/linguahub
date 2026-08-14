"use client";

// Fires once when a lesson page actually mounts on the client (not on Next's
// hover/viewport Link prefetch, which only fetches the RSC payload and never
// mounts client components) — so opening a lesson counts toward the
// classroom's streak and flips a fresh lesson to "in_progress".
import { useEffect, useRef } from "react";
import { recordLessonOpen } from "@/app/classroom/[id]/lesson/[lessonId]/actions";

export function LessonOpenTracker({
  lessonId,
  classroomId,
}: {
  lessonId: string;
  classroomId: string;
}) {
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (firedFor.current === lessonId) return;
    firedFor.current = lessonId;
    recordLessonOpen(lessonId, classroomId);
  }, [lessonId, classroomId]);

  return null;
}
