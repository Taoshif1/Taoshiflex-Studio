"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { ResponsiveMedia } from "@/components/ui/primitives";
import type { ProjectMedia } from "@/types/content";
import styles from "./project-media-viewer.module.css";

const formatNumber = (value: number) => String(value).padStart(2, "0");

export function ProjectMediaViewer({
  accent,
  media,
  projectName,
}: {
  accent: string;
  media: ProjectMedia[];
  projectName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const total = media.length;

  if (total === 0) return null;

  const activeMedia = media[activeIndex] ?? media[0];
  const selectPrevious = () => setActiveIndex((index) => (index - 1 + total) % total);
  const selectNext = () => setActiveIndex((index) => (index + 1) % total);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectPrevious();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      selectNext();
    }
  };

  return (
    <div
      className={styles.viewer}
      onKeyDown={handleKeyDown}
      style={{ "--viewer-accent": accent } as CSSProperties}
      tabIndex={0}
      role="region"
      aria-label={`${projectName} project media viewer. Use left and right arrow keys to change images.`}
    >
      <div className={styles.stage}>
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={activeMedia.id}
            className={styles.activeMedia}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 0.99 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }}
          >
            <ResponsiveMedia
              accent={accent}
              className={styles.activeFrame}
              fit="contain"
              label={activeMedia.alt || `${projectName} project image ${activeIndex + 1}`}
              media={activeMedia}
              sizes="(max-width: 767px) 100vw, (max-width: 1536px) 92vw, 1400px"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {total > 1 ? (
        <div className={styles.controls}>
          <button type="button" onClick={selectPrevious}>Previous</button>
          <p className={styles.counter} aria-live="polite" aria-atomic="true">
            <span className="sr-only">Image </span>{formatNumber(activeIndex + 1)}
            <span aria-hidden="true"> / </span>
            <span className="sr-only"> of </span>{formatNumber(total)}
          </p>
          <button type="button" onClick={selectNext}>Next</button>
        </div>
      ) : null}

      {total > 1 ? (
        <div className={styles.thumbnailRail} role="group" aria-label={`${projectName} media thumbnails`}>
          {media.map((item, index) => {
          const isActive = index === activeIndex;
          const label = item.alt || `${projectName} project image`;
          return (
            <button
              key={item.id}
              type="button"
              className={styles.thumbnail}
              aria-label={`Show image ${index + 1} of ${total} — ${label}`}
              aria-pressed={isActive}
              onClick={() => setActiveIndex(index)}
            >
              <span className={styles.thumbnailStage}>
                {item.src ? (
                  <Image
                    unoptimized
                    src={item.src}
                    alt=""
                    width={item.width || 1600}
                    height={item.height || 1000}
                    sizes="112px"
                  />
                ) : (
                  <span className={styles.thumbnailPlaceholder} aria-hidden="true" />
                )}
              </span>
              <span className={styles.thumbnailNumber} aria-hidden="true">{formatNumber(index + 1)}</span>
            </button>
          );
          })}
        </div>
      ) : null}
    </div>
  );
}
