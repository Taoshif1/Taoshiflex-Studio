import type { ButtonHTMLAttributes, ReactNode } from "react";

export function LoadingSpinner() {
  return <span className="loading-spinner" aria-hidden="true" />;
}
export function PendingButton({ pending, pendingLabel = "Saving…", children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { pending: boolean; pendingLabel?: ReactNode }) {
  return <button {...props} disabled={disabled || pending} aria-busy={pending}>
    {pending ? <><LoadingSpinner />{pendingLabel}</> : children}
  </button>;
}
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={"skeleton " + className} aria-hidden="true" />;
}
export function LoadingShell({ label, compact = false }: { label: ReactNode; compact?: boolean }) {
  return <section className={"loading-shell" + (compact ? " compact" : "")} aria-busy="true">
    <p role="status"><LoadingSpinner />{label}</p>
    <Skeleton className="skeleton-heading" /><Skeleton className="skeleton-copy" />
    <div className="skeleton-grid">{[0, 1, 2].map(key => <div className="skeleton-card" key={key}><Skeleton className="skeleton-media" /><Skeleton className="skeleton-heading" /><Skeleton className="skeleton-copy" /></div>)}</div>
  </section>;
}
