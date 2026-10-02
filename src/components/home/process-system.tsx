"use client";
import { DynamicText, T } from "@/i18n/language-context";

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
        <p className="eyebrow"><T id="home.process.05Process"/></p>
        <div className="process-grid">
          <div className="process-intro">
            <h2 className="display display-md"> <T id="home.process.oneSystem"/> <br /> <T id="home.process.fiveDeliberateMoves"/> </h2>
            <p> <T id="home.process.enoughStructureToProtectTheOutcomeEnoughFlexibilityTo"/> </p>
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
                  <h3><DynamicText text={stage.title}/></h3>
                  <p><DynamicText text={stage.what}/></p>
                  <dl>
                    <dt><T id="home.process.whyItMatters"/></dt>
                    <dd><DynamicText text={stage.why}/></dd>
                    <dt><T id="home.process.youGet"/></dt>
                    <dd><DynamicText text={stage.deliverable}/></dd>
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
