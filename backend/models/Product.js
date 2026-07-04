import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
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
    Dimension: {
      type: String,
      trim: true,
    },
    ActualCount: {
      type: Number,
      required: false,
      default: 0,
    },
    UOM: {
      type: String,
      required: true, 
      trim: true,
    },
    Condition: {
      type: String,
      default: "Good", // Automatic "Good" kapag bagong gawa ang produkto
      trim: true,
    },
    AccountTo: {
      type: String,
      trim: true, 
    },
    isArchived: {
      type: Boolean,
      default: false, // Default ay active (hindi archived)
    },
  },
  {
    timestamps: true, 
  }
);

const Product = mongoose.model("Product", productSchema);
export default Product;