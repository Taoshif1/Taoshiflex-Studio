import { DynamicText, T } from "@/i18n/language-context";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Project } from "@/types/content";
import { ResponsiveMedia } from "@/components/ui/primitives";
import "./selected-work.css";
import "./selected-work-phase1c1.css";
import "./selected-work-phase1d2.css";

export function SelectedWork({ projects }: { projects: Project[] }) {
  return <section id="work" className="work-section">
    <div className="container work-heading">
      <p className="eyebrow"><T id="home.work.02SelectedWork"/></p>
      <h2 className="display display-md"><T id="home.work.proofNotPromises"/></h2>
    </div>
    <div className="work-stage container">
      {projects.length ? projects.map((project, index) => <article className="project-scene" key={project.slug} data-project-index={index + 1} style={{ "--accent": project.accent } as CSSProperties}>
        <div className="project-meta">
          <p className="technical"><span className="work-number">{String(index + 1).padStart(2, "0")}</span><DynamicText text={project.category}/></p>
          <h3>{project.name}</h3>
          <p><DynamicText text={project.summary} slug={project.slug}/></p>
          <dl>
            <div><dt><T id="home.work.state"/></dt><dd><DynamicText text={project.status}/></dd></div>
            <div><dt><T id="home.work.focus"/></dt><dd>{project.capabilities.slice(0, 2).map((capability, index) => <span key={capability}>{index > 0 ? " + " : ""}<DynamicText text={capability}/></span>)}</dd></div>
          </dl>
          <Link className="action" href={`/work/${project.slug}`}><T id="home.work.viewCaseStudy"/><span aria-hidden>↗</span></Link>
        </div>
        <div className="work-media-mount">
          <span className="work-evidence-label technical" aria-hidden="true">E{String(index + 1).padStart(2, "0")} / {project.year}</span>
          <ResponsiveMedia accent={project.accent} className="project-cover-media" fit="contain" label={project.name} media={project.coverMedia} sizes="(max-width: 767px) 92vw, (max-width: 1400px) 54vw, 760px"/>
        </div>
      </article>) : <p className="empty-state"><T id="home.work.noProjectsAreFeaturedOnTheHomepageRightNow"/></p>}
    </div>
  </section>;
}
