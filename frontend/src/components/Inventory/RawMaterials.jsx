import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Filter, X, Edit2, Archive, EyeOff, Sliders, RotateCcw, CheckCircle2, Palette, Image as ImageIcon, Upload } from 'lucide-react';
import axios from 'axios';
import PageHeader from '../Common/PageHeader';
import ThresholdModal from '../Common/ThresholdModal';

// Lahat ng pagpipiliang kulay na gagamitin sa system globally
const COLOR_OPTIONS = [
    { name: "Yellow", classes: "bg-amber-50 text-amber-700 border-amber-200", prefix: "🟡" },
    { name: "Green", classes: "bg-emerald-50 text-emerald-700 border-emerald-200", prefix: "🟢" },
    { name: "Blue", classes: "bg-blue-50 text-blue-700 border-blue-200", prefix: "🔵" },
    { name: "Purple", classes: "bg-purple-50 text-purple-700 border-purple-200", prefix: "🟣" },
    { name: "Red", classes: "bg-rose-50 text-rose-700 border-rose-200", prefix: "🔴" },
    { name: "Gray", classes: "bg-slate-50 text-slate-600 border-slate-200", prefix: "⚪" }
];

function RawMaterials() {
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
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
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
    const [materialCategory, setMaterialCategory] = useState('');
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

    // 2. READ & FETCH SCHEMAS MULA SA SERVER (API CALLS)
    const fetchPaletteSettings = async () => {
        try {
            const response = await axios.get('/api/settings/palette');
            if (response.data) {
                setCategoryColors(response.data.categoryColors || {});
                setSegmentColors(response.data.segmentColors || {});
            }
        } catch (err) {
            console.error("Failed to fetch global color settings from the database:", err);
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
            setError("Failed to fetch raw materials from the server.");
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
            triggerSuccess("Successfully saved and synchronized global palette styles across all devices!");
            fetchPaletteSettings();
        } catch (err) {
            setErrorMessage("Failed to save palette configuration to backend database server.");
        }
    };

    const categoriesInDB = [...new Set(rawMaterialsList.map(item => item.Category).filter(Boolean))].sort();
    const segmentsInDB = [...new Set(rawMaterialsList.map(item => item.Segment).filter(Boolean))].sort();
    const descriptionsInDB = [...new Set(rawMaterialsList.map(item => item.ItemDescription).filter(Boolean))];
    const dimensionsInDB = [...new Set(rawMaterialsList.map(item => item.Dimension).filter(Boolean))];
    const uomsInDB = [...new Set(rawMaterialsList.map(item => item.UOM).filter(Boolean))];
    const accountsInDB = [...new Set(rawMaterialsList.map(item => item.AccountTo).filter(Boolean))];

    const filterCategories = ['All Categories', ...categoriesInDB];
    const filterSegments = ['All Segments', ...segmentsInDB];
    const filterDescriptions = ['All Item Descriptions', ...descriptionsInDB];

    const getSegmentStyles = (segment) => {
        if (!segment) return { classes: "bg-slate-50 text-slate-600 border-slate-200", prefix: "⚪" };
        const cleaned = segment.trim().toUpperCase();
        if (segmentColors[cleaned] !== undefined) return COLOR_OPTIONS[segmentColors[cleaned]];
        const index = segmentsInDB.findIndex(seg => seg.trim().toUpperCase() === cleaned);
        return COLOR_OPTIONS[(index !== -1 ? index : 0) % COLOR_OPTIONS.length];
    };

    const getCategoryStyles = (category) => {
        if (!category) return { classes: "bg-slate-50 text-slate-600 border-slate-200" };
        const cleaned = category.trim().toUpperCase();
        if (categoryColors[cleaned] !== undefined) return COLOR_OPTIONS[categoryColors[cleaned]];
        const index = categoriesInDB.findIndex(cat => cat.trim().toUpperCase() === cleaned);
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
        setMaterialCategory(item.Category || '');
        setMaterialSegment(item.Segment || '');
        setItemDescription(item.ItemDescription || '');
        setMaterialDimension(item.Dimension || '');
        setMaterialUom(item.UOM || '');
        setAccountTo(item.AccountTo || '');
        setModalActualCount(item.ActualCount ?? 0);
        
        // 🌟 I-set ang image references sa modal opening
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
            // 🌟 GAMITIN ANG FORMDATA PARA SA FILE UPLOAD COMPATIBILITY
            const formData = new FormData();
            formData.append("Code", materialCode.trim());
            formData.append("Category", materialCategory.trim());
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
            setErrorMessage(err.response?.data?.message || "Error updating item.");
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

    const handleConfirmAction = async () => {
        const { actionType, selectedItem } = confirmModalConfig;
        if (!selectedItem) return;
        setIsConfirmModalOpen(false);
        try {
            if (actionType === 'archive') {
                await axios.delete(`/api/raw-materials/${selectedItem._id}`);
                triggerSuccess(`Successfully archived item.`);
            } else {
                await axios.put(`/api/raw-materials/${selectedItem._id}/unarchive`);
                triggerSuccess(`Successfully restored item.`);
            }
            fetchRawMaterials();
        } catch (err) { setErrorMessage("Action execution failed."); }
    };

    const currentDisplayList = rawMaterialsList.filter(item => showArchivedOnly ? item.isArchived === true : !item.isArchived);
    const filteredRawMaterials = currentDisplayList.filter(item => {
        const matchesCategory = selectedCategory === 'All Categories' || item.Category === selectedCategory;
        const matchesSegment = selectedSegment === 'All Segments' || item.Segment === selectedSegment;
        const matchesDescription = selectedDescription === 'All Item Descriptions' || item.ItemDescription === selectedDescription;
        const matchesZeroQty = !hideZeroQty || (item.ActualCount > 0);
        let statusText = 'Healthy';
        if (item.ActualCount <= thresholds.critical) statusText = 'Critical';
        else if (item.ActualCount <= thresholds.reorder) statusText = 'Re-Stock';
        else if (item.ActualCount > thresholds.overstock) statusText = 'Overstock';
        const matchesHealth = selectedHealth === 'All Health Status' || statusText === selectedHealth;
        const matchesSearch = !searchTerm || [item.Code, item.Dimension, item.ItemDescription, item.AccountTo].some(val => val && val.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesCategory && matchesSegment && matchesDescription && matchesHealth && matchesSearch && matchesZeroQty;
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

            <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
                
                {/* FILTER CONTROLS MASTER ROW */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                            <Filter className="w-4 h-4 text-[#18174e]" />
                            <span>{showArchivedOnly ? 'Viewing Archived Vault' : 'Filter Raw Materials'}</span>
                        </div>

                        <div className="flex items-center flex-wrap gap-2.5">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all">
                                <input type="checkbox" checked={hideZeroQty} onChange={(e) => setHideZeroQty(e.target.checked)} className="w-3.5 h-3.5 accent-[#18174e] rounded cursor-pointer" />
                                <span>Hide 0 Qty</span>
                            </label>

                            <button onClick={() => setIsThresholdModalOpen(true)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 transition-all cursor-pointer">
                                <Sliders className="w-3.5 h-3.5 text-[#18174e]" /> Threshold Settings
                            </button>

                            <button onClick={() => setIsPaletteModalOpen(true)} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border bg-[#18174e] text-white hover:bg-[#18174e]/90 transition-all cursor-pointer shadow-sm">
                                <Palette className="w-3.5 h-3.5" /> Palette Settings
                            </button>

                            <button onClick={() => setShowArchivedOnly(!showArchivedOnly)} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${showArchivedOnly ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>
                                {showArchivedOnly ? <><EyeOff className="w-3.5 h-3.5" /> Show Active Materials ({activeCount})</> : <><Archive className="w-3.5 h-3.5" /> View Archive Vault ({archivedCount})</>}
                            </button>
                        </div>
                    </div>

                    {/* SELECT DROPDOWNS GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 items-center mt-2">
                        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full">
                            {filterCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>

                        <select value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)} className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full">
                            {filterSegments.map(seg => {
                                if (seg === 'All Segments') return <option key={seg} value={seg}>{seg}</option>;
                                const config = getSegmentStyles(seg);
                                return <option key={seg} value={seg}>{config.prefix} {seg}</option>;
                            })}
                        </select>

                        <select value={selectedDescription} onChange={(e) => setSelectedDescription(e.target.value)} className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full">
                            {filterDescriptions.map(desc => <option key={desc} value={desc}>{desc}</option>)}
                        </select>

                        <select value={selectedHealth} onChange={(e) => setSelectedHealth(e.target.value)} className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none font-medium w-full cursor-pointer">
                            <option value="All Health Status">All Conditions</option>
                            <option value="Healthy">🟢 Healthy Stock</option>
                            <option value="Re-Stock">🟡 Restock Warning</option>
                            <option value="Critical">🔴 Critical Stock</option>
                            <option value="Overstock">🔵 Overstocked</option>
                        </select>

                        <div className="relative w-full">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Search Code, Description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none text-slate-700" />
                        </div>
                    </div>
                    <div className="h-px bg-slate-100 w-full mt-3"></div>
                </div>

                {/* MAIN CLEAN TABLE MASTERLIST */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="text-white font-bold bg-[#18174e] uppercase text-sm">
                                    <th className="py-3 px-4 whitespace-nowrap text-center">Image</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Code</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Category</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Segment</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Item Description</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Dimension</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-center">Actual Count</th>
                                    <th className="py-3 px-4 whitespace-nowrap">UOM</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Condition</th>
                                    <th className="py-3 px-4 whitespace-nowrap bg-indigo-950">Account To</th>
                                    <th className="py-3 px-4 text-center bg-indigo-900">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan="11" className="text-center py-10 text-slate-400 font-medium italic">Fetching secure rackings data...</td></tr>
                                ) : error ? (
                                    <tr><td colSpan="11" className="text-center py-8 text-rose-600 font-semibold">{error}</td></tr>
                                ) : filteredRawMaterials.map((rawMat) => {
                                    const currentCatConfig = getCategoryStyles(rawMat.Category);
                                    const currentSegConfig = getSegmentStyles(rawMat.Segment);

                                    return (
                                        <tr key={rawMat._id || rawMat.Code} className="hover:bg-slate-50/80 transition-colors text-slate-600 font-medium whitespace-nowrap text-sm">
                                            {/* 🌟 IMAGE RENDER CELLS (May Dynamic Localhost Fallback Port Check) */}
<td className="py-2 px-4 text-center">
    {rawMat.ImageUrl ? (
        <img 
            src={rawMat.ImageUrl.startsWith('http') ? rawMat.ImageUrl : `${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}${rawMat.ImageUrl}`} 
            alt={rawMat.ItemDescription} 
            onClick={() => setPreviewImage(rawMat.ImageUrl.startsWith('http') ? rawMat.ImageUrl : `${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}${rawMat.ImageUrl}`)}
            className="w-10 h-10 object-cover rounded-lg border border-slate-200 cursor-pointer hover:scale-110 hover:border-[#18174e] transition-all mx-auto shadow-sm"
        />
    ) : (
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-dashed border-slate-200 mx-auto">
            <ImageIcon className="w-4 h-4" />
        </div>
    )}
</td>
                                            
                                            <td className="py-3 px-4 font-mono font-extrabold text-[#18174e]">{rawMat.Code}</td>
                                            <td className="py-3 px-4">
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${currentCatConfig.classes}`}>
                                                    {rawMat.Category || '—'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 w-fit ${currentSegConfig.classes}`}>
                                                    <span>{currentSegConfig.prefix}</span> <span>{rawMat.Segment || '—'}</span>
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-800 font-semibold">{rawMat.ItemDescription}</td>
                                            <td className="py-3 px-4 text-slate-600 font-mono text-xs bg-slate-50/30">{rawMat.Dimension || '—'}</td>
                                            <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono">{rawMat.ActualCount}</td>
                                            <td className="py-3 px-4 text-slate-500">{rawMat.UOM}</td>
                                            <td className="py-3 px-4">{getRawMaterialHealthBadge(rawMat.ActualCount)}</td>
                                            <td className="py-3 px-4 font-semibold text-slate-700 bg-slate-50/20">{rawMat.AccountTo || '—'}</td>
                                            <td className="py-3 px-4 bg-slate-50/40 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {!showArchivedOnly ? (
                                                        <>
                                                            <button onClick={() => openEditModal(rawMat)} className="p-1 bg-white border border-slate-200 rounded text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                                                            <button onClick={() => openArchiveConfirmation(rawMat)} className="p-1 bg-white border border-slate-200 rounded text-rose-600 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"><Archive className="w-3.5 h-3.5" /></button>
                                                        </>
                                                    ) : (
                                                        <button onClick={() => openUnarchiveConfirmation(rawMat)} className="p-1 bg-white border border-slate-200 rounded text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold px-2 py-0.5"><RotateCcw className="w-3.5 h-3.5" /> Restore</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredRawMaterials.length === 0 && !loading && (
                                    <tr><td colSpan="11" className="text-center py-10 text-slate-400 font-medium italic">No records match queries.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 🌟 IMAGE PREVIEW BOX (LIGHTBOX CONTAINER) */}
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
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-xl flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <Palette className="w-5 h-5 text-[#18174e]" />
                                <h3 className="font-bold text-slate-800 text-base">Global Color Palette Mapping</h3>
                            </div>
                            <button onClick={() => setIsPaletteModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="overflow-y-auto py-4 space-y-6 pr-1 flex-1">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Category Color Configuration</h4>
                                <div className="space-y-2.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                    {categoriesInDB.length === 0 && <p className="text-xs italic text-slate-400">No categories found in system.</p>}
                                    {categoriesInDB.map(cat => {
                                        const config = getCategoryStyles(cat);
                                        const currentIdx = COLOR_OPTIONS.findIndex(c => c.classes === config.classes);
                                        return (
                                            <div key={cat} className="flex items-center justify-between gap-4 bg-white p-2 rounded-lg border border-slate-200/60 shadow-sm">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${config.classes}`}>{cat}</span>
                                                <select value={currentIdx !== -1 ? currentIdx : 5} onChange={(e) => handleCategoryColorChange(cat, e.target.value)} className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 cursor-pointer font-medium focus:outline-none focus:border-[#18174e]">
                                                    {COLOR_OPTIONS.map((opt, i) => <option key={i} value={i}>{opt.prefix} {opt.name}</option>)}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">Segment Color Configuration</h4>
                                <div className="space-y-2.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                    {segmentsInDB.length === 0 && <p className="text-xs italic text-slate-400">No segments found in system.</p>}
                                    {segmentsInDB.map(seg => {
                                        const config = getSegmentStyles(seg);
                                        const currentIdx = COLOR_OPTIONS.findIndex(c => c.classes === config.classes);
                                        return (
                                            <div key={seg} className="flex items-center justify-between gap-4 bg-white p-2 rounded-lg border border-slate-200/60 shadow-sm">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 ${config.classes}`}>
                                                    <span>{config.prefix}</span> <span>{seg}</span>
                                                </span>
                                                <select value={currentIdx !== -1 ? currentIdx : 5} onChange={(e) => handleSegmentColorChange(seg, e.target.value)} className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 cursor-pointer font-medium focus:outline-none focus:border-[#18174e]">
                                                    {COLOR_OPTIONS.map((opt, i) => <option key={i} value={i}>{opt.prefix} {opt.name}</option>)}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end border-t border-slate-100 pt-3 shrink-0">
                            <button onClick={handleSavePaletteToDatabase} className="w-full bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 rounded-xl text-sm cursor-pointer shadow-md transition-colors">
                                Apply Globally to All Devices
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MATERIAL FORM MODAL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-800 text-base">Update Raw Material Profile</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 mt-3">
                            <span className="block text-xs font-bold text-amber-800 uppercase mb-1">Stock Volatility Protection</span>
                            <p className="text-[11px] text-amber-700 leading-relaxed">Current count: <strong>{modalActualCount} {materialUom || 'units'}</strong>.</p>
                        </div>
                        <form onSubmit={handleEditFormSubmit} className="space-y-3 mt-3">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Material Code</label>
                                <input type="text" disabled className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-not-allowed font-mono" value={materialCode} />
                            </div>
       
                            {/* 🌟 IMAGE UPLOAD DROPZONE FIELD INSIDE MODAL */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Image Upload</label>
                                <div className="mt-1 flex items-center gap-3">
                                    {existingImgPreview && !selectedFile && (
                                        <img src={existingImgPreview} alt="Current raw material" className="w-12 h-12 rounded-lg border object-cover shadow-sm" />
                                    )}
                                    <label className="flex-1 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-200 rounded-xl py-3 px-4 transition-all cursor-pointer">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                            <Upload className="w-4 h-4 text-[#18174e]" />
                                            <span>{selectedFile ? selectedFile.name : "Choose profile image..."}</span>
                                        </div>
                                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Category *</label>
                                    <input type="text" required list="m-categories" value={materialCategory} onChange={(e) => setMaterialCategory(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                                    <datalist id="m-categories">{categoriesInDB.map((cat, i) => <option key={i} value={cat} />)}</datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Segment</label>
                                    <input type="text" list="m-segments" value={materialSegment} onChange={(e) => setMaterialSegment(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                                    <datalist id="m-segments">{segmentsInDB.map((seg, i) => <option key={i} value={seg} />)}</datalist>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Item Description *</label>
                                <input type="text" required list="m-descriptions" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                                <datalist id="m-descriptions">{descriptionsInDB.map((desc, i) => <option key={i} value={desc} />)}</datalist>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Dimension</label>
                                    <input type="text" list="m-dimensions" value={materialDimension} onChange={(e) => setMaterialDimension(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                                    <datalist id="m-dimensions">{dimensionsInDB.map((dim, i) => <option key={i} value={dim} />)}</datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">UOM *</label>
                                    <input type="text" required list="m-uoms" value={materialUom} onChange={(e) => setMaterialUom(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                                    <datalist id="m-uoms">{uomsInDB.map((uom, i) => <option key={i} value={uom} />)}</datalist>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Account To</label>
                                <input type="text" list="m-accounts" value={accountTo} onChange={(e) => setAccountTo(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                                <datalist id="m-accounts">{accountsInDB.map((acc, i) => <option key={i} value={acc} />)}</datalist>
                            </div>
                            <div className="flex items-center justify-end gap-2 mt-6 pt-2">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">Cancel</button>
                                <button type="submit" className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Threshold Modal Schema */}
            <ThresholdModal isOpen={isThresholdModalOpen} onClose={() => setIsThresholdModalOpen(false)} categoryType="raw_materials" onSaveSuccess={() => { fetchThresholdSettings(); fetchRawMaterials(); triggerSuccess("Successfully updated threshold configuration."); }} />

            {/* CONFIRMATION MODAL */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-5">
                    <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-5 shadow-2xl relative">
                        <div className="border-b border-slate-100 pb-2"><h3 className="font-bold text-slate-800 text-sm tracking-wide">{confirmModalConfig.title}</h3></div>
                        <p className="text-sm text-slate-600 leading-relaxed mt-3">{confirmModalConfig.message}</p>
                        <div className="flex items-center justify-end gap-2 mt-5">
                            <button type="button" onClick={() => setIsConfirmModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer">Cancel</button>
                            <button type="button" onClick={handleConfirmAction} className={`text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer ${confirmModalConfig.actionType === 'archive' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RawMaterials;