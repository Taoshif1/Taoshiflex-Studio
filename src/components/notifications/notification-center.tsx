"use client";
import { useToasts } from "@/components/ui/toast";
import { PendingButton } from "@/components/ui/loading";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AppNotification, NotificationInbox } from "@/lib/notifications";

function formatNotificationTime(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

export function NotificationCenter({
  inbox,
  placement = "end",
}: {
  inbox: NotificationInbox;
  placement?: "start" | "end";
}) {
  const router = useRouter();
  const { toast } = useToasts();
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;
    details.open = false;
    function outside(event: PointerEvent) {
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) details.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || !details?.open) return;
      const restoreFocus = details.contains(document.activeElement);
      details.open = false;
      if (restoreFocus) summaryRef.current?.focus();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [pathname]);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const countLabel = inbox.capped ? inbox.unreadCount + "+" : String(inbox.unreadCount);

  async function markRead(action: "one" | "all", id?: string) {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    setNotice("");
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Notification could not be updated.");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Notification could not be updated.";
      setNotice(message); toast("error", message);
      return false;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  async function openNotification(event: React.MouseEvent<HTMLAnchorElement>, item: AppNotification) {
    if (detailsRef.current) detailsRef.current.open = false;
    if (item.read_at || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    await markRead("one", item.id);
    router.push(item.href);
  }

  return (
    <details ref={detailsRef} className={"notification-center placement-" + placement}>
      <summary ref={summaryRef}
        className="notification-trigger"
        aria-label={"Notifications" + (inbox.unreadCount ? ", " + countLabel + " unread" : "")}
      >
        <svg aria-hidden className="notification-bell" viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
        <span>Notifications</span>
        {inbox.unreadCount ? <strong aria-label={countLabel + " unread notifications"}>{countLabel}</strong> : null}
      </summary>
      <div className="notification-panel">
        <header>
          <div>
            <span className="eyebrow">Attention</span>
            <h2>Notifications</h2>
          </div>
          {inbox.unreadCount ? (
            <PendingButton pending={pending} pendingLabel={"Updating…"}
              type="button"
              disabled={pending}
              onClick={async () => {
                if (await markRead("all")) router.refresh();
              }}
            >
              {pending ? "Updating…" : "Mark all as read"}
            </PendingButton>
          ) : null}
        </header>
        {inbox.items.length ? (
          <ol className="notification-list">
            {inbox.items.map((item) => (
              <li key={item.id}>
                <a
                  className={[
                    item.read_at ? "read" : "unread",
                    item.priority === "attention" ? "attention" : "",
                  ].filter(Boolean).join(" ")}
                  href={item.href}
                  onClick={(event) => void openNotification(event, item)}
                >
                  <span className="notification-dot" aria-hidden />
                  <span>
                    <strong>{item.title}</strong>
                    {item.message ? <span>{item.message}</span> : null}
                    <time dateTime={item.created_at}>{formatNotificationTime(item.created_at)}</time>
                  </span>
                  {!item.read_at ? <small>Unread</small> : null}
                </a>
              </li>
            ))}
          </ol>
        ) : <p className="notification-empty">No notifications yet.</p>}
        <p className="notification-notice" aria-live="polite">{notice}</p>
      </div>
    </details>
  );
}
