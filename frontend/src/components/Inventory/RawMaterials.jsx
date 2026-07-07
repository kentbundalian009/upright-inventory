import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Filter, X, Edit2, Archive, EyeOff, Sliders, RotateCcw, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import PageHeader from '../Common/PageHeader';
import ThresholdModal from '../Common/ThresholdModal';

// Static palette ng 5 kulay na hiningi mo: 🟡, 🟢, 🔵, 🟣, 🔴
const COLOR_PALETTE = [
    { classes: "bg-amber-50 text-amber-700 border-amber-200", prefix: "" },   // Yellow
    { classes: "bg-emerald-50 text-emerald-700 border-emerald-200", prefix: "" }, // Green
    { classes: "bg-blue-50 text-blue-700 border-blue-200", prefix: "" },     // Blue
    { classes: "bg-purple-50 text-purple-700 border-purple-200", prefix: "" }, // Purple
    { classes: "bg-rose-50 text-rose-700 border-rose-200", prefix: "" }       // Red
];

function RawMaterials() {
    // 1. DATABASE AT LIFECYCLE STATES
    const [rawMaterialsList, setRawMaterialsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Toast Notification States
    const [successMessage, setSuccessMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    // Toggle feature para sa Active vs Archived view
    const [showArchivedOnly, setShowArchivedOnly] = useState(false);
    // States para sa Filtering at Search
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [selectedSegment, setSelectedSegment] = useState('All Segments');
    const [selectedDescription, setSelectedDescription] = useState('All Item Descriptions');
    const [selectedHealth, setSelectedHealth] = useState('All Health Status');

    // Modals at Config States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
    const [currentId, setCurrentId] = useState(null);
    // Custom Confirmation Modal States
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmModalConfig, setConfirmModalConfig] = useState({
        title: '',
        message: '',
        actionType: '', // 'archive' o 'unarchive'
        selectedItem: null
    });
    // Form Fields para sa Edit
    const [materialCode, setMaterialCode] = useState('');
    const [materialCategory, setMaterialCategory] = useState('');
    const [materialSegment, setMaterialSegment] = useState('');
    const [itemDescription, setItemDescription] = useState('');
    const [materialDimension, setMaterialDimension] = useState('');
    const [materialUom, setMaterialUom] = useState('');
    const [accountTo, setAccountTo] = useState('');
    const [modalActualCount, setModalActualCount] = useState(0);
    // Live Database-driven Threshold System Configuration Parameters
    const [thresholds, setThresholds] = useState({
        critical: 5,
        reorder: 15,
        overstock: 50,
    });

    // Helper para sa Auto-dismiss ng Success Toast
    const triggerSuccess = (message) => {
        setSuccessMessage(message);
        setErrorMessage(null);
        setTimeout(() => {
            setSuccessMessage(null);
        }, 4000);
    };

    // 2. READ: FETCH DATA & THRESHOLDS FROM BACKEND
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
        } catch (err) {
            console.error("Error fetching thresholds config schema:", err);
        }
    };

    const fetchRawMaterials = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/raw-materials');
            if (Array.isArray(response.data)) {
                setRawMaterialsList(response.data);
            } else if (response.data && Array.isArray(response.data.data)) {
                setRawMaterialsList(response.data.data);
            } else {
                setRawMaterialsList([]);
            }
            setError(null);
        } catch (err) {
            console.error("Error fetching raw materials:", err);
            setError("Hindi makuha ang mga raw materials mula sa server.");
            setRawMaterialsList([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchThresholdSettings();
        fetchRawMaterials();
    }, []);

    // Open Edit Modal Form Handler
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
        setIsEditModalOpen(true);
    };

    // Edit Submit Handler
    const handleEditFormSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            Code: materialCode.trim(),
            Category: materialCategory.trim(),
            Segment: materialSegment.trim(),
            ItemDescription: itemDescription.trim(),
            Dimension: materialDimension.trim(),
            UOM: materialUom.trim(),
            AccountTo: accountTo.trim(),
        };

        try {
            await axios.put(`/api/raw-materials/${currentId}`, payload);
            setIsEditModalOpen(false);
            triggerSuccess("Successfully updated raw material profile details.");
            fetchRawMaterials();
        } catch (err) {
            setErrorMessage(err.response?.data?.message || "Nagka-error sa pag-update ng raw material.");
        }
    };

    // TRIGGER ARCHIVE MODAL
    const openArchiveConfirmation = (item) => {
        setConfirmModalConfig({
            title: 'Archive Raw Material',
            message: `Are you sure you want to archive "${item.ItemDescription}" (${item.Code})?`,
            actionType: 'archive',
            selectedItem: item
        });
        setIsConfirmModalOpen(true);
    };

    // TRIGGER UNARCHIVE MODAL
    const openUnarchiveConfirmation = (item) => {
        setConfirmModalConfig({
            title: 'Restore Raw Material',
            message: `Are you sure you want to restore "${item.ItemDescription}" (${item.Code})?`,
            actionType: 'unarchive',
            selectedItem: item
        });
        setIsConfirmModalOpen(true);
    };

    // CONFIRM MODAL SUBMIT HANDLER
    const handleConfirmAction = async () => {
        const { actionType, selectedItem } = confirmModalConfig;
        if (!selectedItem) return;

        setIsConfirmModalOpen(false);

        try {
            if (actionType === 'archive') {
                await axios.delete(`/api/raw-materials/${selectedItem._id}`);
                triggerSuccess(`Successfully archived "${selectedItem.ItemDescription}".`);
            } else if (actionType === 'unarchive') {
                await axios.put(`/api/raw-materials/${selectedItem._id}/unarchive`);
                triggerSuccess(`Successfully restored "${selectedItem.ItemDescription}" from the vault.`);
            }
            fetchRawMaterials();
        } catch (err) {
            setErrorMessage(
                actionType === 'archive' 
                    ? "Hindi mai-archive ang raw material." 
                    : "Hindi mai-restore ang profile details mula sa vault."
            );
        }
    };

    // Unique arrays para sa Filters at Datalists ng Edit Modal
    const categoriesInDB = [...new Set(rawMaterialsList.map(item => item.Category).filter(Boolean))];
    const segmentsInDB = [...new Set(rawMaterialsList.map(item => item.Segment).filter(Boolean))].sort();
    const descriptionsInDB = [...new Set(rawMaterialsList.map(item => item.ItemDescription).filter(Boolean))];
    const dimensionsInDB = [...new Set(rawMaterialsList.map(item => item.Dimension).filter(Boolean))];
    const uomsInDB = [...new Set(rawMaterialsList.map(item => item.UOM).filter(Boolean))];
    const accountsInDB = [...new Set(rawMaterialsList.map(item => item.AccountTo).filter(Boolean))];

    const filterCategories = ['All Categories', ...categoriesInDB];
    const filterSegments = ['All Segments', ...segmentsInDB];
    const filterDescriptions = ['All Item Descriptions', ...descriptionsInDB];

    // 🌟 FIX AT FIXTURE LOGIC: Index-Based Absolute Palette Map Function
    // Dito, ibinabase natin ang kulay sa permanenteng posisyon ng Segment sa array ng mga natatanging segment mula sa database.
    // Tinitiyak nito na walang magiging magkapareho (hangga't kasya sa 5 kulay) at tuluy-tuloy na magbabago habang nagdadagdag ka ng bago nang hindi nagre-reset.
    const getSegmentStyles = (segment) => {
        if (!segment) return { classes: "bg-slate-50 text-slate-600 border-slate-200", prefix: "⚪" };
        
        const cleaned = segment.trim().toUpperCase();
        
        // Hanapin ang permanenteng index ng segment na ito sa lahat ng unique segments na nakuha sa database natin
        const segmentIndex = segmentsInDB.findIndex(seg => seg.trim().toUpperCase() === cleaned);
        
        // Kung hindi mahanap (hal. pansamantalang loading), bigyan ng fallback index
        const targetIndex = segmentIndex !== -1 ? segmentIndex : 0;
        
        // Gamitin ang modulo (%) operation para maging ligtas kung sakaling lumampas sa 5 ang kabuuang segments mo
        return COLOR_PALETTE[targetIndex % COLOR_PALETTE.length];
    };

    // CONSISTENT UI BADGE LOGIC BASED ON LIVE THRESHOLDS
    const getRawMaterialHealthBadge = (actualCount) => {
        if (actualCount <= thresholds.critical) {
            return <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-medium">🔴 Critical</span>;
        }
        if (actualCount <= thresholds.reorder) {
            return <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium">🟡 Re-Stock</span>;
        }
        if (actualCount > thresholds.overstock) {
            return <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">🔵 Overstock</span>;
        }
        return <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded font-medium">🟢 Healthy</span>;
    };

    // 5. SEPARATION & FILTERING LOGIC
    const currentDisplayList = rawMaterialsList.filter(item => 
        showArchivedOnly ? item.isArchived === true : !item.isArchived
    );
    const filteredRawMaterials = currentDisplayList.filter(item => {
        const matchesCategory = selectedCategory === 'All Categories' || item.Category === selectedCategory;
        const matchesSegment = selectedSegment === 'All Segments' || item.Segment === selectedSegment;
        const matchesDescription = selectedDescription === 'All Item Descriptions' || item.ItemDescription === selectedDescription;

        let statusText = 'Healthy';
        if (item.ActualCount <= thresholds.critical) statusText = 'Critical';
        else if (item.ActualCount <= thresholds.reorder) statusText = 'Re-Stock';
        else if (item.ActualCount > thresholds.overstock) statusText = 'Overstock';
        
        const matchesHealth = selectedHealth === 'All Health Status' || statusText === selectedHealth;

        const matchesSearch =
            (item.Code && item.Code.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.Dimension && item.Dimension.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.ItemDescription && item.ItemDescription.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.AccountTo && item.AccountTo.toLowerCase().includes(searchTerm.toLowerCase()));

        return matchesCategory && matchesSegment && matchesDescription && matchesHealth && matchesSearch;
    });

    const activeCount = rawMaterialsList.filter(item => !item.isArchived).length;
    const archivedCount = rawMaterialsList.filter(item => item.isArchived).length;

    return (
        <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative">
            <PageHeader activeTab="raw-materials" />

            {/* 🎉 SUCCESS NOTIFICATION TOAST */}
            {successMessage && (
                <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold">{successMessage}</span>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ⚠️ ERROR NOTIFICATION TOAST */}
            {errorMessage && (
                <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span className="text-sm font-semibold">{errorMessage}</span>
                    <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 ml-2 cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-6">

                {/* FILTER & CONTROLS SECTION */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                            <Filter className="w-4 h-4 text-[#18174e]" />
                            <span>{showArchivedOnly ? 'Viewing Archived Raw Materials Vault' : 'Filter Raw Materials'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsThresholdModalOpen(true)}
                                className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                            >
                                <Sliders className="w-3.5 h-3.5 text-[#18174e]" /> Threshold Settings
                            </button>

                            <button
                                onClick={() => setShowArchivedOnly(!showArchivedOnly)}
                                className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                    showArchivedOnly 
                                        ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {showArchivedOnly ? (
                                    <>
                                        <EyeOff className="w-3.5 h-3.5" /> Show Active Materials ({activeCount})
                                    </>
                                ) : (
                                    <>
                                        <Archive className="w-3.5 h-3.5" /> View Archive Vault ({archivedCount})
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 items-center mt-2">
                        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full">
                            {filterCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>

                        {/* FIXED DYNAMIC DROPDOWN SELECTION */}
                        <select 
                            value={selectedSegment} 
                            onChange={(e) => setSelectedSegment(e.target.value)} 
                            className="bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full"
                        >
                            {filterSegments.map(seg => {
                                if (seg === 'All Segments') return <option key={seg} value={seg}>{seg}</option>;
                                const config = getSegmentStyles(seg);
                                return (
                                    <option key={seg} value={seg}>
                                        {config.prefix} {seg}
                                    </option>
                                );
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
                            <input type="text" placeholder="Search Code, Description, Dimension..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none text-slate-700" />
                        </div>
                    </div>
                    <div className="h-px bg-slate-100 w-full mt-3"></div>
                </div>

                {/* TABLE MASTERLIST CONTAINER */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="text-white font-bold bg-[#18174e] uppercase text-sm">
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
                                    <tr>
                                        <td colSpan="7" className="text-center py-10 text-slate-400 font-medium italic">
                                            <div className="flex items-center justify-center gap-2">
                                                <span>Fetching secure rackings data from database...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan="10" className="text-center py-8 text-rose-600 font-semibold">
                                            {error}
                                        </td>
                                    </tr>
                                ) : filteredRawMaterials.map((rawMat) => (
                                    <tr key={rawMat._id || rawMat.Code} className="hover:bg-slate-50/80 transition-colors text-slate-600 font-medium whitespace-nowrap text-sm">
                                        <td className="py-3 px-4 font-mono font-extrabold text-[#18174e]">{rawMat.Code}</td>
                                        <td className="py-3 px-4 text-slate-700">{rawMat.Category || '—'}</td>
                                        
                                        {/* TABLE ROW BADGE: Aturdidong index computation para hindi mag-collaps sa puro iisang kulay */}
                                        <td className="py-3 px-4">
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 w-fit ${getSegmentStyles(rawMat.Segment).classes}`}>
                                                <span>{getSegmentStyles(rawMat.Segment).prefix}</span>
                                                <span>{rawMat.Segment || '—'}</span>
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
                                                        <button 
                                                            onClick={() => openEditModal(rawMat)} 
                                                            className="p-1 bg-white border border-slate-200 rounded text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => openArchiveConfirmation(rawMat)} 
                                                            className="p-1 bg-white border border-slate-200 rounded text-rose-600 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                                                        >
                                                            <Archive className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button 
                                                        onClick={() => openUnarchiveConfirmation(rawMat)} 
                                                        className="p-1 bg-white border border-slate-200 rounded text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold px-2 py-0.5"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                
                                {filteredRawMaterials.length === 0 && !loading && (
                                    <tr>
                    <td colSpan="10" className="text-center py-10 text-slate-400 font-medium italic">
                      <div className="flex items-center justify-center gap-2">
                        <span>No records match the selected filters or search queries.</span>
                      </div>
                    </td>
                  </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* EDIT MODAL FORM */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-800 text-base">Update Raw Material Profile</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 mt-3">
                            <span className="block text-xs font-bold text-amber-800 uppercase mb-1">Stock Volatility Protection</span>
                            <p className="text-[11px] text-amber-700 leading-relaxed">
                                Current count: <strong>{modalActualCount} {materialUom || 'units'}</strong>. For stock quantity updates, manage inventory inputs via their designated supply chain log modules.
                            </p>
                        </div>

                        <form onSubmit={handleEditFormSubmit} className="space-y-3 mt-3">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Material Code</label>
                                <input type="text" disabled className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-not-allowed font-mono" value={materialCode} />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Category *</label>
                                    <input type="text" required list="m-categories" placeholder="Category" value={materialCategory} onChange={(e) => setMaterialCategory(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                                    <datalist id="m-categories">{categoriesInDB.map((cat, i) => <option key={i} value={cat} />)}</datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Segment</label>
                                    <input type="text" list="m-segments" placeholder="Segment" value={materialSegment} onChange={(e) => setMaterialSegment(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                                    <datalist id="m-segments">{segmentsInDB.map((seg, i) => <option key={i} value={seg} />)}</datalist>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Item Description *</label>
                                <input type="text" required list="m-descriptions" placeholder="Enter details description" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                                <datalist id="m-descriptions">{descriptionsInDB.map((desc, i) => <option key={i} value={desc} />)}</datalist>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Dimension</label>
                                    <input type="text" list="m-dimensions" placeholder="Dimension" value={materialDimension} onChange={(e) => setMaterialDimension(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                                    <datalist id="m-dimensions">{dimensionsInDB.map((dim, i) => <option key={i} value={dim} />)}</datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">UOM *</label>
                                    <input type="text" required list="m-uoms" placeholder="UOM" value={materialUom} onChange={(e) => setMaterialUom(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                                    <datalist id="m-uoms">{uomsInDB.map((uom, i) => <option key={i} value={uom} />)}</datalist>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Account To</label>
                                <input type="text" list="m-accounts" placeholder="Owner Assignee" value={accountTo} onChange={(e) => setAccountTo(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
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

            {/* Reusable Threshold Modal */}
            <ThresholdModal 
                isOpen={isThresholdModalOpen}
                onClose={() => setIsThresholdModalOpen(false)}
                categoryType="raw_materials"
                onSaveSuccess={() => {
                    fetchThresholdSettings();
                    fetchRawMaterials();
                    triggerSuccess("Successfully updated threshold configuration.");
                }}
            />

            {/* 🛡️ TOP-CENTER CUSTOM CONFIRMATION MODAL */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-5 animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-5 shadow-2xl relative animate-in slide-in-from-top-5 duration-300">
                        <div className="border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-slate-800 text-sm tracking-wide">
                                {confirmModalConfig.title}
                            </h3>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed mt-3">
                            {confirmModalConfig.message}
                        </p>
                        <div className="flex items-center justify-end gap-2 mt-5">
                            <button 
                                type="button" 
                                onClick={() => setIsConfirmModalOpen(false)} 
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                onClick={handleConfirmAction} 
                                className={`text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer ${
                                    confirmModalConfig.actionType === 'archive' 
                                        ? 'bg-rose-600 hover:bg-rose-700' 
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
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

export default RawMaterials;