import mongoose from "mongoose";

const suppliesSchema = new mongoose.Schema(
  {
    Code: { type: String, required: true, unique: true, trim: true },
    Category: { type: String, trim: true, default: "General" },
    Segment: { type: String, trim: true },
    ItemDescription: { type: String, required: true, trim: true },
    Dimension: { type: String, trim: true },
    SerialNo: { type: String, trim: true, default: "—" },
    
    // Condition Breakdown Counters (Synchronized to Movements)
    ActualCount: { type: Number, required: true, default: 0 },   
    UsedCount: { type: Number, required: true, default: 0 },     
    DamagedCount: { type: Number, required: true, default: 0 },  
    
    UOM: { type: String, required: true, trim: true },
    Condition: { type: String, default: "Good", trim: true },
    Brand: { type: String, trim: true },
    Color: { type: String, trim: true },
    AccountTo: { type: String, trim: true },
    AcquisitionCost: { type: Number, default: 0, min: 0 },
    isArchived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

suppliesSchema.index({ createdAt: -1 });

const Supplies = mongoose.model("Supplies", suppliesSchema);
export default Supplies;