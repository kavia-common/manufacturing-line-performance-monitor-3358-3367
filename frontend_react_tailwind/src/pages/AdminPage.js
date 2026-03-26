import React from "react";
import { getEnv } from "../config/env";

// PUBLIC_INTERFACE
export default function AdminPage() {
  /** Admin screen scaffold: feature flags and environment visibility. */
  const env = getEnv();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-extrabold text-slate-900">Admin</h1>
        <p className="text-sm text-slate-600">Configuration and feature flags (UI scaffold).</p>
      </div>

      <div className="ocean-card p-4">
        <div className="text-sm font-extrabold text-slate-900">Feature flags</div>
        <pre className="mt-3 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
{JSON.stringify(env.featureFlags || {}, null, 2)}
        </pre>
      </div>

      <div className="ocean-card p-4">
        <div className="text-sm font-extrabold text-slate-900">Environment</div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="text-xs font-semibold text-slate-500">API Base</div>
            <div className="mt-1 break-all font-mono text-xs text-slate-700">{env.apiBase || "-"}</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
            <div className="text-xs font-semibold text-slate-500">WS URL</div>
            <div className="mt-1 break-all font-mono text-xs text-slate-700">{env.wsUrl || "-"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
