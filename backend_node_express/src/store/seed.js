const { db, upsert } = require("./memoryStore");

function seedDefaultsIfEmpty() {
  if (db.lines.size === 0) {
    upsert(db.lines, { id: "LINE-1", name: "Line 1", idealRatePerMin: 30 });
    upsert(db.lines, { id: "LINE-2", name: "Line 2", idealRatePerMin: 26 });
    upsert(db.lines, { id: "LINE-3", name: "Line 3", idealRatePerMin: 22 });
  }

  if (db.shifts.size === 0) {
    upsert(db.shifts, { id: "SHIFT-A", code: "A", name: "Shift A", startHour: 6, durationMin: 480 });
    upsert(db.shifts, { id: "SHIFT-B", code: "B", name: "Shift B", startHour: 14, durationMin: 480 });
    upsert(db.shifts, { id: "SHIFT-C", code: "C", name: "Shift C", startHour: 22, durationMin: 480 });
  }

  if (db.alertRules.size === 0) {
    // OEE below 0.75 in last 15 minutes
    upsert(db.alertRules, {
      id: "RULE-OEE-LOW",
      enabled: true,
      name: "OEE below threshold",
      severity: "high",
      type: "oee.threshold",
      params: { lineId: null, windowMin: 15, op: "<", value: 0.75 },
      cooldownMin: 10,
    });

    // Downtime minutes in last 30 min > 15
    upsert(db.alertRules, {
      id: "RULE-DT-SPIKE",
      enabled: true,
      name: "Downtime spike detected",
      severity: "medium",
      type: "downtime.sum",
      params: { lineId: null, windowMin: 30, op: ">", value: 15 },
      cooldownMin: 10,
    });

    // Reject rate (quality) > 3% in last 60 min
    upsert(db.alertRules, {
      id: "RULE-REJECT-RATE",
      enabled: true,
      name: "Quality rejects increasing",
      severity: "medium",
      type: "quality.rejectRate",
      params: { lineId: null, windowMin: 60, op: ">", value: 0.03 },
      cooldownMin: 15,
    });
  }
}

module.exports = { seedDefaultsIfEmpty };
