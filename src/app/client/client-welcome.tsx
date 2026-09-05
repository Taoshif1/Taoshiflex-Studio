"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function ClientWelcome({ initiallyVisible }: { initiallyVisible: boolean }) {
  const [visible, setVisible] = useState(initiallyVisible);

  useEffect(() => {
    if (!initiallyVisible) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("welcome") !== "1") return;
    url.searchParams.delete("welcome");
    const query = url.searchParams.toString();
    window.history.replaceState(window.history.state, "", `${url.pathname}${query ? `?${query}` : ""}${url.hash}`);
  }, [initiallyVisible]);

  if (!visible) return null;
  return (
    <section className="client-welcome-card" aria-labelledby="client-welcome-title">
      <div>
        <p className="eyebrow">Welcome to your workspace</p>
        <h2 id="client-welcome-title">Everything for this project lives here.</h2>
        <p>Follow progress, deliverables, feedback, payments and decisions in one private place.</p>
      </div>
      <div className="client-welcome-actions">
        <Link className="action action-solid" href="/client/help">View Workspace Guide</Link>
        <button className="action" type="button" onClick={() => setVisible(false)}>Got it</button>
      </div>
    </section>
  );
}
