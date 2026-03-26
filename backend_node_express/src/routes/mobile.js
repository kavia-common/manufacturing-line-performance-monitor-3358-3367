const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { publish } = require("../realtime/eventBus");

const Machine = require("../models/Machine");
const ProductionEvent = require("../models/ProductionEvent");
const DowntimeEvent = require("../models/DowntimeEvent");
const QualityEvent = require("../models/QualityEvent");

const router = express.Router();

/**
 * Mobile operator workflows:
 * - Scan: resolves a machine via QR/Barcode payload (simple machineId in this MVP)
 * - Quick log: single endpoint for big-button actions: start/stop run, downtime, defect
 */

const ScanSchema = z.object({
  code: z.string().min(1), // QR/Barcode content
  // Optional hints from operator UI:
  lineId: z.string().min(1).optional(),
});

function toMachineApi(doc) {
  return {
    machineId: doc.machineId,
    name: doc.name,
    usageHours: doc.usageHours,
    lastMaintenanceDate: doc.lastMaintenanceDate
      ? new Date(doc.lastMaintenanceDate).toISOString()
      : null,
  };
}

// PUBLIC_INTERFACE
router.post("/scan", requireAuth(), async (req, res, next) => {
  /**
   * POST /api/scan
   * Body: { code, lineId? }
   *
   * Interprets `code` as machineId (e.g., "M-100") and returns machine details.
   * If machine doesn't exist, creates a minimal placeholder machine for demo/operator flow continuity.
   */
  try {
    const parsed = ScanSchema.safeParse(req.body || {});
    if (!parsed.success) throw new HttpError(400, "Invalid payload", parsed.error.flatten());

    const machineId = String(parsed.data.code).trim();
    const lineId = parsed.data.lineId ? String(parsed.data.lineId) : null;

    let machine = await Machine.findOne({ machineId });
    if (!machine) {
      machine = await Machine.create({
        machineId,
        name: `Machine ${machineId}`,
        usageHours: 0,
        lastMaintenanceDate: null,
      });
    }

    const payload = {
      machine: toMachineApi(machine.toObject()),
      resolvedFrom: { code: parsed.data.code, lineId },
    };

    publish({
      type: "activity.mobile.scan",
      ts: new Date().toISOString(),
      entity: "machine",
      data: {
        ...payload,
        user: req.user,
      },
    });

    res.status(200).json(payload);
  } catch (e) {
    next(e);
  }
});

const QuickLogSchema = z.object({
  action: z.enum(["start_run", "stop_run", "log_downtime", "log_defect"]),
  ts: z.string().datetime().optional(),

  // Context
  lineId: z.string().min(1).default("LINE-1"),
  machineId: z.string().min(1).optional(),
  shift: z.string().min(1).optional(),
  operator: z.string().min(1).optional(),

  // Start/stop run fields
  sku: z.string().min(1).optional(),
  qty: z.number().nonnegative().optional(),

  // Downtime fields
  category: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
  minutes: z.number().nonnegative().optional(),

  // Defect fields
  defect: z.string().min(1).optional(),
  rejectQty: z.number().nonnegative().optional(),
  rootCause: z.string().min(1).optional(),
});

function asIsoDate(ts) {
  return ts ? new Date(ts) : new Date();
}

// PUBLIC_INTERFACE
router.post("/quick-log", requireAuth(), async (req, res, next) => {
  /**
   * POST /api/quick-log
   * Body: { action, ... }
   *
   * Supported actions:
   * - start_run: creates ProductionEvent (expects sku, qty)
   * - stop_run: emits activity only (no canonical "run" entity yet)
   * - log_downtime: creates DowntimeEvent (expects category, reason, minutes)
   * - log_defect: creates QualityEvent (expects defect, rejectQty)
   */
  try {
    const parsed = QuickLogSchema.safeParse(req.body || {});
    if (!parsed.success) throw new HttpError(400, "Invalid payload", parsed.error.flatten());

    const data = parsed.data;
    const ts = asIsoDate(data.ts);
    const lineId = String(data.lineId || "LINE-1");
    const operator = data.operator || req.user?.name || req.user?.email || "operator";

    let result = { ok: true, action: data.action };

    if (data.action === "start_run") {
      if (!data.sku || data.qty === undefined) {
        throw new HttpError(400, "start_run requires sku and qty");
      }

      const doc = await ProductionEvent.create({
        ts,
        lineId,
        sku: data.sku,
        qty: data.qty,
        shift: data.shift,
        operator,
      });

      result = { ...result, productionEventId: String(doc._id) };

      publish({
        type: "production.created",
        ts: new Date().toISOString(),
        lineId,
        payload: {
          id: String(doc._id),
          ts: new Date(doc.ts).toISOString(),
          lineId: doc.lineId,
          sku: doc.sku,
          qty: doc.qty,
          shift: doc.shift,
          operator: doc.operator,
          meta: { source: "mobile.quick-log", machineId: data.machineId || null },
        },
      });
      publish({ type: "oee.update", ts: new Date().toISOString(), lineId });
    }

    if (data.action === "stop_run") {
      // No canonical "run" entity in this template yet—emit activity so frontend can show a timeline/toast.
      publish({
        type: "activity.production.stop_run",
        ts: new Date().toISOString(),
        entity: "run",
        data: {
          ts: ts.toISOString(),
          lineId,
          machineId: data.machineId || null,
          shift: data.shift || null,
          operator,
          source: "mobile.quick-log",
        },
      });
      publish({ type: "oee.update", ts: new Date().toISOString(), lineId });
    }

    if (data.action === "log_downtime") {
      if (!data.category || !data.reason || data.minutes === undefined) {
        throw new HttpError(400, "log_downtime requires category, reason, minutes");
      }

      const doc = await DowntimeEvent.create({
        ts,
        lineId,
        category: data.category,
        reason: data.reason,
        minutes: data.minutes,
        shift: data.shift,
      });

      result = { ...result, downtimeEventId: String(doc._id) };

      publish({
        type: "downtime.created",
        ts: new Date().toISOString(),
        lineId,
        payload: {
          id: String(doc._id),
          ts: new Date(doc.ts).toISOString(),
          lineId: doc.lineId,
          category: doc.category,
          reason: doc.reason,
          minutes: doc.minutes,
          shift: doc.shift,
          meta: { source: "mobile.quick-log", machineId: data.machineId || null },
        },
      });
      publish({ type: "oee.update", ts: new Date().toISOString(), lineId });
    }

    if (data.action === "log_defect") {
      if (!data.defect || data.rejectQty === undefined) {
        throw new HttpError(400, "log_defect requires defect and rejectQty");
      }

      const doc = await QualityEvent.create({
        ts,
        lineId,
        defect: data.defect,
        rejectQty: data.rejectQty,
        rootCause: data.rootCause,
        shift: data.shift,
      });

      result = { ...result, qualityEventId: String(doc._id) };

      publish({
        type: "quality.created",
        ts: new Date().toISOString(),
        lineId,
        payload: {
          id: String(doc._id),
          ts: new Date(doc.ts).toISOString(),
          lineId: doc.lineId,
          defect: doc.defect,
          rejectQty: doc.rejectQty,
          rootCause: doc.rootCause,
          shift: doc.shift,
          meta: { source: "mobile.quick-log", machineId: data.machineId || null },
        },
      });
      publish({ type: "oee.update", ts: new Date().toISOString(), lineId });
    }

    // Always emit a high-level activity event for mobile timeline UX
    publish({
      type: "activity.mobile.quick_log",
      ts: new Date().toISOString(),
      entity: "quick_log",
      data: {
        ...data,
        ts: ts.toISOString(),
        operator,
        user: req.user,
      },
    });

    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router;

