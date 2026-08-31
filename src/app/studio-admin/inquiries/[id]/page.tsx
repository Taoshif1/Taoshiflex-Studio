import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";
import { inquiryReference, type InquiryRecord } from "@/lib/inquiries";
import { InquiryView } from "../../inquiry-view";
import { InquiryStatusActions } from "../status-actions";

export const metadata: Metadata = { title: "Inquiry detail / Studio Admin", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function InquiryDetailPage({ params }: Props) {
  if (!await getAdminSession()) redirect("/studio-admin");
  const { id } = await params;
  if (!uuid.test(id)) notFound();
  const rows = await supabaseRest<InquiryRecord[]>(`inquiries?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, {}, "privileged").catch(() => []);
  const inquiry = rows[0]; if (!inquiry) notFound();
  return <main className="admin-shell inquiry-detail-page">
    <header className="admin-head"><div><p className="eyebrow">Private / Inquiry detail</p><h1>{inquiryReference(inquiry)}</h1><p>Submitted brief, contact context and qualification state.</p></div><Link className="admin-back" href="/studio-admin/inquiries">← All inquiries</Link></header>
    <section className="inquiry-detail-head"><div><p className="eyebrow">Qualification</p><h2>Lead status</h2></div><InquiryStatusActions id={inquiry.id} status={inquiry.status}/></section>
    <InquiryView inquiry={inquiry}/>
    <aside className="future-action"><div><p className="eyebrow">Phase 1D direction</p><h2>Client project conversion</h2><p>Once qualified and accepted, this inquiry can become a secure client project with milestones, files, approvals and updates.</p></div><button disabled type="button">Convert to Client Project / Future</button></aside>
  </main>;
}
