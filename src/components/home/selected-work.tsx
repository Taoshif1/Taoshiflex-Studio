"use client";
import { DynamicText, T } from "@/i18n/language-context";

import Link from "next/link";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef } from "react";
import type { Project } from "@/types/content";
import { ResponsiveMedia } from "@/components/ui/primitives";
import "./selected-work.css";
import "./selected-work-phase1c1.css";
import "./selected-work-phase1d2.css";
export function SelectedWork({ projects }: { projects: Project[] }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  return (
    <section ref={ref} id="work" className="work-section">
      <div className="work-trajectory" aria-hidden="true">
        <svg viewBox="0 0 1200 760" preserveAspectRatio="none">
          <path className="trajectory-guide" d="M-60 690 L1260 72" />
          <path className="trajectory-path trajectory-path-one" d="M-30 620 C250 560 340 372 604 390 S940 230 1240 132" />
          <path className="trajectory-path trajectory-path-two" d="M80 728 C330 620 520 660 690 510 S980 420 1160 248" />
          <circle cx="604" cy="390" r="5" />
          <circle cx="690" cy="510" r="5" />
          <circle cx="930" cy="267" r="5" />
        </svg>
        <span className="registration-mark registration-a"><i /><i /></span>
        <span className="registration-mark registration-b"><i /><i /></span>
        <span className="coordinate-ticks ticks-a"><i /><i /><i /><i /></span>
        <span className="coordinate-ticks ticks-b"><i /><i /><i /></span>
      </div>
      <div className="container work-heading">
        <p className="eyebrow"><T id="home.work.02SelectedWork"/></p>
        <h2 className="display display-md"><T id="home.work.proofNotPromises"/></h2>
      </div>
      <div className="work-stage container">
        {projects.length ? (
          projects.map((project, index) => (
            <ProjectScene
              key={project.slug}
              project={project}
              index={index}
              progress={scrollYProgress}
              reduce={Boolean(reduce)}
            />
          ))
        ) : (
          <p className="empty-state"> <T id="home.work.noProjectsAreFeaturedOnTheHomepageRightNow"/> </p>
        )}
      </div>
    </section>
  );
}
function ProjectScene({
  project,
  index,
  progress,
  reduce,
}: {
  project: Project;
  index: number;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  reduce: boolean;
}) {
  const start = index / 3;
  const end = (index + 1) / 3;
  const scale = useTransform(progress, [start, end], [0.96, 1]);
  return (
    <motion.article className="project-scene" data-project-index={index + 1}>
      <div className="project-evidence" aria-hidden="true">
        <i />
        <i />
        <span>E{String(index + 1).padStart(2, "0")}</span>
      </div>
      <div className="project-meta">
        <p className="technical">
          0{index + 1} / <DynamicText text={project.category}/>
        </p>
        <h3>{project.name}</h3>
        <p><DynamicText text={project.summary} slug={project.slug}/></p>
        <dl>
          <div>
            <dt><T id="home.work.state"/></dt>
            <dd><DynamicText text={project.status}/></dd>
          </div>
          <div>
            <dt><T id="home.work.focus"/></dt>
            <dd>{project.capabilities.slice(0, 2).join(" + ")}</dd>
          </div>
        </dl>
        <Link className="action" href={`/work/${project.slug}`}> <T id="home.work.viewCaseStudy"/> <span aria-hidden>↗</span>
        </Link>
      </div>
      <motion.div style={reduce ? undefined : { scale }}>
        <ResponsiveMedia
          accent={project.accent}
          className="project-cover-media"
          fit="contain"
          label={project.name}
          media={project.coverMedia}
        />
      </motion.div>
    </motion.article>
  );
}
