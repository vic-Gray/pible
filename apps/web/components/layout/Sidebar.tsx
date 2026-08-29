"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const navItems = [
  { href: "/projects", label: "Overview", icon: "◈" },
  { href: "/projects", label: "Tasks", icon: "☐", disabled: true },
  { href: "/projects", label: "Memory", icon: "◎", disabled: true },
  { href: "/projects", label: "Analytics", icon: "◐", disabled: true },
  { href: "/projects", label: "Timeline", icon: "⟐", disabled: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="glass-sidebar fixed left-3 top-3 bottom-3 w-56 z-50 flex flex-col rounded-2xl">
      <div className="p-4 pb-2">
        <Link href="/projects" className="flex items-center gap-2.5 px-2 py-1.5 group">
          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/80 text-sm font-bold tracking-tight group-hover:bg-white/[0.1] transition-colors">
            P
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">Pible</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/projects" && pathname.startsWith(item.href));
          if (item.disabled) {
            return (
              <div
                key={item.href}
                className="nav-item opacity-30 cursor-not-allowed"
                title="Coming soon"
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            );
          }
          return (
            <Link key={item.href} href={item.href}>
              <div className={`nav-item ${isActive ? "active" : ""}`}>
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 pt-2">
        <div className="px-2 py-2">
          <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>
      </div>
    </aside>
  );
}
