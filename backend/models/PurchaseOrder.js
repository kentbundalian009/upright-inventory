import mongoose from "mongoose";

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNo: {
      type: String,
      required: true,
      unique: true, // Iniiwasan ang duplicate PO
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
      default: "N/A"
    },
    deliveryDate: {
      type: Date,
      required: true,
    },
    preparedBy: {
      type: String,
      required: true,
      default: "System User",
    },
    items: [
      {
        materialId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "RawMaterial",
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
    timestamps: true,
  }
);

const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);
export default PurchaseOrder;