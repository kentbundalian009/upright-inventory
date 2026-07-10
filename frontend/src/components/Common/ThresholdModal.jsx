import React, { useState, useEffect } from 'react';
import { X, Sliders } from 'lucide-react'; // Idinamay ko ang Sliders icon para sa dynamic header look
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
            await axios.put(`/api/settings/thresholds/${categoryType}`, thresholds);
            if (onSaveSuccess) onSaveSuccess(); 
            onClose(); 
        } catch (err) {
            console.error("Backend Error Details:", err.response?.data);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            {/* Consistent sizing (max-w-xl), layout, roundings (rounded-2xl) at flex control */}
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-base"> Rackings Materials Threshold Rules</h3>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* System Inventory Protocol Notification Card */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 mt-3 shrink-0">
                    <span className="block text-xs font-bold text-amber-800 uppercase mb-1">
                        * System Inventory Protocol *
                    </span>
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                        Modifying target buffer parameters directly updates real-time stock status calculations across active ledger views and system procurement notifications.
                    </p>
                </div>

                {/* Modal Form Content Section */}
                <form onSubmit={handleSave} className="space-y-4 mt-4 flex-1 overflow-y-auto pr-1">
                    
                    {/* 2-Column Grid structure para malinis at pantay sa Edit Form Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Critical Level */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">🔴 Critical Level</label>
                            <input 
                                type="number" 
                                value={thresholds.critical} 
                                onChange={(e) => setThresholds({ ...thresholds, critical: Math.max(0, parseInt(e.target.value) || 0) })} 
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e] text-slate-700 font-semibold" 
                            />
                        </div>

                        {/* Restock Warning Point */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">🟡 Restock Warning Point</label>
                            <input 
                                type="number" 
                                value={thresholds.reorder} 
                                onChange={(e) => setThresholds({ ...thresholds, reorder: Math.max(0, parseInt(e.target.value) || 0) })} 
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e] text-slate-700 font-semibold" 
                            />
                        </div>

                        {/* Safe Buffer Zone UI Block (Full-width row extension) */}
                        <div className="md:col-span-2 bg-slate-50/50 p-3 border border-slate-100 rounded-xl">
                            <span className="block text-xs font-bold text-slate-500 uppercase mb-1.5">🟢 Calculated Safe Buffer Zone</span>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                Stocks are declared optimal starting from <span className="font-mono bg-white px-1.5 py-0.5 border border-slate-200 rounded shadow-sm font-semibold">{thresholds.reorder + 1}</span> up to <span className="font-mono bg-white px-1.5 py-0.5 border border-slate-200 rounded shadow-sm font-semibold">{thresholds.overstock}</span> units.
                            </p>
                        </div>

                        {/* Overstock Limit Point (Full-width row pattern consistency) */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">🔵 Overstock Limit Point</label>
                            <input 
                                type="number" 
                                value={thresholds.overstock} 
                                onChange={(e) => setThresholds({ ...thresholds, overstock: Math.max(0, parseInt(e.target.value) || 0) })} 
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e] text-slate-700 font-semibold" 
                            />
                        </div>

                    </div>

                    {/* Modal Bottom Actions */}
                    <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100 shrink-0">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={saving} 
                            className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50 shadow-md"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}

export default ThresholdModal;