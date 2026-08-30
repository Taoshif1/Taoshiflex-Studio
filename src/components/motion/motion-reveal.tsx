"use client";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function MotionReveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) { const reduce = useReducedMotion(); return <motion.div className={className} initial={reduce ? false : { opacity:0, y:28 }} whileInView={reduce ? undefined : { opacity:1, y:0 }} viewport={{ once:true, margin:"-8%" }} transition={{ duration:.7, delay, ease:[.22,1,.36,1] }}>{children}</motion.div>; }
export function LineDraw({ className = "" }: { className?: string }) { const reduce = useReducedMotion(); return <motion.div className={`rule ${className}`} initial={reduce ? false : { scaleX:0 }} whileInView={reduce ? undefined : { scaleX:1 }} viewport={{ once:true }} transition={{ duration:1.1, ease:[.22,1,.36,1] }} style={{ transformOrigin:"left" }} />; }
