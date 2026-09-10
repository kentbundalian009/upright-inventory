import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Client name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["Supplier", "Customer", "Logistics"],
      required: [true, "Client type (Supplier, Customer, or Logistics) is required"],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },
    contactNumber: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
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

clientSchema.index({ type: 1, isArchived: 1 });
clientSchema.index({ name: 1, type: 1 });

const Client = mongoose.model("Client", clientSchema);
export default Client;
