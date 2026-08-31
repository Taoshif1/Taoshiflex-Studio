import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";
import { inquiryStatuses, isInquiryStatus, type InquiryRecord } from "@/lib/inquiries";
import { InquiryView } from "../inquiry-view";

export const metadata: Metadata = { title: "Inquiries / Studio Admin", robots: { index: false, follow: false } };
const pageSize = 10;
type Props = { searchParams: Promise<{ page?: string; status?: string }> };

export default async function InquiriesPage({ searchParams }: Props) {
  if (!await getAdminSession()) redirect("/studio-admin");
  const query = await searchParams;
  const page = Math.max(1, Math.min(10000, Number.parseInt(query.page || "1", 10) || 1));
  const status = isInquiryStatus(query.status) ? query.status : undefined;
  const offset = (page - 1) * pageSize;
  const filter = status ? `&status=eq.${status}` : "";
  const rows = await supabaseRest<InquiryRecord[]>(`inquiries?select=*&order=created_at.desc${filter}&limit=${pageSize + 1}&offset=${offset}`, {}, "privileged").catch(() => []);
  const inquiries = rows.slice(0, pageSize), hasNext = rows.length > pageSize;
  const href = (nextPage: number) => `/studio-admin/inquiries?${new URLSearchParams({ ...(status ? { status } : {}), ...(nextPage > 1 ? { page: String(nextPage) } : {}) })}`;
  return <main className="admin-shell inquiries-page">
    <header className="admin-head"><div><p className="eyebrow">Private / Lead desk</p><h1>Inquiries.</h1><p>Qualified context, without the raw developer payload.</p></div><Link className="admin-back" href="/studio-admin">← Studio workspace</Link></header>
    <nav className="inquiry-filters" aria-label="Filter inquiries"><Link className={!status ? "active" : ""} href="/studio-admin/inquiries">All</Link>{inquiryStatuses.map((item) => <Link key={item} className={status === item ? "active" : ""} href={`/studio-admin/inquiries?status=${item}`}>{item}</Link>)}</nav>
    <section className="inquiry-results" aria-labelledby="inquiry-results-title"><div className="section-title"><div><p className="eyebrow">Newest first</p><h2 id="inquiry-results-title">Lead queue</h2></div><span>Page {page}</span></div>
      <div className="inquiry-preview-list">{inquiries.length ? inquiries.map((item) => <InquiryView key={item.id} inquiry={item} compact/>) : <p className="inquiry-empty">No inquiries match this status.</p>}</div>
      <nav className="pagination" aria-label="Inquiry pages">{page > 1 ? <Link href={href(page - 1)}>← Previous</Link> : <span aria-disabled>← Previous</span>}<strong>Page {page}</strong>{hasNext ? <Link href={href(page + 1)}>Next →</Link> : <span aria-disabled>Next →</span>}</nav>
    </section>
  </main>;
}
