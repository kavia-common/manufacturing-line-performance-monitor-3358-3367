const mongoose = require("mongoose");

const AlertRuleSchema = new mongoose.Schema(
  {
    ruleId: { type: String, required: true, unique: true, index: true }, // e.g., RULE-OEE-LOW
    enabled: { type: Boolean, default: true },
    name: { type: String, required: true },
    severity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    type: { type: String, required: true }, // e.g., oee.threshold
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    cooldownMin: { type: Number, min: 0, default: 10 },
    lastFiredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AlertRule", AlertRuleSchema);
