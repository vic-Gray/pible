"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-navbar-light fixed top-3 left-4 right-4 z-50 flex items-center justify-between px-5 py-3 rounded-2xl"
    >
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-8 h-8 rounded-lg bg-black/[0.06] flex items-center justify-center text-black/80 text-sm font-bold tracking-tight group-hover:bg-black/[0.12] transition-all duration-200">
          P
        </div>
        <span className="text-dark font-semibold text-sm tracking-tight">Pible</span>
      </Link>

      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="btn-secondary-light text-sm py-2 px-4"
        >
          Sign in
        </Link>
        <Link
          href="/login"
          className="btn-primary-light text-sm py-2 px-4"
        >
          Get started
        </Link>
      </div>
    </motion.nav>
  );
}
