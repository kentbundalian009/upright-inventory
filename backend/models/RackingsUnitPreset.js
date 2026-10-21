import mongoose from 'mongoose';

const RackingsUnitPresetSchema = new mongoose.Schema({
    key: { 
        type: String, 
        default: 'rackings_unit_records', 
        unique: true 
    },
    records: { 
        type: mongoose.Schema.Types.Mixed, 
        default: [] 
    }
}, { timestamps: true });

export default mongoose.model('RackingsUnitPreset', RackingsUnitPresetSchema);
