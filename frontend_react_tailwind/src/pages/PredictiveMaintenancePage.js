import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import clsx from "clsx";
import { useAuth } from "../contexts/AuthContext";
import RiskBadge from "../components/Predictive/RiskBadge";
import ProbabilityBar from "../components/Predictive/ProbabilityBar";
import { createSocketClient } from "../services/wsClient";

function pct(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function fmtAgo(ts) {
  if (!ts) return "—";
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true });
  } catch {
    return String(ts);
  }
}

function alertTitleFromPredict(alert) {
  // Backend Alert model uses `message`; existing AlertsPage expects title/description in mock fallback.
  // Here we present consistent UI: title derives from meta.kind.
  const kind = alert?.meta?.kind;
  if (kind === "predictive.maintenance") return "Machine likely to fail soon";
  return "Alert";
}

function severityCls(sev) {
  switch (sev) {
    case "critical":
      return "bg-red-50 text-red-700 ring-red-100";
    case "high":
      return "bg-amber-50 text-amber-800 ring-amber-100";
    case "medium":
      return "bg-blue-50 text-blue-700 ring-blue-100";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

// PUBLIC_INTERFACE
export default function PredictiveMaintenancePage() {
  /** Predictive maintenance UI: machine health/risk view + live predictive alerts via Socket.IO. */
  const { api, token } = useAuth();

  const [machineId, setMachineId] = useState("M-100");
  const [lineId, setLineId] = useState("LINE-1");

  const [prediction, setPrediction] = useState(null);
  const [machine, setMachine] = useState(null);
  const [features, setFeatures] = useState(null);
  const [status, setStatus] = useState({ loading: false, error: "" });

  const [socketState, setSocketState] = useState({ state: "disconnected" });
  const [predictiveAlerts, setPredictiveAlerts] = useState([]);

  const lastFetchRef = useRef(0);

  const load = async ({ persist } = {}) => {
    setStatus({ loading: true, error: "" });
    try {
      const res = await api.predictGet(machineId, { lineId, persist: persist ? "true" : "false" });
      setMachine(res?.machine || null);
      setPrediction(res?.prediction || null);
      setFeatures(res?.features || null);
      setStatus({ loading: false, error: "" });
    } catch (e) {
      setStatus({ loading: false, error: e?.body?.message || e?.message || "Failed to load prediction." });
    }
  };

  useEffect(() => {
    load({ persist: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineId, lineId]);

  useEffect(() => {
    const client = createSocketClient({
      getToken: () => token,
      onStatus: (s) => setSocketState(s),
    });

    const unsubHello = client.on("socket:hello", () => {
      // no-op, but confirms auth + connection
    });

    const unsubAlert = client.on("alert:update", (payload) => {
      const a = payload?.alert || null;
      if (!a) return;

      const kind = a?.meta?.kind;
      if (kind !== "predictive.maintenance") return;

      setPredictiveAlerts((prev) => {
        const id = a.id || a._id || `${a.ts}-${a.message}`;
        const next = [{ ...a, id }, ...prev];
        // Deduplicate by id, keep latest 20
        const seen = new Set();
        const deduped = [];
        for (const item of next) {
          const key = item.id || `${item.ts}-${item.message}`;
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push(item);
          if (deduped.length >= 20) break;
        }
        return deduped;
      });
    });

    const unsubActivity = client.on("activity:update", (payload) => {
      // When a new prediction is computed for current machine, refresh view (rate limited)
      const t = payload?.type;
      if (t !== "activity.predictive.prediction") return;
      const mid = payload?.data?.prediction?.machineId || payload?.data?.machineId;
      if (mid && mid !== machineId) return;

      const now = Date.now();
      if (now - lastFetchRef.current < 1500) return;
      lastFetchRef.current = now;

      load({ persist: false });
    });

    client.connect();

    return () => {
      unsubHello?.();
      unsubAlert?.();
      unsubActivity?.();
      client.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineId, token]);

  const riskLevel = prediction?.riskLevel || "Unknown";
  const failureProbability = prediction?.failureProbability;

  const healthSummary = useMemo(() => {
    const r = String(riskLevel || "").toLowerCase();
    if (r === "high") return { label: "Immediate attention recommended", cls: "text-red-700" };
    if (r === "medium") return { label: "Monitor closely", cls: "text-amber-700" };
    if (r === "low") return { label: "Healthy", cls: "text-emerald-700" };
    return { label: "No data yet", cls: "text-slate-700" };
  }, [riskLevel]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Predictive Maintenance</h1>
          <p className="text-sm text-slate-600">Machine health, failure risk, and predictive alerts.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
            <span className="text-xs font-semibold text-slate-500">Socket</span>{" "}
            <span className="font-mono text-xs text-slate-700">{socketState?.state || "unknown"}</span>
          </div>

          <select className="ocean-input w-32" value={lineId} onChange={(e) => setLineId(e.target.value)}>
            <option value="LINE-1">LINE-1</option>
            <option value="LINE-2">LINE-2</option>
            <option value="LINE-3">LINE-3</option>
          </select>

          <input className="ocean-input w-40" value={machineId} onChange={(e) => setMachineId(e.target.value)} placeholder="Machine ID (e.g., M-100)" />

          <button className="ocean-btn-ghost" onClick={() => load({ persist: false })} disabled={status.loading}>
            Refresh
          </button>
          <button className="ocean-btn-primary" onClick={() => load({ persist: true })} disabled={status.loading}>
            Recompute
          </button>
        </div>
      </div>

      {status.error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">{status.error}</div> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="ocean-card p-4 lg:col-span-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Machine health</div>
              <div className="text-xs text-slate-500">Latest stored prediction (auto-computed if missing).</div>
            </div>
            <RiskBadge riskLevel={riskLevel} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">Machine</div>
              <div className="mt-1 text-sm font-extrabold text-slate-900">{machine?.name || "—"}</div>
              <div className="mt-1 text-xs text-slate-600">
                <span className="font-semibold">ID:</span> {machine?.machineId || machineId}
              </div>
              <div className="mt-2 text-xs text-slate-600">
                <span className="font-semibold">Usage hours:</span> {machine?.usageHours ?? "—"}
              </div>
              <div className="mt-1 text-xs text-slate-600">
                <span className="font-semibold">Last maintenance:</span> {machine?.lastMaintenanceDate ? fmtAgo(machine.lastMaintenanceDate) : "—"}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="text-xs font-semibold text-slate-500">Failure probability</div>
              <div className="mt-1 flex items-end justify-between">
                <div className="text-2xl font-extrabold text-slate-900">{pct(failureProbability)}</div>
                <div className={clsx("text-xs font-bold", healthSummary.cls)}>{healthSummary.label}</div>
              </div>
              <div className="mt-3">
                <ProbabilityBar value={failureProbability} />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Updated {prediction?.timestamp ? fmtAgo(prediction.timestamp) : "—"} (line {lineId})
              </div>
            </div>
          </div>

          {features ? (
            <div className="mt-4 rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <div className="text-sm font-extrabold text-slate-900">Signals (explainability)</div>
              <div className="mt-2 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                {Object.entries(features).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
                    <span className="font-semibold text-slate-600">{k}</span>
                    <span className="font-mono text-slate-900">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="ocean-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Predictive alerts</div>
              <div className="text-xs text-slate-500">Live updates (high risk deduped by backend).</div>
            </div>
            <span className="ocean-badge bg-slate-100 text-slate-800">{predictiveAlerts.length}</span>
          </div>

          <div className="mt-3 space-y-2">
            {predictiveAlerts.length ? (
              predictiveAlerts.map((a) => (
                <div key={a.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={clsx("ocean-badge ring-1", severityCls(a.severity))}>{a.severity || "info"}</span>
                    <span className="text-xs font-extrabold text-slate-900">{alertTitleFromPredict(a)}</span>
                    <span className="text-xs text-slate-500">{a.ts ? fmtAgo(a.ts) : ""}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-700">{a.message || a.description || "—"}</div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    <span className="font-semibold">Machine:</span> {a?.meta?.machineId || "—"} •{" "}
                    <span className="font-semibold">Risk:</span> {a?.meta?.riskLevel || "—"}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-600 ring-1 ring-slate-200">
                No predictive alerts yet. Recompute a prediction to evaluate risk.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
