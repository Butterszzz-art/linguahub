"use client";

// Content-authoring form for a classroom: pick/create a unit, write a title,
// paste or drop the lesson's self-contained HTML, preview it live through the
// same sandboxed iframe the viewer uses, then save. contentHtml is stored
// as-is — safety comes from LessonFrame's sandboxed iframe at render time,
// not from mangling the upload here.
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent, type FormEvent } from "react";
import LessonFrame from "@/components/LessonFrame";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const MAX_CONTENT_BYTES = 2 * 1024 * 1024; // keep in sync with app/api/lessons/route.ts

type Unit = { id: string; title: string };

const fieldStyles =
  "mt-1.5 w-full rounded-2xl border-2 border-beige-dark/50 bg-cream px-4 py-2.5 text-sm text-ink " +
  "placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-60";

export function UploadForm({ classroomId, units: initialUnits }: { classroomId: string; units: Unit[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [units, setUnits] = useState(initialUnits);
  const [unitId, setUnitId] = useState(initialUnits[0]?.id ?? "");
  const [creatingUnit, setCreatingUnit] = useState(initialUnits.length === 0);
  const [newUnitTitle, setNewUnitTitle] = useState("");

  const [title, setTitle] = useState("");
  const [order, setOrder] = useState("");
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function loadFile(file: File) {
    setError(null);
    if (file.size > MAX_CONTENT_BYTES) {
      setError("That file is over the 2MB limit.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setContent(typeof reader.result === "string" ? reader.result : "");
      setFileName(file.name);
    };
    reader.onerror = () => setError("Couldn't read that file — try pasting the HTML instead.");
    reader.readAsText(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Give the lesson a title.");
      return;
    }
    if (!content.trim()) {
      setError("Paste or drop the lesson's HTML content first.");
      return;
    }
    if (new TextEncoder().encode(content).length > MAX_CONTENT_BYTES) {
      setError("That content is over the 2MB limit.");
      return;
    }
    if (creatingUnit && !newUnitTitle.trim()) {
      setError("Give the new unit a title.");
      return;
    }
    if (!creatingUnit && !unitId) {
      setError("Select a unit for this lesson.");
      return;
    }

    setSubmitting(true);
    try {
      let targetUnitId = unitId;

      if (creatingUnit) {
        const unitRes = await fetch("/api/units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classroomId, title: newUnitTitle.trim() }),
        });
        const unitBody = await unitRes.json().catch(() => null);
        if (!unitRes.ok) {
          setError(unitBody?.error ?? "Couldn't create the unit — try again.");
          return;
        }
        targetUnitId = unitBody.id;
        setUnits((prev) => [...prev, { id: unitBody.id, title: newUnitTitle.trim() }]);
        setUnitId(unitBody.id);
        setCreatingUnit(false);
        setNewUnitTitle("");
      }

      const lessonRes = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: targetUnitId,
          title: trimmedTitle,
          order: order.trim() ? Number(order.trim()) : undefined,
          contentHtml: content,
        }),
      });
      const lessonBody = await lessonRes.json().catch(() => null);
      if (!lessonRes.ok) {
        setError(lessonBody?.error ?? "Couldn't save the lesson — try again.");
        return;
      }

      setSuccess(`Saved "${trimmedTitle}".`);
      setTitle("");
      setOrder("");
      setContent("");
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <Card className="space-y-5 p-6">
        <div>
          <label className="text-sm font-semibold text-ink">Unit</label>
          {creatingUnit ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <input
                autoFocus
                value={newUnitTitle}
                onChange={(e) => setNewUnitTitle(e.target.value)}
                placeholder="New unit title…"
                className={`${fieldStyles} mt-0 max-w-xs`}
              />
              {units.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCreatingUnit(false);
                    setNewUnitTitle("");
                  }}
                  className="text-sm font-semibold text-ink-muted hover:text-ink hover:underline"
                >
                  Choose existing unit instead
                </button>
              )}
            </div>
          ) : (
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <select
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className={`${fieldStyles} mt-0 max-w-xs`}
              >
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCreatingUnit(true)}
                className="text-sm font-semibold text-caramel hover:text-caramel-dark hover:underline"
              >
                + New unit
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="lesson-title" className="text-sm font-semibold text-ink">
              Lesson Title
            </label>
            <input
              id="lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ordering Food at a Restaurant"
              className={fieldStyles}
            />
          </div>
          <div>
            <label htmlFor="lesson-order" className="text-sm font-semibold text-ink">
              Order <span className="font-normal text-ink-faint">(optional)</span>
            </label>
            <input
              id="lesson-order"
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder="Auto"
              className={`${fieldStyles} sm:w-28`}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-ink">Lesson Content</label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`mt-1.5 rounded-2xl border-2 border-dashed p-4 transition-colors ${
              dragActive ? "border-caramel bg-caramel-light/30" : "border-beige-dark/50"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-ink-muted">
                Drag & drop an <code className="rounded bg-beige px-1 py-0.5">.html</code> file, or paste
                HTML below.
                {fileName && <span className="ml-1 font-semibold text-ink">Loaded: {fileName}</span>}
              </p>
              <label className="cursor-pointer rounded-full bg-beige px-3 py-1.5 text-xs font-semibold text-ink hover:bg-beige-hover">
                Browse…
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,text/html"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) loadFile(file);
                  }}
                />
              </label>
            </div>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setFileName(null);
              }}
              placeholder="<html>…</html>"
              rows={8}
              spellCheck={false}
              className="mt-3 w-full rounded-xl border-2 border-beige-dark/40 bg-white/60 px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-faint"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-2xl bg-danger-light px-4 py-2.5 text-sm font-semibold text-danger-dark">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-2xl bg-success-light px-4 py-2.5 text-sm font-semibold text-success-dark">
            {success}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save Lesson"}
        </Button>
      </Card>

      <div>
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-muted">
          Live Preview
        </h2>
        <Card className="mt-2.5 p-3">
          {content.trim() ? (
            <LessonFrame contentHtml={content} title={title || "Lesson preview"} />
          ) : (
            <div className="flex min-h-40 items-center justify-center text-center text-sm text-ink-faint">
              Paste or drop HTML above to see it rendered here before you save.
            </div>
          )}
        </Card>
      </div>
    </form>
  );
}
