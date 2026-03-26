const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { publish } = require("../realtime/eventBus");
const ProductionEvent = require("../models/ProductionEvent");

const router = express.Router();

const CreateSchema = z.object({
  ts: z.string().datetime().optional(),
  lineId: z.string().min(1),
  sku: z.string().min(1),
  qty: z.number().nonnegative(),
  shift: z.string().min(1).optional(),
  operator: z.string().min(1).optional(),
});

function toApi(doc) {
  return {
    id: String(doc._id),
    ts: new Date(doc.ts).toISOString(),
    lineId: doc.lineId,
    sku: doc.sku,
    qty: doc.qty,
    shift: doc.shift,
    operator: doc.operator,
  };
}

// PUBLIC_INTERFACE
router.get("/", requireAuth(), async (req, res, next) => {
  /** Lists production events. */
  try {
    const limit = Number(req.query.limit || 50);
    const docs = await ProductionEvent.find()
      .sort({ ts: -1 })
      .limit(limit)
      .lean();
    res.json({ items: docs.map(toApi) });
  } catch (e) {
    next(e);
  }
});

// PUBLIC_INTERFACE
router.post("/", requireAuth(), async (req, res, next) => {
  /** Creates a production event. */
  try {
    const parsed = CreateSchema.safeParse(req.body || {});
    if (!parsed.success) throw new HttpError(400, "Invalid payload", parsed.error.flatten());

    const ts = parsed.data.ts ? new Date(parsed.data.ts) : new Date();

    const doc = await ProductionEvent.create({
      ts,
      lineId: parsed.data.lineId,
      sku: parsed.data.sku,
      qty: parsed.data.qty,
      shift: parsed.data.shift,
      operator: parsed.data.operator,
    });

    const apiDoc = toApi(doc.toObject());

    publish({
      type: "production.created",
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
