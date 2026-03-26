import React, { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import KpiCard from "../components/KpiCard";
import { getMockOeeSummary } from "../services/mockData";

function delta(a, b) {
  if (a == null || b == null) return null;
  return a - b;
}

// PUBLIC_INTERFACE
export default function ShiftComparePage() {
  /** Compare two shifts (A/B/C) KPIs for management and supervisors. */
  const [lineId, setLineId] = useState("LINE-1");
  const [shiftA, setShiftA] = useState("A");
  const [shiftB, setShiftB] = useState("B");

  // Mock: synthesize per-shift values by using seed variations
  const summaryA = useMemo(() => getMockOeeSummary({ lineId: `${lineId}-${shiftA}` }), [lineId, shiftA]);
  const summaryB = useMemo(() => getMockOeeSummary({ lineId: `${lineId}-${shiftB}` }), [lineId, shiftB]);

  const a = summaryA.kpis;
  const b = summaryB.kpis;

  const chart = useMemo(
    () => [
      { metric: "OEE", [shiftA]: Math.round(a.oee * 1000) / 10, [shiftB]: Math.round(b.oee * 1000) / 10 },
      { metric: "Avail", [shiftA]: Math.round(a.availability * 1000) / 10, [shiftB]: Math.round(b.availability * 1000) / 10 },
      { metric: "Perf", [shiftA]: Math.round(a.performance * 1000) / 10, [shiftB]: Math.round(b.performance * 1000) / 10 },
      { metric: "Qual", [shiftA]: Math.round(a.quality * 1000) / 10, [shiftB]: Math.round(b.quality * 1000) / 10 },
    ],
    [a, b, shiftA, shiftB]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Shift Comparison</h1>
          <p className="text-sm text-slate-600">Compare performance between two shifts and spot systemic loss patterns.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="ocean-input w-40" value={lineId} onChange={(e) => setLineId(e.target.value)}>
            <option value="LINE-1">LINE-1</option>
            <option value="LINE-2">LINE-2</option>
            <option value="LINE-3">LINE-3</option>
          </select>
          <select className="ocean-input w-28" value={shiftA} onChange={(e) => setShiftA(e.target.value)}>
            <option value="A">Shift A</option>
            <option value="B">Shift B</option>
            <option value="C">Shift C</option>
          </select>
          <span className="text-sm font-bold text-slate-500">vs</span>
          <select className="ocean-input w-28" value={shiftB} onChange={(e) => setShiftB(e.target.value)}>
            <option value="A">Shift A</option>
            <option value="B">Shift B</option>
            <option value="C">Shift C</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Δ OEE" value={delta(a.oee, b.oee) ?? 0} subtitle={`${shiftA} - ${shiftB}`} tone="neutral" />
        <KpiCard title="Δ Availability" value={delta(a.availability, b.availability) ?? 0} subtitle={`${shiftA} - ${shiftB}`} tone="neutral" />
        <KpiCard title="Δ Performance" value={delta(a.performance, b.performance) ?? 0} subtitle={`${shiftA} - ${shiftB}`} tone="neutral" />
        <KpiCard title="Δ Quality" value={delta(a.quality, b.quality) ?? 0} subtitle={`${shiftA} - ${shiftB}`} tone="neutral" />
      </div>

      <div className="ocean-card p-4">
        <div className="text-sm font-extrabold text-slate-900">Shift KPI comparison</div>
        <div className="mt-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 10, left: 0, right: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey={shiftA} fill="#2563EB" />
              <Bar dataKey={shiftB} fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
