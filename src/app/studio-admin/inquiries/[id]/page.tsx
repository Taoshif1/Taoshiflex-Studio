import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";
import { safeAdminReturnPath } from "@/lib/admin-list-state";
import { inquiryReference, type InquiryRecord } from "@/lib/inquiries";
import { AdminBreadcrumbs } from "../../admin-breadcrumbs";
import { InquiryView } from "../../inquiry-view";
import { InquiryStatusActions } from "../status-actions";
import { ConvertInquiry } from "./convert-inquiry";

export const metadata: Metadata = { title: "Inquiry detail / Studio Admin", robots: { index: false, follow: false } };
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ from?: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function InquiryDetailPage({ params, searchParams }: Props) {
  if (!await getAdminSession()) redirect("/studio-admin");
  const { id } = await params;
  if (!uuid.test(id)) notFound();
  const rows = await supabaseRest<InquiryRecord[]>(`inquiries?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, {}, "privileged").catch(() => []);
  const inquiry = rows[0];
  if (!inquiry) notFound();
  const returnPath = safeAdminReturnPath((await searchParams).from, "/studio-admin/inquiries");
  const converted = await supabaseRest<Array<{ id: string }>>(`client_projects?source_inquiry_id=eq.${encodeURIComponent(id)}&select=id&limit=1`, {}, "privileged").catch(() => []);
  const reference = inquiryReference(inquiry);

  return <main className="admin-shell inquiry-detail-page">
    <AdminBreadcrumbs items={[{ label: "Studio Admin", href: "/studio-admin" }, { label: "Inquiries", href: returnPath }, { label: reference }]}/>
    <header className="admin-head"><div><p className="eyebrow">Private / Inquiry detail</p><h1>{reference}</h1><p>Submitted brief, contact context and qualification state.</p></div><Link className="admin-back" href={returnPath}>&larr; Back to inquiries</Link></header>
    <section className="inquiry-detail-head"><div><p className="eyebrow">Qualification</p><h2>Lead status</h2></div><InquiryStatusActions id={inquiry.id} status={inquiry.status}/></section>
    <InquiryView inquiry={inquiry}/>
    {converted[0] ? <aside className="future-action"><div><p className="eyebrow">Converted</p><h2>Client Project created</h2><p>This lead is linked to one private operational project. The inquiry reference remains an identifier, never an access credential.</p></div><Link className="admin-list-link" href={`/studio-admin/client-projects/${converted[0].id}`}>Open Client Project &rarr;</Link></aside> : inquiry.status === "qualified" ? <ConvertInquiry id={inquiry.id} name={inquiry.payload.projectType || inquiry.payload.name} business={inquiry.payload.business || inquiry.payload.name} summary={inquiry.payload.details}/> : <aside className="future-action"><div><p className="eyebrow">Conversion unavailable</p><h2>Qualify and accept first.</h2><p>Only a qualified inquiry can be explicitly converted to a Client Project.</p></div></aside>}
  </main>;
}
