"use client";
import { motion, useReducedMotion } from "motion/react";
import type { ComponentProps } from "react";
export function PageSection({ delay = 0, ...props }: ComponentProps<typeof motion.section> & { delay?: number }) { const reduce = useReducedMotion(); return <motion.section initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25, ease: "easeOut", delay }} {...props} />; }
