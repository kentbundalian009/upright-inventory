import express from 'express';
import PaletteSup from '../../models/PaletteSup.js';

const router = express.Router();

let cachedPaletteSup = null;
let paletteSupExpiresAt = 0;

router.get('/palette-sup', async (req, res) => {
    try {
        const now = Date.now();
        if (cachedPaletteSup && paletteSupExpiresAt > now) {
            return res.json(cachedPaletteSup);
        }

        let config = await PaletteSup.findOne({ key: 'supplies_palette' }).lean();
        const result = {
            categoryColors: config?.categoryColors || {},
            segmentColors: config?.segmentColors || {}
        };

        cachedPaletteSup = result;
        paletteSupExpiresAt = now + 60 * 1000;

        res.json(result);
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
        ).lean();

        cachedPaletteSup = {
            categoryColors: savedConfig.categoryColors || {},
            segmentColors: savedConfig.segmentColors || {}
        };
        paletteSupExpiresAt = Date.now() + 60 * 1000;

        res.json({ message: 'Supplies palette saved successfully!', data: savedConfig });
    } catch (error) {
        console.error('Error saving supplies palette:', error);
        res.status(500).json({ message: 'Server Error sa pag-save ng palette.' });
    }
});

let cachedPaletteCon = null;
let paletteConExpiresAt = 0;

router.get('/palette-con', async (req, res) => {
    try {
        const now = Date.now();
        if (cachedPaletteCon && paletteConExpiresAt > now) {
            return res.json(cachedPaletteCon);
        }

        let config = await PaletteSup.findOne({ key: 'consumables_palette' }).lean();
        const result = {
            categoryColors: config?.categoryColors || {},
            segmentColors: config?.segmentColors || {}
        };

        cachedPaletteCon = result;
        paletteConExpiresAt = now + 60 * 1000;

        res.json(result);
    } catch (error) {
        console.error('Error fetching consumables palette:', error);
        res.status(500).json({ message: 'Server Error sa pagkuha ng palette.' });
    }
});

router.post('/palette-con', async (req, res) => {
    const { categoryColors, segmentColors } = req.body;
    try {
        const savedConfig = await PaletteSup.findOneAndUpdate(
            { key: 'consumables_palette' },
            { categoryColors: categoryColors || {}, segmentColors: segmentColors || {} },
            { new: true, upsert: true }
        ).lean();

        cachedPaletteCon = {
            categoryColors: savedConfig.categoryColors || {},
            segmentColors: savedConfig.segmentColors || {}
        };
        paletteConExpiresAt = Date.now() + 60 * 1000;

        res.json({ message: 'Consumables palette saved successfully!', data: savedConfig });
    } catch (error) {
        console.error('Error saving consumables palette:', error);
        res.status(500).json({ message: 'Server Error sa pag-save ng palette.' });
    }
});

export default router;
