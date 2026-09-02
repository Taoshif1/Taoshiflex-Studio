"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { NotificationCenter } from "@/components/notifications/notification-center";
import type { NotificationInbox } from "@/lib/notifications";

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

export function AdminNavigation({ email, inbox }: { email?: string; inbox: NotificationInbox }) {
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

  const inquiryUnread = inbox.unreadTypeCounts.new_inquiry ?? 0;
  const clientProjectUnread =
    (inbox.unreadTypeCounts.client_feedback ?? 0) +
    (inbox.unreadTypeCounts.client_changes_requested ?? 0);
  const links = items.map((item) => {
    const isActive = item.section === current && (
      item.section !== "dashboard" || item.label === "Dashboard"
    );
    const unread = item.section === "inquiries"
      ? inquiryUnread
      : item.section === "client-projects"
        ? clientProjectUnread
        : 0;
    return <Link key={item.label} href={item.href} aria-current={isActive ? "page" : undefined} onClick={() => mobileMenu.current?.removeAttribute("open")}><span>{item.label}</span>{unread ? <strong className="admin-nav-count" aria-label={unread + " unread"}>{unread}</strong> : null}</Link>;
  });

  return <>
    <aside className="admin-global-nav" aria-label="Studio Admin navigation">
      <div className="admin-nav-brand"><span>Taoshiflex</span><strong>Studio Admin</strong></div>
      <nav>{links}</nav>
      <div className="admin-nav-utility">
        <NotificationCenter inbox={inbox} placement="start"/>
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
          <NotificationCenter inbox={inbox}/>
          <Link href="/" target="_blank" rel="noreferrer">View Public Site <span aria-hidden>↗</span></Link>
          <button type="button" onClick={signOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button>
        </div>
      </div>
    </details>
  </>;
}
