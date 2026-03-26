const express = require("express");
const { z } = require("zod");
const { db, list, upsert, get, remove } = require("../store/memoryStore");
const { requireAuth, requireRole } = require("../middleware/auth");
const { HttpError } = require("../middleware/errors");
const { publish } = require("../realtime/eventBus");

const router = express.Router();

const LineSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  idealRatePerMin: z.number().positive().optional(),
});

// PUBLIC_INTERFACE
router.get("/", requireAuth(), (req, res) => {
  /** Lists lines. */
  const limit = Number(req.query.limit || 50);
  const items = list(db.lines, { limit });
  res.json({ items });
});

// PUBLIC_INTERFACE
router.post("/", requireAuth(), requireRole(["manager", "admin"]), (req, res, next) => {
  /** Creates/updates a line. */
  try {
    const parsed = LineSchema.safeParse(req.body || {});
    if (!parsed.success) throw new HttpError(400, "Invalid payload", parsed.error.flatten());
    const doc = upsert(db.lines, parsed.data);
    publish({ type: "lines.updated", ts: new Date().toISOString(), lineId: doc.id, payload: doc });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

// PUBLIC_INTERFACE
router.get("/:id", requireAuth(), (req, res, next) => {
  /** Gets a line by ID. */
  const doc = get(db.lines, req.params.id);
  if (!doc) return next(new HttpError(404, "Line not found"));
  res.json(doc);
});

// PUBLIC_INTERFACE
router.delete("/:id", requireAuth(), requireRole(["admin"]), (req, res) => {
  /** Deletes a line by ID. */
  const ok = remove(db.lines, req.params.id);
  publish({ type: "lines.deleted", ts: new Date().toISOString(), lineId: req.params.id });
  res.json({ ok });
});

module.exports = router;
