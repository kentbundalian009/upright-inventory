import mongoose from "mongoose";

const linkClickLogSchema = new mongoose.Schema(
  {
    openedBy: {
      type: String,
      required: true,
      trim: true,
      default: "Anonymous Viewer",
    },
    sharedBy: {
      type: String,
      required: true,
      trim: true,
    },
    page: {
      type: String,
      required: true,
      default: "Rackings (Records)",
    },
    url: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const LinkClickLog = mongoose.model("LinkClickLog", linkClickLogSchema);
export default LinkClickLog;
