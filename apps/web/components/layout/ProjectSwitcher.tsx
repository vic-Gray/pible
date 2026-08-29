"use client";

import { motion } from "framer-motion";

export default function ProjectSwitcher() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="glass-panel glass-subtle px-3 py-2 rounded-xl flex items-center gap-2 cursor-pointer hover:bg-white/[0.06] transition-colors"
    >
      <div className="w-5 h-5 rounded-md bg-white/[0.06] flex items-center justify-center">
        <span className="text-white/50 text-xs">⛁</span>
      </div>
      <span className="text-white/70 text-sm font-medium">Select a project</span>
      <svg
        className="w-3.5 h-3.5 text-white/30 ml-auto"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </motion.div>
  );
}
