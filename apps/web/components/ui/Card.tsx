"use client";

import { motion } from "framer-motion";
import { type ReactNode } from "react";
import { GlassPanel } from "./GlassPanel";

interface CardProps {
  children?: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, title, description, className = "", onClick }: CardProps) {
  return (
    <GlassPanel
      intensity="default"
      className={`p-6 ${onClick ? "cursor-pointer" : ""} ${className}`}
      whileHover={onClick ? { y: -2, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-white font-semibold text-base tracking-tight">{title}</h3>
          )}
          {description && (
            <p className="text-white/40 text-sm mt-1 leading-relaxed">{description}</p>
          )}
        </div>
      )}
      <div>{children}</div>
    </GlassPanel>
  );
}
