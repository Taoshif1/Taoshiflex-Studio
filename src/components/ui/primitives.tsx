import Link from "next/link";
import Image from "next/image";
import type { ProjectMedia } from "@/types/content";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export function Section({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) { return <section id={id} className={`section ${className}`}>{children}</section>; }
export function SectionLabel({ children }: { children: ReactNode }) { return <p className="eyebrow">{children}</p>; }
export function DisplayHeading({ children, as: Tag = "h2", className = "" }: { children: ReactNode; as?: "h1" | "h2" | "h3"; className?: string }) { return <Tag className={`display ${className}`}>{children}</Tag>; }
export function ActionLink({ href, children, solid = false }: { href: string; children: ReactNode; solid?: boolean }) { return <Link className={`action ${solid ? "action-solid" : ""}`} href={href}>{children}<span aria-hidden>↗</span></Link>; }
export function Rule(props: HTMLAttributes<HTMLDivElement>) { return <div {...props} className={`rule ${props.className ?? ""}`} />; }
export function ResponsiveMedia({
  accent,
  label,
  className = "",
  fit = "cover",
  media,
  priority = false,
  sizes = "(max-width: 767px) 100vw, (max-width: 1200px) 80vw, 1200px",
}: {
  accent: string;
  label: string;
  className?: string;
  fit?: "cover" | "contain";
  media?: ProjectMedia;
  priority?: boolean;
  sizes?: string;
}) {
  const width = media?.width || 1600;
  const height = media?.height || 1000;

  return (
    <div
      className={`media-frame media-fit-${fit} ${media?.src ? "has-media" : "media-placeholder"} ${className}`}
      style={{ "--accent": accent, "--media-ratio": `${width}/${height}` } as CSSProperties}
    >
      {media?.src ? (
        <Image unoptimized src={media.src} alt={media.alt || label} width={width} height={height} sizes={sizes} preload={priority} />
      ) : (
        <div className="media-ui" role="img" aria-label={label}>
          <span className="technical">Media slot / {label}</span>
        </div>
      )}
    </div>
  );
}
