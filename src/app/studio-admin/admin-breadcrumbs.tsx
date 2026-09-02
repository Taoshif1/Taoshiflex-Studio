import Link from "next/link";

export type AdminBreadcrumb = { label: string; href?: string };

export function AdminBreadcrumbs({ items }: { items: AdminBreadcrumb[] }) {
  return <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
    <ol>{items.map((item, index) => <li key={`${item.label}-${index}`}>
      {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
    </li>)}</ol>
  </nav>;
}
