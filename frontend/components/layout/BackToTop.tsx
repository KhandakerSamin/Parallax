"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useState } from "react";

/** Floating button that appears after one viewport of scrolling. */
export function BackToTop() {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    setVisible(y > window.innerHeight);
  });

  return (
    <AnimatePresence>
      {visible && (
        <motion.a
          href="#top"
          aria-label="Back to top"
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9 }}
          transition={{ duration: 0.25 }}
          className="glass fixed right-4 bottom-4 z-40 grid size-12 place-items-center rounded-full border border-border text-foreground shadow-lift transition-colors hover:text-brand sm:right-6 sm:bottom-6"
        >
          <ArrowUp className="size-5" aria-hidden />
        </motion.a>
      )}
    </AnimatePresence>
  );
}
