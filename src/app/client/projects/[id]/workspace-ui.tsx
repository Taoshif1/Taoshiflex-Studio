import Link from "next/link";

export function WorkspaceSection({
  eyebrow,
  title,
  helpHref,
  children,
}: {
  eyebrow: string;
  title: string;
  helpHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="workspace-section">
      <header>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {helpHref ? <Link className="workspace-help-link" href={helpHref}>How does this work?</Link> : null}
      </header>
      {children}
    </section>
  );
}

export function WorkspaceEmpty({ children }: { children: React.ReactNode }) {
  return <p className="workspace-empty">{children}</p>;
}
