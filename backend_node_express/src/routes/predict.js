const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { publish } = require("../realtime/eventBus");

const Alert = require("../models/Alert");
const {
  computeAndStorePrediction,
  getLatestPrediction,
  getOrCreateMachine,
} = require("../services/predictiveService");

const router = express.Router();

const QuerySchema = z.object({
  lineId: z.string().min(1).optional(),
  windowMin: z.coerce.number().int().positive().max(60 * 24 * 60).optional(), // max 60 days
  persist: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});

/**
 * Create an alert when the machine is predicted as high risk.
 * Includes basic dedupe via time window (avoid spam).
 */
async function maybeCreatePredictiveAlert({ machineId, riskLevel, failureProbability, lineId }) {
  if (riskLevel !== "High") return null;

  const since = new Date(Date.now() - 60 * 60 * 1000); // 1 hour dedupe window
  const existing = await Alert.findOne({
    ts: { $gte: since },
    "meta.machineId": machineId,
    "meta.kind": "predictive.maintenance",
  })
    .sort({ ts: -1 })
    .lean();

  if (existing) return null;

  const doc = await Alert.create({
    ts: new Date(),
    ruleId: "PREDICTIVE-MAINTENANCE",
    severity: "high",
    lineId: lineId || null,
    message: `Machine ${machineId} likely to fail soon (p=${Math.round(
      failureProbability * 100
    )}%).`,
    acknowledged: false,
    meta: {
      kind: "predictive.maintenance",
      machineId,
      riskLevel,
      failureProbability,
    },
  });

  const apiAlert = {
    id: String(doc._id),
    ts: new Date(doc.ts).toISOString(),
    ruleId: doc.ruleId,
    severity: doc.severity,
    lineId: doc.lineId,
    message: doc.message,
    acknowledged: doc.acknowledged,
    acknowledgedAt: doc.acknowledgedAt ? new Date(doc.acknowledgedAt).toISOString() : null,
    meta: doc.meta || {},
  };

  publish({
    type: "alerts.created",
    ts: new Date().toISOString(),
    lineId: apiAlert.lineId,
    payload: apiAlert,
  });

  return apiAlert;
}

// PUBLIC_INTERFACE
router.get("/predict/:machineId", requireAuth(), async (req, res, next) => {
  /**
   * GET /api/predict/:machineId
   * Query:
   * - lineId (optional): current downtime model is line-based; used to correlate patterns
   * - windowMin (optional): lookback window for downtime analysis (default 14 days)
   * - persist (optional): if true, compute+store a new prediction; if false, return latest stored
   *
   * Returns:
   * { machine, prediction, features? }
   */
  try {
    const machineId = String(req.params.machineId || "").trim();
    if (!machineId) throw new HttpError(400, "machineId is required");

    const qParsed = QuerySchema.safeParse(req.query || {});
    if (!qParsed.success) throw new HttpError(400, "Invalid query", qParsed.error.flatten());
    const { lineId, windowMin, persist } = qParsed.data;

    const machine = await getOrCreateMachine(machineId);

    let prediction = null;
    let computed = null;

    if (persist) {
      computed = await computeAndStorePrediction({
        machineId,
        lineId: lineId || undefined,
        windowMin: windowMin || undefined,
      });
      prediction = {
        machineId: computed.machineId,
        failureProbability: computed.failureProbability,
        riskLevel: computed.riskLevel,
        timestamp: new Date(computed.timestamp).toISOString(),
      };
    } else {
      prediction = await getLatestPrediction({ machineId });
      if (!prediction) {
        // If none exists yet, compute & persist one by default so feature "just works".
        computed = await computeAndStorePrediction({
          machineId,
          lineId: lineId || undefined,
          windowMin: windowMin || undefined,
        });
        prediction = {
          machineId: computed.machineId,
          failureProbability: computed.failureProbability,
          riskLevel: computed.riskLevel,
          timestamp: new Date(computed.timestamp).toISOString(),
        };
      }
    }

    // Emit realtime activity + create alert if needed
    publish({
      type: "activity.predictive.prediction",
      ts: new Date().toISOString(),
      entity: "prediction",
      data: {
        machineId,
        lineId: lineId || null,
        prediction,
        user: req.user,
      },
    });

    const alert = await maybeCreatePredictiveAlert({
      machineId,
      riskLevel: prediction.riskLevel,
      failureProbability: prediction.failureProbability,
      lineId: lineId || null,
    });

    if (alert) {
      publish({
        type: "activity.predictive.alert_emitted",
        ts: new Date().toISOString(),
        entity: "alert",
        data: { alert, machineId, user: req.user },
      });
    }

    res.json({
      machine: {
        machineId: machine.machineId,
        name: machine.name,
        usageHours: machine.usageHours,
        lastMaintenanceDate: machine.lastMaintenanceDate
          ? new Date(machine.lastMaintenanceDate).toISOString()
          : null,
      },
      prediction,
      features: computed ? computed.features : undefined,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;

