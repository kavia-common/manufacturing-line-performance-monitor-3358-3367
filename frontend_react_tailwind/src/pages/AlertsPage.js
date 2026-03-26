import React, { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import { getMockAlerts } from "../services/mockData";

function sevCls(sev) {
  switch (sev) {
    case "critical":
      return "bg-red-50 text-red-700 ring-red-100";
    case "high":
      return "bg-amber-50 text-amber-800 ring-amber-100";
    case "medium":
      return "bg-blue-50 text-blue-700 ring-blue-100";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-100";
  }
}

// PUBLIC_INTERFACE
export default function AlertsPage() {
  /** Alerting UI: list, filter, acknowledge. */
  const { api } = useAuth();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({ severity: "all", showAck: false });

  const load = async () => {
    try {
      const res = await api.alertsList({ limit: 50 });
      setRows(Array.isArray(res) ? res : res?.items || []);
    } catch {
      setRows(getMockAlerts({ limit: 16 }));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((a) => {
      if (!filter.showAck && a.acknowledged) return false;
      if (filter.severity !== "all" && a.severity !== filter.severity) return false;
      return true;
    });
  }, [rows, filter]);

  const ack = async (id) => {
    try {
      await api.alertsAck(id);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, acknowledged: true } : r)));
    } catch {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, acknowledged: true } : r)));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Alerts</h1>
          <p className="text-sm text-slate-600">Review and acknowledge operational alerts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="ocean-input w-40"
            value={filter.severity}
            onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <label className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={filter.showAck}
              onChange={(e) => setFilter({ ...filter, showAck: e.target.checked })}
            />
            Show acknowledged
          </label>
          <button className="ocean-btn-ghost" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map((a) => (
          <div key={a.id} className="ocean-card p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={clsx("ocean-badge ring-1", sevCls(a.severity))}>{a.severity}</span>
                  <span className="text-sm font-extrabold text-slate-900">{a.title}</span>
                  <span className="text-xs text-slate-500">
                    {a.ts ? formatDistanceToNow(new Date(a.ts), { addSuffix: true }) : ""}
                  </span>
                </div>
                <div className="mt-2 text-sm text-slate-600">{a.description}</div>
                <div className="mt-2 text-xs text-slate-500">
                  <span className="font-semibold">Line:</span> {a.lineId || "-"} • <span className="font-semibold">ID:</span>{" "}
                  {a.id}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {a.acknowledged ? (
                  <span className="ocean-badge bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">acknowledged</span>
                ) : (
                  <button className="ocean-btn-secondary" onClick={() => ack(a.id)}>
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 ? (
          <div className="ocean-card p-8 text-center text-sm text-slate-600">No alerts match the selected filters.</div>
        ) : null}
      </div>
    </div>
  );
}
