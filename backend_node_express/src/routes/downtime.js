const express = require("express");
const { z } = require("zod");
const { db, list, createEvent } = require("../store/memoryStore");
const { requireAuth } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { publish } = require("../realtime/eventBus");

const router = express.Router();

const CreateSchema = z.object({
  ts: z.string().datetime().optional(),
  lineId: z.string().min(1),
  category: z.string().min(1),
  reason: z.string().min(1),
  minutes: z.number().nonnegative(),
  shift: z.string().min(1).optional(),
});

// PUBLIC_INTERFACE
router.get("/", requireAuth(), (req, res) => {
  /** Lists downtime events. */
  const limit = Number(req.query.limit || 50);
  res.json({ items: list(db.downtime, { limit }) });
});

// PUBLIC_INTERFACE
router.post("/", requireAuth(), (req, res, next) => {
  /** Creates a downtime event. */
  try {
    const parsed = CreateSchema.safeParse(req.body || {});
    if (!parsed.success) throw new HttpError(400, "Invalid payload", parsed.error.flatten());
    const doc = createEvent(db.downtime, parsed.data);
    publish({ type: "downtime.created", ts: new Date().toISOString(), lineId: doc.lineId, payload: doc });
    publish({ type: "oee.update", ts: new Date().toISOString(), lineId: doc.lineId });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
