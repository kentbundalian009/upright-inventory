import express from 'express';
import Palette from '../../models/Palette.js';

const router = express.Router();

router.get('/palette', async (req, res) => {
    try {
        let config = await Palette.findOne({ key: 'global_palette' });
        
        if (!config) {
            return res.json({ categoryColors: {}, segmentColors: {} });
        }
        
        res.json({
            categoryColors: config.categoryColors || {},
            segmentColors: config.segmentColors || {}
        });
    } catch (error) {
        console.error('Error fetching palette:', error);
        res.status(500).json({ message: 'Server Error sa pagkuha ng palette.' });
    }
});

router.post('/palette', async (req, res) => {
    const { categoryColors, segmentColors } = req.body;

    try {
        const savedConfig = await Palette.findOneAndUpdate(
            { key: 'global_palette' },
            { 
                categoryColors: categoryColors || {}, 
                segmentColors: segmentColors || {} 
            },
            { new: true, upsert: true }
        );

        res.json({
            message: 'Global palette configuration synchronized successfully!',
            data: savedConfig
        });
    } catch (error) {
        console.error('Error saving palette:', error);
        res.status(500).json({ message: 'Server Error sa pag-save ng palette.' });
    }
});

export default router;
