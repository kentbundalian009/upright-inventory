import mongoose from "mongoose";

const consumableTransactionItemSchema = new mongoose.Schema({
  consumableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Consumable",
    required: true
  },
  Code: { type: String, trim: true },
  ItemDescription: { type: String, trim: true },
  Segment: { type: String, trim: true },
  Dimension: { type: String, trim: true },
  Category: { type: String, trim: true },
  Brand: { type: String, trim: true },
  SerialNo: { type: String, trim: true },
  UOM: { type: String, trim: true },
  qty: { type: Number, required: true, min: 1 },
  remarks: { type: String, trim: true, default: "" }
});

const consumableTransactionSchema = new mongoose.Schema(
  {
    transactionNo: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    transactionType: {
      type: String,
      enum: ["IN", "OUT"],
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: String,
      required: true,
      trim: true
    },
    time: {
      type: String,
      required: true,
      trim: true
    },
    items: [consumableTransactionItemSchema]
  },
  { timestamps: true }
);

consumableTransactionSchema.index({ createdAt: -1 });

const ConsumableTransaction = mongoose.model(
  "ConsumableTransaction",
  consumableTransactionSchema
);
export default ConsumableTransaction;
