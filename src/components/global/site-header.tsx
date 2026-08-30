"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const links = [
  { href: "/work", label: "Work" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#services", label: "Services" },
  { href: "/#process", label: "Process" },
  { href: "/#studio", label: "Studio" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState("");
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (pathname !== "/") return;
    const sections = ["services", "process", "studio"].map((id) => document.getElementById(id)).filter((item): item is HTMLElement => Boolean(item));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: "-28% 0px -56%", threshold: [0, .2, .5] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [pathname]);
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) triggerRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const pageRegions = [document.querySelector("main"), document.querySelector("footer")].filter((element): element is HTMLElement => element instanceof HTMLElement);
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    pageRegions.forEach((element) => { element.inert = true; element.setAttribute("aria-hidden", "true"); });
    const frame = window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("a")?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab" || !menuRef.current) return;
      const focusable = [triggerRef.current, ...menuRef.current.querySelectorAll<HTMLElement>("a")].filter((element): element is HTMLElement => Boolean(element));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      pageRegions.forEach((element) => { element.inert = false; element.removeAttribute("aria-hidden"); });
    };
  }, [open]);

  const routeActive=(href:string)=>href==="/work"?pathname==="/work"||pathname.startsWith("/work/"):pathname===href;
  const linkActive=(href:string)=>href.startsWith("/#")?pathname==="/"&&activeSection===href.slice(2):routeActive(href);
  return <header className="site-header"><div className="container nav-inner"><Link href="/" className="wordmark" onClick={() => setOpen(false)}>Taoshifle<span>x</span> Studio</Link><nav className="desktop-nav" aria-label="Primary">{links.map((link) => <Link key={link.href} href={link.href} className={linkActive(link.href)?"nav-active":undefined} aria-current={!link.href.includes("#")&&linkActive(link.href)?"page":undefined}>{link.label}</Link>)}<Link className={`nav-cta${routeActive("/start-a-project")?" nav-active":""}`} aria-current={routeActive("/start-a-project")?"page":undefined} href="/start-a-project">Start a Project</Link></nav><button ref={triggerRef} className="menu-button" type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls={menuId}><span>{open ? "Close" : "Menu"}</span><i aria-hidden /></button></div><AnimatePresence>{open ? <motion.div ref={menuRef} id={menuId} className="mobile-menu" initial={reduceMotion ? false : { clipPath: "inset(0 0 100% 0)", opacity: .85 }} animate={{ clipPath: "inset(0 0 0% 0)", opacity: 1 }} exit={reduceMotion ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)", opacity: .85 }} transition={{ duration: reduceMotion ? .01 : .48, ease: [.22, 1, .36, 1] }}><nav className="container" aria-label="Mobile">{links.map((link, index) => <Link key={link.href} href={link.href} className={linkActive(link.href)?"nav-active":undefined} aria-current={!link.href.includes("#")&&linkActive(link.href)?"page":undefined} onClick={() => setOpen(false)}><small>{String(index + 1).padStart(2, "0")}</small>{link.label}</Link>)}<Link href="/start-a-project" className={routeActive("/start-a-project")?"nav-active":undefined} aria-current={routeActive("/start-a-project")?"page":undefined} onClick={() => setOpen(false)}><small>06</small>Start a Project</Link></nav></motion.div> : null}</AnimatePresence></header>;
}
