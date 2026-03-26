const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { publish } = require("../realtime/eventBus");
const DowntimeEvent = require("../models/DowntimeEvent");

const router = express.Router();

const CreateSchema = z.object({
  ts: z.string().datetime().optional(),
  lineId: z.string().min(1),
  category: z.string().min(1),
  reason: z.string().min(1),
  minutes: z.number().nonnegative(),
  shift: z.string().min(1).optional(),
});

function toApi(doc) {
  return {
    id: String(doc._id),
    ts: new Date(doc.ts).toISOString(),
    lineId: doc.lineId,
    category: doc.category,
    reason: doc.reason,
    minutes: doc.minutes,
    shift: doc.shift,
  };
}

// PUBLIC_INTERFACE
router.get("/", requireAuth(), async (req, res, next) => {
  /** Lists downtime events. */
  try {
    const limit = Number(req.query.limit || 50);
    const docs = await DowntimeEvent.find().sort({ ts: -1 }).limit(limit).lean();
    res.json({ items: docs.map(toApi) });
  } catch (e) {
    next(e);
  }
});

// PUBLIC_INTERFACE
router.post("/", requireAuth(), async (req, res, next) => {
  /** Creates a downtime event. */
  try {
    const parsed = CreateSchema.safeParse(req.body || {});
    if (!parsed.success) throw new HttpError(400, "Invalid payload", parsed.error.flatten());

    const ts = parsed.data.ts ? new Date(parsed.data.ts) : new Date();

    const doc = await DowntimeEvent.create({
      ts,
      lineId: parsed.data.lineId,
      category: parsed.data.category,
      reason: parsed.data.reason,
      minutes: parsed.data.minutes,
      shift: parsed.data.shift,
    });

    const apiDoc = toApi(doc.toObject());

    publish({
      type: "downtime.created",
      ts: new Date().toISOString(),
      lineId: apiDoc.lineId,
      payload: apiDoc,
    });
    publish({ type: "oee.update", ts: new Date().toISOString(), lineId: apiDoc.lineId });

    res.status(201).json(apiDoc);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
