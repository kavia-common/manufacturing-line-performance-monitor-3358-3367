const Line = require("../models/Line");
const DowntimeEvent = require("../models/DowntimeEvent");
const ProductionEvent = require("../models/ProductionEvent");
const QualityEvent = require("../models/QualityEvent");

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function windowStart(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function getIdealRatePerMin(lineId) {
  const line = await Line.findOne({ lineId }).lean();
  const rate = line?.idealRatePerMin;
  return Number.isFinite(Number(rate)) ? Number(rate) : 30;
}

// PUBLIC_INTERFACE
async function computeOeeSummary({ lineId = "LINE-1", windowMin = 480 } = {}) {
  /**
   * Computes OEE summary KPIs for a line and time window.
   * Returns { lineId, windowMin, kpis: { oee, availability, performance, quality, ... } }
   */
  const since = windowStart(windowMin);
  const plannedProductionTimeMin = windowMin;

  const downtimeAgg = await DowntimeEvent.aggregate([
    { $match: { lineId, ts: { $gte: since } } },
    { $group: { _id: null, minutes: { $sum: "$minutes" } } },
  ]);
  const downtimeMin = Number(downtimeAgg?.[0]?.minutes || 0);

  const runtimeMin = Math.max(0, plannedProductionTimeMin - downtimeMin);
  const availability =
    plannedProductionTimeMin <= 0 ? 0 : clamp01(runtimeMin / plannedProductionTimeMin);

  const prodAgg = await ProductionEvent.aggregate([
    { $match: { lineId, ts: { $gte: since } } },
    { $group: { _id: null, qty: { $sum: "$qty" } } },
  ]);
  const totalCount = Number(prodAgg?.[0]?.qty || 0);

  const rejectAgg = await QualityEvent.aggregate([
    { $match: { lineId, ts: { $gte: since } } },
    { $group: { _id: null, rejectQty: { $sum: "$rejectQty" } } },
  ]);
  const rejectCount = Number(rejectAgg?.[0]?.rejectQty || 0);
  const goodCount = Math.max(0, totalCount - rejectCount);

  const quality = totalCount <= 0 ? 1 : clamp01(goodCount / totalCount);

  const idealRatePerMin = await getIdealRatePerMin(lineId);
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
async function computeOeeTrends({ lineId = "LINE-1", minutes = 120, stepMin = 5 } = {}) {
  /**
   * Computes trend points over the last N minutes.
   * Returns array of points: [{ts, oee, availability, performance, quality}] (values in 0..100)
   */
  const points = [];
  const now = Date.now();

  // Note: for now we compute each bucket via computeOeeSummary(stepMin).
  // This is simple and correct, though not the most efficient for large datasets.
  for (let m = minutes; m >= 0; m -= stepMin) {
    const end = now - m * 60 * 1000;
    const start = end - stepMin * 60 * 1000;

    const summary = await computeOeeSummary({ lineId, windowMin: stepMin });

    points.push({
      ts: new Date(end).toISOString(),
      oee: Math.round(summary.kpis.oee * 1000) / 10,
      availability: Math.round(summary.kpis.availability * 1000) / 10,
      performance: Math.round(summary.kpis.performance * 1000) / 10,
      quality: Math.round(summary.kpis.quality * 1000) / 10,
      bucketStart: new Date(start).toISOString(),
      bucketEnd: new Date(end).toISOString(),
    });
  }

  return points;
}

module.exports = { computeOeeSummary, computeOeeTrends };
