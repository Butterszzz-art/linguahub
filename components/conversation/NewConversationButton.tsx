"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function NewConversationButton({
  classroomId,
  lessonId,
  label = "+ New conversation",
}: {
  classroomId: string;
  /** When set, the new conversation is scoped to this lesson ("practice this lesson"). */
  lessonId?: string;
  label?: string;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startConversation() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classroomId, lessonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't start a conversation");
      router.push(`/classroom/${classroomId}/conversation/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button onClick={startConversation} disabled={starting}>
        {starting ? "Starting…" : label}
      </Button>
      {error && <p className="text-xs font-semibold text-danger-dark">{error}</p>}
    </div>
  );
}
