import express from 'express';
import RackingsUnitPreset from '../../models/RackingsUnitPreset.js';

const router = express.Router();

// GET /api/rackings-unit - Retrieve synced unit configurations
router.get('/', async (req, res) => {
    try {
        const preset = await RackingsUnitPreset.findOne({ key: 'rackings_unit_records' }).lean();
        return res.status(200).json({
            success: true,
            records: preset?.records || []
        });
    } catch (error) {
        console.error('Error fetching rackings unit records:', error);
        return res.status(500).json({ success: false, message: 'Server error retrieving rackings unit records', error: error.message });
    }
});

// POST /api/rackings-unit - Save or update unit configurations
router.post('/', async (req, res) => {
    try {
        const { records } = req.body;
        if (!Array.isArray(records)) {
            return res.status(400).json({ success: false, message: 'Invalid payload: records must be an array.' });
        }

        const saved = await RackingsUnitPreset.findOneAndUpdate(
            { key: 'rackings_unit_records' },
            { records },
            { new: true, upsert: true }
        ).lean();

        return res.status(200).json({
            success: true,
            message: 'Rackings unit configurations synchronized successfully!',
            records: saved.records
        });
    } catch (error) {
        console.error('Error saving rackings unit records:', error);
        return res.status(500).json({ success: false, message: 'Server error saving rackings unit records', error: error.message });
    }
});

export default router;
