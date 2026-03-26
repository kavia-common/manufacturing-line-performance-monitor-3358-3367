import React, { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import DashboardPage from "./DashboardPage";
import { useAuth } from "../contexts/AuthContext";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// PUBLIC_INTERFACE
export default function ReportsPage() {
  /** Reporting and PDF export screen: server-side PDF when available, else client-side snapshot export. */
  const { api, role } = useAuth();
  const reportRef = useRef(null);

  const [status, setStatus] = useState({ exporting: false, msg: "" });
  const [lineId, setLineId] = useState("LINE-1");
  const [mode, setMode] = useState("server"); // server | client

  const canServerPdf = useMemo(() => ["manager", "admin"].includes(role), [role]);

  const exportServerPdf = async () => {
    setStatus({ exporting: true, msg: "Requesting server PDF…" });
    try {
      const blob = await api.reportsOeePdf({ lineId, windowMin: 480 });
      downloadBlob(blob, `oee-report-${lineId}-${new Date().toISOString().slice(0, 10)}.pdf`);
      setStatus({ exporting: false, msg: "Downloaded server PDF." });
      return true;
    } catch (e) {
      setStatus({ exporting: false, msg: "Server PDF unavailable; try client export." });
      return false;
    }
  };

  const exportClientPdf = async () => {
    if (!reportRef.current) return;
    setStatus({ exporting: true, msg: "Rendering client PDF…" });
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#f9fafb" });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Fit width, compute height keeping aspect
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let y = 0;
      let remaining = imgH;

      // Multi-page support
      while (remaining > 0) {
        pdf.addImage(imgData, "PNG", 0, y, imgW, imgH);
        remaining -= pageH;
        if (remaining > 0) {
          pdf.addPage();
          y -= pageH;
        }
      }

      pdf.save(`oee-report-${lineId}-${new Date().toISOString().slice(0, 10)}.pdf`);
      setStatus({ exporting: false, msg: "Exported client PDF." });
    } catch {
      setStatus({ exporting: false, msg: "Client export failed." });
    }
  };

  const onExport = async () => {
    if (mode === "server") {
      const ok = await exportServerPdf();
      if (!ok) {
        // Keep user choice, but give them an easy path
      }
      return;
    }
    await exportClientPdf();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Reports & Export</h1>
          <p className="text-sm text-slate-600">
            Export management-ready reports. Prefer server-side PDF (consistent template) or use client snapshot.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select className="ocean-input w-40" value={lineId} onChange={(e) => setLineId(e.target.value)}>
            <option value="LINE-1">LINE-1</option>
            <option value="LINE-2">LINE-2</option>
            <option value="LINE-3">LINE-3</option>
          </select>

          <select
            className="ocean-input w-44"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            title="Export mode"
          >
            <option value="server" disabled={!canServerPdf}>
              Server PDF (manager/admin)
            </option>
            <option value="client">Client snapshot PDF</option>
          </select>

          <button className="ocean-btn-primary" onClick={onExport} disabled={status.exporting}>
            {status.exporting ? "Exporting…" : "Export PDF"}
          </button>

          {status.msg ? <span className="text-xs text-slate-500">{status.msg}</span> : null}
        </div>
      </div>

      {!canServerPdf ? (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-100">
          Server-side PDF export requires the <span className="font-semibold">manager</span> or{" "}
          <span className="font-semibold">admin</span> role. Switch roles on the login page, or use client export.
        </div>
      ) : null}

      <div className="ocean-card p-4">
        <div className="text-sm font-extrabold text-slate-900">Report preview</div>
        <div className="mt-3 rounded-xl bg-gradient-to-b from-blue-500/5 to-transparent p-3 ring-1 ring-slate-100">
          <div ref={reportRef} className="space-y-4">
            {/* Reuse the dashboard inside the report snapshot area */}
            <DashboardPage />
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Server PDF endpoint: <span className="font-mono">GET /reports/oee.pdf?lineId=LINE-1&amp;windowMin=480</span>
          . Live events refresh the underlying KPIs via WebSocket and REST.
        </div>
      </div>
    </div>
  );
}
