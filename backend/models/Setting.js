import mongoose from "mongoose";

const SettingSchema = new mongoose.Schema(
  {
    categoryType: {
      type: String,
      required: true,
      unique: true,
      // 🔥 SIGURADUHING KASAMA ANG 'products' AT 'supplies' DITO!
      enum: ["raw_materials", "products", "supplies"], 
    },
    critical: {
      type: Number,
      required: true,
      default: 5,
    },
    reorder: {
      type: Number,
      required: true,
      default: 15,
    },
    overstock: {
      type: Number,
      required: true,
      default: 50,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Setting", SettingSchema);