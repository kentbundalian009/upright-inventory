import mongoose from "mongoose";

const SystemSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "system_maintenance"
    },
    isMaintenanceActive: {
      type: Boolean,
      default: false
    },
    maintenanceMessage: {
      type: String,
      default: "System is currently undergoing scheduled maintenance or database optimization. Access for standard accounts is temporarily suspended. Please contact your System Administrator."
    },
    scheduledEndTime: {
      type: Date,
      default: null
    },
    updatedBy: {
      type: String,
      default: "System Admin"
    }
  },
  { timestamps: true }
);

export default mongoose.model("SystemSetting", SystemSettingSchema);
