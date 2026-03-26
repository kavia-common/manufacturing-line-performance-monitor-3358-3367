const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { publish } = require("../realtime/eventBus");
const Alert = require("../models/Alert");

const router = express.Router();

function toApi(doc) {
  return {
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
}

// PUBLIC_INTERFACE
router.get("/", requireAuth(), async (req, res, next) => {
  /** Lists alerts. Query: limit. */
  try {
    const limit = Number(req.query.limit || 50);
    const docs = await Alert.find().sort({ ts: -1 }).limit(limit).lean();
    res.json({ items: docs.map(toApi) });
  } catch (e) {
    next(e);
  }
});

// PUBLIC_INTERFACE
router.post("/:id/ack", requireAuth(), async (req, res, next) => {
  /** Acknowledges an alert by ID. */
  try {
    const id = req.params.id;

    const doc = await Alert.findByIdAndUpdate(
      id,
      { acknowledged: true, acknowledgedAt: new Date() },
      { new: true }
    ).lean();

    if (!doc) return next(new HttpError(404, "Alert not found"));

    publish({
      type: "alerts.acknowledged",
      ts: new Date().toISOString(),
      alertId: id,
      payload: toApi(doc),
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
