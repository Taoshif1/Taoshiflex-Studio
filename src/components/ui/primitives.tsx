import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";

export function Section({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) { return <section id={id} className={`section ${className}`}>{children}</section>; }
export function SectionLabel({ children }: { children: ReactNode }) { return <p className="eyebrow">{children}</p>; }
export function DisplayHeading({ children, as: Tag = "h2", className = "" }: { children: ReactNode; as?: "h1" | "h2" | "h3"; className?: string }) { return <Tag className={`display ${className}`}>{children}</Tag>; }
export function ActionLink({ href, children, solid = false }: { href: string; children: ReactNode; solid?: boolean }) { return <Link className={`action ${solid ? "action-solid" : ""}`} href={href}>{children}<span aria-hidden>↗</span></Link>; }
export function Rule(props: HTMLAttributes<HTMLDivElement>) { return <div {...props} className={`rule ${props.className ?? ""}`} />; }
export function ResponsiveMedia({ accent, label, className = "" }: { accent: string; label: string; className?: string }) { return <div className={`media-placeholder ${className}`} style={{ "--accent": accent } as React.CSSProperties} role="img" aria-label={label}><div className="media-ui"><span className="technical" style={{ position:"absolute", bottom:"1.5rem", left:"2rem" }}>Media slot / {label}</span></div></div>; }
