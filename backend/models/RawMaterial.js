import mongoose from "mongoose";

const rawMaterialSchema = new mongoose.Schema(
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
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

const RawMaterial = mongoose.model("RawMaterial", rawMaterialSchema);
export default RawMaterial;