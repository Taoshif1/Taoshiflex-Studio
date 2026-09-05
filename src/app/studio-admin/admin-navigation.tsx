"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { NotificationCenter } from "@/components/notifications/notification-center";
import type { NotificationInbox } from "@/lib/notifications";
import { SignOutIcon } from "@/components/ui/sign-out-icon";
import { ToastRegion, useToasts } from "@/components/ui/toast";

const items = [
  { label: "Dashboard", href: "/studio-admin", section: "dashboard" },
  { label: "Public Projects", href: "/studio-admin/projects", section: "projects" },
  { label: "Inquiries", href: "/studio-admin/inquiries", section: "inquiries" },
  { label: "Client Projects", href: "/studio-admin/client-projects", section: "client-projects" },
  { label: "Pricing", href: "/studio-admin/pricing", section: "pricing" },
  { label: "Policies", href: "/studio-admin/policies", section: "policies" },
  { label: "GitHub", href: "/studio-admin/github", section: "github" },
  { label: "Settings", href: "/studio-admin/settings", section: "settings" },
] as const;

function activeDestination(pathname: string) {
  const destination = items.find((item) =>
    item.href === "/studio-admin"
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/"),
  );
  return destination?.href ?? "";
}

export function AdminNavigation({ email, inbox }: { email?: string; inbox: NotificationInbox }) {
  const pathname = usePathname();
  const router = useRouter();
  const current = activeDestination(pathname);
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const [signingOut, setSigningOut] = useState(false);
  const { toasts, toast, dismiss } = useToasts();

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const response = await fetch("/api/studio/auth", { method: "DELETE" });
      if (!response.ok) throw new Error("sign_out_failed");
      router.replace("/studio-admin");
      router.refresh();
    } catch {
      toast("error", "Sign-out could not be confirmed. Please retry.");
      setSigningOut(false);
    }
  }

  const inquiryUnread = inbox.unreadTypeCounts.new_inquiry ?? 0;
  const clientProjectUnread =
    (inbox.unreadTypeCounts.client_feedback ?? 0) +
    (inbox.unreadTypeCounts.client_changes_requested ?? 0) +
    (inbox.unreadTypeCounts.payment_submitted ?? 0);
  const links = items.map((item) => {
    const isActive = item.href === current;
    const unread = item.section === "inquiries"
      ? inquiryUnread
      : item.section === "client-projects"
        ? clientProjectUnread
        : 0;
    return <Link key={item.label} href={item.href} aria-current={isActive ? "page" : undefined} onClick={() => {
      mobileMenu.current?.removeAttribute("open");
    }}><span>{item.label}</span>{unread ? <strong className="admin-nav-count" aria-label={unread + " unread"}>{unread}</strong> : null}</Link>;
  });

  return <>
    <aside className="admin-global-nav" aria-label="Studio Admin navigation">
      <div className="admin-nav-brand"><span>Taoshiflex</span><strong>Studio Admin</strong></div>
      <div className="admin-nav-attention">
        <NotificationCenter inbox={inbox} placement="start"/>
      </div>
      <nav>{links}</nav>
      <div className="admin-nav-utility">
        <Link href="/" target="_blank" rel="noreferrer">View Public Site <span aria-hidden>↗</span></Link>
        {email ? <small title={email}>{email}</small> : null}
        <button className="admin-signout" type="button" onClick={signOut} disabled={signingOut}><SignOutIcon/><span>{signingOut ? "Signing out…" : "Sign out"}</span></button>
      </div>
    </aside>
    <details className="admin-mobile-nav" ref={mobileMenu}>
      <summary>Studio Admin <span aria-hidden>Menu</span></summary>
      <div>
        <nav aria-label="Studio Admin mobile navigation">{links}</nav>
        <div className="admin-nav-utility">
          <NotificationCenter inbox={inbox}/>
          <Link href="/" target="_blank" rel="noreferrer">View Public Site <span aria-hidden>↗</span></Link>
          <button className="admin-signout" type="button" onClick={signOut} disabled={signingOut}><SignOutIcon/><span>{signingOut ? "Signing out…" : "Sign out"}</span></button>
        </div>
      </div>
    </details>
    <ToastRegion toasts={toasts} dismiss={dismiss}/>
  </>;
}
