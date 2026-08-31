"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { inquiryStatuses, type InquiryStatus } from "@/lib/inquiries";
import { ToastRegion, useToasts } from "@/components/ui/toast";

export function InquiryStatusActions({ id, status }: { id: string; status: InquiryStatus }) {
  const router = useRouter();
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const { toasts, toast, dismiss } = useToasts();
  async function update(nextStatus: InquiryStatus) {
    if (pendingRef.current || nextStatus === status) return;
    pendingRef.current = true; setPending(true);
    try {
      const response = await fetch("/api/studio/inquiries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: nextStatus }) });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Inquiry could not be updated.");
      toast("success", `Inquiry marked ${nextStatus}.`); router.refresh();
    } catch (error) { toast("error", error instanceof Error ? error.message : "Inquiry could not be updated."); }
    finally { pendingRef.current = false; setPending(false); }
  }
  return <><div className="status-actions" aria-label="Update inquiry status">{inquiryStatuses.map((item) => <button type="button" key={item} disabled={pending} aria-pressed={status === item} onClick={() => update(item)}>{item}</button>)}</div><ToastRegion toasts={toasts} dismiss={dismiss}/></>;
}
