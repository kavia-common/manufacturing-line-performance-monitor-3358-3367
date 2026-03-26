const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { computeOeeSummary, computeOeeTrends } = require("../services/oeeService");

const router = express.Router();

// PUBLIC_INTERFACE
router.get("/summary", requireAuth(), (req, res) => {
  /** Returns OEE KPI summary for a line. Query: lineId, windowMin(optional). */
  const lineId = String(req.query.lineId || "LINE-1");
  const windowMin = req.query.windowMin ? Number(req.query.windowMin) : 480;
  const data = computeOeeSummary({ lineId, windowMin });
  res.json(data);
});

// PUBLIC_INTERFACE
router.get("/trends", requireAuth(), (req, res) => {
  /** Returns OEE trend points. Query: lineId, minutes(optional). */
  const lineId = String(req.query.lineId || "LINE-1");
  const minutes = req.query.minutes ? Number(req.query.minutes) : 120;
  const points = computeOeeTrends({ lineId, minutes, stepMin: 5 });
  res.json(points);
});

module.exports = router;
