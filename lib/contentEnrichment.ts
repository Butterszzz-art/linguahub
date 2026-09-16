// lib/contentEnrichment.ts
//
// Uses the same OpenRouter client as lib/conversationProvider.ts (see
// lib/openrouter.ts), but for a different job: given a lesson's plain-text
// content, distill it into a short summary + key vocabulary + key grammar
// points. That structured output is what lets the conversation partner act
// like a teacher who actually knows the curriculum, instead of a generic
// chatbot — see buildSystemPrompt's `coveredMaterial`/`focusLesson` handling
// in conversationProvider.ts.
//
// Kept as a separate file from conversationProvider.ts because the request
// (single extraction call, no turn history) and response (structured JSON,
// not free-form reply text) are a different job against the same API, not
// the same job.

import { callOpenRouter } from "./openrouter";

export type LessonEnrichment = {
  summary: string;
  keyVocabulary: { term: string; translation: string }[];
  keyGrammarPoints: string[];
};

export async function enrichLessonContent(
  plainTextContent: string,
  context: { language: string; lessonTitle: string }
): Promise<LessonEnrichment> {
  const instructions = [
    `The following is the text content of a ${context.language} lesson titled "${context.lessonTitle}".`,
    "Distill it into JSON with exactly these keys:",
    `{"summary": string (2-3 sentences, plain language, what this lesson covers),`,
    `"keyVocabulary": [{"term": string, "translation": string}] (the most important 5-12 words/phrases),`,
    `"keyGrammarPoints": [string] (0-6 short grammar points taught in this lesson, empty array if none)}`,
    "Respond with ONLY the JSON object — no markdown fences, no other text.",
  ].join(" ");

  const raw = await callOpenRouter([
    { role: "system", content: instructions },
    { role: "user", content: plainTextContent.slice(0, 12_000) },
  ]);

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    throw new Error("Enrichment API's reply wasn't valid JSON — check the prompt/response format.");
  }

  return normalizeEnrichment(parsed);
}

/** Some models wrap JSON in ```json fences despite instructions not to — strip if present. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

function normalizeEnrichment(value: unknown): LessonEnrichment {
  const obj = (value ?? {}) as Record<string, unknown>;

  const summary = typeof obj.summary === "string" ? obj.summary.trim() : "";

  const keyVocabulary = Array.isArray(obj.keyVocabulary)
    ? obj.keyVocabulary
        .filter(
          (v): v is { term: unknown; translation: unknown } =>
            typeof v === "object" && v !== null
        )
        .map((v) => ({
          term: typeof v.term === "string" ? v.term : "",
          translation: typeof v.translation === "string" ? v.translation : "",
        }))
        .filter((v) => v.term.length > 0)
    : [];

  const keyGrammarPoints = Array.isArray(obj.keyGrammarPoints)
    ? obj.keyGrammarPoints.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    : [];

  if (!summary) {
    throw new Error("Enrichment API's reply was missing a usable 'summary' field.");
  }

  return { summary, keyVocabulary, keyGrammarPoints };
}
