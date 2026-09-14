import mongoose from "mongoose";

const consumableSchema = new mongoose.Schema(
  {
    Code: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    ItemDescription: {
      type: String,
      required: true,
      trim: true
    },
    Segment: {
      type: String,
      trim: true,
      default: "Consumables"
    },
    Dimension: {
      type: String,
      trim: true,
      default: "—"
    },
    Category: {
      type: String,
      trim: true,
      default: "Consumables"
    },
    Brand: {
      type: String,
      trim: true,
      default: "—"
    },
    SerialNo: {
      type: String,
      trim: true,
      default: "—"
    },
    ActualCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    Damaged: {
      type: Number,
      default: 0,
      min: 0
    },
    UOM: {
      type: String,
      required: true,
      trim: true,
      default: "pcs"
    },
    isArchived: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

consumableSchema.index({ createdAt: -1 });

const Consumable = mongoose.model("Consumable", consumableSchema);
export default Consumable;
