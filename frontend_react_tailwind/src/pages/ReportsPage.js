import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import DashboardPage from "./DashboardPage";

// PUBLIC_INTERFACE
export default function ReportsPage() {
  /** Reporting and PDF export screen: exports selected report sections to PDF. */
  const reportRef = useRef(null);
  const [status, setStatus] = useState({ exporting: false, msg: "" });

  const exportPdf = async () => {
    if (!reportRef.current) return;
    setStatus({ exporting: true, msg: "Rendering…" });
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

      pdf.save(`oee-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      setStatus({ exporting: false, msg: "Exported." });
    } catch (e) {
      setStatus({ exporting: false, msg: "Export failed." });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Reports & Export</h1>
          <p className="text-sm text-slate-600">Generate management-ready snapshots and export to PDF.</p>
        </div>

        <div className="flex items-center gap-2">
          <button className="ocean-btn-primary" onClick={exportPdf} disabled={status.exporting}>
            {status.exporting ? "Exporting…" : "Export PDF"}
          </button>
          {status.msg ? <span className="text-xs text-slate-500">{status.msg}</span> : null}
        </div>
      </div>

      <div className="ocean-card p-4">
        <div className="text-sm font-extrabold text-slate-900">Report preview</div>
        <div className="mt-3 rounded-xl bg-gradient-to-b from-blue-500/5 to-transparent p-3 ring-1 ring-slate-100">
          <div ref={reportRef} className="space-y-4">
            {/* Reuse the dashboard inside the report snapshot area */}
            <DashboardPage />
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">
          Note: PDF export is client-side. For server-side or branded templates, integrate backend report endpoints.
        </div>
      </div>
    </div>
  );
}
