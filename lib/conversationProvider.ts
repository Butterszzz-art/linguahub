// lib/conversationProvider.ts
//
// Conversation practice, powered by OpenRouter (see lib/openrouter.ts) —
// set CONVERSATION_API_KEY in .env to enable it.

import { callOpenRouter } from "./openrouter";

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export type ConversationContext = {
  language: string;
  level: string | null;
  /** Optional scenario label, e.g. "Ordering at a restaurant" — null/undefined for free chat. */
  scenario?: string | null;
  /**
   * Lessons the student has already studied (completed or in-progress),
   * oldest first. Grounds the "teacher" persona in what's actually been
   * taught, so it can reference real material instead of guessing at the
   * student's vocabulary from the level label alone.
   */
  coveredMaterial?: { title: string; summary: string | null }[];
  /**
   * Set when a conversation is started from a specific lesson ("practice
   * this lesson") rather than the classroom's material as a whole — the
   * persona narrows to specifically reinforcing this lesson's content.
   */
  focusLesson?: {
    title: string;
    summary: string | null;
    keyVocabulary: { term: string; translation: string }[];
    keyGrammarPoints: string[];
  } | null;
};

export async function getAssistantReply(
  turns: ConversationTurn[],
  context: ConversationContext
): Promise<string> {
  return callOpenRouter([{ role: "system", content: buildSystemPrompt(context) }, ...turns]);
}

/**
 * Builds the "teacher who knows the curriculum" persona: level-calibration
 * (short/simple vs. natural pace and idioms), plus grounding in what the
 * student has actually studied — either a specific lesson being practiced
 * (focusLesson) or everything covered so far in the classroom
 * (coveredMaterial). Kept as a pure function so it's easy to tune
 * independently of the request-plumbing above.
 */
function buildSystemPrompt(context: ConversationContext): string {
  const { language, level, scenario, coveredMaterial, focusLesson } = context;

  const levelGuidance = describeLevelGuidance(level);
  const scenarioLine = scenario
    ? `Stay in character for this scenario: ${scenario}.`
    : "This is free conversation practice — no fixed scenario.";

  const lines = [
    `You are a patient ${language} teacher having a conversation with your student to help`,
    `them practice. Reply primarily in ${language} unless the learner seems completely lost,`,
    `in which case briefly clarify before returning to ${language}.`,
    levelGuidance,
    scenarioLine,
  ];

  if (focusLesson) {
    lines.push(
      `You just taught the student a lesson called "${focusLesson.title}".`,
      focusLesson.summary ? `That lesson covers: ${focusLesson.summary}` : "",
      focusLesson.keyVocabulary.length > 0
        ? `Key vocabulary to reinforce: ${focusLesson.keyVocabulary
            .map((v) => `${v.term} (${v.translation})`)
            .join(", ")}.`
        : "",
      focusLesson.keyGrammarPoints.length > 0
        ? `Key grammar points to reinforce: ${focusLesson.keyGrammarPoints.join("; ")}.`
        : "",
      "Steer the conversation toward naturally using this material, and gently correct",
      "mistakes related to it — don't just chat about anything."
    );
  } else if (coveredMaterial && coveredMaterial.length > 0) {
    const materialList = coveredMaterial
      .map((l) => (l.summary ? `"${l.title}" (${l.summary})` : `"${l.title}"`))
      .join("; ");
    lines.push(
      `So far the student has studied: ${materialList}.`,
      "Favor vocabulary and grammar from that material so the conversation reinforces",
      "what they've actually learned, rather than relying on things they haven't studied yet.",
      "It's fine to gently stretch a little beyond it, but don't lean on advanced material",
      "they have no exposure to."
    );
  }

  lines.push(
    "Gently correct mistakes as a teacher would — briefly, without breaking the flow of",
    "conversation. Keep replies conversational — a few sentences, not a lecture."
  );

  return lines.filter(Boolean).join(" ");
}

function describeLevelGuidance(level: string | null): string {
  switch (level) {
    case "Beginner":
      return "The learner is a beginner: use short, simple sentences and common, everyday vocabulary — avoid idioms and complex grammar.";
    case "Intermediate":
      return "The learner is intermediate: use a natural pace and everyday vocabulary, and introduce the occasional idiom or more complex sentence structure.";
    case "Advanced":
      return "The learner is advanced: speak at a natural, native pace, using idioms and varied sentence structure freely.";
    default:
      return "No level is set for this classroom — default to a general intermediate pace and vocabulary unless the learner's own replies suggest otherwise.";
  }
}
