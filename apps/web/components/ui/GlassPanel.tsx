"use client";

import { motion, type MotionProps } from "framer-motion";
import { type ReactNode } from "react";

type GlassIntensity = "subtle" | "default" | "heavy";

interface GlassPanelProps extends MotionProps {
  children?: ReactNode;
  intensity?: GlassIntensity;
  className?: string;
  as?: "div" | "section" | "main" | "aside" | "nav" | "article";
  shimmer?: boolean;
  onClick?: () => void;
}

const intensityClasses: Record<GlassIntensity, string> = {
  subtle: "glass-panel glass-subtle",
  default: "glass-panel",
  heavy: "glass-panel glass-heavy",
};

export function GlassPanel({
  children,
  intensity = "default",
  className = "",
  as = "div",
  shimmer = false,
  ...motionProps
}: GlassPanelProps) {
  const Component = motion[as] || motion.div;

  return (
    <Component
      className={`${intensityClasses[intensity]} ${shimmer ? "shimmer" : ""} ${className}`}
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      {...motionProps}
    >
      {children}
    </Component>
  );
}
