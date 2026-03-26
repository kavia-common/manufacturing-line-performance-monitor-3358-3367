const { db, list } = require("../store/memoryStore");

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function windowStartIso(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function sumByLineAndWindow(items, { lineId, sinceIso, field }) {
  let sum = 0;
  for (const it of items) {
    if (lineId && it.lineId !== lineId) continue;
    if (sinceIso && it.ts && it.ts < sinceIso) continue;
    sum += Number(it[field] || 0);
  }
  return sum;
}

function countRejects(items, { lineId, sinceIso }) {
  let reject = 0;
  for (const it of items) {
    if (lineId && it.lineId !== lineId) continue;
    if (sinceIso && it.ts && it.ts < sinceIso) continue;
    reject += Number(it.rejectQty || 0);
  }
  return reject;
}

function sumProductionQty(items, { lineId, sinceIso }) {
  let qty = 0;
  for (const it of items) {
    if (lineId && it.lineId !== lineId) continue;
    if (sinceIso && it.ts && it.ts < sinceIso) continue;
    qty += Number(it.qty || 0);
  }
  return qty;
}

function getIdealRatePerMin(lineId) {
  const line = db.lines.get(lineId);
  const rate = line?.idealRatePerMin;
  return Number.isFinite(Number(rate)) ? Number(rate) : 30;
}

// PUBLIC_INTERFACE
function computeOeeSummary({ lineId = "LINE-1", windowMin = 480 } = {}) {
  /**
   * Computes OEE summary KPIs for a line and time window.
   * Returns { lineId, windowMin, kpis: { oee, availability, performance, quality, ... } }
   */
  const sinceIso = windowStartIso(windowMin);

  const plannedProductionTimeMin = windowMin;

  const dtItems = list(db.downtime, { limit: 2000, offset: 0 });
  const downtimeMin = sumByLineAndWindow(dtItems, { lineId, sinceIso, field: "minutes" });

  const runtimeMin = Math.max(0, plannedProductionTimeMin - downtimeMin);
  const availability = plannedProductionTimeMin <= 0 ? 0 : clamp01(runtimeMin / plannedProductionTimeMin);

  const prodItems = list(db.production, { limit: 5000, offset: 0 });
  const totalCount = sumProductionQty(prodItems, { lineId, sinceIso });

  const qItems = list(db.quality, { limit: 5000, offset: 0 });
  const rejectCount = countRejects(qItems, { lineId, sinceIso });
  const goodCount = Math.max(0, totalCount - rejectCount);

  const quality = totalCount <= 0 ? 1 : clamp01(goodCount / totalCount);

  const idealRatePerMin = getIdealRatePerMin(lineId);
  const idealCount = idealRatePerMin * runtimeMin;
  const performance = idealCount <= 0 ? 0 : clamp01(totalCount / idealCount);

  const oee = clamp01(availability * performance * quality);

  return {
    lineId,
    windowMin,
    kpis: {
      oee,
      availability,
      performance,
      quality,
      goodCount,
      rejectCount,
      downtimeMin,
      plannedProductionTimeMin,
      runtimeMin,
      totalCount,
      idealRatePerMin,
    },
  };
}

// PUBLIC_INTERFACE
function computeOeeTrends({ lineId = "LINE-1", minutes = 120, stepMin = 5 } = {}) {
  /**
   * Computes trend points over the last N minutes.
   * Returns array of points: [{ts, oee, availability, performance, quality}] (values in 0..100 like frontend mock trends)
   */
  const points = [];
  const now = Date.now();
  for (let m = minutes; m >= 0; m -= stepMin) {
    const end = now - m * 60 * 1000;
    const start = end - stepMin * 60 * 1000;

    // Compute a short window summary
    const summary = computeOeeSummary({ lineId, windowMin: stepMin });

    // Use timestamp at end of bucket (ISO)
    points.push({
      ts: new Date(end).toISOString(),
      oee: Math.round(summary.kpis.oee * 1000) / 10,
      availability: Math.round(summary.kpis.availability * 1000) / 10,
      performance: Math.round(summary.kpis.performance * 1000) / 10,
      quality: Math.round(summary.kpis.quality * 1000) / 10,
      // keep bucket boundaries for debugging (not used by frontend)
      bucketStart: new Date(start).toISOString(),
      bucketEnd: new Date(end).toISOString(),
    });
  }
  return points;
}

module.exports = { computeOeeSummary, computeOeeTrends };
