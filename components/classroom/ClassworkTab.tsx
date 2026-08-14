"use client";

// Client component: unit/lesson reordering and inline unit creation need to
// call the API routes and then pull fresh server data, which router.refresh()
// gives us without hand-rolling client-side state for the whole tree.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Badge, statusBadgeProps } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type Lesson = { id: string; title: string; order: number; status: string };
type Unit = { id: string; title: string; order: number; lessons: Lesson[] };

const reorderBtn =
  "flex h-6 w-6 items-center justify-center rounded-full bg-beige text-xs font-bold text-ink-muted " +
  "transition-colors hover:bg-beige-hover hover:text-ink disabled:cursor-not-allowed disabled:opacity-40";

const fieldStyles =
  "w-full rounded-2xl border-2 border-beige-dark/50 bg-cream px-4 py-2 text-sm text-ink placeholder:text-ink-faint";

export function ClassworkTab({ classroomId, units }: { classroomId: string; units: Unit[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);
  const [newUnitTitle, setNewUnitTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const nextLesson = units
    .flatMap((unit) => unit.lessons.map((lesson) => ({ ...lesson, unitTitle: unit.title })))
    .find((lesson) => lesson.status !== "completed");

  async function reorder(url: string, order: number) {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Couldn't reorder — try again.");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setPending(false);
    }
  }

  async function createUnit(e: FormEvent) {
    e.preventDefault();
    const title = newUnitTitle.trim();
    if (!title) return;

    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classroomId, title }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Couldn't create unit — try again.");
        return;
      }
      setNewUnitTitle("");
      setAddingUnit(false);
      startTransition(() => router.refresh());
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-7">
      {nextLesson && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-caramel/50 bg-caramel-light/40 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-caramel-dark">Continue</p>
            <p className="mt-1 font-display text-lg font-bold text-ink">{nextLesson.title}</p>
            <p className="text-sm text-ink-muted">{nextLesson.unitTitle}</p>
          </div>
          <Link href={`/classroom/${classroomId}/lesson/${nextLesson.id}`}>
            <Button>Continue →</Button>
          </Link>
        </Card>
      )}

      {error && (
        <p className="rounded-2xl bg-danger-light px-4 py-2.5 text-sm font-semibold text-danger-dark">
          {error}
        </p>
      )}

      {units.length === 0 ? (
        <Card className="border-dashed p-8 text-center text-ink-muted">
          No units yet for this classroom.
        </Card>
      ) : (
        units.map((unit, unitIndex) => (
          <div key={unit.id}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-muted">
                {unit.title}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pending || unitIndex === 0}
                  onClick={() => reorder(`/api/units/${unit.id}`, unit.order - 1)}
                  className={reorderBtn}
                  aria-label={`Move ${unit.title} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={pending || unitIndex === units.length - 1}
                  onClick={() => reorder(`/api/units/${unit.id}`, unit.order + 1)}
                  className={reorderBtn}
                  aria-label={`Move ${unit.title} down`}
                >
                  ↓
                </button>
              </div>
            </div>
            <ul className="mt-2.5 space-y-2">
              {unit.lessons.length === 0 ? (
                <li className="rounded-2xl border-2 border-dashed border-beige-dark/40 px-4 py-3 text-sm text-ink-faint">
                  No lessons in this unit yet.
                </li>
              ) : (
                unit.lessons.map((lesson, lessonIndex) => {
                  const { variant, label } = statusBadgeProps(lesson.status);
                  return (
                    <li key={lesson.id} className="flex items-center gap-2">
                      <Link
                        href={`/classroom/${classroomId}/lesson/${lesson.id}`}
                        className="flex flex-1 items-center justify-between rounded-2xl border-2 border-beige-dark/40 bg-beige/60 px-4 py-3.5 text-sm font-semibold text-ink shadow-bubble transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-beige-hover hover:shadow-bubble-hover"
                      >
                        <span>{lesson.title}</span>
                        <Badge variant={variant}>{label}</Badge>
                      </Link>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={pending || lessonIndex === 0}
                          onClick={() => reorder(`/api/lessons/${lesson.id}`, lesson.order - 1)}
                          className={reorderBtn}
                          aria-label={`Move ${lesson.title} up`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={pending || lessonIndex === unit.lessons.length - 1}
                          onClick={() => reorder(`/api/lessons/${lesson.id}`, lesson.order + 1)}
                          className={reorderBtn}
                          aria-label={`Move ${lesson.title} down`}
                        >
                          ↓
                        </button>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ))
      )}

      {addingUnit ? (
        <form onSubmit={createUnit} className="flex flex-wrap items-center gap-2">
          <input
            autoFocus
            value={newUnitTitle}
            onChange={(e) => setNewUnitTitle(e.target.value)}
            placeholder="Unit title…"
            className={`${fieldStyles} max-w-xs`}
          />
          <Button type="submit" size="sm" disabled={pending}>
            Add
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setAddingUnit(false);
              setNewUnitTitle("");
              setError(null);
            }}
          >
            Cancel
          </Button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAddingUnit(true)}
          className="text-sm font-semibold text-caramel hover:text-caramel-dark hover:underline"
        >
          + New Unit
        </button>
      )}
    </div>
  );
}
