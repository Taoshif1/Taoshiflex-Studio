import Link from "next/link";
import { formatInquiryDate, inquiryReference, type InquiryRecord } from "@/lib/inquiries";

const value = (input: string | undefined) => input?.trim() || "Not provided";

export function InquiryView({ inquiry, compact = false }: { inquiry: InquiryRecord; compact?: boolean }) {
  const brief = inquiry.payload;
  if (compact) return <article className="inquiry-preview">
    <div><span className={`status-badge ${inquiry.status}`}>{inquiry.status}</span><strong>{inquiryReference(inquiry)}</strong></div>
    <h3>{value(brief.name)}{brief.business ? ` / ${brief.business}` : ""}</h3>
    <p>{brief.projectType} · {brief.budget}</p>
    <small>{formatInquiryDate(inquiry.created_at)}</small>
    <Link className="inquiry-open" href={`/studio-admin/inquiries/${inquiry.id}`}>Open inquiry <span aria-hidden>↗</span></Link>
  </article>;

  return <div className="inquiry-detail-grid">
    <section><p className="eyebrow">Contact</p><dl className="lead-fields"><Field label="Name" value={brief.name}/><Field label="Email" value={inquiry.email}/><Field label="Phone / WhatsApp" value={brief.phone}/><Field label="Business" value={brief.business}/></dl></section>
    <section><p className="eyebrow">Project</p><dl className="lead-fields"><Field label="Project type" value={brief.projectType}/><Field label="Current stage" value={brief.stage}/><Field label="Goals" value={brief.goals.join(", ")}/><Field label="Investment" value={brief.budget}/><Field label="Timeline" value={brief.timeline}/></dl></section>
    <section className="inquiry-brief"><p className="eyebrow">Full brief</p><p>{value(brief.details)}</p></section>
    <section><p className="eyebrow">Admin</p><dl className="lead-fields"><Field label="Reference" value={inquiryReference(inquiry)}/><Field label="Submitted" value={formatInquiryDate(inquiry.created_at)}/><Field label="Status" value={inquiry.status}/></dl></section>
  </div>;
}

function Field({ label, value: fieldValue }: { label: string; value?: string }) {
  return <div><dt>{label}</dt><dd>{value(fieldValue)}</dd></div>;
}
