import React from "react";
import clsx from "clsx";

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

function toneClass(p) {
  if (p >= 0.7) return "bg-red-500";
  if (p >= 0.4) return "bg-amber-500";
  return "bg-emerald-500";
}

// PUBLIC_INTERFACE
export default function ProbabilityBar({ value, className } = {}) {
  /** Displays a 0..1 failure probability as a horizontal bar. */
  const p = clamp01(value);
  return (
    <div className={clsx("h-2 w-full rounded-full bg-slate-100 ring-1 ring-slate-200", className)} aria-label="Probability">
      <div className={clsx("h-full rounded-full transition-all", toneClass(p))} style={{ width: `${Math.round(p * 100)}%` }} />
    </div>
  );
}
