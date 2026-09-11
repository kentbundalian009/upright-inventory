import mongoose from "mongoose";

const rawMaterialSchema = new mongoose.Schema(
  {
    Code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    ImageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    Category: {
      type: String,
      default: "",
      trim: true,
    },
    Segment: {
      type: String,
      trim: true,
      default: "N/A"
    },
    ItemDescription: {
      type: String,
      required: true,
      trim: true,
    },
    Dimension: {
      type: String,
      trim: true,
      default: "N/A"
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
    Condition: {
      type: String,
      default: "Good",
      trim: true,
    },
    AccountTo: {
      type: String,
      trim: true,
      default: "N/A"
    },
    AcquisitionCost: {
      type: Number,
      default: 0,
      min: 0
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

rawMaterialSchema.index({ createdAt: -1 });

const RawMaterial = mongoose.model("RawMaterial", rawMaterialSchema);
export default RawMaterial;