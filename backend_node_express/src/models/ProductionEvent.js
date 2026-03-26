const mongoose = require("mongoose");

const ProductionEventSchema = new mongoose.Schema(
  {
    ts: { type: Date, required: true, index: true },
    lineId: { type: String, required: true, index: true },
    sku: { type: String, required: true },
    qty: { type: Number, min: 0, required: true },
    shift: { type: String },
    operator: { type: String },
  },
  { timestamps: true }
);

ProductionEventSchema.index({ lineId: 1, ts: -1 });

module.exports = mongoose.model("ProductionEvent", ProductionEventSchema);
