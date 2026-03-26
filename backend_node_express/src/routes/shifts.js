const express = require("express");
const { z } = require("zod");
const { requireAuth, requireRole } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { publish } = require("../realtime/eventBus");
const Shift = require("../models/Shift");

const router = express.Router();

const ShiftSchema = z.object({
  id: z.string().min(1).optional(), // backward-compat alias for shiftId
  shiftId: z.string().min(1).optional(),
  code: z.enum(["A", "B", "C"]),
  name: z.string().min(1),
  startHour: z.number().int().min(0).max(23),
  durationMin: z.number().int().positive(),
});

function toApi(doc) {
  return {
    id: doc.shiftId,
    code: doc.code,
    name: doc.name,
    startHour: doc.startHour,
    durationMin: doc.durationMin,
  };
}

// PUBLIC_INTERFACE
router.get("/", requireAuth(), async (req, res, next) => {
  /** Lists shifts. */
  try {
    const limit = Number(req.query.limit || 50);
    const docs = await Shift.find().sort({ code: 1 }).limit(limit).lean();
    res.json({ items: docs.map(toApi) });
  } catch (e) {
    next(e);
  }
});

// PUBLIC_INTERFACE
router.post(
  "/",
  requireAuth(),
  requireRole(["supervisor", "manager", "admin"]),
  async (req, res, next) => {
    /** Creates/updates shift definition. */
    try {
      const parsed = ShiftSchema.safeParse(req.body || {});
      if (!parsed.success) throw new HttpError(400, "Invalid payload", parsed.error.flatten());

      const shiftId = String(parsed.data.shiftId || parsed.data.id || `SHIFT-${parsed.data.code}`);
      const update = {
        shiftId,
        code: parsed.data.code,
        name: parsed.data.name,
        startHour: parsed.data.startHour,
        durationMin: parsed.data.durationMin,
      };

      const doc = await Shift.findOneAndUpdate({ shiftId }, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }).lean();

      publish({ type: "shifts.updated", ts: new Date().toISOString(), payload: toApi(doc) });
      res.status(201).json(toApi(doc));
    } catch (e) {
      next(e);
    }
  }
);

// PUBLIC_INTERFACE
router.get("/:id", requireAuth(), async (req, res, next) => {
  /** Gets a shift by ID. */
  try {
    const doc = await Shift.findOne({ shiftId: req.params.id }).lean();
    if (!doc) return next(new HttpError(404, "Shift not found"));
    res.json(toApi(doc));
  } catch (e) {
    next(e);
  }
});

// PUBLIC_INTERFACE
router.delete("/:id", requireAuth(), requireRole(["admin"]), async (req, res, next) => {
  /** Deletes a shift by ID. */
  try {
    const result = await Shift.deleteOne({ shiftId: req.params.id });
    const ok = result.deletedCount > 0;
    publish({ type: "shifts.deleted", ts: new Date().toISOString(), shiftId: req.params.id });
    res.json({ ok });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
