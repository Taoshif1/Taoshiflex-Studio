"use client";

import { useEffect } from "react";

export function PublicNavigationScrollReset() {
  useEffect(() => {
    const handleNavigationClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !(event.target instanceof Element)
      ) return;

      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.hasAttribute("download")) return;

      const target = anchor.getAttribute("target");
      if (target && target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let nextUrl: URL;
      try {
        nextUrl = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (nextUrl.origin !== window.location.origin) return;

      const sameLocation =
        nextUrl.pathname === window.location.pathname &&
        nextUrl.search === window.location.search;
      if (sameLocation) return;

      // Next keeps the previous scroll position while a streamed route fallback is
      // rendering, then restores the destination to the top. Reset before the
      // navigation starts so the branded loader/skeleton is visible immediately
      // instead of briefly showing the footer/bottom of the next shell.
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    document.addEventListener("click", handleNavigationClick, true);
    return () => document.removeEventListener("click", handleNavigationClick, true);
  }, []);

  return null;
}
