// lib/pdfImport/restructureUnit.ts
//
// Third job for the same custom endpoint as conversationProvider.ts and
// contentEnrichment.ts: given one unit's raw extracted text, distill it into
// the app's standard lesson sections (see lib/lessonRenderer.ts) so imported
// PDF content renders with the exact same look as every hand-authored
// lesson. Deliberately asks for each section pre-formatted in the specific
// inline convention renderVocab/renderExamples/renderBullets expect (see
// comments below), rather than free-form text, so the output slots directly
// into renderLessonHtml with no further guessing.

import { callOpenRouter } from "../openrouter";

export type RestructuredSections = {
  overview?: string;
  grammar?: string;
  conjugationTable?: string;
  vocabulary?: string;
  examples?: string;
  notes?: string;
  practice?: string;
};

export async function restructureUnit(
  rawText: string,
  context: { language: string; unitTitle: string }
): Promise<RestructuredSections> {
  const instructions = [
    `The following is raw OCR/extracted text from one unit of a public-domain ${context.language}`,
    `language course, titled "${context.unitTitle}". It may have OCR errors, page-break artifacts,`,
    `and inconsistent spacing — clean that up as you go. Distill it into a JSON object with these`,
    `optional string keys (omit any that don't apply to this unit — not every unit has every section):`,
    ``,
    `"overview": 2-4 plain sentences summarizing what this unit teaches.`,
    `"grammar": grammar points as a plain list, one per line, each starting with "- ".`,
    `"vocabulary": key vocabulary, one entry per line, each formatted EXACTLY as`,
    `  "word (pronunciation) - meaning" — omit the parenthetical if no pronunciation guide exists,`,
    `  e.g. "word - meaning".`,
    `"examples": example sentences, one per line, each formatted EXACTLY as`,
    `  "${context.language} sentence - phonetic - English translation" (omit the middle phonetic`,
    `  segment, i.e. two " - " separated parts, if there's no phonetic guide in the source).`,
    `"conjugationTable": ONLY if the unit contains an actual verb conjugation or reference table —`,
    `  reproduce it as plain aligned text (rows/columns), otherwise omit this key entirely.`,
    `"notes": any other short teaching notes, one per line, each starting with "- ". Optional.`,
    `"practice": a short paragraph describing the drill/practice activity in this unit, if any.`,
    ``,
    `Respond with ONLY the JSON object — no markdown fences, no other text.`,
  ].join("\n");

  const raw = await callOpenRouter([
    { role: "system", content: instructions },
    { role: "user", content: rawText.slice(0, 20_000) },
  ]);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    throw new Error("Restructuring API's reply wasn't valid JSON.");
  }

  return normalize(parsed);
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

function normalize(value: unknown): RestructuredSections {
  const obj = (value ?? {}) as Record<string, unknown>;
  const str = (key: string): string | undefined => {
    const v = obj[key];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
  };
  return {
    overview: str("overview"),
    grammar: str("grammar"),
    conjugationTable: str("conjugationTable"),
    vocabulary: str("vocabulary"),
    examples: str("examples"),
    notes: str("notes"),
    practice: str("practice"),
  };
}
