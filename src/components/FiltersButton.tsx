'use client';

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

export function FiltersButton({ onClick }: { onClick: () => void }) {
  const [animate, setAnimate] = useState(true);

  // Re-trigger shimmer every 6s (desktop only)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return; // no animation
    const id = setInterval(() => setAnimate((v) => !v), 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <button
      onClick={onClick}
      className="
        relative inline-flex items-center gap-3 px-6 py-4 rounded-full
        bg-emerald-500 text-white font-medium shadow-sm
        hover:bg-emerald-600 focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2
        transition-colors
        overflow-hidden
        btn-shimmer
      "
      aria-label="Open filters"
    >
      <SlidersHorizontal size={18} aria-hidden="true" />
      <span>Filters</span>

      {/* Shimmer overlay */}
      <span
        className={`
          pointer-events-none absolute inset-0
          before:absolute before:inset-0 before:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,.55),transparent)]
          before:w-[60%] before:translate-x-[-120%]
          ${animate ? "animate-shimmer" : ""}
        `}
        aria-hidden="true"
      />
    </button>
  );
}
