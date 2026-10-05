import type { ButtonHTMLAttributes, ReactNode } from "react";

export function BrandLoader({ size = "lg" }: { size?: "sm" | "lg" }) {
  return <span className={`brand-loader brand-loader--${size}`} aria-hidden="true">
    <span className="brand-loader-orbit" /><span className="brand-loader-orbit brand-loader-orbit--inner" />
    <span className="brand-loader-mark">{size === "sm" ? "X" : <>T<span>x</span>S</>}</span>
  </span>;
}
export function PendingButton({ pending, pendingLabel = "Saving…", children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { pending: boolean; pendingLabel?: ReactNode }) {
  return <button {...props} disabled={disabled || pending} aria-busy={pending}>
    {pending ? <><BrandLoader size="sm" />{pendingLabel}</> : children}
  </button>;
}
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={"skeleton " + className} aria-hidden="true" />;
}
export function LoadingShell({ label, compact = false }: { label: ReactNode; compact?: boolean }) {
  return <section className={"loading-shell" + (compact ? " compact" : "")} aria-busy="true">
    <div className="loading-signal" role="status"><BrandLoader /><p>{label}</p></div>
    <Skeleton className="skeleton-heading" /><Skeleton className="skeleton-copy" />
    <div className="skeleton-grid">{[0, 1, 2].map(key => <div className="skeleton-card" key={key}><Skeleton className="skeleton-media" /><Skeleton className="skeleton-heading" /><Skeleton className="skeleton-copy" /></div>)}</div>
  </section>;
}