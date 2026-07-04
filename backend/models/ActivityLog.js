import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["Admin", "Inventory"],
    },
    module: {
      type: String,
      required: true,
    },
    operation: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
  },
  { 
    timestamps: true 
  }
);

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);
export default ActivityLog;