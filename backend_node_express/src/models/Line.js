const mongoose = require("mongoose");

const LineSchema = new mongoose.Schema(
  {
    lineId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    idealRatePerMin: { type: Number, default: 30 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Line", LineSchema);
