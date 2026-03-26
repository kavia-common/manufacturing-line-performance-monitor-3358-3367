import { subMinutes, subHours } from "date-fns";

const clamp01 = (n) => Math.max(0, Math.min(1, n));

function rand(seed) {
  // deterministic-ish LCG based on seed string
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = (h * 48271) % 0x7fffffff;
    return h / 0x7fffffff;
  };
}

// PUBLIC_INTERFACE
export function getMockOeeSummary({ lineId = "LINE-1" } = {}) {
  /** Returns mock OEE KPI summary for a line. */
  const r = rand(lineId);
  const availability = clamp01(0.82 + (r() - 0.5) * 0.08);
  const performance = clamp01(0.88 + (r() - 0.5) * 0.08);
  const quality = clamp01(0.96 + (r() - 0.5) * 0.03);
  const oee = clamp01(availability * performance * quality);

  const plannedProductionTimeMin = 480;
  const downtimeMin = Math.round((1 - availability) * plannedProductionTimeMin);
  const goodCount = Math.round(12000 * performance * quality);
  const rejectCount = Math.round(goodCount * (1 - quality));

  return {
    lineId,
    window: "Current shift",
    kpis: {
      oee,
      availability,
      performance,
      quality,
      goodCount,
      rejectCount,
      downtimeMin,
      plannedProductionTimeMin,
    },
  };
}

// PUBLIC_INTERFACE
export function getMockTrends({ minutes = 60, lineId = "LINE-1" } = {}) {
  /** Returns mock OEE trend points for charts. */
  const r = rand(`${lineId}:${minutes}`);
  const now = new Date();
  const points = [];
  for (let i = minutes; i >= 0; i -= 5) {
    const t = subMinutes(now, i);
    const a = clamp01(0.83 + (r() - 0.5) * 0.1);
    const p = clamp01(0.88 + (r() - 0.5) * 0.1);
    const q = clamp01(0.96 + (r() - 0.5) * 0.04);
    const o = clamp01(a * p * q);
    points.push({
      ts: t.toISOString(),
      oee: Math.round(o * 1000) / 10,
      availability: Math.round(a * 1000) / 10,
      performance: Math.round(p * 1000) / 10,
      quality: Math.round(q * 1000) / 10,
    });
  }
  return points;
}

// PUBLIC_INTERFACE
export function getMockEvents({ type = "downtime", limit = 20 } = {}) {
  /** Returns mock list data for production/downtime/quality events tables. */
  const now = new Date();
  const rows = [];
  for (let i = 0; i < limit; i++) {
    const start = subHours(now, i + 1);
    if (type === "production") {
      rows.push({
        id: `P-${i + 1}`,
        ts: start.toISOString(),
        lineId: "LINE-1",
        sku: `SKU-${(i % 6) + 100}`,
        qty: 1200 + i * 17,
        shift: i % 2 === 0 ? "A" : "B",
        operator: i % 3 === 0 ? "Alex" : i % 3 === 1 ? "Sam" : "Jordan",
      });
    } else if (type === "quality") {
      rows.push({
        id: `Q-${i + 1}`,
        ts: start.toISOString(),
        lineId: "LINE-1",
        defect: i % 3 === 0 ? "Scratch" : i % 3 === 1 ? "Mislabel" : "Seal",
        rejectQty: 3 + (i % 6),
        rootCause: i % 2 === 0 ? "Material" : "Setup",
        shift: i % 2 === 0 ? "A" : "B",
      });
    } else {
      rows.push({
        id: `D-${i + 1}`,
        ts: start.toISOString(),
        lineId: "LINE-1",
        category: i % 3 === 0 ? "Mechanical" : i % 3 === 1 ? "Electrical" : "Material",
        reason: i % 3 === 0 ? "Jam" : i % 3 === 1 ? "Sensor fault" : "No feed",
        minutes: 4 + (i % 10),
        shift: i % 2 === 0 ? "A" : "B",
      });
    }
  }
  return rows;
}

// PUBLIC_INTERFACE
export function getMockAlerts({ limit = 12 } = {}) {
  /** Returns mock alert list for alerts UI. */
  const now = new Date();
  return Array.from({ length: limit }).map((_, i) => ({
    id: `AL-${i + 1}`,
    ts: subMinutes(now, i * 9).toISOString(),
    severity: i % 4 === 0 ? "critical" : i % 4 === 1 ? "high" : i % 4 === 2 ? "medium" : "low",
    title:
      i % 3 === 0
        ? "OEE below threshold"
        : i % 3 === 1
          ? "Downtime spike detected"
          : "Quality rejects increasing",
    description:
      i % 3 === 0
        ? "OEE dropped below 75% over the last 15 minutes."
        : i % 3 === 1
          ? "Unplanned downtime exceeded expected baseline."
          : "Reject rate trending above target.",
    lineId: "LINE-1",
    acknowledged: i % 5 === 0,
  }));
}
