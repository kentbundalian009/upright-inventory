import mongoose from "mongoose";

const packingListSchema = new mongoose.Schema(
  {
    plNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    transactionType: {
      type: String,
      required: true,
      enum: ["Outbound", "Reserve"],
      default: "Outbound"
    },
    referencePlNo: {
      type: String,
      trim: true,
      default: ""
    },
    customer: {
      type: String,
      required: true,
      trim: true,
    },
    carrier: {
      type: String,
      trim: true,
      default: ""
    },
    destinationAddress: {
      type: String,
      trim: true,
      default: ""
    },
    shipmentDate: {
      type: Date,
      required: true,
    },
    preparedBy: {
      type: String,
      required: true,
      trim: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product", // Saktong tugma sa Product model mo
          required: true,
        },
        qtyRequested: {
          type: Number,
          required: true,
          min: 1,
        },
        actualCountShipped: {
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

const PackingList = mongoose.model("PackingList", packingListSchema);
export default PackingList;