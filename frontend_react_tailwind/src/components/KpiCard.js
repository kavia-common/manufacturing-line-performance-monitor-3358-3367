import React from "react";
import clsx from "clsx";

const pct = (v) => `${Math.round(v * 1000) / 10}%`;

// PUBLIC_INTERFACE
export default function KpiCard({ title, value, subtitle, tone = "neutral" }) {
  /** KPI card component for dashboard summaries. */
  const toneCls =
    tone === "good"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
      : tone === "warn"
        ? "bg-amber-50 text-amber-800 ring-amber-100"
        : tone === "bad"
          ? "bg-red-50 text-red-700 ring-red-100"
          : "bg-slate-50 text-slate-700 ring-slate-100";

  const display =
    typeof value === "number" && value <= 1 && value >= 0 ? pct(value) : value === null || value === undefined ? "-" : value;

  return (
    <div className="ocean-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-500">{title}</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-900">{display}</div>
          {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
        </div>
        <div className={clsx("rounded-full px-2 py-1 text-xs font-bold ring-1", toneCls)}>{tone}</div>
      </div>
    </div>
  );
}
