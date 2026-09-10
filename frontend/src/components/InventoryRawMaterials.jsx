import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Filter, X, Edit2, Archive, EyeOff, Sliders, RotateCcw, CheckCircle2, Palette, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import axios from 'axios';
import PageHeader from './PageHeader';
import ThresholdModal from './ThresholdModal';
import { useTheme } from '../context/ThemeContext';

// Lahat ng pagpipiliang kulay na gagamitin sa system globally
const COLOR_OPTIONS = [
    { name: 'Emerald / Green', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800', prefix: '🟢' },
    { name: 'Blue / Indigo', classes: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800', prefix: '🔵' },
    { name: 'Amber / Orange', classes: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800', prefix: '🟡' },
    { name: 'Rose / Red', classes: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800', prefix: '🔴' },
    { name: 'Orange', classes: 'bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800', prefix: '🟠' },
    { name: 'Purple / Violet', classes: 'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800', prefix: '🟣' },
    { name: 'Slate / Muted Gray', classes: 'bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', prefix: '⚪' },
    { name: 'Cyan / Teal', classes: 'bg-cyan-50 text-cyan-700 border-cyan-200/60 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800', prefix: '🌐' }
];

function InventoryRawMaterials() {
    const { isDark } = useTheme();
    const userRole = localStorage.getItem("SystemRole") || "Inventory";
    const isViewer = userRole?.toLowerCase() === 'viewer';

    // 1. DATABASE AT LIFECYCLE STATES
    const [rawMaterialsList, setRawMaterialsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Toast Notification States
    const [successMessage, setSuccessMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    // View toggles
    const [showArchivedOnly, setShowArchivedOnly] = useState(false);
    const [hideZeroQty, setHideZeroQty] = useState(false);

    // Filters at Search States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSegment, setSelectedSegment] = useState('All Segments');
    const [selectedDescription, setSelectedDescription] = useState('All Item Descriptions');
    const [selectedHealth, setSelectedHealth] = useState('All Health Status');

    // Modals visibility states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
    const [isPaletteModalOpen, setIsPaletteModalOpen] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    // 🌟 IMAGE PREVIEW LIGHTBOX STATE
    const [previewImage, setPreviewImage] = useState(null);

    // Confirmation Modal States
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmModalConfig, setConfirmModalConfig] = useState({
        title: '', message: '', actionType: '', selectedItem: null
    });

    // Form fields para sa Edit modal
    const [materialCode, setMaterialCode] = useState('');
    const [materialSegment, setMaterialSegment] = useState('');
    const [itemDescription, setItemDescription] = useState('');
    const [materialDimension, setMaterialDimension] = useState('');
    const [materialUom, setMaterialUom] = useState('');
    const [accountTo, setAccountTo] = useState('');
    const [modalActualCount, setModalActualCount] = useState(0);

    // 🌟 FILE UPLOAD STATES
    const [selectedFile, setSelectedFile] = useState(null);
    const [existingImgPreview, setExistingImgPreview] = useState('');

    // System Threshold parameters
    const [thresholds, setThresholds] = useState({ critical: 5, reorder: 15, overstock: 50 });
    // GLOBAL COLOR PALETTE STATES
    const [categoryColors, setCategoryColors] = useState({});
    const [segmentColors, setSegmentColors] = useState({});

    const handleCategoryColorChange = (catName, colorIndex) => {
        setCategoryColors(prev => ({ ...prev, [catName.trim().toUpperCase()]: parseInt(colorIndex) }));
    };

    const handleSegmentColorChange = (segName, colorIndex) => {
        setSegmentColors(prev => ({ ...prev, [segName.trim().toUpperCase()]: parseInt(colorIndex) }));
    };

    const triggerSuccess = (message) => {
        setSuccessMessage(message);
        setErrorMessage(null);
        setTimeout(() => setSuccessMessage(null), 4000);
    };

    const triggerError = (message) => {
        setErrorMessage(message);
        setSuccessMessage(null);
        setTimeout(() => setErrorMessage(null), 4000);
    };

    // 2. READ & FETCH SCHEMAS MULA SA SERVER (API CALLS)
    const fetchPaletteSettings = async () => {
        try {
            const response = await axios.get('/api/settings/palette');
            if (response.data) {
                setCategoryColors(response.data.categoryColors || {});
                setSegmentColors(response.data.segmentColors || {});
            }
        } catch (err) {
            console.error("Failed to load data from the server.", err);
        }
    };

    const fetchThresholdSettings = async () => {
        try {
            const response = await axios.get('/api/settings/thresholds/raw_materials');
            if (response.data) {
                const data = response.data;
                setThresholds({
                    critical: Number(data.critical ?? data.settings?.critical ?? 5),
                    reorder: Number(data.reorder ?? data.settings?.reorder ?? 15),
                    overstock: Number(data.overstock ?? data.settings?.overstock ?? 50)
                });
            }
        } catch (err) { console.error(err); }
    };

    const fetchRawMaterials = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/raw-materials');
            if (Array.isArray(response.data)) setRawMaterialsList(response.data);
            else if (response.data && Array.isArray(response.data.data)) setRawMaterialsList(response.data.data);
            else setRawMaterialsList([]);
            setError(null);
        } catch (err) {
            setError("Failed to load data from the server.");
            setRawMaterialsList([]);
        } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchThresholdSettings();
        fetchRawMaterials();
        fetchPaletteSettings();
    }, []);

    const handleSavePaletteToDatabase = async () => {
        try {
            const payload = { categoryColors, segmentColors };
            await axios.post('/api/settings/palette', payload);
            setIsPaletteModalOpen(false);
            triggerSuccess("Palette configurations applied successfully!");
            fetchPaletteSettings();
        } catch (err) {
            setErrorMessage("Failed to load data from the server.");
        }
    };

    const segmentsInDB = [...new Set(rawMaterialsList.map(item => item.Segment).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    const descriptionsInDB = [...new Set(rawMaterialsList.map(item => item.ItemDescription).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const dimensionsInDB = [...new Set(rawMaterialsList.map(item => item.Dimension).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const uomsInDB = [...new Set(rawMaterialsList.map(item => item.UOM).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const accountsInDB = [...new Set(rawMaterialsList.map(item => item.AccountTo).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    const filterSegments = ['All Segments', ...segmentsInDB];
    const filterDescriptions = ['All Item Descriptions', ...descriptionsInDB];

    const getSegmentStyles = (segment) => {
        if (!segment) return { classes: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700", prefix: "⚪" };
        const cleaned = segment.trim().toUpperCase();
        if (segmentColors[cleaned] !== undefined && COLOR_OPTIONS[segmentColors[cleaned]]) return COLOR_OPTIONS[segmentColors[cleaned]];
        const index = segmentsInDB.findIndex(seg => seg.trim().toUpperCase() === cleaned);
        return COLOR_OPTIONS[(index !== -1 ? index : 0) % COLOR_OPTIONS.length];
    };

    const getRawMaterialHealthBadge = (actualCount) => {
        if (actualCount <= thresholds.critical) return <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-medium">🔴 Critical</span>;
        if (actualCount <= thresholds.reorder) return <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium">🟡 Re-Stock</span>;
        if (actualCount > thresholds.overstock) return <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">🔵 Overstock</span>;
        return <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded font-medium">🟢 Healthy</span>;
    };

    const openEditModal = (item) => {
        setCurrentId(item._id);
        setMaterialCode(item.Code || '');
        setMaterialSegment(item.Segment || '');
        setItemDescription(item.ItemDescription || '');
        setMaterialDimension(item.Dimension || '');
        setMaterialUom(item.UOM || '');
        setAccountTo(item.AccountTo || '');
        setModalActualCount(item.ActualCount ?? 0);

        setExistingImgPreview(item.ImageUrl || '');
        setSelectedFile(null);
        setIsEditModalOpen(true);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleEditFormSubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append("Code", materialCode.trim());
            formData.append("Category", "");
            formData.append("Segment", materialSegment.trim());
            formData.append("ItemDescription", itemDescription.trim());
            formData.append("Dimension", materialDimension.trim());
            formData.append("UOM", materialUom.trim());
            formData.append("AccountTo", accountTo.trim());

            if (selectedFile) {
                formData.append("image", selectedFile);
            }

            await axios.put(`/api/raw-materials/${currentId}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            setIsEditModalOpen(false);
            triggerSuccess("Successfully updated raw material profile details.");
            fetchRawMaterials();
        } catch (err) {
            const errMsg = err.response?.data?.message || "Error updating item.";
            triggerError(errMsg);
        }
    };

    const openArchiveConfirmation = (item) => {
        setConfirmModalConfig({ title: 'Archive Raw Material', message: `Are you sure you want to archive "${item.ItemDescription}"?`, actionType: 'archive', selectedItem: item });
        setIsConfirmModalOpen(true);
    };

    const openUnarchiveConfirmation = (item) => {
        setConfirmModalConfig({ title: 'Restore Raw Material', message: `Are you sure you want to restore "${item.ItemDescription}"?`, actionType: 'unarchive', selectedItem: item });
        setIsConfirmModalOpen(true);
    };

    const openPermanentDeleteConfirmation = (item) => {
        setConfirmModalConfig({ title: 'Delete Raw Material Permanently', message: `Are you sure you want to PERMANENTLY delete "${item.ItemDescription}"? This action cannot be undone.`, actionType: 'permanentDelete', selectedItem: item });
        setIsConfirmModalOpen(true);
    };

    const handleConfirmAction = async () => {
        const { actionType, selectedItem } = confirmModalConfig;
        if (!selectedItem) return;
        setIsConfirmModalOpen(false);
        try {
            if (actionType === 'archive') {
                await axios.delete(`/api/raw-materials/${selectedItem._id}`);
                triggerSuccess(`Successfully archived item.`);
            } else if (actionType === 'permanentDelete') {
                await axios.delete(`/api/raw-materials/${selectedItem._id}/permanent`);
                triggerSuccess(`Successfully deleted item permanently.`);
            } else {
                await axios.put(`/api/raw-materials/${selectedItem._id}/unarchive`);
                triggerSuccess(`Successfully restored item.`);
            }
            fetchRawMaterials();
        } catch (err) { setErrorMessage(err.response?.data?.message || "Failed to process request."); }
    };

    const currentDisplayList = rawMaterialsList.filter(item => showArchivedOnly ? item.isArchived === true : !item.isArchived);
    const filteredRawMaterials = currentDisplayList.filter(item => {
        const matchesSegment = selectedSegment === 'All Segments' || item.Segment === selectedSegment;
        const matchesDescription = selectedDescription === 'All Item Descriptions' || item.ItemDescription === selectedDescription;
        const matchesZeroQty = !hideZeroQty || (item.ActualCount > 0);
        let statusText = 'Healthy';
        if (item.ActualCount <= thresholds.critical) statusText = 'Critical';
        else if (item.ActualCount <= thresholds.reorder) statusText = 'Re-Stock';
        else if (item.ActualCount > thresholds.overstock) statusText = 'Overstock';
        const matchesHealth = selectedHealth === 'All Health Status' || statusText === selectedHealth;
        const matchesSearch = !searchTerm || [
            item.Code,
            item.Segment,
            item.ItemDescription,
            item.Dimension,
            item.AccountTo
        ].some(val => val && val.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSegment && matchesDescription && matchesHealth && matchesSearch && matchesZeroQty;
    });

    const activeCount = rawMaterialsList.filter(item => !item.isArchived).length;
    const archivedCount = rawMaterialsList.filter(item => item.isArchived).length;

    return (
        <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative">
            <PageHeader activeTab="raw-materials" />

            {/* NOTIFICATION TOASTS */}
            {successMessage && (
                <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold">{successMessage}</span>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
            )}
            {errorMessage && (
                <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span className="text-sm font-semibold">{errorMessage}</span>
                    <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 ml-2 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>
            )}

            <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100 text-slate-600'} border rounded-2xl p-6 shadow-sm flex flex-col gap-6 transition-colors duration-200`}>

                {/* FILTER CONTROLS MASTER ROW */}
                <div className="flex flex-col gap-1.5">

                    {/* TOP BAR */}
                    <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'} flex-shrink-0`}>
                            <Filter className={`w-4 h-4 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
                            <span>{showArchivedOnly ? 'Archive' : 'Filter'}</span>
                        </div>

                        <div className="flex items-center gap-2.5 ml-auto">

                            <label 
                                className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none border px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 ${
                                    hideZeroQty 
                                        ? (isDark ? 'bg-red-950/40 border-red-900/60 text-red-400' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100') 
                                        : (isDark ? 'bg-[#141622] border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')
                                }`}
                            >
                                <input 
                                    type="checkbox" 
                                    checked={hideZeroQty} 
                                    onChange={(e) => setHideZeroQty(e.target.checked)} 
                                    className={`w-3.5 h-3.5 rounded cursor-pointer transition-colors ${
                                        hideZeroQty ? 'accent-red-600' : 'accent-[#ff6600]'
                                    }`} 
                                />
                                <span className="hidden sm:inline">Hide 0 Qty</span>
                                <span className="sm:hidden text-[10px] font-bold">0 Qty</span>
                            </label>

                            {!isViewer && (
                                <button
                                    onClick={() => setIsThresholdModalOpen(true)}
                                    title="Threshold Settings"
                                    className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                                        isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    <Sliders className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
                                    <span className="hidden md:inline">Threshold Settings</span>
                                </button>
                            )}

                            {!isViewer && (
                                <button
                                    onClick={() => setIsPaletteModalOpen(true)}
                                    title="Palette Settings"
                                    className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm flex-shrink-0 ${
                                        isDark ? 'border-slate-700 bg-[#ff6600] text-white hover:bg-[#ff6600]/90' : 'border-slate-200 bg-[#18174e] text-white hover:bg-[#18174e]/90'
                                    }`}
                                >
                                    <Palette className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                    <span className="hidden md:inline">Palette Settings</span>
                                </button>
                            )}

                            {!isViewer && (
                                <button
                                    onClick={() => setShowArchivedOnly(!showArchivedOnly)}
                                    title={showArchivedOnly ? "Show Active Materials" : "View Archive Vault"}
                                    className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${showArchivedOnly
                                        ? (isDark ? 'bg-rose-950/40 text-rose-300 border-rose-900/60' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100')
                                        : (isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                                        }`}
                                >
                                    {showArchivedOnly ? (
                                        <>
                                            <EyeOff className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                            <span className="hidden md:inline">Show Active Materials</span>
                                            <span className="text-[11px] font-bold">({activeCount})</span>
                                        </>
                                    ) : (
                                        <>
                                            <Archive className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                            <span className="hidden md:inline">View Archive Vault</span>
                                            <span className="text-[11px] font-bold">({archivedCount})</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex overflow-x-auto gap-2 items-center mt-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-4 md:pb-0">

                        <div className="min-w-[180px] w-full md:min-w-0">
                            <div className="relative w-full">
                                <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                                <input type="text" placeholder="Search Segment, Description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none`} />
                            </div>
                        </div>

                        <div className="min-w-[150px] w-full md:min-w-0">
                            <select value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)} className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border font-semibold rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full`}>
                                {filterSegments.map(seg => {
                                    if (seg === 'All Segments') return <option key={seg} value={seg}>{seg}</option>;
                                    const config = getSegmentStyles(seg);
                                    return <option key={seg} value={seg}>{config.prefix} {seg}</option>;
                                })}
                            </select>
                        </div>

                        <div className="min-w-[170px] w-full md:min-w-0">
                            <select value={selectedDescription} onChange={(e) => setSelectedDescription(e.target.value)} className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full truncate`}>
                                {filterDescriptions.map(desc => <option key={desc} value={desc}>{desc}</option>)}
                            </select>
                        </div>

                        <div className="min-w-[150px] w-full md:min-w-0">
                            <select value={selectedHealth} onChange={(e) => setSelectedHealth(e.target.value)} className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none font-medium w-full cursor-pointer`}>
                                <option value="All Health Status">All Conditions</option>
                                <option value="Healthy">🟢 Healthy Stock</option>
                                <option value="Re-Stock">🟡 Restock Warning</option>
                                <option value="Critical">🔴 Critical Stock</option>
                                <option value="Overstock">🔵 Overstocked</option>
                            </select>
                        </div>

                    </div>

                    <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-full mt-3`}></div>
                </div>

                {/* MAIN CLEAN TABLE MASTERLIST */}
                <div className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'} rounded-xl border shadow-sm overflow-hidden`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className={`text-white font-bold uppercase text-sm ${isDark ? 'bg-[#0f111d] border-b border-slate-800' : 'bg-[#18174e]'}`}>
                                    <th 
                                        className={`py-3 px-2 text-center whitespace-nowrap static md:sticky md:left-0 z-20 w-[70px] min-w-[70px] max-w-[70px] ${isDark ? 'bg-[#0f111d]' : 'bg-[#18174e]'}`}
                                    >
                                        Image
                                    </th>
                                    <th 
                                        className={`py-3 px-4 whitespace-nowrap static md:sticky md:left-[70px] z-20 w-[240px] min-w-[240px] max-w-[240px] ${isDark ? 'bg-[#0f111d]' : 'bg-[#18174e]'}`}
                                    >
                                        Item Description
                                    </th>
                                    <th 
                                        className={`py-3 px-4 whitespace-nowrap static md:sticky md:left-[310px] z-20 w-[130px] min-w-[130px] max-w-[130px] ${isDark ? 'bg-[#0f111d]' : 'bg-[#18174e]'}`}
                                        style={{ boxShadow: isDark ? 'inset -2px 0 0 0 #475569, 6px 0 10px -2px rgba(0, 0, 0, 0.4)' : 'inset -2px 0 0 0 #cbd5e1, 6px 0 10px -2px rgba(0, 0, 0, 0.15)' }}
                                    >
                                        <span className={`hidden md:block absolute right-0 top-0 bottom-0 w-[2px] ${isDark ? 'bg-slate-600' : 'bg-slate-300'} pointer-events-none`} />
                                        Dimension
                                    </th>
                                    <th className="py-3 px-4 whitespace-nowrap">Segment</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-center">Actual Count</th>
                                    <th className="py-3 px-4 whitespace-nowrap">UOM</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Condition</th>
                                    {!isViewer && (
                                        <th className="py-3 px-4 text-center whitespace-nowrap">
                                             Action
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-slate-800/80 bg-[#090b10]' : 'divide-slate-100 bg-white'}`}>
                                {loading ? (
                                    <tr><td colSpan={isViewer ? "7" : "8"} className="text-center py-10 text-green-700 font-medium italic">
                                        Fetching secure rackings data from database...
                                    </td></tr>
                                ) : error ? (
                                    <tr><td colSpan={isViewer ? "7" : "8"} className="text-center py-8 text-rose-600 font-semibold">{error}</td></tr>
                                ) : filteredRawMaterials.map((rawMat) => {
                                    const currentSegConfig = getSegmentStyles(rawMat.Segment);

                                    return (
                                        <tr key={rawMat._id || rawMat.Code} className={`group ${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'} transition-colors font-medium whitespace-nowrap text-sm`}>
                                            <td 
                                                className={`py-2 px-2 text-center static md:sticky md:left-0 z-10 w-[70px] min-w-[70px] max-w-[70px] transition-colors ${
                                                    isDark ? 'bg-[#090b10] group-hover:bg-[#141622]' : 'bg-white group-hover:bg-[#f8fafc]'
                                                }`}
                                            >
                                                {rawMat.ImageUrl ? (
                                                    <div className="relative inline-block">
                                                        <img
                                                            src={
                                                                rawMat.ImageUrl.startsWith('http') || rawMat.ImageUrl.startsWith('data:')
                                                                    ? rawMat.ImageUrl
                                                                    : process.env.NODE_ENV === 'production'
                                                                        ? rawMat.ImageUrl
                                                                        : `${window.location.protocol}//${window.location.hostname}:5000${rawMat.ImageUrl}`
                                                            } alt={rawMat.ItemDescription}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                if (e.target.nextElementSibling) {
                                                                    e.target.nextElementSibling.style.display = 'flex';
                                                                }
                                                            }}
                                                            onClick={() => setPreviewImage(rawMat.ImageUrl.startsWith('http') || rawMat.ImageUrl.startsWith('data:') ? rawMat.ImageUrl : `${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}${rawMat.ImageUrl}`)}
                                                            className={`w-10 h-10 object-cover rounded-lg cursor-pointer hover:scale-110 ${isDark ? 'hover:border-[#ff6600]' : 'hover:border-[#18174e]'} transition-all mx-auto shadow-sm`}
                                                        />
                                                        <div style={{ display: 'none' }} className={`w-10 h-10 rounded-lg ${isDark ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-slate-100 text-slate-400 border-slate-200'} items-center justify-center border border-dashed mx-auto`}>
                                                            <ImageIcon className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={`w-10 h-10 rounded-lg ${isDark ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-slate-100 text-slate-400 border-slate-200'} flex items-center justify-center border border-dashed mx-auto`}>
                                                        <ImageIcon className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </td>

                                            <td 
                                                className={`py-3 px-4 font-semibold static md:sticky md:left-[70px] z-10 w-[240px] min-w-[240px] max-w-[240px] whitespace-normal md:whitespace-nowrap transition-colors ${
                                                    isDark ? 'bg-[#090b10] group-hover:bg-[#141622] text-slate-100' : 'bg-white group-hover:bg-[#f8fafc] text-slate-800'
                                                }`}
                                                title={rawMat.ItemDescription}
                                            >
                                                <div className="line-clamp-2 md:truncate font-semibold" title={rawMat.ItemDescription}>
                                                    {rawMat.ItemDescription}
                                                </div>
                                            </td>

                                            <td 
                                                className={`py-3 px-4 font-mono text-xs static md:sticky md:left-[310px] z-10 w-[130px] min-w-[130px] max-w-[130px] truncate transition-colors ${
                                                    isDark ? 'bg-[#090b10] group-hover:bg-[#141622] text-slate-300' : 'bg-white group-hover:bg-[#f8fafc] text-slate-600'
                                                }`}
                                                style={{ boxShadow: isDark ? 'inset -2px 0 0 0 #475569, 6px 0 10px -2px rgba(0, 0, 0, 0.4)' : 'inset -2px 0 0 0 #cbd5e1, 6px 0 10px -2px rgba(0, 0, 0, 0.08)' }}
                                                title={rawMat.Dimension || '—'}
                                            >
                                                <span className={`hidden md:block absolute right-0 top-0 bottom-0 w-[2px] ${isDark ? 'bg-slate-600' : 'bg-slate-300'} pointer-events-none`} />
                                                {rawMat.Dimension || '—'}
                                            </td>

                                            <td className="py-3 px-4">
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 w-fit ${currentSegConfig.classes}`}>
                                                    <span>{rawMat.Segment || '—'}</span>
                                                </span>
                                            </td>
                                            <td className={`py-3 px-4 text-center font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{rawMat.ActualCount}</td>
                                            <td className={`py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{rawMat.UOM}</td>
                                            <td className="py-3 px-4">{getRawMaterialHealthBadge(rawMat.ActualCount)}</td>
                                            {!isViewer && (
                                                <td className="py-3 px-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {!showArchivedOnly ? (
                                                            <>
                                                                <button onClick={() => openEditModal(rawMat)} className={`p-1 ${isDark ? 'bg-[#181a26] border-slate-700 text-indigo-400 hover:bg-indigo-600 hover:text-white' : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'} border rounded transition-all cursor-pointer`}><Edit2 className="w-3.5 h-3.5" /></button>
                                                                <button onClick={() => openArchiveConfirmation(rawMat)} className={`p-1 ${isDark ? 'bg-[#181a26] border-slate-700 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'} border rounded transition-all cursor-pointer`}><Archive className="w-3.5 h-3.5" /></button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => openUnarchiveConfirmation(rawMat)} className={`p-1 ${isDark ? 'bg-[#181a26] border-emerald-800/80 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'} border rounded transition-all cursor-pointer flex items-center gap-1 text-xs font-bold px-2 py-0.5`}><RotateCcw className="w-3.5 h-3.5" /> Restore</button>
                                                                <button onClick={() => openPermanentDeleteConfirmation(rawMat)} className={`p-1 ${isDark ? 'bg-[#181a26] border-rose-800/80 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'} border rounded transition-all cursor-pointer flex items-center gap-1 text-xs font-bold px-2 py-0.5`}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                                {filteredRawMaterials.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={isViewer ? "7" : "8"} className="text-center py-10 text-red-600 font-medium italic">
                                            No records match the selected filters or search queries.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* LIGHTBOX CONTAINER */}
            {previewImage && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[60] p-4" onClick={() => setPreviewImage(null)}>
                    <div className="relative bg-white p-2 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 bg-slate-900/80 text-white hover:bg-slate-800 p-2 rounded-full transition-all cursor-pointer z-10 shadow">
                            <X className="w-5 h-5" />
                        </button>
                        <img src={previewImage} alt="Large Display" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
                    </div>
                </div>
            )}

            {/* GLOBAL COLOR PALETTE SETTINGS MODAL */}
            {isPaletteModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto flex flex-col`}>

                        <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
                            <div className="flex items-center gap-2">
                                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>Color Palette Mapping</h3>
                            </div>
                            <button
                                onClick={() => setIsPaletteModalOpen(false)}
                                className={`${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-50 border-amber-200/60'} rounded-xl border mt-3`}>
                            <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                                * System Palette Protocol *
                            </span>
                            <p className={`text-[11px] ${isDark ? 'text-amber-300/80' : 'text-amber-700'} leading-relaxed`}>
                                Color configurations modified here will synchronize instantly across the workspace. Ensure selections align with active hardware color coding tags.
                            </p>
                        </div>

                        <div className="space-y-4 mt-4 flex-1 overflow-y-auto pr-1">

                            <div>
                                <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Segment Color Configuration</label>
                                <div className={`space-y-2.5 ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50/50 border-slate-100'} p-3 rounded-xl border`}>
                                    {segmentsInDB.length === 0 && (
                                        <p className="text-xs italic text-slate-400">No segments found in system.</p>
                                    )}
                                    {segmentsInDB.map((seg, segIdx) => {
                                        const config = getSegmentStyles(seg);
                                        const cleanedSeg = seg.trim().toUpperCase();
                                        const currentIdx = segmentColors[cleanedSeg] !== undefined ? segmentColors[cleanedSeg] : (segIdx % COLOR_OPTIONS.length);
                                        return (
                                            <div key={seg} className={`flex items-center justify-between gap-4 ${isDark ? 'bg-[#090b10] border-slate-800' : 'bg-white border-slate-200/60'} p-2 rounded-lg border shadow-sm`}>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 ${config.classes}`}>
                                                    <span>{config.prefix}</span>
                                                    <span>{seg}</span>
                                                </span>
                                                <select
                                                    value={currentIdx}
                                                    onChange={(e) => handleSegmentColorChange(seg, e.target.value)}
                                                    className={`text-xs ${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'} border rounded-md px-2 py-1 cursor-pointer font-medium focus:outline-none`}
                                                >
                                                    {COLOR_OPTIONS.map((opt, i) => (
                                                        <option key={i} value={i} className={isDark ? 'bg-[#141622] text-slate-200' : 'bg-white text-slate-700'}>{opt.prefix} {opt.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>

                        <div className={`flex items-center justify-end gap-2 mt-6 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                            <button
                                onClick={() => setIsPaletteModalOpen(false)}
                                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSavePaletteToDatabase}
                                className={`${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md`}
                            >
                                Save Changes
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* EDIT MATERIAL FORM MODAL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto`}>

                        <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
                            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>Update Rackings Details</h3>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className={`${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-50 border-amber-200/60'} rounded-xl border mt-3`}>
                            <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                                * System Inventory Protocol *
                            </span>
                            <p className={`text-[11px] ${isDark ? 'text-amber-300/80' : 'text-amber-700'} leading-relaxed`}>
                                Manual quantity inputs are disabled to comply with audit protocols. Racking images and related media must be uploaded through the <strong>Rackings Components.</strong>
                            </p>
                        </div>

                        <form onSubmit={handleEditFormSubmit} className="space-y-4 mt-4">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                <div className="md:col-span-2">
                                    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Item Image Upload</label>
                                    <div className="mt-1 flex items-center gap-3">
                                        {existingImgPreview && !selectedFile && (
                                            <img
                                                src={existingImgPreview}
                                                alt="Current raw material"
                                                className={`w-12 h-12 rounded-lg border ${isDark ? 'border-slate-700' : 'border-slate-200'} object-cover shadow-sm flex-shrink-0`}
                                            />
                                        )}
                                        <label className={`flex-1 flex flex-col items-center justify-center ${isDark ? 'bg-[#141622] border-slate-700 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'} border-2 border-dashed rounded-xl py-3 px-4 transition-all cursor-pointer`}>
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                                                <Upload className={`w-4 h-4 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
                                                <span>{selectedFile ? selectedFile.name : "Choose profile image"}</span>
                                            </div>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                        </label>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Segment</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={materialSegment}
                                            onChange={(e) => setMaterialSegment(e.target.value)}
                                            list="segments-list"
                                            placeholder="Search or enter segment"
                                            className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
                                        />
                                        <datalist id="segments-list">
                                            {[...segmentsInDB]
                                                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                                                .map((seg) => <option key={seg} value={seg} />)
                                            }
                                        </datalist>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Item Description *</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            value={itemDescription}
                                            onChange={(e) => setItemDescription(e.target.value)}
                                            list="descriptions-list"
                                            placeholder="Search or enter item description"
                                            className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
                                        />
                                        <datalist id="descriptions-list">
                                            {[...descriptionsInDB]
                                                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                                                .map((desc) => <option key={desc} value={desc} />)
                                            }
                                        </datalist>
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Dimension</label>
                                    <input
                                        type="text"
                                        value={materialDimension}
                                        onChange={(e) => setMaterialDimension(e.target.value)}
                                        placeholder="e.g. 100x50x2mm"
                                        className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>UOM</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={materialUom}
                                            onChange={(e) => setMaterialUom(e.target.value)}
                                            list="uoms-list"
                                            placeholder="Search or enter UOM"
                                            className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
                                        />
                                        <datalist id="uoms-list">
                                            {[...uomsInDB]
                                                .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
                                                .map((uom) => <option key={uom} value={uom} />)
                                            }
                                        </datalist>
                                    </div>
                                </div>

                            </div>

                            <div className={`flex items-center justify-end gap-2 mt-6 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md`}
                                >
                                    Save Changes
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            {/* Threshold Modal Schema */}
            <ThresholdModal isOpen={isThresholdModalOpen} onClose={() => setIsThresholdModalOpen(false)} categoryType="raw_materials" onSaveSuccess={() => { fetchThresholdSettings(); fetchRawMaterials(); triggerSuccess("Successfully updated threshold configuration."); }} />

            {/* CONFIRMATION MODAL */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-md p-6 shadow-xl relative flex flex-col animate-in zoom-in-95 duration-200`}>

                        <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3 shrink-0`}>
                            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                                {confirmModalConfig.title}
                            </h3>
                        </div>

                        <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-50 border-amber-200/60'} rounded-xl border mt-3 shrink-0`}>
                            <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                                * System Action Protocol *
                            </span>
                            <p className={`text-[11px] ${isDark ? 'text-amber-300/80' : 'text-amber-700'} leading-relaxed`}>
                                Please review the operation context. Confirming this step commits changes directly to the live system registry.
                            </p>
                        </div>

                        <div className="mt-4 flex-1">
                            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'} leading-relaxed font-medium`}>
                                {confirmModalConfig.message}
                            </p>
                        </div>

                        <div className={`flex items-center justify-end gap-2 mt-6 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'} shrink-0`}>
                            <button
                                type="button"
                                onClick={() => setIsConfirmModalOpen(false)}
                                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer`}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmAction}
                                className={`${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md`}
                            >
                                Confirm
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}

export default InventoryRawMaterials;
