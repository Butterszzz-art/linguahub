"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PageContainer } from "@/components/PageContainer";
import { BackLink } from "@/components/BackLink";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const fieldStyles =
  "mt-1.5 w-full rounded-2xl border-2 border-beige-dark/50 bg-cream px-4 py-2.5 text-sm text-ink " +
  "placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-60";

export default function NewClassroomPage() {
  const router = useRouter();
  const [language, setLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!language.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: language.trim(), level: level.trim() || undefined }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Couldn't create classroom — try again.");
        return;
      }
      router.push(`/classroom/${body.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer>
      <BackLink href="/" label="Back to Dashboard" />

      <h1 className="font-display text-2xl font-bold tracking-tight text-ink">New Classroom</h1>
      <p className="mt-1.5 text-ink-muted">Add a language you want to start learning.</p>

      <Card className="mt-8 max-w-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="language" className="text-sm font-semibold text-ink">
              Language
            </label>
            <input
              id="language"
              name="language"
              type="text"
              required
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. Spanish"
              className={fieldStyles}
            />
          </div>

          <div>
            <label htmlFor="level" className="text-sm font-semibold text-ink">
              Level <span className="font-normal text-ink-faint">(optional)</span>
            </label>
            <input
              id="level"
              name="level"
              type="text"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="e.g. Beginner"
              className={fieldStyles}
            />
          </div>

          {error && (
            <p className="rounded-2xl bg-danger-light px-4 py-2.5 text-sm font-semibold text-danger-dark">
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting || !language.trim()}>
            {submitting ? "Creating…" : "Create Classroom"}
          </Button>
        </form>
      </Card>
    </PageContainer>
  );
}
