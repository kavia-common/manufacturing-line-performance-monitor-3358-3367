import React, { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import clsx from "clsx";
import { useAuth } from "../contexts/AuthContext";
import KpiCard from "../components/KpiCard";
import RiskBadge from "../components/Predictive/RiskBadge";
import ProbabilityBar from "../components/Predictive/ProbabilityBar";
import { getMockOeeSummary, getMockTrends } from "../services/mockData";
import { createSocketClient } from "../services/wsClient";

const fmtTs = (iso) => {
  try {
    return format(new Date(iso), "HH:mm");
  } catch {
    return "";
  }
};

function toneForOee(oee) {
  if (oee >= 0.85) return "good";
  if (oee >= 0.75) return "warn";
  return "bad";
}

function pct(p) {
  const n = Number(p);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n * 100)}%`;
}

function riskToCaption(risk) {
  const r = String(risk || "").toLowerCase();
  if (r === "high") return "Action recommended";
  if (r === "medium") return "Monitor closely";
  if (r === "low") return "Healthy";
  return "No data";
}

// PUBLIC_INTERFACE
export default function DashboardPage() {
  /** Real-time dashboard: OEE KPIs + trends + predictive maintenance summary. */
  const { api, token } = useAuth();
  const [lineId, setLineId] = useState("LINE-1");
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [socketState, setSocketState] = useState({ state: "disconnected" });
  const lastRefresh = useRef(0);

  // Predictive summary (single machine for MVP)
  const [machineId, setMachineId] = useState("M-100");
  const [prediction, setPrediction] = useState(null);
  const [predictAlert, setPredictAlert] = useState(null);

  const load = async () => {
    const now = Date.now();
    lastRefresh.current = now;

    try {
      const res = await api.oeeSummary({ lineId });
      setSummary(res);
    } catch {
      setSummary(getMockOeeSummary({ lineId }));
    }

    try {
      const t = await api.oeeTrends({ lineId, minutes: 120 });
      setTrend(Array.isArray(t) ? t : t?.points || getMockTrends({ lineId, minutes: 120 }));
    } catch {
      setTrend(getMockTrends({ lineId, minutes: 120 }));
    }
  };

  const loadPrediction = async () => {
    try {
      const res = await api.predictGet(machineId, { lineId, persist: "false" });
      setPrediction(res?.prediction || null);
    } catch {
      // ignore; predictive is optional in UI and may be unavailable in demo environments
    }
  };

  useEffect(() => {
    load();
    loadPrediction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineId, machineId]);

  useEffect(() => {
    const client = createSocketClient({
      getToken: () => token,
      onStatus: setSocketState,
    });

    const refreshMaybe = () => {
      if (Date.now() - lastRefresh.current < 1200) return;
      load();
    };

    const unsubKpi = client.on("kpi:update", (payload) => {
      // If backend emits line-scoped KPI snapshots, refresh summary quickly.
      const msgLine = payload?.lineId;
      if (msgLine && msgLine !== lineId) return;
      refreshMaybe();
    });

    const unsubActivity = client.on("activity:update", (payload) => {
      // activity events aren't strictly typed; use them as a generic "something changed"
      const t = payload?.type || "";
      if (t.includes("predictive")) {
        loadPrediction();
        return;
      }
      if (t.includes("production") || t.includes("downtime") || t.includes("quality") || t.includes("mobile")) {
        refreshMaybe();
      }
    });

    const unsubAlert = client.on("alert:update", (payload) => {
      const a = payload?.alert || null;
      if (!a) return;
      if (a?.meta?.kind !== "predictive.maintenance") return;
      setPredictAlert(a);
    });

    client.connect();
    return () => {
      unsubKpi?.();
      unsubActivity?.();
      unsubAlert?.();
      client.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineId, token, machineId]);

  const kpis = summary?.kpis || summary?.data?.kpis || summary?.kpi || null;

  const chartData = useMemo(
    () =>
      trend.map((p) => ({
        ...p,
        label: fmtTs(p.ts || p.timestamp || p.time),
        OEE: p.oee ?? p.OEE ?? p.value,
        Availability: p.availability ?? p.Availability,
        Performance: p.performance ?? p.Performance,
        Quality: p.quality ?? p.Quality,
      })),
    [trend]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">Live KPIs and rolling trends. Updates via REST + Socket.IO.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
            <span className="text-xs font-semibold text-slate-500">Socket</span>{" "}
            <span className="font-mono text-xs text-slate-700">{socketState.state}</span>
          </div>

          <select className="ocean-input w-44" value={lineId} onChange={(e) => setLineId(e.target.value)}>
            <option value="LINE-1">LINE-1</option>
            <option value="LINE-2">LINE-2</option>
            <option value="LINE-3">LINE-3</option>
          </select>

          <button className="ocean-btn-primary" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {/* Predictive maintenance quick view */}
      <div className="ocean-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Machine health (predictive maintenance)</div>
            <div className="text-xs text-slate-500">Failure probability + risk indicator. High risk emits alerts.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input className="ocean-input w-40" value={machineId} onChange={(e) => setMachineId(e.target.value)} placeholder="Machine ID (M-100)" />
            <RiskBadge riskLevel={prediction?.riskLevel || "Unknown"} />
            <button className="ocean-btn-ghost" onClick={loadPrediction}>
              Refresh health
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 lg:col-span-1">
            <div className="text-xs font-semibold text-slate-500">Failure probability</div>
            <div className="mt-1 flex items-end justify-between">
              <div className="text-2xl font-extrabold text-slate-900">{pct(prediction?.failureProbability)}</div>
              <div className={clsx("text-xs font-bold", prediction?.riskLevel === "High" ? "text-red-700" : "text-slate-700")}>
                {riskToCaption(prediction?.riskLevel)}
              </div>
            </div>
            <div className="mt-3">
              <ProbabilityBar value={prediction?.failureProbability} />
            </div>
            <div className="mt-2 text-xs text-slate-500">{prediction?.timestamp ? `Updated ${fmtTs(prediction.timestamp)} (local time)` : "—"}</div>
          </div>

          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-slate-500">Prediction alert</div>
                <div className="text-sm font-extrabold text-slate-900">Latest</div>
              </div>
              {predictAlert?.meta?.riskLevel ? <RiskBadge riskLevel={predictAlert.meta.riskLevel} /> : null}
            </div>
            <div className="mt-2 text-sm text-slate-700">{predictAlert?.message || "No predictive alerts received yet."}</div>
            {predictAlert ? (
              <div className="mt-2 text-xs text-slate-500">
                <span className="font-semibold">Machine:</span> {predictAlert?.meta?.machineId || machineId} •{" "}
                <span className="font-semibold">Line:</span> {predictAlert?.lineId || lineId}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="OEE" value={kpis?.oee ?? kpis?.OEE ?? 0} subtitle="Overall effectiveness" tone={toneForOee(kpis?.oee ?? 0)} />
        <KpiCard title="Availability" value={kpis?.availability ?? 0} subtitle="Uptime vs planned" tone="neutral" />
        <KpiCard title="Performance" value={kpis?.performance ?? 0} subtitle="Ideal vs actual rate" tone="neutral" />
        <KpiCard title="Quality" value={kpis?.quality ?? 0} subtitle="Good vs total" tone="neutral" />
      </div>

      <div className="ocean-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-extrabold text-slate-900">Trend (last 2 hours)</div>
            <div className="text-xs text-slate-500">OEE, availability, performance, quality</div>
          </div>
        </div>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="OEE" stroke="#2563EB" fill="#2563EB" fillOpacity={0.12} />
              <Area type="monotone" dataKey="Availability" stroke="#0EA5E9" fill="#0EA5E9" fillOpacity={0.1} />
              <Area type="monotone" dataKey="Performance" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.08} />
              <Area type="monotone" dataKey="Quality" stroke="#10B981" fill="#10B981" fillOpacity={0.08} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
