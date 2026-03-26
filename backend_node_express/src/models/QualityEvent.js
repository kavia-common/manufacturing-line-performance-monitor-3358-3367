const mongoose = require("mongoose");

const QualityEventSchema = new mongoose.Schema(
  {
    ts: { type: Date, required: true, index: true },
    lineId: { type: String, required: true, index: true },
    defect: { type: String, required: true },
    rejectQty: { type: Number, min: 0, required: true },
    rootCause: { type: String },
    shift: { type: String },
  },
  { timestamps: true }
);

QualityEventSchema.index({ lineId: 1, ts: -1 });

module.exports = mongoose.model("QualityEvent", QualityEventSchema);
