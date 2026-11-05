"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "section" | "header";
};

/** Fades and rises 16px into place the first time it scrolls into view. */
export function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Comp>
  );
}

const container: Variants = {
  hidden: {},
  show: (stagger: number) => ({ transition: { staggerChildren: stagger } }),
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

type StaggerProps = {
  children: ReactNode;
  className?: string;
  stagger?: number;
  as?: "div" | "ul" | "ol";
};

/** Reveals its <StaggerItem> children one after another. */
export function Stagger({ children, className, stagger = 0.08, as = "div" }: StaggerProps) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      variants={container}
      custom={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
    >
      {children}
    </Comp>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const Comp = motion[as];
  return (
    <Comp className={cn(className)} variants={item}>
      {children}
    </Comp>
  );
}
