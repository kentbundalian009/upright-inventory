// models/Conversion.js
import mongoose from 'mongoose';

const ConversionSchema = new mongoose.Schema({
  conversionNo: { type: String, required: true, unique: true },
  productionType: { type: String, required: true },
  dateProcessed: { type: Date, required: true },
  remarks: { type: String },
  preparedBy: { type: String },
  inputs: [{
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
    qtyUsed: { type: Number, required: true }
  }],
  outputs: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'outputs.itemType' },
    itemType: { type: String, required: true, enum: ['Product', 'RawMaterial'] }, // Dynamic target mapping
    qtyProduced: { type: Number, required: true }
  }]
}, { timestamps: true });

export default mongoose.model('Conversion', ConversionSchema);