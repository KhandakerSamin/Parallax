"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { createContext, useContext, type PointerEvent, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type TiltContextValue = { x: MotionValue<number>; y: MotionValue<number> };
const TiltContext = createContext<TiltContextValue | null>(null);

type TiltStageProps = {
  children: ReactNode;
  className?: string;
  /** Maximum rotation in degrees. */
  maxTilt?: number;
};

/**
 * Tracks the pointer over its area and gently tilts in 3D.
 * Child <TiltPlane depth={…}> elements shift by different amounts to create parallax depth.
 */
export function TiltStage({ children, className, maxTilt = 8 }: TiltStageProps) {
  const reduced = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const x = useSpring(px, { stiffness: 120, damping: 18, mass: 0.4 });
  const y = useSpring(py, { stiffness: 120, damping: 18, mass: 0.4 });
  const rotateY = useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt]);
  const rotateX = useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt]);

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduced || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width - 0.5);
    py.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function onPointerLeave() {
    px.set(0);
    py.set(0);
  }

  return (
    <TiltContext.Provider value={{ x, y }}>
      <div
        className={className}
        style={{ perspective: 1200 }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <motion.div
          className="relative size-full"
          style={reduced ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
        >
          {children}
        </motion.div>
      </div>
    </TiltContext.Provider>
  );
}

type TiltPlaneProps = {
  children?: ReactNode;
  className?: string;
  /** How far (px) this plane shifts at the pointer extremes. Larger = closer to the viewer. */
  depth?: number;
};

export function TiltPlane({ children, className, depth = 20 }: TiltPlaneProps) {
  const ctx = useContext(TiltContext);
  const fallback = useMotionValue(0);
  const x = useTransform(ctx?.x ?? fallback, [-0.5, 0.5], [-depth, depth]);
  const y = useTransform(ctx?.y ?? fallback, [-0.5, 0.5], [-depth, depth]);
  return (
    <motion.div className={className} style={{ x, y, translateZ: depth }}>
      {children}
    </motion.div>
  );
}
