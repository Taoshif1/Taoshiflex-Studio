"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatMoney,
  paymentMethodLabel,
  paymentMethods,
  type CommercialData,
  type PaymentScheduleItem,
  type ProjectPayment,
} from "@/lib/commercial";
import { formatFeedbackTime } from "@/lib/client-projects";

const headers = { "Content-Type": "application/json" };

export function BillingAdmin({ projectId, data }: { projectId: string; data: CommercialData }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function mutate(method: string, body: object, success: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/studio/billing", {
        method,
        headers,
        body: JSON.stringify({ projectId, ...body }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Billing action failed.");
      setMessage(success);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Billing action failed.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  if (!data.billing || !data.summary) {
    return <section id="billing" className="admin-billing">
      <header><p className="eyebrow">Commercial</p><h2>Billing</h2></header>
      <p className="admin-live-message" aria-live="polite">{message}</p>
      <form className="editor-form compact-admin-form" onSubmit={(event) => {
        event.preventDefault();
        void mutate("POST", { kind: "initialize", ...Object.fromEntries(new FormData(event.currentTarget)) }, "Billing initialized with the starting schedule.");
      }}>
        <label>Agreed project value<input name="projectValue" inputMode="decimal" required /></label>
        <label>Currency<input name="currency" defaultValue="BDT" maxLength={3} required /></label>
        <label>Currency decimals<input name="decimals" type="number" defaultValue="2" min="0" max="3" /></label>
        <label>Initial deposit % (starting calculation)<input name="depositPercentage" type="number" defaultValue="30" min="1" max="99" step="0.01" /></label>
        <p className="wide">The Studio default is 30% deposit and 70% final. Change the percentage here for the agreed plan.</p>
        <button disabled={pending}>Create starting plan</button>
      </form>
    </section>;
  }

  const { billing, summary } = data;
  const progress = billing.agreed_value_minor ? Math.min(100, Math.round(summary.paid_minor / billing.agreed_value_minor * 100)) : 0;
  const activeSchedule = data.schedule.filter((item) => !item.archived_at);
  const archivedSchedule = data.schedule.filter((item) => item.archived_at);
  const pendingPayments = data.payments.filter((item) => item.status === "pending");
  const paymentHistory = data.payments.filter((item) => item.status !== "pending");

  function moveSchedule(index: number, direction: number) {
    const ids = activeSchedule.map((item) => item.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void mutate("PATCH", { kind: "schedule-order", orderedIds: ids }, "Installment order saved.");
  }

  const paymentCard = (payment: ProjectPayment) => <article key={payment.id}>
    <div>
      <strong>{payment.entry_type === "reversal" ? "−" : ""}{formatMoney(payment.amount_minor, payment.currency, billing.currency_decimals)}</strong>
      <span>{formatFeedbackTime(payment.submitted_at)} / {paymentMethodLabel(payment.payment_method)} / {payment.reference_id || "No reference"}</span>
      {payment.note ? <small>{payment.note}</small> : null}
      {payment.rejection_reason ? <small>{payment.rejection_reason}</small> : null}
      {payment.confirmed_at ? <small>Confirmed {formatFeedbackTime(payment.confirmed_at)}</small> : null}
      {payment.rejected_at ? <small>Rejected {formatFeedbackTime(payment.rejected_at)}</small> : null}
    </div>
    <span className={`payment-state ${payment.status}`}>{payment.entry_type} / {payment.status}</span>
    {payment.status === "pending" ? <div className="payment-actions">
      <button disabled={pending} onClick={() => confirm("Confirm this payment as received?") && void mutate("PATCH", { kind: "decision", paymentId: payment.id, decision: "confirmed" }, "Payment confirmed.")}>Confirm</button>
      <button className="danger" disabled={pending} onClick={() => {
        const reason = prompt("Reason shown to the Client (optional)") ?? null;
        if (reason !== null) void mutate("PATCH", { kind: "decision", paymentId: payment.id, decision: "rejected", reason }, "Payment rejected.");
      }}>Reject</button>
    </div> : null}
    {payment.status === "confirmed" && payment.entry_type === "payment" ? <button className="danger" disabled={pending} onClick={() => {
      const reason = prompt("Required auditable reversal reason") || "";
      if (reason) void mutate("PATCH", { kind: "reverse", paymentId: payment.id, reason }, "Reversal recorded.");
    }}>Record reversal</button> : null}
  </article>;

  return <section id="billing" className="admin-billing">
    <header><p className="eyebrow">Commercial / Private ledger</p><h2>Billing</h2></header>
    <p className="admin-live-message" aria-live="polite">{pending ? "Saving…" : message}</p>
    <div className="admin-billing-summary">
      <span>Project value<strong>{formatMoney(billing.agreed_value_minor, billing.currency, billing.currency_decimals)}</strong></span>
      <span>Paid<strong>{formatMoney(summary.paid_minor, billing.currency, billing.currency_decimals)}</strong></span>
      <span>Remaining<strong>{formatMoney(summary.remaining_minor, billing.currency, billing.currency_decimals)}</strong></span>
      <span>Progress<strong>{progress}%</strong></span>
    </div>
    <form className="editor-form admin-billing-settings" onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void mutate("PATCH", { kind: "settings", projectValue: form.get("projectValue"), instructions: form.get("instructions"), methods: form.getAll("methods") }, "Billing settings saved.");
    }}>
      <label>Agreed value<input name="projectValue" defaultValue={(billing.agreed_value_minor / 10 ** billing.currency_decimals).toFixed(billing.currency_decimals)} required /></label>
      <fieldset><legend>Allowed methods</legend>{paymentMethods.map((method) => <label key={method}><input type="checkbox" name="methods" value={method} defaultChecked={billing.allowed_methods.includes(method)} />{paymentMethodLabel(method)}</label>)}</fieldset>
      <label className="wide">Private Client payment instructions<textarea name="instructions" rows={4} defaultValue={billing.payment_instructions} /></label>
      <button disabled={pending}>Save billing settings</button>
    </form>

    <h3>Payment schedule</h3>
    <div className="admin-schedule-list">{activeSchedule.map((item, index) => <ScheduleForm
      key={item.id}
      item={item}
      decimals={billing.currency_decimals}
      locked={data.payments.some((payment) => payment.schedule_item_id === item.id && payment.status === "confirmed")}
      pending={pending}
      moveUp={index > 0 ? () => moveSchedule(index, -1) : undefined}
      moveDown={index < activeSchedule.length - 1 ? () => moveSchedule(index, 1) : undefined}
      save={(body) => void mutate("PATCH", { kind: "schedule", id: item.id, ...body }, "Installment saved.")}
      archive={() => void mutate("PATCH", { kind: "schedule-archive", id: item.id, archive: true }, "Installment archived.")}
    />)}</div>
    {archivedSchedule.length ? <details className="archived-schedule"><summary>Archived installments ({archivedSchedule.length})</summary><div className="admin-payment-list">{archivedSchedule.map((item) => <article key={item.id}><div><strong>{item.label}</strong><span>{formatMoney(item.expected_amount_minor, billing.currency, billing.currency_decimals)}</span></div><span>Archived</span><button disabled={pending} onClick={() => void mutate("PATCH", { kind: "schedule-archive", id: item.id, archive: false }, "Installment restored.")}>Restore</button></article>)}</div></details> : null}
    <SimpleForm title="Add installment" button="Add installment" pending={pending} fields={<>
      <label>Label<input name="label" required /></label><label>Amount<input name="amount" inputMode="decimal" required /></label>
      <label>Percentage (optional reference)<input name="percentage" type="number" min="0.01" max="100" step="0.01" /></label><label>Due date (optional)<input name="dueDate" type="date" /></label>
    </>} submit={(form) => void mutate("POST", { kind: "schedule", ...Object.fromEntries(form) }, "Installment added.")} />

    <h3>Pending payment submissions</h3>
    <div className="admin-payment-list">{pendingPayments.length ? pendingPayments.map(paymentCard) : <p className="admin-empty">No payments are waiting for verification.</p>}</div>
    <h3>Confirmed / Rejected payment history</h3>
    <div className="admin-payment-list">{paymentHistory.length ? paymentHistory.map(paymentCard) : <p className="admin-empty">No verified payment history yet.</p>}</div>
    <SimpleForm title="Record payment received outside Client submission" button="Record confirmed payment" pending={pending} fields={<>
      <label>Installment<select name="scheduleItemId" defaultValue=""><option value="">General payment</option>{activeSchedule.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label>Amount<input name="amount" inputMode="decimal" required /></label><label>Method<select name="method">{billing.allowed_methods.map((method) => <option key={method} value={method}>{paymentMethodLabel(method)}</option>)}</select></label>
      <label>Reference<input name="referenceId" maxLength={160} /></label><label className="wide">Note<textarea name="note" rows={2} maxLength={1000} /></label>
    </>} submit={(form) => void mutate("POST", { kind: "manual", ...Object.fromEntries(form) }, "Confirmed payment recorded.")} />
  </section>;
}

function ScheduleForm({ item, decimals, locked, pending, moveUp, moveDown, save, archive }: {
  item: PaymentScheduleItem; decimals: number; locked: boolean; pending: boolean;
  moveUp?: () => void; moveDown?: () => void; save: (body: object) => void; archive: () => void;
}) {
  return <form className="editor-form admin-schedule-form" onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save(Object.fromEntries(form));
  }}>
    <label>Label<input name="label" defaultValue={item.label} maxLength={120} required disabled={locked} /></label>
    <label>Amount<input name="amount" inputMode="decimal" defaultValue={(item.expected_amount_minor / 10 ** decimals).toFixed(decimals)} required disabled={locked} /></label>
    <label>Percentage (reference)<input name="percentage" type="number" min="0.01" max="100" step="0.01" defaultValue={item.percentage ?? ""} disabled={locked} /></label>
    <label>Due date<input name="dueDate" type="date" defaultValue={item.due_date ?? ""} disabled={locked} /></label>
    {locked ? <p className="wide schedule-lock">Amount, wording and due date are locked because this installment has confirmed payment history.</p> : null}
    <div className="editor-actions wide">
      {!locked ? <button disabled={pending}>Save installment</button> : null}
      <button type="button" disabled={pending || !moveUp} onClick={moveUp}>Move up</button>
      <button type="button" disabled={pending || !moveDown} onClick={moveDown}>Move down</button>
      <button type="button" className="danger" disabled={pending} onClick={archive}>Archive</button>
    </div>
  </form>;
}

function SimpleForm({ title, button, pending, fields, submit }: { title: string; button: string; pending: boolean; fields: React.ReactNode; submit: (form: FormData) => void }) {
  return <form className="editor-form admin-billing-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); submit(new FormData(event.currentTarget)); }}>
    <h3 className="wide">{title}</h3>{fields}<button disabled={pending}>{button}</button>
  </form>;
}
