"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type DetectedUnit = { number: number; headingText: string; preview: string; charCount: number };

const fieldStyles =
  "mt-1.5 w-full rounded-2xl border-2 border-beige-dark/50 bg-cream px-4 py-2.5 text-sm text-ink " +
  "placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-60";

export function ImportForm({ classroomId, language }: { classroomId: string; language: string }) {
  const router = useRouter();

  const [pdfUrl, setPdfUrl] = useState("");
  const [langCode, setLangCode] = useState("");
  const [unitTitle, setUnitTitle] = useState("");

  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [units, setUnits] = useState<DetectedUnit[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; lessonId?: string; error?: string }[] | null>(null);

  async function detect() {
    setDetecting(true);
    setDetectError(null);
    setUnits(null);
    setResult(null);
    try {
      const res = await fetch("/api/import/detect-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Detection failed");
      setUnits(data.units);
      setSelected(new Set(data.units.map((u: DetectedUnit) => u.number)));
    } catch (err) {
      setDetectError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDetecting(false);
    }
  }

  function toggle(number: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
  }

  async function runImport() {
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch("/api/import/generate-lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classroomId,
          unitTitle,
          pdfUrl,
          language,
          langCode,
          selectedNumbers: Array.from(selected),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Import failed");
      setResult(data.lessons);
      router.refresh();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <label className="block text-sm font-semibold text-ink">
          PDF URL
          <input
            type="url"
            value={pdfUrl}
            onChange={(e) => setPdfUrl(e.target.value)}
            placeholder="https://…/CourseVolume1-StudentText.pdf"
            className={fieldStyles}
          />
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm font-semibold text-ink">
            Language code (for lang=&quot;…&quot;)
            <input
              type="text"
              value={langCode}
              onChange={(e) => setLangCode(e.target.value)}
              placeholder="es"
              className={fieldStyles}
            />
          </label>
          <label className="block text-sm font-semibold text-ink">
            New unit title
            <input
              type="text"
              value={unitTitle}
              onChange={(e) => setUnitTitle(e.target.value)}
              placeholder="FSI Basic Course — Volume 1"
              className={fieldStyles}
            />
          </label>
        </div>
        <Button
          className="mt-4"
          onClick={detect}
          disabled={detecting || pdfUrl.trim().length === 0}
        >
          {detecting ? "Fetching & detecting…" : "Detect units"}
        </Button>
        {detectError && <p className="mt-2 text-xs font-semibold text-danger-dark">{detectError}</p>}
      </Card>

      {units && (
        <Card className="p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-muted">
            {units.length} unit{units.length === 1 ? "" : "s"} detected — review before importing
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            Automated splitting on decades-old scanned text isn&apos;t perfect — uncheck anything
            that looks wrong (too short, misdetected, table-of-contents noise) before importing.
          </p>
          <ul className="mt-3 space-y-2">
            {units.map((u) => (
              <li key={u.number}>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-beige-dark/40 bg-cream p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(u.number)}
                    onChange={() => toggle(u.number)}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm font-bold text-ink">
                      Unit {u.number}
                      {u.headingText ? `: ${u.headingText}` : ""}
                      <span className="ml-2 font-normal text-ink-muted">({u.charCount} chars)</span>
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">{u.preview}…</p>
                  </div>
                </label>
              </li>
            ))}
          </ul>

          <Button
            className="mt-4"
            onClick={runImport}
            disabled={importing || selected.size === 0 || unitTitle.trim().length === 0 || langCode.trim().length === 0}
          >
            {importing ? `Importing ${selected.size} unit(s)…` : `Import ${selected.size} selected unit(s)`}
          </Button>
          {importError && <p className="mt-2 text-xs font-semibold text-danger-dark">{importError}</p>}
        </Card>
      )}

      {result && (
        <Card className="p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-muted">Import results</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {result.map((r, i) => (
              <li key={i} className={r.error ? "text-danger-dark" : "text-ink"}>
                {r.error ? `✕ ${r.title} — ${r.error}` : `✓ ${r.title}`}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
