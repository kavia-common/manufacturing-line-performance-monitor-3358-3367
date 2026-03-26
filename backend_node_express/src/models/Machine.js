const mongoose = require("mongoose");

const MachineSchema = new mongoose.Schema(
  {
    machineId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    usageHours: { type: Number, min: 0, default: 0 },
    lastMaintenanceDate: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Machine", MachineSchema);
