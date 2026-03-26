import React from "react";
import clsx from "clsx";

function clsForRisk(riskLevel) {
  const r = String(riskLevel || "").toLowerCase();
  if (r === "high") return "bg-red-50 text-red-700 ring-red-100";
  if (r === "medium") return "bg-amber-50 text-amber-800 ring-amber-100";
  if (r === "low") return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  return "bg-slate-50 text-slate-700 ring-slate-200";
}

// PUBLIC_INTERFACE
export default function RiskBadge({ riskLevel, className } = {}) {
  /** Pill badge that displays Low/Medium/High risk for predictive maintenance. */
  return (
    <span className={clsx("ocean-badge ring-1", clsForRisk(riskLevel), className)}>
      {riskLevel || "Unknown"}
    </span>
  );
}
