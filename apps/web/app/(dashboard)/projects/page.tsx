"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";

export default function ProjectsPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Projects</h1>
        <p className="text-white/40 text-sm mt-1">
          Select a project to view its intelligence layer.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card
            key={i}
            title={`Project ${i}`}
            description="No description yet. Connect a repository to get started."
          />
        ))}
      </div>
    </motion.div>
  );
}
