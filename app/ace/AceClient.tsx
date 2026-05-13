"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export default function AceClient({
  initialMessages,
  decayTier,
  decay,
}: {
  initialMessages: Message[];
  decayTier: number;
  decay: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    setInput("");

    const localUserId = `local-u-${Date.now()}`;
    const localAceId = `local-a-${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: localUserId, role: "user", content: text, createdAt: new Date().toISOString() },
      { id: localAceId, role: "assistant", content: "…", createdAt: new Date().toISOString() },
    ]);

    try {
      const res = await fetch("/api/ace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Request failed (${res.status}): ${t.slice(0, 200)}`);
      }
      const data = await res.json();
      if (!data?.assistant?.content) throw new Error("Empty response from ACE.");
      setMessages((m) => {
        const filtered = m.filter((msg) => msg.id !== localUserId && msg.id !== localAceId);
        return [
          ...filtered,
          { id: data.user.id, role: "user", content: data.user.content, createdAt: data.user.created_at },
          {
            id: data.assistant.id,
            role: "assistant",
            content: data.assistant.content,
            createdAt: data.assistant.created_at,
          },
        ];
      });
    } catch (e) {
      // Roll back the optimistic assistant placeholder so the UI doesn't
      // sit on a "…" forever.
      setMessages((m) => m.filter((msg) => msg.id !== localAceId));
      setError(e instanceof Error ? e.message : "Failed to reach ACE.");
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (id: string) => {
    if (id.startsWith("local-")) {
      setMessages((m) => m.filter((msg) => msg.id !== id));
      return;
    }
    setMessages((m) => m.filter((msg) => msg.id !== id));
    await fetch("/api/ace", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  };

  const clearAll = async () => {
    setMessages([]);
    setConfirmClear(false);
    await fetch("/api/ace", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold tracking-tight">ACE</h1>
          <p className="text-sm text-ink-300">Talk through the week. No scripts.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`pill ${decayTier > 0 ? "bg-flame/20 text-flame" : ""}`}>
            decay {decayTier}
          </span>
          {messages.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-xs text-flame underline hover:text-flame-dim"
            >
              End session
            </button>
          )}
        </div>
      </header>

      {decay && (
        <div className="card border-flame/40 bg-flame/5 text-sm text-flame">{decay}</div>
      )}

      {error && (
        <div className="card border-flame/40 bg-flame/5 text-sm text-flame">{error}</div>
      )}

      <section className="space-y-3 min-h-[40vh]">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-400">
            Try: &ldquo;why am I struggling this week?&rdquo; or &ldquo;I can&apos;t gym today&rdquo;.
            Enter sends · Shift-Enter for a new line.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="group relative">
              <div
                className={`rounded-2xl px-4 py-3 text-sm ${
                  m.role === "assistant"
                    ? "bg-ink-700 text-ink-100"
                    : "bg-gold/15 text-ink-100 ml-8"
                }`}
              >
                {m.content === "…" ? <span className="text-ink-400">ACE is thinking…</span> : m.content}
              </div>
              {!m.id.startsWith("local-a-") && (
                <button
                  onClick={() => deleteMessage(m.id)}
                  className="absolute -top-1 right-2 hidden text-xs text-flame group-hover:block hover:text-flame-dim"
                  aria-label="Delete message"
                >
                  ✕
                </button>
              )}
            </div>
          ))
        )}
      </section>

      <div className="sticky bottom-20 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="Ask ACE… (Enter to send, Shift-Enter for newline)"
          disabled={sending}
          className="flex-1 resize-none rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-gold disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="btn-primary disabled:opacity-50"
        >
          {sending ? "…" : "Send"}
        </button>
      </div>

      {confirmClear && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/80 backdrop-blur-sm p-4"
          onClick={() => setConfirmClear(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-ink-800 border border-ink-700 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">Clear all ACE messages?</h3>
            <p className="mt-1 text-sm text-ink-300">
              This deletes the full conversation history. ACE will lose its memory of past chats.
            </p>
            <div className="mt-4 flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
              <button className="btn-danger flex-1" onClick={clearAll}>
                Clear history
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
