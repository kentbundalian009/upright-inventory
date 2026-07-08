import mongoose from 'mongoose';

const PaletteSchema = new mongoose.Schema({
    key: { 
        type: String, 
        default: 'global_palette', 
        unique: true 
    },
    // Ginamit ang Schema.Types.Mixed para tanggapin ang raw JSON na pinapadala ng React
    categoryColors: { 
        type: mongoose.Schema.Types.Mixed, 
        default: {} 
    },
    segmentColors: { 
        type: mongoose.Schema.Types.Mixed, 
        default: {} 
    }
}, { timestamps: true });

export default mongoose.model('Palette', PaletteSchema);