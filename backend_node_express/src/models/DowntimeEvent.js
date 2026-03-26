const mongoose = require("mongoose");

const DowntimeEventSchema = new mongoose.Schema(
  {
    ts: { type: Date, required: true, index: true },
    lineId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    reason: { type: String, required: true },
    minutes: { type: Number, min: 0, required: true },
    shift: { type: String },
  },
  { timestamps: true }
);

DowntimeEventSchema.index({ lineId: 1, ts: -1 });

module.exports = mongoose.model("DowntimeEvent", DowntimeEventSchema);
