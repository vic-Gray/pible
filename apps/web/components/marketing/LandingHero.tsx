"use client";

import { motion } from "framer-motion";

export default function LandingHero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      <div className="glass-panel-light w-full min-h-[70vh] flex items-center justify-center relative overflow-hidden">
        {/* Hero content will go here in a follow-up prompt */}
        {/* Placeholder: headline, subtext, CTAs, visual */}
      </div>
    </motion.div>
  );
}
