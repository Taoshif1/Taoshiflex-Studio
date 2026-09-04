"use client";

import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";

import type {
  ProjectTimelineEvent,
  ProjectTimelineType,
} from "@/lib/project-timeline";

type TimelineFilter = "all" | Exclude<ProjectTimelineType, "project">;

const filters: { label: string; value: TimelineFilter }[] = [
  { label: "All", value: "all" },
  { label: "Updates", value: "update" },
  { label: "Milestones", value: "milestone" },
  { label: "Feedback", value: "feedback" },
  { label: "Payments", value: "payment" },
  { label: "Deliverables", value: "deliverable" },
];

const typeLabels: Record<ProjectTimelineType, string> = {
  project: "Project",
  update: "Update",
  milestone: "Milestone",
  feedback: "Feedback",
  payment: "Payment",
  deliverable: "Deliverable",
};

export function ProjectTimeline({ events, helpHref }: { events: ProjectTimelineEvent[]; helpHref?: string }) {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const scroller = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const visible = useMemo(
    () =>
      filter === "all"
        ? events
        : events.filter((event) => event.type === filter),
    [events, filter],
  );

  function move(direction: -1 | 1) {
    scroller.current?.scrollBy({
      left: direction * Math.min(scroller.current.clientWidth * 0.75, 620),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  return (
    <section id="activity" className="project-timeline" aria-labelledby="timeline-title">
      <header className="project-timeline-head">
        <div>
          <p className="eyebrow">Project history</p>
          <h2 id="timeline-title">Activity Timeline</h2>
          <p>Chronological progress, from earliest to latest.</p>
          {helpHref ? <Link className="workspace-help-link" href={helpHref}>How does the timeline work?</Link> : null}
        </div>
        {events.length > 1 ? (
          <div className="timeline-controls" aria-label="Timeline controls">
            <button type="button" onClick={() => move(-1)}>
              <span aria-hidden>←</span> Previous
            </button>
            <button type="button" onClick={() => move(1)}>
              Next <span aria-hidden>→</span>
            </button>
          </div>
        ) : null}
      </header>

      {events.length ? (
        <div className="timeline-filters" aria-label="Filter project activity">
          {filters.map((item) => (
            <button
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
              key={item.value}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {visible.length ? (
        <div
          className="timeline-scroll"
          ref={scroller}
          tabIndex={0}
          aria-label={`${filter === "all" ? "All" : typeLabels[filter]} project activity, chronological left to right`}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              move(-1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              move(1);
            }
          }}
        >
          <div className="timeline-track">
            {visible.map((event, index) => (
              <motion.article
                className="timeline-event"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.36, delay: Math.min(index * 0.035, 0.2) }}
                key={event.id}
              >
                <span className="timeline-node" aria-hidden>
                  <TimelineIcon type={event.type} />
                </span>
                <div className="timeline-card">
                  <div className="timeline-card-meta">
                    <span>{typeLabels[event.type]}</span>
                    {event.status ? <i>{event.status}</i> : null}
                  </div>
                  <h3>{event.title}</h3>
                  {event.summary ? <p>{event.summary}</p> : null}
                  {event.amount ? <strong>{event.amount}</strong> : null}
                  <dl>
                    {event.actor ? (
                      <div>
                        <dt>By</dt>
                        <dd>{event.actor}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>When</dt>
                      <dd>
                        <time dateTime={event.occurredAt}>
                          {formatTimelineDate(event.occurredAt)}
                        </time>
                      </dd>
                    </div>
                  </dl>
                  {event.href ? (
                    <Link href={event.href}>View detail <span aria-hidden>↘</span></Link>
                  ) : null}
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      ) : events.length ? (
        <p className="timeline-filter-empty">No activity matches this filter.</p>
      ) : (
        <p className="timeline-empty">
          Project activity will appear here as updates, milestones, feedback,
          payments and deliverables are recorded.
        </p>
      )}
    </section>
  );
}

function formatTimelineDate(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

function TimelineIcon({ type }: { type: ProjectTimelineType }) {
  const paths: Record<ProjectTimelineType, ReactNode> = {
    project: <path d="M4 7.5h16v12H4zM8 7.5V4.8h8v2.7M8 12h8" />,
    update: <path d="M5 5h14v14H5zM8 9h8M8 12h8M8 15h5" />,
    milestone: <path d="m4 13 5 5L20 6" />,
    feedback: <path d="M4 5h16v11H9l-5 4zM8 9h8M8 12h5" />,
    payment: <path d="M3 7h18v11H3zM3 10h18M7 15h3" />,
    deliverable: <path d="M7 3h7l4 4v14H7zM14 3v5h4M10 13h5M10 16h5" />,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      {paths[type]}
    </svg>
  );
}
