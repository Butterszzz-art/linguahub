"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Enrichment = {
  summary: string;
  keyVocabulary: { term: string; translation: string }[];
  keyGrammarPoints: string[];
};

export function LessonEnrichment({
  lessonId,
  initial,
}: {
  lessonId: string;
  /** Existing enrichment from the DB, if this lesson has been enriched before. */
  initial: Enrichment | null;
}) {
  const [enrichment, setEnrichment] = useState<Enrichment | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runEnrichment() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/enrich`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Enrichment failed");
      setEnrichment({
        summary: data.summary,
        keyVocabulary: data.keyVocabulary,
        keyGrammarPoints: data.keyGrammarPoints,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mt-6 p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ink-muted">
          {enrichment ? "Lesson summary" : "No AI summary yet"}
        </h2>
        <Button variant="secondary" size="sm" onClick={runEnrichment} disabled={loading}>
          {loading ? "Enriching…" : enrichment ? "↻ Regenerate" : "✨ Enrich with AI"}
        </Button>
      </div>

      {error && <p className="mt-2 text-xs font-semibold text-danger-dark">{error}</p>}

      {enrichment && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-ink">{enrichment.summary}</p>

          {enrichment.keyVocabulary.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Key vocabulary</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {enrichment.keyVocabulary.map((v, i) => (
                  <li
                    key={i}
                    className="rounded-full bg-cream px-3 py-1 text-xs text-ink shadow-bubble"
                  >
                    {v.term} <span className="text-ink-muted">— {v.translation}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {enrichment.keyGrammarPoints.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Key grammar</p>
              <ul className="mt-1 list-inside list-disc text-sm text-ink">
                {enrichment.keyGrammarPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
