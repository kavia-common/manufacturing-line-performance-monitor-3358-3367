import React from "react";
import { Link } from "react-router-dom";
import { getEnv } from "../config/env";

// PUBLIC_INTERFACE
export default function AboutPage() {
  /** About/help screen with environment wiring details. */
  const env = getEnv();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="ocean-card p-6">
        <h1 className="text-xl font-extrabold text-slate-900">About Ocean OEE</h1>
        <p className="mt-2 text-sm text-slate-600">
          This SPA provides real-time dashboards and operational screens for OEE (Overall Equipment Effectiveness) across
          manufacturing lines. It supports role-based navigation and PDF export reporting.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="text-xs font-semibold text-slate-500">API Base</div>
            <div className="mt-1 break-all font-mono text-xs text-slate-700">{env.apiBase || "(not set)"}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="text-xs font-semibold text-slate-500">WebSocket URL</div>
            <div className="mt-1 break-all font-mono text-xs text-slate-700">{env.wsUrl || "(not set)"}</div>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          If the backend is not reachable, the UI automatically falls back to mock data so you can review layouts and
          flows.
        </p>
        <div className="mt-4">
          <Link to="/login" className="ocean-btn-primary">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
