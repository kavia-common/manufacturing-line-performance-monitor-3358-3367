const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { publish } = require("../realtime/eventBus");
const QualityEvent = require("../models/QualityEvent");

const router = express.Router();

const CreateSchema = z.object({
  ts: z.string().datetime().optional(),
  lineId: z.string().min(1),
  defect: z.string().min(1),
  rejectQty: z.number().nonnegative(),
  rootCause: z.string().min(1).optional(),
  shift: z.string().min(1).optional(),
});

function toApi(doc) {
  return {
    id: String(doc._id),
    ts: new Date(doc.ts).toISOString(),
    lineId: doc.lineId,
    defect: doc.defect,
    rejectQty: doc.rejectQty,
    rootCause: doc.rootCause,
    shift: doc.shift,
  };
}

// PUBLIC_INTERFACE
router.get("/", requireAuth(), async (req, res, next) => {
  /** Lists quality events. */
  try {
    const limit = Number(req.query.limit || 50);
    const docs = await QualityEvent.find().sort({ ts: -1 }).limit(limit).lean();
    res.json({ items: docs.map(toApi) });
  } catch (e) {
    next(e);
  }
});

// PUBLIC_INTERFACE
router.post("/", requireAuth(), async (req, res, next) => {
  /** Creates a quality event. */
  try {
    const parsed = CreateSchema.safeParse(req.body || {});
    if (!parsed.success) throw new HttpError(400, "Invalid payload", parsed.error.flatten());

    const ts = parsed.data.ts ? new Date(parsed.data.ts) : new Date();

    const doc = await QualityEvent.create({
      ts,
      lineId: parsed.data.lineId,
      defect: parsed.data.defect,
      rejectQty: parsed.data.rejectQty,
      rootCause: parsed.data.rootCause,
      shift: parsed.data.shift,
    });

    const apiDoc = toApi(doc.toObject());

    publish({
      type: "quality.created",
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
