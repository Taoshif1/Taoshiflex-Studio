import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";
import { inquiryStatuses, isInquiryStatus, type InquiryRecord } from "@/lib/inquiries";
import { adminListHref, normalizeAdminSearch, parseAdminPage, postgrestSearchPattern } from "@/lib/admin-list-state";
import { AdminBreadcrumbs } from "../admin-breadcrumbs";
import { InquiryView } from "../inquiry-view";

export const metadata: Metadata = { title: "Inquiries / Studio Admin", robots: { index: false, follow: false } };
const pageSize = 10;
const pathname = "/studio-admin/inquiries";
type Props = { searchParams: Promise<{ page?: string; status?: string; q?: string }> };

export default async function InquiriesPage({ searchParams }: Props) {
  if (!await getAdminSession()) redirect("/studio-admin");
  const query = await searchParams;
  const page = parseAdminPage(query.page);
  const status = isInquiryStatus(query.status) ? query.status : undefined;
  const q = normalizeAdminSearch(query.q);
  const pattern = postgrestSearchPattern(q);
  const offset = (page - 1) * pageSize;
  const statusFilter = status ? `&status=eq.${status}` : "";
  const searchFilter = pattern ? `&or=${encodeURIComponent(`(reference.ilike.${pattern},email.ilike.${pattern},payload->>name.ilike.${pattern},payload->>business.ilike.${pattern})`)}` : "";
  const rows = await supabaseRest<InquiryRecord[]>(`inquiries?select=*&order=created_at.desc,id.desc${statusFilter}${searchFilter}&limit=${pageSize + 1}&offset=${offset}`, {}, "privileged").catch(() => []);
  const inquiries = rows.slice(0, pageSize);
  const hasNext = rows.length > pageSize;
  const href = (nextPage: number, nextStatus = status, nextSearch = q) => adminListHref(pathname, { page: nextPage, status: nextStatus, q: nextSearch });
  if (page > 1 && inquiries.length === 0) redirect(href(1));
  const currentPath = href(page);
  const range = inquiries.length ? `${offset + 1}-${offset + inquiries.length}` : "0";

  return <main className="admin-shell inquiries-page">
    <AdminBreadcrumbs items={[{ label: "Studio Admin", href: "/studio-admin" }, { label: "Inquiries" }]}/>
    <header className="admin-head"><div><p className="eyebrow">Private / Lead desk</p><h1>Inquiries.</h1><p>Qualified context, without the raw developer payload.</p></div></header>
    <form className="admin-list-search" action={pathname}>
      <label htmlFor="inquiry-search">Search inquiries</label>
      <div><input id="inquiry-search" name="q" type="search" defaultValue={q} placeholder="Reference, name, email or business" maxLength={80}/>{status ? <input type="hidden" name="status" value={status}/> : null}<button>Search</button>{q ? <Link href={href(1, status, "")}>Clear</Link> : null}</div>
    </form>
    <nav className="inquiry-filters" aria-label="Filter inquiries"><Link className={!status ? "active" : ""} href={href(1, undefined)} aria-current={!status ? "page" : undefined}>All</Link>{inquiryStatuses.map((item) => <Link key={item} className={status === item ? "active" : ""} href={href(1, item)} aria-current={status === item ? "page" : undefined}>{item}</Link>)}</nav>
    <section className="inquiry-results" aria-labelledby="inquiry-results-title"><div className="section-title"><div><p className="eyebrow">Newest first</p><h2 id="inquiry-results-title">Lead queue</h2></div><span>Results {range} &middot; Page {page}</span></div>
      <div className="inquiry-preview-list">{inquiries.length ? inquiries.map((item) => <InquiryView key={item.id} inquiry={item} compact detailHref={`/studio-admin/inquiries/${item.id}?from=${encodeURIComponent(currentPath)}`}/>) : <p className="inquiry-empty">No inquiries match this filter or search.</p>}</div>
      <nav className="pagination" aria-label="Inquiry pages">{page > 1 ? <Link href={href(page - 1)}>&larr; Previous</Link> : <span aria-disabled="true">&larr; Previous</span>}<strong>Page {page}</strong>{hasNext ? <Link href={href(page + 1)}>Next &rarr;</Link> : <span aria-disabled="true">Next &rarr;</span>}</nav>
    </section>
  </main>;
}
