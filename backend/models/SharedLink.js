import mongoose from "mongoose";

const sharedLinkSchema = new mongoose.Schema(
  {
    viewerName: {
      type: String,
      required: true,
      trim: true,
    },
    sharedBy: {
      type: String,
      required: true,
      trim: true,
    },
    page: {
      type: String,
      default: "Rackings (Records)",
    },
    linkUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Terminated", "Revoked"],
      default: "Active",
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    lastOpenedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const SharedLink = mongoose.model("SharedLink", sharedLinkSchema);
export default SharedLink;
