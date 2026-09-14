import mongoose from "mongoose";

const suppliesMovementSchema = new mongoose.Schema(
  {
    slipNo: { type: String, required: true, unique: true, trim: true },
    transactionType: { 
      type: String, 
      required: true, 
      // 🎯 Idagdag ang "Repair" dito sa enum list:
      enum: ["Borrow", "Return", "Restock", "Reserved", "Out", "Scrap", "Return to Vendor", "Repair"], 
      trim: true 
    },
    transactionDate: { type: Date, required: true, default: Date.now },
    transactionTime: { type: String, default: "", trim: true },
    
    partyName: { type: String, default: "N/A", trim: true }, 
    purpose: { type: String, default: "Production", trim: true },
    originAddress: { type: String, default: "N/A", trim: true },
    preparedBy: { type: String, required: true, default: "System User" },
    
    isReturned: { type: Boolean, default: false },
    referenceSlipNo: { type: String, default: "", trim: true },
    
    items: [
      {
        supplyId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplies", required: true },
        qty: { type: Number, required: true, min: 0 }, 
        goodConditionQty: { type: Number, required: true, default: 0 }, 
        damagedQty: { type: Number, required: true, default: 0 }, 
        remarks: { type: String, trim: true, default: "" }
      }
    ]
  },
  { timestamps: true }
);

const SuppliesMovement = mongoose.model("SuppliesMovement", suppliesMovementSchema);
export default SuppliesMovement;