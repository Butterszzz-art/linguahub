// lib/openrouter.ts
//
// Shared client for OpenRouter's (openrouter.ai) OpenAI-compatible chat
// completions API — used by both conversation practice
// (conversationProvider.ts) and lesson enrichment (contentEnrichment.ts),
// which differ only in what messages they send and what they do with the
// reply text, not in how the request/response is shaped.

const DEFAULT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
// A free-tier OpenRouter model so this works out of the box with just an API
// key — override with CONVERSATION_API_MODEL for a paid/higher-quality model.
const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function callOpenRouter(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.CONVERSATION_API_KEY;
  if (!apiKey) {
    throw new Error(
      "CONVERSATION_API_KEY is not set — add your OpenRouter API key to .env (see .env.example)."
    );
  }

  const endpoint = process.env.CONVERSATION_API_URL || DEFAULT_ENDPOINT;
  const model = process.env.CONVERSATION_API_MODEL || DEFAULT_MODEL;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenRouter request failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as unknown;
  const reply = (data as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]
    ?.message?.content;
  if (typeof reply !== "string") {
    throw new Error("OpenRouter returned an unexpected response shape.");
  }

  return reply;
}
