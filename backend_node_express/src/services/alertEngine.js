const { db, upsert, list } = require("../store/memoryStore");
const { computeOeeSummary } = require("./oeeService");
const { publish } = require("../realtime/eventBus");

function nowIso() {
  return new Date().toISOString();
}

function compare(op, a, b) {
  if (op === "<") return a < b;
  if (op === "<=") return a <= b;
  if (op === ">") return a > b;
  if (op === ">=") return a >= b;
  if (op === "==") return a === b;
  return false;
}

function recentCooldownHit(ruleId, cooldownMin) {
  if (!cooldownMin) return false;
  const since = new Date(Date.now() - cooldownMin * 60 * 1000).toISOString();
  const alerts = list(db.alerts, { limit: 2000 });
  return alerts.some((a) => a.ruleId === ruleId && a.ts >= since);
}

function createAlert({ rule, lineId, title, description }) {
  const alert = upsert(db.alerts, {
    ts: nowIso(),
    ruleId: rule.id,
    severity: rule.severity || "low",
    title,
    description,
    lineId: lineId || null,
    acknowledged: false,
  });

  publish({ type: "alerts.created", ts: nowIso(), lineId: alert.lineId, payload: alert });
  return alert;
}

function evalRule(rule) {
  const params = rule.params || {};
  const op = params.op || "<";
  const value = Number(params.value);

  const targetLineIds = params.lineId
    ? [params.lineId]
    : Array.from(db.lines.values()).map((l) => l.id);

  for (const lineId of targetLineIds) {
    if (recentCooldownHit(rule.id, rule.cooldownMin || 0)) continue;

    if (rule.type === "oee.threshold") {
      const summary = computeOeeSummary({ lineId, windowMin: Number(params.windowMin || 15) });
      const oee = summary.kpis.oee;
      if (compare(op, oee, value)) {
        createAlert({
          rule,
          lineId,
          title: rule.name || "OEE threshold",
          description: `OEE ${Math.round(oee * 1000) / 10} is ${op} ${value} (window ${params.windowMin || 15}m).`,
        });
      }
    }

    if (rule.type === "downtime.sum") {
      const windowMin = Number(params.windowMin || 30);
      const since = new Date(Date.now() - windowMin * 60 * 1000).toISOString();
      const dt = list(db.downtime, { limit: 5000 });
      const sum = dt
        .filter((d) => d.lineId === lineId && d.ts >= since)
        .reduce((acc, d) => acc + Number(d.minutes || 0), 0);

      if (compare(op, sum, value)) {
        createAlert({
          rule,
          lineId,
          title: rule.name || "Downtime sum",
          description: `Downtime ${sum} min is ${op} ${value} (window ${windowMin}m).`,
        });
      }
    }

    if (rule.type === "quality.rejectRate") {
      const windowMin = Number(params.windowMin || 60);
      const since = new Date(Date.now() - windowMin * 60 * 1000).toISOString();
      const prod = list(db.production, { limit: 5000 });
      const q = list(db.quality, { limit: 5000 });

      const total = prod.filter((p) => p.lineId === lineId && p.ts >= since).reduce((acc, p) => acc + Number(p.qty || 0), 0);
      const rejects = q.filter((qq) => qq.lineId === lineId && qq.ts >= since).reduce((acc, qq) => acc + Number(qq.rejectQty || 0), 0);
      const rate = total <= 0 ? 0 : rejects / total;

      if (compare(op, rate, value)) {
        createAlert({
          rule,
          lineId,
          title: rule.name || "Reject rate",
          description: `Reject rate ${(Math.round(rate * 10000) / 100).toFixed(2)}% is ${op} ${(value * 100).toFixed(2)}% (window ${windowMin}m).`,
        });
      }
    }
  }
}

// PUBLIC_INTERFACE
function startAlertEngine() {
  /**
   * Starts an interval-based alert rule evaluator.
   * Emits realtime events: alerts.created and (indirectly) oee.update on data changes.
   */
  const intervalMs = 10_000;

  setInterval(() => {
    const rules = Array.from(db.alertRules.values()).filter((r) => r.enabled);
    for (const rule of rules) {
      try {
        evalRule(rule);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[alertEngine] rule error:", rule?.id, e);
      }
    }
  }, intervalMs);

  publish({ type: "alerts.engine.started", ts: nowIso(), intervalMs });
}

module.exports = { startAlertEngine };
