import mongoose from "mongoose";

const assetsSchema = new mongoose.Schema(
  {
    Code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    Category: {
      type: String,
      required: true,
      trim: true,
    },
    Segment: {
      type: String,
      trim: true,
    },
    ItemDescription: {
      type: String,
      required: true,
      trim: true,
    },
    Brand: {
      type: String,
      trim: true,
    },
    ActualCount: {
      type: Number,
      required: true,
      default: 0,
    },
    UOM: {
      type: String,
      required: true,
      trim: true,
    },
    ConditionBreakdown: {
      Good: { type: Number, default: 0, min: 0 },
      Used: { type: Number, default: 0, min: 0 },
      Damaged: { type: Number, default: 0, min: 0 },
    },
    AcquisitionDate: {
      type: Date,
    },
    AccountTo: {
      type: String,
      trim: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Assets = mongoose.model("Assets", assetsSchema);
export default Assets;