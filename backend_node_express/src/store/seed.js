const Line = require("../models/Line");
const Shift = require("../models/Shift");
const AlertRule = require("../models/AlertRule");
const Machine = require("../models/Machine");
const Prediction = require("../models/Prediction");

/**
 * Seeds minimal defaults for out-of-the-box usage.
 * This should be safe to call on every startup; it only inserts when collections are empty.
 */
async function seedDefaultsIfEmpty() {
  const lineCount = await Line.countDocuments();
  if (lineCount === 0) {
    await Line.insertMany([
      { lineId: "LINE-1", name: "Line 1", idealRatePerMin: 30 },
      { lineId: "LINE-2", name: "Line 2", idealRatePerMin: 26 },
      { lineId: "LINE-3", name: "Line 3", idealRatePerMin: 22 },
    ]);
  }

  const shiftCount = await Shift.countDocuments();
  if (shiftCount === 0) {
    await Shift.insertMany([
      { shiftId: "SHIFT-A", code: "A", name: "Shift A", startHour: 6, durationMin: 480 },
      { shiftId: "SHIFT-B", code: "B", name: "Shift B", startHour: 14, durationMin: 480 },
      { shiftId: "SHIFT-C", code: "C", name: "Shift C", startHour: 22, durationMin: 480 },
    ]);
  }

  const ruleCount = await AlertRule.countDocuments();
  if (ruleCount === 0) {
    await AlertRule.insertMany([
      {
        ruleId: "RULE-OEE-LOW",
        enabled: true,
        name: "OEE below threshold",
        severity: "high",
        type: "oee.threshold",
        params: { lineId: null, windowMin: 15, op: "<", value: 0.75 },
        cooldownMin: 10,
      },
      {
        ruleId: "RULE-DT-SPIKE",
        enabled: true,
        name: "Downtime spike detected",
        severity: "medium",
        type: "downtime.sum",
        params: { lineId: null, windowMin: 30, op: ">", value: 15 },
        cooldownMin: 10,
      },
      {
        ruleId: "RULE-REJECT-RATE",
        enabled: true,
        name: "Quality rejects increasing",
        severity: "medium",
        type: "quality.rejectRate",
        params: { lineId: null, windowMin: 60, op: ">", value: 0.03 },
        cooldownMin: 15,
      },
    ]);
  }

  const machineCount = await Machine.countDocuments();
  if (machineCount === 0) {
    await Machine.insertMany([
      {
        machineId: "M-100",
        name: "Filler #1",
        usageHours: 1450,
        lastMaintenanceDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45),
      },
      {
        machineId: "M-200",
        name: "Capper #1",
        usageHours: 980,
        lastMaintenanceDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
      },
      {
        machineId: "M-300",
        name: "Labeler #1",
        usageHours: 2100,
        lastMaintenanceDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 75),
      },
    ]);
  }

  const predictionCount = await Prediction.countDocuments();
  if (predictionCount === 0) {
    const now = new Date();
    await Prediction.insertMany([
      {
        machineId: "M-100",
        failureProbability: 0.18,
        riskLevel: "Low",
        timestamp: now,
      },
      {
        machineId: "M-200",
        failureProbability: 0.42,
        riskLevel: "Medium",
        timestamp: now,
      },
      {
        machineId: "M-300",
        failureProbability: 0.77,
        riskLevel: "High",
        timestamp: now,
      },
    ]);
  }
}

module.exports = { seedDefaultsIfEmpty };
