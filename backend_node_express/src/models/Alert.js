const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema(
  {
    ts: { type: Date, required: true, index: true },
    ruleId: { type: String },
    severity: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    lineId: { type: String, default: null, index: true },
    message: { type: String, required: true },
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AlertSchema.index({ ts: -1 });

module.exports = mongoose.model("Alert", AlertSchema);
