"use client";

import { useEffect, useRef, useState } from "react";

import type { AccountabilityCall } from "@/lib/types";

type Turn = { role: "user" | "ace"; text: string; at: string };

// Minimal Web Speech API typings so we don't pull in DOM-vendor types.
type SpeechRecognitionLike = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export default function CallClient({ initialCalls }: { initialCalls: AccountabilityCall[] }) {
  const [recognizing, setRecognizing] = useState(false);
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [started, setStarted] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const Recog = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSupported(!!Recog);
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  };

  const startCall = () => {
    setStarted(new Date().toISOString());
    setTranscript([{ role: "ace", text: "Five minutes. How was the week?", at: new Date().toISOString() }]);
    speak("Five minutes. How was the week?");
  };

  const startListening = () => {
    const Recog = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recog) return;
    const r = new Recog();
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (ev) => {
      const text = ev.results[ev.results.length - 1][0].transcript;
      setInput(text);
      void sendTurn(text);
    };
    r.onerror = () => setRecognizing(false);
    r.onend = () => setRecognizing(false);
    r.start();
    recogRef.current = r;
    setRecognizing(true);
  };

  const sendTurn = async (text: string) => {
    const at = new Date().toISOString();
    setTranscript((t) => [...t, { role: "user", text, at }]);
    setInput("");
    const res = await fetch("/api/call", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setTranscript((t) => [...t, { role: "ace", text: data.reply, at: new Date().toISOString() }]);
    speak(data.reply);
  };

  const endCall = async () => {
    if (!started || transcript.length < 2) return;
    const res = await fetch("/api/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        startedAt: started,
        endedAt: new Date().toISOString(),
      }),
    });
    const data = await res.json();
    setTranscript((t) => [...t, { role: "ace", text: `Call ended. +${data.awarded} pts.`, at: new Date().toISOString() }]);
    setStarted(null);
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Accountability call</h1>
        <p className="text-sm text-ink-300">Five minutes. Verbalize the week.</p>
      </header>

      {!supported && (
        <div className="card border-flame/40 bg-flame/5 text-sm text-flame">
          This browser doesn&apos;t support Web Speech API. You can type instead.
        </div>
      )}

      {!started ? (
        <button className="btn-primary w-full" onClick={startCall}>
          Start call
        </button>
      ) : (
        <>
          <section className="card max-h-[50vh] overflow-y-auto space-y-3">
            {transcript.map((t, i) => (
              <div
                key={i}
                className={`rounded-2xl px-4 py-2 text-sm ${
                  t.role === "ace" ? "bg-ink-700" : "bg-flame/15 ml-8"
                }`}
              >
                {t.text}
              </div>
            ))}
          </section>

          <section className="space-y-2">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type or talk"
                className="flex-1 rounded-xl bg-ink-700 border border-ink-600 p-3 text-sm focus:outline-none focus:border-flame"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim()) {
                    e.preventDefault();
                    sendTurn(input.trim());
                  }
                }}
              />
              <button
                className="btn-ghost"
                onClick={startListening}
                disabled={!supported || recognizing}
              >
                {recognizing ? "Listening…" : "🎙"}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                className="btn-primary flex-1"
                onClick={() => sendTurn(input)}
                disabled={!input.trim()}
              >
                Send
              </button>
              <button className="btn-ghost" onClick={endCall}>
                End call
              </button>
            </div>
          </section>
        </>
      )}

      {initialCalls.length > 0 && (
        <section className="card">
          <h2 className="text-sm font-semibold text-ink-200">Past calls</h2>
          <ul className="mt-2 space-y-1 text-xs text-ink-300">
            {initialCalls.map((c) => (
              <li key={c.id}>
                {new Date(c.startedAt).toLocaleString()} · {c.transcript.length} turns · +{c.awardedPoints} pts
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
