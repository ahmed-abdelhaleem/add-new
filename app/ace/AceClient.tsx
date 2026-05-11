"use client";

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
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setInput("");

    // Optimistic user message.
    const localId = `local-${Date.now()}`;
    setMessages((m) => [
      ...m,
      { id: localId, role: "user", content: text, createdAt: new Date().toISOString() },
    ]);

    try {
      const res = await fetch("/api/ace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((m) => {
        const filtered = m.filter((msg) => msg.id !== localId);
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
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">ACE</h1>
          <p className="text-sm text-ink-300">Talk through the week. No scripts.</p>
        </div>
        <span className={`pill ${decayTier > 0 ? "bg-flame/20 text-flame" : ""}`}>
          decay {decayTier}
        </span>
      </header>

      {decay && (
        <div className="card border-flame/40 bg-flame/5 text-sm text-flame">{decay}</div>
      )}

      <section className="space-y-3 min-h-[40vh]">
        {messages.length === 0 ? (
          <p className="text-sm text-ink-400">
            Try: &ldquo;why am I struggling this week?&rdquo; or &ldquo;I can&apos;t gym today&rdquo;.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl px-4 py-3 text-sm ${
                m.role === "assistant"
                  ? "bg-ink-700 text-ink-100"
                  : "bg-flame/15 text-ink-100 ml-8"
              }`}
            >
              {m.content}
            </div>
          ))
        )}
      </section>

      <div className="sticky bottom-20 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={2}
          placeholder="Ask ACE…"
          className="flex-1 resize-none rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
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
          Send
        </button>
      </div>
    </div>
  );
}
