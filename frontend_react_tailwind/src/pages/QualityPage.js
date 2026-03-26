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
export default function QualityPage() {
  /** Quality tracking management: capture defects/rejects and review recent quality events. */
  const { api } = useAuth();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ lineId: "LINE-1", defect: "Scratch", rejectQty: 4, rootCause: "Material", shift: "A" });
  const [status, setStatus] = useState({ loading: false, error: "", ok: "" });

  const load = async () => {
    try {
      const res = await api.qualityList({ limit: 50 });
      setRows(Array.isArray(res) ? res : res?.items || []);
    } catch {
      setRows(getMockEvents({ type: "quality", limit: 25 }));
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
      await api.qualityCreate({ ...form, ts: new Date().toISOString() });
      setStatus({ loading: false, error: "", ok: "Saved." });
      await load();
    } catch {
      setRows((prev) => [{ id: `Q-${Date.now()}`, ts: new Date().toISOString(), ...form }, ...prev]);
      setStatus({ loading: false, error: "", ok: "Saved (demo mode)." });
    }
  };

  const columns = [
    { key: "ts", label: "Time", render: (r) => fmt(r.ts) },
    { key: "lineId", label: "Line" },
    { key: "defect", label: "Defect" },
    { key: "rejectQty", label: "Reject Qty" },
    { key: "rootCause", label: "Root cause" },
    { key: "shift", label: "Shift" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-extrabold text-slate-900">Quality</h1>
        <p className="text-sm text-slate-600">Track defects, reject quantities, and root cause notes.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="ocean-card p-4 lg:col-span-1">
          <div className="text-sm font-extrabold text-slate-900">Log quality event</div>
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
              <label className="text-xs font-bold text-slate-600">Defect</label>
              <select className="ocean-input mt-1" value={form.defect} onChange={(e) => setForm({ ...form, defect: e.target.value })}>
                <option>Scratch</option>
                <option>Mislabel</option>
                <option>Seal</option>
                <option>Crack</option>
                <option>Contamination</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600">Reject qty</label>
                <input
                  className="ocean-input mt-1"
                  type="number"
                  value={form.rejectQty}
                  onChange={(e) => setForm({ ...form, rejectQty: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Shift</label>
                <select className="ocean-input mt-1" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600">Root cause</label>
              <select
                className="ocean-input mt-1"
                value={form.rootCause}
                onChange={(e) => setForm({ ...form, rootCause: e.target.value })}
              >
                <option>Material</option>
                <option>Setup</option>
                <option>Machine</option>
                <option>Operator</option>
                <option>Unknown</option>
              </select>
            </div>

            {status.ok ? <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{status.ok}</div> : null}
            <button className="w-full ocean-btn-primary" disabled={status.loading}>
              {status.loading ? "Saving..." : "Save"}
            </button>
          </form>
        </div>

        <div className="ocean-card p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-extrabold text-slate-900">Recent quality</div>
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
