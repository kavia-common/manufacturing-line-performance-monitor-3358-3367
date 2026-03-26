import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import DataTable from "../components/DataTable";
import { getMockEvents } from "../services/mockData";

const fmt = (iso) => {
  try {
    return format(new Date(iso), "yyyy-MM-dd HH:mm");
  } catch {
    return iso;
  }
};

// PUBLIC_INTERFACE
export default function ProductionPage() {
  /** Production events management: log production and view recent events. */
  const { api } = useAuth();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ lineId: "LINE-1", sku: "SKU-100", qty: 1000, shift: "A", operator: "Alex" });
  const [status, setStatus] = useState({ loading: false, error: "", ok: "" });

  const load = async () => {
    try {
      const res = await api.productionList({ limit: 50 });
      setRows(Array.isArray(res) ? res : res?.items || []);
    } catch {
      setRows(getMockEvents({ type: "production", limit: 25 }));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: "", ok: "" });
    try {
      await api.productionCreate({ ...form, ts: new Date().toISOString() });
      setStatus({ loading: false, error: "", ok: "Saved." });
      await load();
    } catch {
      // Mock save: prepend
      setRows((prev) => [{ id: `P-${Date.now()}`, ts: new Date().toISOString(), ...form }, ...prev]);
      setStatus({ loading: false, error: "", ok: "Saved (demo mode)." });
    }
  };

  const columns = [
    { key: "ts", label: "Time", render: (r) => fmt(r.ts) },
    { key: "lineId", label: "Line" },
    { key: "sku", label: "SKU" },
    { key: "qty", label: "Quantity" },
    { key: "shift", label: "Shift" },
    { key: "operator", label: "Operator" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-extrabold text-slate-900">Production</h1>
        <p className="text-sm text-slate-600">Log production counts and review recent production events.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="ocean-card p-4 lg:col-span-1">
          <div className="text-sm font-extrabold text-slate-900">Log production</div>
          <form className="mt-3 space-y-3" onSubmit={submit}>
            <div>
              <label className="text-xs font-bold text-slate-600">Line</label>
              <select className="ocean-input mt-1" value={form.lineId} onChange={(e) => setForm({ ...form, lineId: e.target.value })}>
                <option value="LINE-1">LINE-1</option>
                <option value="LINE-2">LINE-2</option>
                <option value="LINE-3">LINE-3</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">SKU</label>
              <input className="ocean-input mt-1" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600">Quantity</label>
              <input
                className="ocean-input mt-1"
                type="number"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Shift</label>
                <select className="ocean-input mt-1" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Operator</label>
                <input
                  className="ocean-input mt-1"
                  value={form.operator}
                  onChange={(e) => setForm({ ...form, operator: e.target.value })}
                />
              </div>
            </div>

            {status.error ? <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{status.error}</div> : null}
            {status.ok ? <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{status.ok}</div> : null}

            <button className="w-full ocean-btn-primary" disabled={status.loading}>
              {status.loading ? "Saving..." : "Save"}
            </button>
          </form>
        </div>

        <div className="ocean-card p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-900">Recent production</div>
            <button className="ocean-btn-ghost" onClick={load}>
              Refresh
            </button>
          </div>
          <div className="mt-3">
            <DataTable columns={columns} rows={rows} />
          </div>
        </div>
      </div>
    </div>
  );
}
