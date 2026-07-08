import mongoose from 'mongoose';

const PaletteSupSchema = new mongoose.Schema({
    key: { 
        type: String, 
        default: 'supplies_palette', 
        unique: true 
    },
    categoryColors: { 
        type: mongoose.Schema.Types.Mixed, 
        default: {} 
    },
    segmentColors: { 
        type: mongoose.Schema.Types.Mixed, 
        default: {} 
    }
}, { timestamps: true });

export default mongoose.model('PaletteSup', PaletteSupSchema);