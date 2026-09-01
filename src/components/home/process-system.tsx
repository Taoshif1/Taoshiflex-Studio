"use client";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef } from "react";
import type { ProcessStage } from "@/types/content";
import "./process-system.css";
export function ProcessSystem({ stages }: { stages: ProcessStage[] }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start center", "end center"],
  });
  const height = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  return (
    <section ref={ref} id="process" className="section process">
      <div className="process-drafting" aria-hidden="true">
        <svg viewBox="0 0 1200 900" preserveAspectRatio="none">
          <path d="M96 108 H1100" />
          <path d="M1060 42 V846" />
          <path className="drafting-arc" d="M1060 190 A210 210 0 0 0 850 400" />
          <path className="drafting-arc" d="M1060 465 A340 340 0 0 0 720 805" />
        </svg>
        <span className="draft-crosshair crosshair-a"><i /><i /></span>
        <span className="draft-crosshair crosshair-b"><i /><i /></span>
      </div>
      <div className="container">
        <p className="eyebrow">05 / Process</p>
        <div className="process-grid">
          <div className="process-intro">
            <h2 className="display display-md">
              One system.
              <br />
              Five deliberate moves.
            </h2>
            <p>
              Enough structure to protect the outcome. Enough flexibility to
              respond to what we learn.
            </p>
          </div>
          <div className="timeline">
            <div className="timeline-line">
              <motion.i style={reduce ? { height: "100%" } : { height }} />
            </div>
            {stages.map((stage, index) => (
              <article key={stage.id}>
                <span className="stage-datum" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="node">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{stage.title}</h3>
                  <p>{stage.what}</p>
                  <dl>
                    <dt>Why it matters</dt>
                    <dd>{stage.why}</dd>
                    <dt>You get</dt>
                    <dd>{stage.deliverable}</dd>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
