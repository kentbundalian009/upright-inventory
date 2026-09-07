import React, { useState, useEffect } from 'react';
import { X, Sliders } from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';

function ThresholdModal({ isOpen, onClose, categoryType, onSaveSuccess }) {
    const { isDark } = useTheme();
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200`}>
                
                <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3 shrink-0`}>
                    <div className="flex items-center gap-2">
                        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>Rackings Materials Threshold Rules</h3>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className={`${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer transition-colors`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-50 border-amber-200/60'} rounded-xl border mt-3 shrink-0`}>
                    <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                        * System Inventory Protocol *
                    </span>
                    <p className={`text-[11px] ${isDark ? 'text-amber-300/80' : 'text-amber-700'} leading-relaxed`}>
                        Modifying target buffer parameters directly updates real-time stock status calculations across active ledger views and system procurement notifications.
                    </p>
                </div>

                <form onSubmit={handleSave} className="space-y-4 mt-4 flex-1 overflow-y-auto pr-1">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        <div>
                            <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>🔴 Critical Level</label>
                            <input 
                                type="number" 
                                value={thresholds.critical} 
                                onChange={(e) => setThresholds({ ...thresholds, critical: Math.max(0, parseInt(e.target.value) || 0) })} 
                                onWheel={(e) => e.currentTarget.blur()}
                                className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold`} 
                            />
                        </div>

                        <div>
                            <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>🟡 Restock Warning Point</label>
                            <input 
                                type="number" 
                                value={thresholds.reorder} 
                                onChange={(e) => setThresholds({ ...thresholds, reorder: Math.max(0, parseInt(e.target.value) || 0) })} 
                                onWheel={(e) => e.currentTarget.blur()}
                                className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold`} 
                            />
                        </div>

                        <div className={`md:col-span-2 ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50/50 border-slate-100'} p-3 border rounded-xl`}>
                            <span className={`block text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'} uppercase mb-1.5`}>🟢 Calculated Safe Buffer Zone</span>
                            <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'} font-medium leading-relaxed`}>
                                Stocks are declared optimal starting from <span className={`font-mono ${isDark ? 'bg-[#090b10] border-slate-700 text-emerald-400' : 'bg-white border-slate-200'} px-1.5 py-0.5 border rounded shadow-sm font-semibold`}>{thresholds.reorder + 1}</span> up to <span className={`font-mono ${isDark ? 'bg-[#090b10] border-slate-700 text-emerald-400' : 'bg-white border-slate-200'} px-1.5 py-0.5 border rounded shadow-sm font-semibold`}>{thresholds.overstock}</span> units.
                            </p>
                        </div>

                        <div className="md:col-span-2">
                            <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>🔵 Overstock Limit Point</label>
                            <input 
                                type="number" 
                                value={thresholds.overstock} 
                                onChange={(e) => setThresholds({ ...thresholds, overstock: Math.max(0, parseInt(e.target.value) || 0) })} 
                                onWheel={(e) => e.currentTarget.blur()}
                                className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold`} 
                            />
                        </div>

                    </div>

                    <div className={`flex items-center justify-end gap-2 mt-6 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'} shrink-0`}>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer`}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={saving} 
                            className={`${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50 shadow-md`}
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
