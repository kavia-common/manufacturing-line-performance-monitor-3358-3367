const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { computeOeeSummary, computeOeeTrends } = require("../services/oeeService");

const router = express.Router();

// PUBLIC_INTERFACE
router.get("/summary", requireAuth(), async (req, res, next) => {
  /** Returns OEE KPI summary for a line. Query: lineId, windowMin(optional). */
  try {
    const lineId = String(req.query.lineId || "LINE-1");
    const windowMin = req.query.windowMin ? Number(req.query.windowMin) : 480;
    const data = await computeOeeSummary({ lineId, windowMin });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// PUBLIC_INTERFACE
router.get("/trends", requireAuth(), async (req, res, next) => {
  /** Returns OEE trend points. Query: lineId, minutes(optional). */
  try {
    const lineId = String(req.query.lineId || "LINE-1");
    const minutes = req.query.minutes ? Number(req.query.minutes) : 120;
    const points = await computeOeeTrends({ lineId, minutes, stepMin: 5 });
    res.json(points);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
