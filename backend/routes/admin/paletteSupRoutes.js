import express from 'express';
import PaletteSup from '../../models/PaletteSup.js';

const router = express.Router();

router.get('/palette-sup', async (req, res) => {
    try {
        let config = await PaletteSup.findOne({ key: 'supplies_palette' });
        if (!config) return res.json({ categoryColors: {}, segmentColors: {} });
        
        res.json({
            categoryColors: config.categoryColors || {},
            segmentColors: config.segmentColors || {}
        });
    } catch (error) {
        console.error('Error fetching supplies palette:', error);
        res.status(500).json({ message: 'Server Error sa pagkuha ng palette.' });
    }
});

router.post('/palette-sup', async (req, res) => {
    const { categoryColors, segmentColors } = req.body;
    try {
        const savedConfig = await PaletteSup.findOneAndUpdate(
            { key: 'supplies_palette' },
            { categoryColors: categoryColors || {}, segmentColors: segmentColors || {} },
            { new: true, upsert: true }
        );
        res.json({ message: 'Supplies palette saved successfully!', data: savedConfig });
    } catch (error) {
        console.error('Error saving supplies palette:', error);
        res.status(500).json({ message: 'Server Error sa pag-save ng palette.' });
    }
});

export default router;
