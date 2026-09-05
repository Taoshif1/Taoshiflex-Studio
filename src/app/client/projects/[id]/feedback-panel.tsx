"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  feedbackIntentLabel,
  feedbackStateLabel,
  formatFeedbackTime,
  type FeedbackIntent,
  type FeedbackTargetType,
  type ProjectFeedback,
} from "@/lib/client-projects";

type Props = {
  projectId: string;
  targetType: FeedbackTargetType;
  targetId: string | null;
  feedback: ProjectFeedback[];
  readOnly?: boolean;
  maintenanceMessage?: string;
};
type ComposeMode = Extract<FeedbackIntent, "changes_requested" | "comment"> | null;

export function FeedbackPanel({ projectId, targetType, targetId, feedback, readOnly = false, maintenanceMessage }: Props) {
  const router = useRouter();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<ComposeMode>(null);
  const [notice, setNotice] = useState("");

  async function submit(intent: FeedbackIntent, message = "") {
    if (pendingRef.current || readOnly) return;
    pendingRef.current = true;
    setPending(true);
    setNotice("");
    try {
      const response = await fetch("/api/client/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, targetType, targetId, intent, message }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Feedback could not be saved.");
      setMode(null);
      setNotice(result.message || "Feedback sent.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Feedback could not be saved.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  function sendWrittenFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mode) return;
    const message = String(new FormData(event.currentTarget).get("message") || "");
    void submit(mode, message);
  }

  return (
    <div className="feedback-panel">
      <div className="feedback-heading">
        <strong>Feedback</strong>
        <span>{feedback.length ? `${feedback.length} ${feedback.length === 1 ? "response" : "responses"}` : "Share your review"}</span>
      </div>
      <div className="feedback-actions" aria-label="Feedback options">
        <button type="button" disabled={pending || readOnly} onClick={() => void submit("looks_good")}>Looks good</button>
        <button type="button" disabled={pending || readOnly} onClick={() => { setNotice(""); setMode("changes_requested"); }}>Request changes</button>
        <button type="button" disabled={pending || readOnly} onClick={() => { setNotice(""); setMode("comment"); }}>Leave a comment</button>
      </div>
      {readOnly ? <p className="feedback-read-only">{maintenanceMessage || "Feedback and project decisions are temporarily paused."}</p> : null}
      {mode && !readOnly ? (
        <form className="feedback-compose" onSubmit={sendWrittenFeedback}>
          <label htmlFor={`feedback-${targetType}-${targetId ?? projectId}`}>
            {mode === "changes_requested" ? "What would you like changed?" : "Leave a comment"}
          </label>
          <textarea
            id={`feedback-${targetType}-${targetId ?? projectId}`}
            name="message"
            rows={3}
            minLength={mode === "changes_requested" ? 10 : 2}
            maxLength={2000}
            autoFocus
            required
          />
          <div>
            <button className="feedback-send" disabled={pending}>{pending ? "Sending…" : mode === "comment" ? "Send comment" : "Send feedback"}</button>
            <button type="button" disabled={pending} onClick={() => setMode(null)}>Cancel</button>
          </div>
        </form>
      ) : null}
      <p className="feedback-notice" aria-live="polite">{pending && !mode ? "Sending…" : notice}</p>
      {feedback.length ? (
        <ol className="feedback-history">
          {feedback.map((item) => (
            <li key={item.id}>
              <div className="feedback-meta">
                <strong>Client</strong>
                <span className={`feedback-intent ${item.intent}`}>{feedbackIntentLabel(item.intent)}</span>
                <time dateTime={item.created_at}>{formatFeedbackTime(item.created_at)}</time>
              </div>
              {item.message ? <p>{item.message}</p> : <p className="feedback-acknowledgement">Positive acknowledgement sent.</p>}
              {item.studio_response ? (
                <blockquote>
                  <strong>Studio response</strong>
                  <p>{item.studio_response}</p>
                  {item.responded_at ? <time dateTime={item.responded_at}>{formatFeedbackTime(item.responded_at)}</time> : null}
                </blockquote>
              ) : null}
              <span className={`feedback-state ${item.status}`}>{feedbackStateLabel(item)}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
