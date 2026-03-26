const DowntimeEvent = require("../models/DowntimeEvent");
const Machine = require("../models/Machine");
const Prediction = require("../models/Prediction");

/**
 * Simple rule-based predictive maintenance scoring.
 * Designed to be deterministic, explainable, and production-safe (no heavy ML deps).
 */

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function windowStart(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function daysSince(d) {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  return ms < 0 ? 0 : ms / (1000 * 60 * 60 * 24);
}

function riskFromProbability(p) {
  if (p >= 0.7) return "High";
  if (p >= 0.35) return "Medium";
  return "Low";
}

async function sumDowntimeMinutes({ lineId, since }) {
  const agg = await DowntimeEvent.aggregate([
    { $match: { lineId, ts: { $gte: since } } },
    { $group: { _id: null, minutes: { $sum: "$minutes" } } },
  ]);
  return Number(agg?.[0]?.minutes || 0);
}

async function countDowntimeEvents({ lineId, since }) {
  return DowntimeEvent.countDocuments({ lineId, ts: { $gte: since } });
}

// PUBLIC_INTERFACE
async function getOrCreateMachine(machineId) {
  /**
   * Returns Machine document for a machineId.
   * If missing, creates a minimal placeholder to allow predictive feature to function.
   */
  const existing = await Machine.findOne({ machineId });
  if (existing) return existing;

  return Machine.create({
    machineId,
    name: `Machine ${machineId}`,
    usageHours: 0,
    lastMaintenanceDate: null,
  });
}

// PUBLIC_INTERFACE
async function computeAndStorePrediction({ machineId, lineId, windowMin = 14 * 24 * 60 } = {}) {
  /**
   * Computes a prediction for the given machineId and stores it in MongoDB.
   * Inputs:
   * - machineId (required)
   * - lineId (optional): used to correlate downtime events (current data model ties downtime to lineId)
   * - windowMin: lookback for downtime analysis
   *
   * Returns:
   * { machineId, failureProbability, riskLevel, timestamp, features }
   */
  if (!machineId) throw new Error("machineId is required");

  const machine = await getOrCreateMachine(machineId);

  const since = windowStart(windowMin);

  // NOTE: current schema associates downtime with lineId, not machineId.
  // We accept an optional lineId to approximate machine-level downtime patterns.
  const effectiveLineId = lineId || "LINE-1";

  const [dtMinutes14d, dtCount14d] = await Promise.all([
    sumDowntimeMinutes({ lineId: effectiveLineId, since }),
    countDowntimeEvents({ lineId: effectiveLineId, since }),
  ]);

  const usageHours = Number(machine.usageHours || 0);
  const maintDays = daysSince(machine.lastMaintenanceDate);

  // Rule-based scoring:
  // - More downtime minutes/events increases probability
  // - Higher usage increases probability
  // - Longer since maintenance increases probability
  const dtMinutesScore = clamp01(dtMinutes14d / 180); // 180 min+ in window => maxed
  const dtCountScore = clamp01(dtCount14d / 18); // 18+ events in window => maxed
  const usageScore = clamp01((usageHours - 500) / 2000); // ~500h baseline then ramps to 2500h
  const maintScore =
    maintDays === null ? 0.25 : clamp01((maintDays - 14) / 90); // after 2w ramps up to ~3mo

  // Weighted blend (kept explainable)
  const probability = clamp01(
    0.4 * dtMinutesScore + 0.2 * dtCountScore + 0.25 * usageScore + 0.15 * maintScore
  );

  const riskLevel = riskFromProbability(probability);
  const timestamp = new Date();

  const predDoc = await Prediction.create({
    machineId,
    failureProbability: probability,
    riskLevel,
    timestamp,
  });

  return {
    machineId,
    failureProbability: probability,
    riskLevel,
    timestamp: predDoc.timestamp,
    features: {
      lineId: effectiveLineId,
      windowMin,
      downtimeMinutes: dtMinutes14d,
      downtimeCount: dtCount14d,
      usageHours,
      daysSinceMaintenance: maintDays,
      scores: {
        dtMinutesScore,
        dtCountScore,
        usageScore,
        maintScore,
      },
    },
  };
}

// PUBLIC_INTERFACE
async function getLatestPrediction({ machineId } = {}) {
  /**
   * Returns latest stored prediction for machineId or null.
   */
  if (!machineId) throw new Error("machineId is required");
  const doc = await Prediction.findOne({ machineId }).sort({ timestamp: -1 }).lean();
  if (!doc) return null;
  return {
    machineId: doc.machineId,
    failureProbability: doc.failureProbability,
    riskLevel: doc.riskLevel,
    timestamp: new Date(doc.timestamp).toISOString(),
  };
}

module.exports = {
  computeAndStorePrediction,
  getLatestPrediction,
  getOrCreateMachine,
};

