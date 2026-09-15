"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

type Message = { id: string; role: string; content: string };

const fieldStyles =
  "w-full rounded-2xl border-2 border-beige-dark/50 bg-cream px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint";

export function ConversationChat({
  conversationId,
  initialMessages,
}: {
  conversationId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);
    setDraft("");

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();

      // The learner's message is saved server-side even when the reply
      // fails, so surface it in the thread either way — only the
      // assistant's turn is missing until they send another message.
      if (data?.userMessage) {
        setMessages((prev) => [...prev, data.userMessage]);
      }

      if (!res.ok) {
        throw new Error(data?.error ?? "Couldn't send that message");
      }

      setMessages((prev) => [...prev, data.assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex max-h-[28rem] min-h-[16rem] flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="m-auto text-sm text-ink-muted">Say hello to get started.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-bubble ${
                m.role === "user"
                  ? "self-end bg-caramel text-cream"
                  : "self-start bg-beige text-ink"
              }`}
            >
              {m.content}
            </div>
          ))
        )}
      </div>

      {error && (
        <p className="mx-4 rounded-2xl bg-danger-light px-4 py-2.5 text-sm font-semibold text-danger-dark">
          {error}
        </p>
      )}

      <form onSubmit={sendMessage} className="flex items-center gap-2 border-t-2 border-beige-dark/40 p-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          disabled={sending}
          className={fieldStyles}
        />
        <Button type="submit" disabled={sending || draft.trim().length === 0}>
          {sending ? "Sending…" : "Send"}
        </Button>
      </form>
    </div>
  );
}
