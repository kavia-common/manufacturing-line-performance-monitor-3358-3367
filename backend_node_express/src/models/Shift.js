const mongoose = require("mongoose");

const ShiftSchema = new mongoose.Schema(
  {
    shiftId: { type: String, required: true, unique: true, index: true }, // e.g., SHIFT-A
    code: { type: String, enum: ["A", "B", "C"], required: true },
    name: { type: String, required: true },
    startHour: { type: Number, min: 0, max: 23, required: true },
    durationMin: { type: Number, min: 1, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shift", ShiftSchema);
