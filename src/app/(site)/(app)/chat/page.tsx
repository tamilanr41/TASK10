"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Disclosure } from "@/components/ui";
import { PageFade, motion, AnimatePresence, TypingDots } from "@/components/motion";

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
    <PageFade>
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
            <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="chat-empty"
              >
                <img src="/images/chat-clinic.jpg" alt="Consulting a hair and nail specialist" />
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
              </motion.div>
            )}
            </AnimatePresence>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`chat-bubble ${m.role === "user" ? "chat-user" : "chat-assistant"}`}
            >
              {m.content}
            </motion.div>
          ))}
          <AnimatePresence>
            {busy && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="chat-bubble chat-assistant"
              >
                <TypingDots />
              </motion.div>
            )}
          </AnimatePresence>
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
    </PageFade>
  );
}