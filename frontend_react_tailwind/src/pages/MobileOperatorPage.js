import React, { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useAuth } from "../contexts/AuthContext";

function supportsBarcodeDetector() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

const DEFAULT_ACTION_FORM = {
  lineId: "LINE-1",
  shift: "A",
  operator: "",
  sku: "SKU-100",
  qty: 100,
  category: "Mechanical",
  reason: "Jam",
  minutes: 5,
  defect: "Scratch",
  rejectQty: 1,
  rootCause: "Machine",
};

function prettyError(e) {
  return e?.body?.message || e?.message || String(e || "Unknown error");
}

function normalizeScanCode(raw) {
  const s = String(raw || "").trim();
  // Allow scanning payloads like "machineId:M-100" or URLs containing id; keep MVP simple.
  const m = s.match(/machineId\s*[:=]\s*([A-Za-z0-9\-_]+)/i);
  if (m) return m[1];
  return s;
}

// PUBLIC_INTERFACE
export default function MobileOperatorPage() {
  /** Mobile-friendly operator UI: camera QR/barcode scan + big quick-action buttons using /api/scan and /api/quick-log. */
  const { api, user } = useAuth();

  const [lineId, setLineId] = useState("LINE-1");
  const [scanCode, setScanCode] = useState("");
  const [scanStatus, setScanStatus] = useState({ state: "idle", error: "" });
  const [machine, setMachine] = useState(null);

  const [form, setForm] = useState(DEFAULT_ACTION_FORM);
  const [actionStatus, setActionStatus] = useState({ loading: false, ok: "", error: "" });

  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    setForm((prev) => ({ ...prev, lineId }));
  }, [lineId]);

  useEffect(() => {
    // default operator name
    setForm((prev) => ({ ...prev, operator: prev.operator || user?.name || "" }));
  }, [user?.name]);

  const canUseCameraScan = useMemo(() => supportsBarcodeDetector(), []);

  const stopCamera = () => {
    setCameraOn(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    try {
      if (videoRef.current) videoRef.current.pause();
    } catch {
      // ignore
    }
    try {
      streamRef.current?.getTracks?.().forEach((t) => t.stop());
    } catch {
      // ignore
    }
    streamRef.current = null;
    detectorRef.current = null;
  };

  const startCamera = async () => {
    setScanStatus({ state: "starting", error: "" });
    try {
      if (!canUseCameraScan) {
        setScanStatus({ state: "unsupported", error: "Camera scan not supported in this browser. Use manual entry." });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("Video element unavailable");
      video.srcObject = stream;
      await video.play();

      // Support both QR and common barcodes.
      // Note: Some browsers only support a subset.
      // eslint-disable-next-line no-undef
      detectorRef.current = new BarcodeDetector({
        formats: [
          "qr_code",
          "code_128",
          "code_39",
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
          "itf",
          "data_matrix",
          "pdf417",
        ],
      });

      setCameraOn(true);
      setScanStatus({ state: "scanning", error: "" });

      const tick = async () => {
        if (!videoRef.current || !detectorRef.current) return;
        if (videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes && barcodes.length) {
            const raw = barcodes[0]?.rawValue || "";
            const normalized = normalizeScanCode(raw);
            setScanCode(normalized);
            setScanStatus({ state: "detected", error: "" });
            stopCamera();
            return;
          }
        } catch (e) {
          // Detection can fail intermittently; don't hard-stop on first error.
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      stopCamera();
      setScanStatus({ state: "error", error: prettyError(e) });
    }
  };

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitScan = async () => {
    setScanStatus({ state: "resolving", error: "" });
    setMachine(null);
    try {
      const code = normalizeScanCode(scanCode);
      if (!code) throw new Error("Enter or scan a code.");
      const res = await api.mobileScan({ code, lineId });
      setMachine(res?.machine || null);
      setScanStatus({ state: "resolved", error: "" });
    } catch (e) {
      setScanStatus({ state: "error", error: prettyError(e) });
    }
  };

  const quickLog = async (action) => {
    setActionStatus({ loading: true, ok: "", error: "" });
    try {
      const payload = {
        action,
        ts: new Date().toISOString(),
        lineId,
        machineId: machine?.machineId,
        shift: form.shift,
        operator: form.operator || user?.name || "operator",
      };

      if (action === "start_run") {
        payload.sku = form.sku;
        payload.qty = Number(form.qty);
      }
      if (action === "log_downtime") {
        payload.category = form.category;
        payload.reason = form.reason;
        payload.minutes = Number(form.minutes);
      }
      if (action === "log_defect") {
        payload.defect = form.defect;
        payload.rejectQty = Number(form.rejectQty);
        payload.rootCause = form.rootCause;
      }

      const res = await api.mobileQuickLog(payload);
      setActionStatus({ loading: false, ok: `Sent: ${action}`, error: "" });

      // For stop_run, nothing else to reset.
      // For logging actions, keep context but clear message after short delay.
      window.setTimeout(() => setActionStatus((s) => ({ ...s, ok: "" })), 2500);

      return res;
    } catch (e) {
      setActionStatus({ loading: false, ok: "", error: prettyError(e) });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Mobile Operator</h1>
          <p className="text-sm text-slate-600">Scan a machine QR/barcode and use quick actions for low-latency logging.</p>
        </div>

        <div className="flex items-center gap-2">
          <select className="ocean-input w-44" value={lineId} onChange={(e) => setLineId(e.target.value)}>
            <option value="LINE-1">LINE-1</option>
            <option value="LINE-2">LINE-2</option>
            <option value="LINE-3">LINE-3</option>
          </select>
          <select
            className="ocean-input w-20"
            value={form.shift}
            onChange={(e) => setForm((prev) => ({ ...prev, shift: e.target.value }))}
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Scan card */}
        <div className="ocean-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-extrabold text-slate-900">Scan machine</div>
              <div className="text-xs text-slate-500">Camera scan (if supported) or paste/enter the code.</div>
            </div>
            <span
              className={clsx(
                "ocean-badge ring-1",
                canUseCameraScan ? "bg-emerald-50 text-emerald-800 ring-emerald-100" : "bg-slate-50 text-slate-700 ring-slate-200"
              )}
            >
              {canUseCameraScan ? "camera supported" : "manual mode"}
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            <label className="text-xs font-bold text-slate-600">QR/Barcode content</label>
            <input
              className="ocean-input"
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              placeholder="e.g., M-100"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
            />

            <div className="flex flex-col gap-2 sm:flex-row">
              <button className="ocean-btn-primary flex-1" onClick={submitScan}>
                Resolve machine
              </button>
              <button
                className="ocean-btn-ghost flex-1"
                onClick={() => (cameraOn ? stopCamera() : startCamera())}
                disabled={!canUseCameraScan && !cameraOn}
              >
                {cameraOn ? "Stop camera" : "Use camera"}
              </button>
            </div>

            {scanStatus.error ? <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{scanStatus.error}</div> : null}

            {cameraOn ? (
              <div className="mt-2 overflow-hidden rounded-xl ring-1 ring-slate-200">
                <video ref={videoRef} className="h-64 w-full bg-black object-cover" playsInline muted />
              </div>
            ) : null}

            {machine ? (
              <div className="mt-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                <div className="text-xs font-semibold text-slate-500">Resolved</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-extrabold text-slate-900">{machine.name}</span>
                  <span className="ocean-badge bg-blue-100 text-blue-800">{machine.machineId}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <span className="font-semibold">Usage hours:</span> {machine.usageHours ?? "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Last maintenance:</span> {machine.lastMaintenanceDate ? "Recorded" : "—"}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Quick actions */}
        <div className="ocean-card p-4">
          <div className="text-sm font-extrabold text-slate-900">Quick actions</div>
          <div className="text-xs text-slate-500">Big buttons optimized for tablets/phones.</div>

          {!machine ? (
            <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-100">
              Scan/resolve a machine to attach machineId metadata to quick logs (optional but recommended).
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <button className="ocean-btn-primary py-4 text-base" disabled={actionStatus.loading} onClick={() => quickLog("start_run")}>
                Start Run
              </button>
              <button className="ocean-btn-secondary py-4 text-base" disabled={actionStatus.loading} onClick={() => quickLog("stop_run")}>
                Stop Run
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button className="ocean-btn-secondary py-4 text-base" disabled={actionStatus.loading} onClick={() => quickLog("log_downtime")}>
                Log Downtime
              </button>
              <button className="ocean-btn-secondary py-4 text-base" disabled={actionStatus.loading} onClick={() => quickLog("log_defect")}>
                Log Defect
              </button>
            </div>

            {actionStatus.error ? <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">{actionStatus.error}</div> : null}
            {actionStatus.ok ? <div className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800">{actionStatus.ok}</div> : null}

            <details className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
              <summary className="cursor-pointer text-sm font-bold text-slate-800">Action details (optional)</summary>
              <div className="mt-3 grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600">Operator</label>
                    <input
                      className="ocean-input mt-1"
                      value={form.operator}
                      onChange={(e) => setForm((p) => ({ ...p, operator: e.target.value }))}
                      placeholder="Name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600">Shift</label>
                    <select className="ocean-input mt-1" value={form.shift} onChange={(e) => setForm((p) => ({ ...p, shift: e.target.value }))}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-500">Start Run</div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600">SKU</label>
                      <input className="ocean-input mt-1" value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600">Qty</label>
                      <input
                        className="ocean-input mt-1"
                        type="number"
                        value={form.qty}
                        onChange={(e) => setForm((p) => ({ ...p, qty: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-500">Downtime</div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600">Category</label>
                      <input
                        className="ocean-input mt-1"
                        value={form.category}
                        onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600">Minutes</label>
                      <input
                        className="ocean-input mt-1"
                        type="number"
                        value={form.minutes}
                        onChange={(e) => setForm((p) => ({ ...p, minutes: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="text-xs font-bold text-slate-600">Reason</label>
                    <input className="ocean-input mt-1" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                  <div className="text-xs font-semibold text-slate-500">Defect</div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600">Defect</label>
                      <input
                        className="ocean-input mt-1"
                        value={form.defect}
                        onChange={(e) => setForm((p) => ({ ...p, defect: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600">Reject Qty</label>
                      <input
                        className="ocean-input mt-1"
                        type="number"
                        value={form.rejectQty}
                        onChange={(e) => setForm((p) => ({ ...p, rejectQty: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-600">Root cause</label>
                      <input
                        className="ocean-input mt-1"
                        value={form.rootCause}
                        onChange={(e) => setForm((p) => ({ ...p, rootCause: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
