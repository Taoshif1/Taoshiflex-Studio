"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectDeliverable } from "@/lib/client-projects";
import { createClient } from "@/lib/supabase/client";

const bucket = "client-deliverables";
const maxDeliverableBytes = 25 * 1024 * 1024;

type Props = {
  projectId: string;
  deliverables: ProjectDeliverable[];
};

export function DeliverableFilesAdmin({ projectId, deliverables }: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function upload(event: FormEvent<HTMLFormElement>, deliverableId: string) {
    event.preventDefault();
    if (pendingId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) {
      setMessage("Choose a file first.");
      return;
    }
    if (file.size > maxDeliverableBytes) {
      setMessage("Deliverable files cannot exceed 25 MB.");
      return;
    }
    setPendingId(deliverableId);
    setMessage("");
    try {
      const ticketResponse = await fetch("/api/studio/deliverable-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          deliverableId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }),
      });
      const ticket = (await ticketResponse.json().catch(() => ({}))) as {
        error?: string;
        finalizeToken?: string;
        path?: string;
        token?: string;
      };
      if (!ticketResponse.ok || !ticket.finalizeToken || !ticket.path || !ticket.token) {
        throw new Error(ticket.error || "Upload could not be authorized.");
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          cacheControl: "0",
          contentType: file.type,
        });
      if (uploadError) throw new Error("Upload to private storage failed.");

      const finalizeResponse = await fetch("/api/studio/deliverable-files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalizeToken: ticket.finalizeToken }),
      });
      const result = (await finalizeResponse.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!finalizeResponse.ok) throw new Error(result.error || "Upload could not be finalized.");
      setMessage(result.message || "Private deliverable uploaded.");
      formElement.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setPendingId(null);
    }
  }

  async function remove(deliverableId: string) {
    if (pendingId || !confirm("Remove the private file from this deliverable?")) return;
    setPendingId(deliverableId);
    setMessage("");
    try {
      const response = await fetch("/api/studio/deliverable-files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, deliverableId }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Removal failed.");
      setMessage(result.message || "Private deliverable removed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Removal failed.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="deliverable-files-admin">
      <header>
        <p className="eyebrow">Private files</p>
        <h2>Deliverable storage</h2>
        <p>Files are stored in a private Supabase bucket. Clients receive short-lived signed download links only after project authorization.</p>
      </header>
      <p className="admin-live-message" aria-live="polite">{message}</p>
      <div className="admin-item-list">
        {deliverables.length ? deliverables.map((item) => (
          <article className="admin-record" key={item.id}>
            <div>
              <strong>{item.title}</strong>
              <p>{item.storage_path ? "Private file attached" : "No private file attached"}</p>
            </div>
            <form
              className="deliverable-upload-form"
              onSubmit={(event) => upload(event, item.id)}
              aria-label={`Private file for ${item.title}`}
              aria-busy={pendingId === item.id}
            >
              <input
                aria-label={`Choose a private file for ${item.title}`}
                name="file"
                type="file"
                accept=".pdf,.zip,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx"
                disabled={Boolean(pendingId)}
                required
              />
              <button disabled={Boolean(pendingId)}>
                {pendingId === item.id ? "Working…" : item.storage_path ? "Replace private file" : "Upload private file"}
              </button>
              {item.storage_path ? (
                <button type="button" className="danger" disabled={Boolean(pendingId)} onClick={() => remove(item.id)}>
                  Remove private file
                </button>
              ) : null}
            </form>
          </article>
        )) : <p className="workspace-empty">Create a deliverable first, then attach its private file here.</p>}
      </div>
      <small>Maximum 25 MB. Allowed: PDF, ZIP, PNG/JPEG/WebP, TXT, DOC/DOCX and XLS/XLSX.</small>
    </section>
  );
}
