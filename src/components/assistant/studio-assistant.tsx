"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ASSISTANT_MAX_HISTORY_MESSAGES,
  ASSISTANT_MAX_QUESTION_LENGTH,
  fallbackStudioAssistantReply,
  type PublicAssistantMessage,
} from "@/lib/studio-assistant-fallback";
import type { AssistantSettings, ServicePackage } from "@/types/content";

const suggestions = ["Pricing", "Business website", "E-commerce", "Process"];

export function StudioAssistant({ settings, packages }: { settings: AssistantSettings; packages: ServicePackage[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<PublicAssistantMessage[]>([{ role: "assistant", text: settings.greeting }]);
  const logRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pendingRef = useRef(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const log = logRef.current;
    if (!open || !log) return;
    log.scrollTo({ top: log.scrollHeight, behavior: "auto" });
  }, [messages, open, pending]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  if (!settings.enabled || pathname.startsWith("/client") || pathname.startsWith("/studio-admin")) return null;

  async function send(value: string) {
    const question = value.trim();
    if (!question || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setInput("");
    const history = messages.slice(1).slice(-ASSISTANT_MAX_HISTORY_MESSAGES);
    setMessages((current) => [...current, { role: "user", text: question }]);

    let reply: string;
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      const result = (await response.json().catch(() => ({}))) as { reply?: string };
      if (!result.reply) throw new Error("assistant_unavailable");
      reply = result.reply;
    } catch {
      reply = fallbackStudioAssistantReply(question, settings, packages, true);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }

    setMessages((current) => {
      const next: PublicAssistantMessage[] = [...current, { role: "assistant", text: reply }];
      const [greeting, ...conversation] = next;
      return [greeting, ...conversation.slice(-Math.max(2, settings.maximumMessages))];
    });
  }

  function submit(event: FormEvent) { event.preventDefault(); void send(input); }
  function close() { setOpen(false); triggerRef.current?.focus(); }

  return <div className="assistant"><AnimatePresence>{open ? <motion.section id="studio-assistant-panel" className="assistant-panel" role="dialog" aria-labelledby="studio-assistant-title" aria-busy={pending} initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
    <div className="assistant-geometry" aria-hidden><i/><i/></div>
    <header><div><small>Taoshiflex / Guided scope</small><strong id="studio-assistant-title">{settings.name}</strong><span>Gemini AI · Public Studio knowledge</span></div><button type="button" onClick={close} aria-label={`Close ${settings.name}`}>×</button></header>
    <div ref={logRef} className="assistant-log" aria-live="polite">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`assistant-message is-${message.role}`}><small>{message.role === "assistant" ? "Studio note" : "Your question"}</small><p>{message.text}</p></div>)}{pending ? <div className="assistant-message assistant-thinking" role="status"><small>Studio Assistant</small><p>Thinking…</p></div> : null}</div>
    <div className="assistant-suggestions" aria-label="Suggested questions">{suggestions.map((item) => <button type="button" key={item} disabled={pending} onClick={() => void send(item)}>{item}</button>)}</div>
    <form onSubmit={submit}><label htmlFor="studio-question">Ask the Studio</label><div><input id="studio-question" value={input} maxLength={ASSISTANT_MAX_QUESTION_LENGTH} onChange={(event) => setInput(event.target.value)} placeholder="Ask about scope or process" disabled={pending}/><button type="submit" disabled={pending || !input.trim()}>{pending ? "Thinking…" : "Send"} <span aria-hidden>→</span></button></div></form>
    <p className="assistant-privacy">Don&apos;t share passwords, payment details or confidential Client information.</p>
    {settings.leadCapture ? <Link href={settings.handoffUrl}>Move from guidance to a real project brief <span aria-hidden>↗</span></Link> : null}
  </motion.section> : null}</AnimatePresence><button ref={triggerRef} className="assistant-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="studio-assistant-panel"><span aria-hidden>{open ? "×" : "TS"}</span>{open ? "Close panel" : "Ask the Studio"}</button></div>;
}
