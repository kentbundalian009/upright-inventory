import mongoose from "mongoose";

const deliveryReceiptSchema = new mongoose.Schema(
  {
    drNo: {
      type: String,
      required: true,
      unique: true, // Para maiwasan ang duplicate DR entries
      trim: true,
    },
    supplier: {
      type: String,
      required: true,
      trim: true,
    },
    originAddress: {
      type: String,
      trim: true,
    },
    deliveryDate: {
      type: Date,
      required: true,
    },
    // Array ng mga items na kasama sa DR na ito
    items: [
      {
        materialId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "RawMaterial", // Tumuturo sa iyong RawMaterial model
          required: true,
        },
        qty: {
          type: Number,
          required: true,
          min: 1,
        },
        actualCountReceived: {
          type: Number,
          required: true,
        },
        remarks: {
          type: String,
          trim: true,
          default: "",
        },
      },
    ],
  },
  {
    timestamps: true, // Awtomatikong nagbibigay ng createdAt at updatedAt
  }
);

const DeliveryReceipt = mongoose.model("DeliveryReceipt", deliveryReceiptSchema);
export default DeliveryReceipt;