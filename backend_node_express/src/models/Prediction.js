const mongoose = require("mongoose");

const PredictionSchema = new mongoose.Schema(
  {
    machineId: { type: String, required: true, index: true },
    failureProbability: { type: Number, min: 0, max: 1, required: true },
    riskLevel: { type: String, enum: ["Low", "Medium", "High"], required: true },
    timestamp: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

PredictionSchema.index({ machineId: 1, timestamp: -1 });

module.exports = mongoose.model("Prediction", PredictionSchema);
