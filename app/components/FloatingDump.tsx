"use client";

import { useEffect, useRef, useState } from "react";

import type { SpeechRecognitionLike } from "@/lib/speech";

/**
 * PRD §5 Feature 4 + §6.5 — floating brain-dump button on every screen.
 * One tap → full-screen dark overlay → cursor auto-focused.
 * 8-second idle prompt: "Done? Save & close."
 */
export default function FloatingDump() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [showDonePrompt, setShowDonePrompt] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  // Re-arm idle timer on each keystroke.
  useEffect(() => {
    if (!open) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    setShowDonePrompt(false);
    if (!text.trim()) return;
    idleTimerRef.current = setTimeout(() => setShowDonePrompt(true), 8000);
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [text, open]);

  const close = () => {
    setOpen(false);
    setText("");
    setShowDonePrompt(false);
    setFeedback(null);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  };

  const save = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setFeedback(`+${data.award?.awardedPoints ?? 0} pts · ${data.dump.categorized?.summary ?? "saved"}`);
      setText("");
      setTimeout(() => {
        close();
      }, 1400);
    } finally {
      setSaving(false);
    }
  };

  const startListening = () => {
    const Recog = typeof window !== "undefined" ? (window.SpeechRecognition ?? window.webkitSpeechRecognition) : null;
    if (!Recog) return;
    const r = new Recog();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (ev) => {
      const transcript = ev.results[ev.results.length - 1][0].transcript;
      setText((t) => (t ? `${t}\n${transcript}` : transcript));
    };
    r.onerror = () => setRecognizing(false);
    r.onend = () => setRecognizing(false);
    r.start();
    recogRef.current = r;
    setRecognizing(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Brain dump"
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-gold text-ink-900 shadow-lg shadow-gold/30 transition-transform hover:scale-105"
      >
        <span className="text-2xl">✎</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-ink-900/98 backdrop-blur"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
            <h2 className="text-sm font-semibold text-ink-200">Brain dump</h2>
            <button onClick={close} className="text-xs text-ink-400 hover:text-ink-100">
              Close
            </button>
          </div>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's in your head right now?"
            className="dump-cursor flex-1 resize-none bg-transparent p-4 text-base text-ink-100 focus:outline-none"
          />
          {feedback && (
            <div className="border-t border-mint/30 bg-mint/5 px-4 py-3 text-sm text-mint">{feedback}</div>
          )}
          {showDonePrompt && !feedback && (
            <div className="border-t border-ink-700 bg-ink-800 px-4 py-3 text-xs text-ink-300">
              Done? → tap Save & close
            </div>
          )}
          <div className="flex items-center justify-between border-t border-ink-700 bg-ink-800 px-4 py-3">
            <button
              onClick={startListening}
              disabled={recognizing}
              className="btn-ghost text-xs"
              aria-label="Voice input"
            >
              {recognizing ? "Listening…" : "🎙 Voice"}
            </button>
            <button
              onClick={save}
              disabled={!text.trim() || saving}
              className="btn-primary disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save & close"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
