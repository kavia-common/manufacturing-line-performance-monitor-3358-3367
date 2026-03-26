const express = require("express");
const { db, list, get, upsert } = require("../store/memoryStore");
const { requireAuth } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { publish } = require("../realtime/eventBus");

const router = express.Router();

// PUBLIC_INTERFACE
router.get("/", requireAuth(), (req, res) => {
  /** Lists alerts. Query: limit. */
  const limit = Number(req.query.limit || 50);
  res.json({ items: list(db.alerts, { limit }) });
});

// PUBLIC_INTERFACE
router.post("/:id/ack", requireAuth(), (req, res, next) => {
  /** Acknowledges an alert by ID. */
  const id = req.params.id;
  const alert = get(db.alerts, id);
  if (!alert) return next(new HttpError(404, "Alert not found"));
  const updated = upsert(db.alerts, { ...alert, acknowledged: true, acknowledgedAt: new Date().toISOString() });
  publish({ type: "alerts.acknowledged", ts: new Date().toISOString(), alertId: id, payload: updated });
  res.json({ ok: true });
});

module.exports = router;
