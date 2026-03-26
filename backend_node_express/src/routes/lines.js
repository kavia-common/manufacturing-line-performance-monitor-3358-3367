const express = require("express");
const { z } = require("zod");
const { requireAuth, requireRole } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { publish } = require("../realtime/eventBus");
const Line = require("../models/Line");

const router = express.Router();

const LineSchema = z.object({
  id: z.string().min(1).optional(), // backward-compat alias for lineId
  lineId: z.string().min(1).optional(),
  name: z.string().min(1),
  idealRatePerMin: z.number().positive().optional(),
});

function toApi(doc) {
  // Keep existing API contract: { id, name, idealRatePerMin }
  return {
    id: doc.lineId,
    name: doc.name,
    idealRatePerMin: doc.idealRatePerMin,
  };
}

// PUBLIC_INTERFACE
router.get("/", requireAuth(), async (req, res, next) => {
  /** Lists lines. */
  try {
    const limit = Number(req.query.limit || 50);
    const docs = await Line.find().sort({ lineId: 1 }).limit(limit).lean();
    res.json({ items: docs.map(toApi) });
  } catch (e) {
    next(e);
  }
});

// PUBLIC_INTERFACE
router.post("/", requireAuth(), requireRole(["manager", "admin"]), async (req, res, next) => {
  /** Creates/updates a line. */
  try {
    const parsed = LineSchema.safeParse(req.body || {});
    if (!parsed.success) throw new HttpError(400, "Invalid payload", parsed.error.flatten());

    const lineId = String(parsed.data.lineId || parsed.data.id || "").trim();
    if (!lineId) throw new HttpError(400, "Invalid payload: lineId is required");

    const update = {
      lineId,
      name: parsed.data.name,
      idealRatePerMin: parsed.data.idealRatePerMin,
    };

    const doc = await Line.findOneAndUpdate({ lineId }, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }).lean();

    publish({
      type: "lines.updated",
      ts: new Date().toISOString(),
      lineId: doc.lineId,
      payload: toApi(doc),
    });

    res.status(201).json(toApi(doc));
  } catch (e) {
    next(e);
  }
});

// PUBLIC_INTERFACE
router.get("/:id", requireAuth(), async (req, res, next) => {
  /** Gets a line by ID. */
  try {
    const doc = await Line.findOne({ lineId: req.params.id }).lean();
    if (!doc) return next(new HttpError(404, "Line not found"));
    res.json(toApi(doc));
  } catch (e) {
    next(e);
  }
});

// PUBLIC_INTERFACE
router.delete("/:id", requireAuth(), requireRole(["admin"]), async (req, res, next) => {
  /** Deletes a line by ID. */
  try {
    const result = await Line.deleteOne({ lineId: req.params.id });
    const ok = result.deletedCount > 0;

    publish({ type: "lines.deleted", ts: new Date().toISOString(), lineId: req.params.id });
    res.json({ ok });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
