import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, supabaseRest } from "@/lib/supabase-rest";
import { clientProjectStatuses, formatProjectDate, statusLabel, type ClientProject } from "@/lib/client-projects";
import { adminListHref, normalizeAdminSearch, parseAdminPage, postgrestSearchPattern } from "@/lib/admin-list-state";
import { AdminBreadcrumbs } from "../admin-breadcrumbs";

export const metadata: Metadata = { title: "Client Projects / Studio Admin", robots: { index: false, follow: false } };
const pageSize = 12;
const pathname = "/studio-admin/client-projects";
type Props = { searchParams: Promise<{ page?: string; status?: string; q?: string }> };

export default async function ClientProjectsPage({ searchParams }: Props) {
  if (!await getAdminSession()) redirect("/studio-admin");
  const query = await searchParams;
  const page = parseAdminPage(query.page);
  const status = clientProjectStatuses.includes(query.status as typeof clientProjectStatuses[number]) ? query.status : undefined;
  const q = normalizeAdminSearch(query.q);
  const pattern = postgrestSearchPattern(q);
  const offset = (page - 1) * pageSize;
  const statusFilter = status ? `&status=eq.${status}` : "";
  const searchFilter = pattern ? `&or=${encodeURIComponent(`(reference.ilike.${pattern},name.ilike.${pattern},client_name.ilike.${pattern})`)}` : "";
  const rows = await supabaseRest<ClientProject[]>(`client_projects?select=*&order=updated_at.desc,id.desc${statusFilter}${searchFilter}&limit=${pageSize + 1}&offset=${offset}`, {}, "privileged").catch(() => null);
  const href = (nextPage: number, nextStatus = status, nextSearch = q) => adminListHref(pathname, { page: nextPage, status: nextStatus, q: nextSearch });
  const projects = rows?.slice(0, pageSize) ?? [];
  if (rows && page > 1 && projects.length === 0) redirect(href(1));
  const currentPath = href(page);
  const range = projects.length ? `${offset + 1}-${offset + projects.length}` : "0";

  return <main className="admin-shell client-projects-admin">
    <AdminBreadcrumbs items={[{ label: "Studio Admin", href: "/studio-admin" }, { label: "Client Projects" }]}/>
    <header className="admin-head"><div><p className="eyebrow">Private / Delivery desk</p><h1>Client Projects.</h1><p>Accepted work, operational progress and client-visible delivery information.</p></div></header>
    {rows === null ? <section className="migration-notice"><p className="eyebrow">Setup required</p><h2>Migration 006 is not active.</h2><p>Review and manually apply the Phase 1D migration before creating Client Projects. The existing Studio remains operational.</p></section> : <>
      <form className="admin-list-search" action={pathname}>
        <label htmlFor="client-project-search">Search Client Projects</label>
        <div><input id="client-project-search" name="q" type="search" defaultValue={q} placeholder="Reference, project or client name" maxLength={80}/>{status ? <input type="hidden" name="status" value={status}/> : null}<button>Search</button>{q ? <Link href={href(1, status, "")}>Clear</Link> : null}</div>
      </form>
      <nav className="inquiry-filters" aria-label="Filter Client Projects"><Link className={!status ? "active" : ""} href={href(1, undefined)} aria-current={!status ? "page" : undefined}>All</Link>{clientProjectStatuses.map(item => <Link key={item} className={status === item ? "active" : ""} href={href(1, item)} aria-current={status === item ? "page" : undefined}>{statusLabel(item)}</Link>)}</nav>
      <section className="client-admin-results"><div className="section-title"><div><p className="eyebrow">Operational projects</p><h2>Delivery queue</h2></div><span>Results {range} &middot; Page {page}</span></div><div className="client-admin-list">{projects.map(project => <Link href={`/studio-admin/client-projects/${project.id}?from=${encodeURIComponent(currentPath)}`} key={project.id}><div><span className={`status-badge ${project.status}`}>{statusLabel(project.status)}</span><span className="technical">{project.reference}</span></div><h3>{project.name}</h3><p>{project.client_name}</p><dl><dt>Phase</dt><dd>{project.current_phase}</dd><dt>Progress</dt><dd>{project.progress}%</dd><dt>Target</dt><dd>{formatProjectDate(project.target_date)}</dd></dl></Link>)}</div>{!projects.length ? <p className="inquiry-empty">No Client Projects match this filter or search.</p> : null}<nav className="pagination" aria-label="Client Project pages">{page > 1 ? <Link href={href(page - 1)}>&larr; Previous</Link> : <span aria-disabled="true">&larr; Previous</span>}<strong>Page {page}</strong>{rows.length > pageSize ? <Link href={href(page + 1)}>Next &rarr;</Link> : <span aria-disabled="true">Next &rarr;</span>}</nav></section>
    </>}
  </main>;
}
