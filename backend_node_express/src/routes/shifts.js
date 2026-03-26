const express = require("express");
const { z } = require("zod");
const { db, list, upsert, get, remove } = require("../store/memoryStore");
const { requireAuth, requireRole } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { publish } = require("../realtime/eventBus");

const router = express.Router();

const ShiftSchema = z.object({
  id: z.string().min(1).optional(),
  code: z.enum(["A", "B", "C"]),
  name: z.string().min(1),
  startHour: z.number().int().min(0).max(23),
  durationMin: z.number().int().positive(),
});

// PUBLIC_INTERFACE
router.get("/", requireAuth(), (req, res) => {
  /** Lists shifts. */
  const limit = Number(req.query.limit || 50);
  res.json({ items: list(db.shifts, { limit }) });
});

// PUBLIC_INTERFACE
router.post("/", requireAuth(), requireRole(["supervisor", "manager", "admin"]), (req, res, next) => {
  /** Creates/updates shift definition. */
  try {
    const parsed = ShiftSchema.safeParse(req.body || {});
    if (!parsed.success) throw new HttpError(400, "Invalid payload", parsed.error.flatten());
    const doc = upsert(db.shifts, parsed.data);
    publish({ type: "shifts.updated", ts: new Date().toISOString(), payload: doc });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

// PUBLIC_INTERFACE
router.get("/:id", requireAuth(), (req, res, next) => {
  /** Gets a shift by ID. */
  const doc = get(db.shifts, req.params.id);
  if (!doc) return next(new HttpError(404, "Shift not found"));
  res.json(doc);
});

// PUBLIC_INTERFACE
router.delete("/:id", requireAuth(), requireRole(["admin"]), (req, res) => {
  /** Deletes a shift by ID. */
  const ok = remove(db.shifts, req.params.id);
  publish({ type: "shifts.deleted", ts: new Date().toISOString(), shiftId: req.params.id });
  res.json({ ok });
});

module.exports = router;
