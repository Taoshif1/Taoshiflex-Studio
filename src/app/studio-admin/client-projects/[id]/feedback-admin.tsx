"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  feedbackIntentLabel,
  formatFeedbackTime,
  statusLabel,
  type AdminProjectFeedback,
} from "@/lib/client-projects";

type Props = { projectId: string; feedback: AdminProjectFeedback[] };
type Action = "reply" | "resolve";

export function FeedbackAdmin({ projectId, feedback }: Props) {
  const router = useRouter();
  const pendingRef = useRef(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const openCount = feedback.filter((item) => item.status === "open").length;

  async function mutate(id: string, action: Action, response: string) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPendingId(id);
    setNotice("");
    try {
      const request = await fetch("/api/studio/client-feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, projectId, action, response }),
      });
      const result = (await request.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!request.ok) throw new Error(result.error || "Feedback could not be updated.");
      setNotice(result.message || "Feedback updated.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Feedback could not be updated.");
    } finally {
      pendingRef.current = false;
      setPendingId(null);
    }
  }

  function formResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const id = String(new FormData(form).get("id") || "");
    const response = String(new FormData(form).get("response") || "");
    void mutate(id, "reply", response);
  }

  return (
    <section className="admin-feedback-section" aria-labelledby="client-feedback-title">
      <header>
        <div><p className="eyebrow">Client communication</p><h2 id="client-feedback-title">Client Feedback</h2></div>
        <span className={openCount ? "admin-feedback-count active" : "admin-feedback-count"}>{openCount} open feedback</span>
      </header>
      <p className="admin-live-message" aria-live="polite">{notice}</p>
      {feedback.length ? (
        <div className="admin-feedback-list">
          {feedback.map((item) => (
            <article key={item.id} className={item.status === "resolved" ? "resolved" : "open"}>
              <div className="admin-feedback-meta">
                <strong>{item.author_label}</strong>
                <span className={`feedback-intent ${item.intent}`}>{feedbackIntentLabel(item.intent)}</span>
                <span>{statusLabel(item.target_type)} / {item.target_label}</span>
                <time dateTime={item.created_at}>{formatFeedbackTime(item.created_at)}</time>
                <span className={`feedback-state ${item.status}`}>{statusLabel(item.status)}</span>
              </div>
              {item.message ? <p>{item.message}</p> : <p className="feedback-acknowledgement">Positive acknowledgement; no note added.</p>}
              {item.studio_response ? <blockquote><strong>Studio response</strong><p>{item.studio_response}</p>{item.responded_at ? <time dateTime={item.responded_at}>{formatFeedbackTime(item.responded_at)}</time> : null}</blockquote> : null}
              {item.status === "open" ? (
                <form onSubmit={formResponse}>
                  <input type="hidden" name="id" value={item.id}/>
                  <label>Studio response<textarea name="response" rows={3} minLength={2} maxLength={2000} defaultValue={item.studio_response ?? ""} placeholder="Share what changed or answer the client."/></label>
                  <div className="admin-feedback-actions">
                    <button disabled={pendingId !== null}>{pendingId === item.id ? "Saving…" : item.studio_response ? "Update response" : "Send response"}</button>
                    <button
                      type="button"
                      disabled={pendingId !== null}
                      onClick={(event) => {
                        const form = event.currentTarget.form;
                        const response = form ? String(new FormData(form).get("response") || "") : "";
                        void mutate(item.id, "resolve", response);
                      }}
                    >Mark resolved</button>
                  </div>
                  {item.intent === "changes_requested" && !item.studio_response ? <small>Reply is required before resolving a change request.</small> : null}
                </form>
              ) : null}
            </article>
          ))}
        </div>
      ) : <p className="inquiry-empty">No Client feedback has been submitted yet.</p>}
    </section>
  );
}
