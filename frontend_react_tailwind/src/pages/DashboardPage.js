import React, { useEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import KpiCard from "../components/KpiCard";
import { getMockOeeSummary, getMockTrends } from "../services/mockData";
import { createWsClient } from "../services/wsClient";

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

// PUBLIC_INTERFACE
export default function DashboardPage() {
  /** Real-time dashboard: OEE KPIs + trends, WS-driven refresh when available. */
  const { api } = useAuth();
  const [lineId, setLineId] = useState("LINE-1");
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [wsState, setWsState] = useState({ state: "disabled" });
  const lastRefresh = useRef(0);

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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineId]);

  useEffect(() => {
    const client = createWsClient({
      onStatus: setWsState,
      onMessage: (msg) => {
        // Expected shape: {type:'oee.update', lineId:'LINE-1'} or similar
        const type = msg?.type || msg?.event;
        const msgLine = msg?.lineId || msg?.line || msg?.payload?.lineId;
        if (type && String(type).includes("oee") && (!msgLine || msgLine === lineId)) {
          // rate limit refresh
          if (Date.now() - lastRefresh.current < 1200) return;
          load();
        }
      },
    });
    client.connect();
    return () => client.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineId]);

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
          <p className="text-sm text-slate-600">Live KPIs and rolling trends. Updates via REST polling and WebSocket.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
            <span className="text-xs font-semibold text-slate-500">WS</span>{" "}
            <span className="font-mono text-xs text-slate-700">{wsState.state}</span>
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
              <Area type="monotone" dataKey="Availability" stroke="#0EA5E9" fill="#0EA5E9" fillOpacity={0.10} />
              <Area type="monotone" dataKey="Performance" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.08} />
              <Area type="monotone" dataKey="Quality" stroke="#10B981" fill="#10B981" fillOpacity={0.08} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
