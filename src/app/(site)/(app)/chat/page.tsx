"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Spinner, Disclosure } from "@/components/ui";

type ChatMessage = {
  id?: number;
  role: string;
  content?: string;
  created_at?: string;
};

type HistoryResponse = {
  messages?: ChatMessage[];
};

type ReplyResponse = {
  reply: string;
  disclaimer?: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<HistoryResponse>("/api/chat/history")
      .then((d) => setMessages(d.messages || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const data = await api<ReplyResponse>("/api/chat/message", { method: "POST", body: { message: text } });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, I could not answer right now. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <div className="flex-between mb-2">
        <div>
          <h1 className="page-title">DermAI Assistant</h1>
          <p className="page-sub">Your health-oriented screening assistant</p>
        </div>
        <span className="badge badge-teal">● Online</span>
      </div>

      <div className="chat-window">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <img src="/images/chat-clinic.jpg" alt="Consulting with a skin specialist" />
              <p>
                I&apos;m here to discuss skin, scalp, hair and nail care the way a
                dermatology consultation would, along with nutrition, hydration,
                screening results and when it&apos;s time to see a doctor. I give
                educational guidance and never diagnose or prescribe.
              </p>
              <p>
                Try: “What can I do for my scalp flaking?” · “my latest screening” ·
                “when should I see a doctor?”
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role === "user" ? "chat-user" : "chat-assistant"}`}>
              {m.content}
            </div>
          ))}
          {busy && (
            <div className="chat-bubble chat-assistant">
              <span className="spinner" style={{ display: "inline-block", width: 14, height: 14 }} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <form className="chat-input-row" onSubmit={send}>
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the DermAI Assistant…"
            disabled={busy}
          />
          <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()}>
            Send
          </button>
        </form>
      </div>

      <div className="mt-3">
        <Disclosure text="This chatbot provides general wellness information only. It does not diagnose, prescribe medicines or recommend treatment for any condition. For serious or worsening symptoms, consult a qualified healthcare professional." />
      </div>
    </div>
  );
}