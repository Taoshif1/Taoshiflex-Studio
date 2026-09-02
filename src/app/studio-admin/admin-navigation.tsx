"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";

const items = [
  { label: "Dashboard", href: "/studio-admin", section: "dashboard" },
  { label: "Projects", href: "/studio-admin#projects", section: "dashboard" },
  { label: "Inquiries", href: "/studio-admin/inquiries", section: "inquiries" },
  { label: "Client Projects", href: "/studio-admin/client-projects", section: "client-projects" },
  { label: "Pricing", href: "/studio-admin#pricing-admin", section: "dashboard" },
  { label: "GitHub", href: "/studio-admin#github", section: "dashboard" },
  { label: "Assistant", href: "/studio-admin#assistant-admin", section: "dashboard" },
] as const;

function activeSection(pathname: string) {
  if (pathname.startsWith("/studio-admin/inquiries")) return "inquiries";
  if (pathname.startsWith("/studio-admin/client-projects")) return "client-projects";
  return pathname === "/studio-admin" ? "dashboard" : "";
}

export function AdminNavigation({ email }: { email?: string }) {
  const pathname = usePathname();
  const current = activeSection(pathname);
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/studio/auth", { method: "DELETE" });
    } finally {
      window.location.assign("/studio-admin");
    }
  }

  const links = items.map((item) => {
    const isActive = item.section === current && (
      item.section !== "dashboard" || item.label === "Dashboard"
    );
    return <Link key={item.label} href={item.href} aria-current={isActive ? "page" : undefined} onClick={() => mobileMenu.current?.removeAttribute("open")}>{item.label}</Link>;
  });

  return <>
    <aside className="admin-global-nav" aria-label="Studio Admin navigation">
      <div className="admin-nav-brand"><span>Taoshiflex</span><strong>Studio Admin</strong></div>
      <nav>{links}</nav>
      <div className="admin-nav-utility">
        <Link href="/" target="_blank" rel="noreferrer">View Public Site <span aria-hidden>↗</span></Link>
        {email ? <small title={email}>{email}</small> : null}
        <button type="button" onClick={signOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button>
      </div>
    </aside>
    <details className="admin-mobile-nav" ref={mobileMenu}>
      <summary>Studio Admin <span aria-hidden>Menu</span></summary>
      <div>
        <nav aria-label="Studio Admin mobile navigation">{links}</nav>
        <div className="admin-nav-utility">
          <Link href="/" target="_blank" rel="noreferrer">View Public Site <span aria-hidden>↗</span></Link>
          <button type="button" onClick={signOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button>
        </div>
      </div>
    </details>
  </>;
}
