import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';

function ThresholdModal({ isOpen, onClose, categoryType, onSaveSuccess }) {
    const [thresholds, setThresholds] = useState({
        critical: 5,
        reorder: 15,
        overstock: 50,
    });
    const [saving, setSaving] = useState(false);

    const formatTitle = () => {
        if (categoryType === 'raw_materials') return 'Raw Materials';
        if (categoryType === 'products') return 'Products';
        if (categoryType === 'supplies') return 'Supplies';
        return 'Inventory';
    };

    useEffect(() => {
        const fetchThresholds = async () => {
            if (!isOpen || !categoryType) return;
            try {
                // Ginagamit ang orihinal mong endpoint pattern
                const response = await axios.get(`/api/settings/thresholds/${categoryType}`);
                if (response.data) {
                    setThresholds({
                        critical: response.data.critical ?? 5,
                        reorder: response.data.reorder ?? 15,
                        overstock: response.data.overstock ?? 50
                    });
                }
            } catch (err) {
                console.error(`Error fetching ${categoryType} thresholds:`, err);
            }
        };

        fetchThresholds();
    }, [isOpen, categoryType]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Ginagamit ang orihinal mong endpoint pattern
            await axios.put(`/api/settings/thresholds/${categoryType}`, thresholds);
            
            // Ligtas na tinanggal ang native alert dito 
            if (onSaveSuccess) onSaveSuccess(); 
            onClose(); 
        } catch (err) {
            // Makikita sa Console (F12) kung ano ang eksaktong galit ng backend mo nang hindi humaharang sa screen
            console.error("Backend Error Details:", err.response?.data);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl relative text-slate-700">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-800 text-base">{formatTitle()} Threshold Rules</h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSave} className="py-1 space-y-3 mt-3">
                    <div>
                        <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">🔴 Critical Level</label>
                        <input 
                            type="number" 
                            value={thresholds.critical} 
                            onChange={(e) => setThresholds({ ...thresholds, critical: Math.max(0, parseInt(e.target.value) || 0) })} 
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-slate-700 font-semibold" 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">🟡 Restock Warning Point</label>
                        <input 
                            type="number" 
                            value={thresholds.reorder} 
                            onChange={(e) => setThresholds({ ...thresholds, reorder: Math.max(0, parseInt(e.target.value) || 0) })} 
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-slate-700 font-semibold" 
                        />
                    </div>

                    <div className="bg-emerald-50/50 p-3 border border-emerald-100 rounded-lg">
                        <span className="block text-sm font-bold text-emerald-700 uppercase mb-1.5">🟢 Safe Buffer Zone</span>
                        <p className="text-xs text-emerald-800 font-medium">Starts from <span className="font-mono bg-white px-1.5 py-0.5 border border-emerald-200 rounded shadow-sm">{thresholds.reorder + 1}</span> up to <span className="font-mono bg-white px-1.5 py-0.5 border border-emerald-200 rounded shadow-sm">{thresholds.overstock}</span>.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">🔵 Overstock Limit Point</label>
                        <input 
                            type="number" 
                            value={thresholds.overstock} 
                            onChange={(e) => setThresholds({ ...thresholds, overstock: Math.max(0, parseInt(e.target.value) || 0) })} 
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none text-slate-700 font-semibold" 
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-6 pt-2 border-t border-slate-100">
                        <button type="button" onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">Cancel</button>
                        <button type="submit" disabled={saving} className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save Rules'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ThresholdModal;