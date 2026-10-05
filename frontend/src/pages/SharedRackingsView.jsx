import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Filter, X, Image as ImageIcon, RefreshCw, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { trackSharedLinkClick } from '../utils/linkTracker';
import TablePagination from '../components/common/TablePagination';
import RackDimensionCell from '../components/common/RackDimensionCell';
import ReserveCountBadge from '../components/common/ReserveCountBadge';

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

function SharedRackingsView() {
    const { isDark } = useTheme();

    const [rawMaterialsList, setRawMaterialsList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [revocationError, setRevocationError] = useState(null);
    const [validatedViewerName, setValidatedViewerName] = useState('');

    // Filters and View Toggles
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSegment, setSelectedSegment] = useState('All Segments');
    const [selectedDescription, setSelectedDescription] = useState('All Item Descriptions');
    const [selectedHealth, setSelectedHealth] = useState('All Health Status');
    const [hideZeroQty, setHideZeroQty] = useState(false);

    // Lightbox image preview state
    const [previewImage, setPreviewImage] = useState(null);

    const [segmentColors, setSegmentColors] = useState({});

    // API Base URL
    const API_BASE_URL = import.meta.env.MODE === 'production'
        ? 'https://one-inventory.onrender.com'
        : 'http://localhost:5000';

    const fetchRawMaterials = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const endpoint = token 
                ? `${API_BASE_URL}/api/raw-materials` 
                : `${API_BASE_URL}/api/raw-materials/shared`;

            const response = await axios.get(endpoint).catch(() => axios.get(`${API_BASE_URL}/api/raw-materials/shared`));

            if (Array.isArray(response.data)) {
                setRawMaterialsList(response.data);
            } else if (response.data && Array.isArray(response.data.data)) {
                setRawMaterialsList(response.data.data);
            } else {
                setRawMaterialsList([]);
            }
            setError(null);
        } catch (err) {
            console.error("Error loading shared raw materials:", err);
            setError("Failed to load records from the server.");
            setRawMaterialsList([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPaletteSettings = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/settings/palette`).catch(() => null);
            if (res && res.data) {
                setSegmentColors(res.data.segmentColors || {});
            }
        } catch (err) {
            // Optional palette fetch, fallback gracefully
        }
    };


    useEffect(() => {
        trackSharedLinkClick();

        const params = new URLSearchParams(window.location.search);
        const linkId = params.get('linkId');
        const viewerParam = params.get('viewer');

        if (viewerParam) {
            setValidatedViewerName(viewerParam);
        }

        if (linkId) {
            axios.get(`${API_BASE_URL}/api/shared-links/${linkId}/validate`)
                .then(res => {
                    if (res.data && res.data.valid) {
                        if (res.data.viewerName) {
                            setValidatedViewerName(res.data.viewerName);
                        }
                    } else {
                        setRevocationError(res.data?.message || 'This shared viewer link has been terminated or deleted by the administrator.');
                    }
                })
                .catch(err => {
                    setRevocationError(err.response?.data?.message || 'This shared viewer link has been terminated or deleted by the administrator.');
                });
        } else {
            setRevocationError('This shared viewer link is invalid, missing parameters, or has been terminated.');
        }

        fetchRawMaterials();
        fetchPaletteSettings();
    }, []);

    // Distinct filter lists
    const segmentsInDB = [...new Set(rawMaterialsList.map(item => item.Segment).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    const descriptionsInDB = [...new Set(rawMaterialsList.map(item => item.ItemDescription).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    const filterSegments = ['All Segments', ...segmentsInDB];
    const filterDescriptions = ['All Item Descriptions', ...descriptionsInDB];

    const getSegmentStyles = (segment) => {
        if (!segment) return { classes: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700", prefix: "⚪" };
        const cleaned = segment.trim().toUpperCase();
        if (segmentColors[cleaned] !== undefined && COLOR_OPTIONS[segmentColors[cleaned]]) {
            return COLOR_OPTIONS[segmentColors[cleaned]];
        }
        const index = segmentsInDB.findIndex(seg => seg.trim().toUpperCase() === cleaned);
        return COLOR_OPTIONS[(index !== -1 ? index : 0) % COLOR_OPTIONS.length];
    };

    const getRawMaterialHealthBadge = (item) => {
        const physical = Number(item?.ActualCount) || 0;
        const reserved = Number(item?.ReserveCount) || 0;
        const actualCount = Math.max(0, physical - reserved);
        const critical = item?.CriticalAlert !== undefined ? Number(item.CriticalAlert) : 0;
        const reorder = item?.RestockWarning !== undefined ? Number(item.RestockWarning) : 10;
        const overstock = item?.MaxStorage !== undefined ? Number(item.MaxStorage) : 1000;

        if (actualCount <= critical) {
            return <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 px-2 py-0.5 rounded font-medium">🔴 Critical</span>;
        }
        if (actualCount <= reorder) {
            return <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 px-2 py-0.5 rounded font-medium">🟡 Re-Stock</span>;
        }
        if (actualCount > overstock) {
            return <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 px-2 py-0.5 rounded font-medium">🔵 Overstock</span>;
        }
        return <span className="text-xs bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800 px-2 py-0.5 rounded font-medium">🟢 Healthy</span>;
    };

    const getCleanItemDescription = (desc, segment) => {
        if (!desc) return '';
        let cleaned = desc
            .replace(/\s*\((new|old)\s*stocks?\)/gi, '')
            .replace(/\s*-(new|old)\s*stocks?/gi, '')
            .replace(/\s*\(fabricated\)/gi, '')
            .replace(/\s*-fabricated/gi, '')
            .trim();
        if (segment && segment !== 'N/A') {
            const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const stripped = cleaned
                .replace(new RegExp(`\\s*\\(${escaped}\\)`, 'gi'), '')
                .replace(new RegExp(`\\s*-\\s*${escaped}`, 'gi'), '')
                .trim();
            if (stripped) {
                cleaned = stripped;
            }
        }
        return cleaned || desc;
    };

    const getItemConditions = (rawMat) => {
        const tags = [];
        const condStr = (rawMat?.Condition || '').toLowerCase().trim();
        const descStr = (rawMat?.ItemDescription || '').toLowerCase();

        if (condStr && condStr !== 'good' && condStr !== 'n/a') {
            if (condStr.includes('old stocks') || condStr.includes('old stock')) tags.push('Old Stocks');
            if (condStr.includes('new stocks') || condStr.includes('new stock')) tags.push('New Stocks');
            if (condStr.includes('fabricated')) tags.push('Fabricated');

            if (tags.length === 0 && rawMat.Condition) {
                tags.push(rawMat.Condition);
            }
        } else {
            if (descStr.includes('(old stocks)') || descStr.includes('(old stock)') || descStr.includes('-old stocks') || descStr.includes('-old stock')) {
                tags.push('Old Stocks');
            }
            if (descStr.includes('(new stocks)') || descStr.includes('(new stock)') || descStr.includes('-new stocks') || descStr.includes('-new stock')) {
                tags.push('New Stocks');
            }
            if (descStr.includes('(fabricated)') || descStr.includes('-fabricated')) {
                tags.push('Fabricated');
            }
        }
        return tags;
    };

    // Client-side filtering
    const filteredRawMaterials = rawMaterialsList.filter(item => {
        if (item.isArchived) return false;
        if (hideZeroQty && (item.ActualCount === 0 || item.ActualCount === '0')) return false;

        const matchesSearch = !searchTerm.trim() ||
            (item.Segment && item.Segment.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.ItemDescription && item.ItemDescription.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.Code && item.Code.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.Dimension && item.Dimension.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesSegment = selectedSegment === 'All Segments' || item.Segment === selectedSegment;
        const matchesDescription = selectedDescription === 'All Item Descriptions' || item.ItemDescription === selectedDescription;

        const actualCount = Number(item.ActualCount) || 0;
        const critical = item.CriticalAlert !== undefined ? Number(item.CriticalAlert) : 0;
        const reorder = item.RestockWarning !== undefined ? Number(item.RestockWarning) : 10;
        const overstock = item.MaxStorage !== undefined ? Number(item.MaxStorage) : 1000;

        let matchesHealth = true;
        if (selectedHealth === 'Healthy') {
            matchesHealth = actualCount > reorder && actualCount <= overstock;
        } else if (selectedHealth === 'Re-Stock') {
            matchesHealth = actualCount > critical && actualCount <= reorder;
        } else if (selectedHealth === 'Critical') {
            matchesHealth = actualCount <= critical;
        } else if (selectedHealth === 'Overstock') {
            matchesHealth = actualCount > overstock;
        }

        return matchesSearch && matchesSegment && matchesDescription && matchesHealth;
    }).sort((a, b) => {
        const descA = (a.ItemDescription || '').trim();
        const descB = (b.ItemDescription || '').trim();
        const cmp = descA.localeCompare(descB, undefined, { sensitivity: 'base', numeric: true });
        if (cmp !== 0) return cmp;
        const dimA = (a.Dimension || '').trim();
        const dimB = (b.Dimension || '').trim();
        const dimCmp = dimA.localeCompare(dimB, undefined, { sensitivity: 'base', numeric: true });
        if (dimCmp !== 0) return dimCmp;
        return (a.Code || '').localeCompare(b.Code || '', undefined, { sensitivity: 'base', numeric: true });
    });

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedSegment, selectedDescription, selectedHealth, hideZeroQty]);

    const totalRows = filteredRawMaterials.length;
    const paginatedRawMaterials = filteredRawMaterials.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    if (revocationError) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#0b0a26] via-[#18174e] to-[#242270] text-white px-6 relative overflow-hidden pb-12 select-none font-sans">
                {/* Ambient background glow objects */}
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#ff6600]/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

                {/* BRAND LOGO SECTION */}
                <div className="flex flex-col items-center text-center mb-8 relative z-10">
                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 shadow-2xl mb-2">
                        <div className="bg-white rounded-full p-2 flex items-center justify-center shadow-inner w-16 h-16">
                            <img
                                src="/cropped_circle_image.png"
                                alt="USSP logo"
                                className="w-full h-full object-contain"
                                onError={(e) => { e.target.style.display = 'none'; }}
                            />
                        </div>
                    </div>
                    <h1 className="font-black text-2xl uppercase text-white mt-3 drop-shadow-md tracking-wide">
                        USSP INVENTORY
                    </h1>
                    <h2 className="text-[11px] font-bold text-slate-300 uppercase opacity-90 mt-0.5">
                        Upright Storage Solutions PH
                    </h2>
                </div>

                {/* MAIN CARD CONTAINER */}
                <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-7 shadow-2xl relative z-10 flex flex-col gap-5">
                    {/* Lockout / 404 Status Pill Badge */}
                    <div className="flex items-center justify-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 border border-rose-500/40 text-rose-300">
                            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                            404 &bull; System Maintenance &amp; Link Inactive
                        </span>
                    </div>

                    {/* Title & Subtitle */}
                    <div className="text-center">
                        <h2 className="text-lg font-black uppercase text-white tracking-tight">
                            Access Suspended / 404 Not Found
                        </h2>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {revocationError}
                        </p>
                    </div>

                    {/* Admin Advisory Notice Box */}
                    <div className="rounded-2xl bg-white/10 border border-white/15 p-4 flex flex-col gap-1.5 text-left">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#ff6600]" />
                            Admin Advisory Notice
                        </span>
                        <p className="text-xs text-slate-200 italic leading-relaxed">
                            &ldquo;This viewer link has been terminated or deleted by the administrator. Live rackings record access is suspended.&rdquo;
                        </p>
                    </div>

                    {/* Viewer Context Tag */}
                    {validatedViewerName && (
                        <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center text-xs text-slate-300">
                            Viewer Fullname: <span className="font-semibold text-white">{validatedViewerName}</span> &bull; Status: <span className="font-bold text-rose-400 uppercase">Terminated / 404</span>
                        </div>
                    )}

                    {/* Refresh / Retry Button */}
                    <div className="flex flex-col gap-2.5 pt-1">
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#ff6600] to-[#ff8533] py-3 px-6 text-sm font-bold text-white shadow-lg hover:shadow-orange-500/25 active:scale-[0.98] transition-all cursor-pointer w-full"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Check Link Status Again</span>
                        </button>
                    </div>
                </div>

                {/* SECURITY NOTICE FOOTER */}
                <p className="mt-8 text-[12px] font-medium text-slate-400 text-center relative z-10">
                    Corporate Security Protocols Enforced &bull; Encrypted Session
                </p>

                {/* SYSTEM COPYRIGHT FOOTER */}
                <div className="absolute bottom-4 left-0 right-0 text-center px-4 z-10">
                    <p className="text-[10px] font-semibold text-slate-400 tracking-wide">
                        Copyright &copy; 2026 Upright Storage Solutions PH. All Rights Reserved.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${isDark ? 'bg-[#090a0f] text-slate-100' : 'bg-[#f5f6f7] text-slate-800'} p-4 sm:p-6 lg:p-8 font-sans antialiased transition-colors duration-200`}>
            
            {/* CONTAINER CARD: TABLE & FILTERS ONLY */}
            <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100 text-slate-600'} border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col gap-5 transition-colors duration-200`}>

                {/* FILTER CONTROLS MASTER ROW */}
                <div className="flex flex-col gap-3">
                    
                    {/* TOP CONTROLS: HIDE 0 QTY */}
                    <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'} flex-shrink-0`}>
                            <Filter className={`w-4 h-4 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
                            <span>Filter</span>
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
                        </div>
                    </div>

                    {/* SEARCH & DROPDOWN FILTERS GRID */}
                    <div className="flex overflow-x-auto gap-2 items-center pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-4 md:pb-0">

                        {/* 1. SEARCH INPUT */}
                        <div className="min-w-[180px] w-full md:min-w-0">
                            <div className="relative w-full">
                                <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                                <input 
                                    type="text" 
                                    placeholder="Search Segment, Description..." 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none`} 
                                />
                            </div>
                        </div>

                        {/* 2. ALL SEGMENTS DROPDOWN */}
                        <div className="min-w-[150px] w-full md:min-w-0">
                            <select 
                                value={selectedSegment} 
                                onChange={(e) => setSelectedSegment(e.target.value)} 
                                className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border font-semibold rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full`}
                            >
                                {filterSegments.map(seg => {
                                    if (seg === 'All Segments') return <option key={seg} value={seg}>{seg}</option>;
                                    const config = getSegmentStyles(seg);
                                    return <option key={seg} value={seg}>{config.prefix} {seg}</option>;
                                })}
                            </select>
                        </div>

                        {/* 3. ALL ITEM DESCRIPTIONS DROPDOWN */}
                        <div className="min-w-[170px] w-full md:min-w-0">
                            <select 
                                value={selectedDescription} 
                                onChange={(e) => setSelectedDescription(e.target.value)} 
                                className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full truncate`}
                            >
                                {filterDescriptions.map(desc => <option key={desc} value={desc}>{desc}</option>)}
                            </select>
                        </div>

                        {/* 4. ALL CONDITIONS DROPDOWN */}
                        <div className="min-w-[150px] w-full md:min-w-0">
                            <select 
                                value={selectedHealth} 
                                onChange={(e) => setSelectedHealth(e.target.value)} 
                                className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none font-medium w-full cursor-pointer`}
                            >
                                <option value="All Health Status">All Conditions</option>
                                <option value="Healthy">🟢 Healthy Stock</option>
                                <option value="Re-Stock">🟡 Restock Warning</option>
                                <option value="Critical">🔴 Critical Stock</option>
                                <option value="Overstock">🔵 Overstocked</option>
                            </select>
                        </div>

                    </div>

                    <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-full mt-1`}></div>
                </div>

                {/* MAIN TABLE MASTERLIST */}
                <div className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'} rounded-xl border shadow-sm overflow-hidden`}>
                    <TablePagination
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        rowsPerPage={rowsPerPage}
                        setRowsPerPage={setRowsPerPage}
                        totalRows={totalRows}
                    />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className={`text-white font-bold uppercase text-xs sm:text-sm ${isDark ? 'bg-[#0f111d] border-b border-slate-800' : 'bg-[#18174e]'}`}>
                                    <th className="py-3 px-3 text-center whitespace-nowrap">Image</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Item Description</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Dimension</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Segment</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-center">Actual Count</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-center">Reserve Count</th>
                                    <th className="py-3 px-4 whitespace-nowrap">UOM</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Condition</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-slate-800/80 bg-[#090b10]' : 'divide-slate-100 bg-white'}`}>
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-12 text-green-600 font-medium italic">
                                            <div className="flex items-center justify-center gap-2">
                                                <RefreshCw className="w-4 h-4 animate-spin text-green-600" />
                                                <span>Fetching secure rackings data from database...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan="8" className="text-center py-8 text-rose-600 font-semibold">{error}</td>
                                    </tr>
                                ) : paginatedRawMaterials.map((rawMat) => {
                                    const currentSegConfig = getSegmentStyles(rawMat.Segment);

                                    return (
                                        <tr 
                                            key={rawMat._id || rawMat.Code} 
                                            className={`group ${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'} transition-colors font-medium whitespace-nowrap text-sm`}
                                        >
                                            <td className="py-2 px-3 text-center whitespace-nowrap">
                                                {rawMat.ImageUrl ? (
                                                    <div className="relative inline-block">
                                                        <img
                                                            src={rawMat.ImageUrl}
                                                            alt={rawMat.ItemDescription || "Material"}
                                                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                                                            onClick={() => setPreviewImage(rawMat.ImageUrl)}
                                                            loading="lazy"
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                        <div className="hidden w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 items-center justify-center text-slate-400">
                                                            <ImageIcon className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                                                        <ImageIcon className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </td>

                                            <td 
                                                className={`py-3 px-4 font-semibold min-w-[200px] whitespace-normal break-words ${isDark ? 'text-slate-100' : 'text-slate-800'}`} 
                                                title={rawMat.ItemDescription}
                                            >
                                                <div>{getCleanItemDescription(rawMat.ItemDescription, rawMat.Segment) || '—'}</div>
                                                {(() => {
                                                    const conditions = getItemConditions(rawMat);
                                                    if (!conditions || conditions.length === 0) return null;
                                                    return (
                                                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                            {conditions.map((cond, idx) => {
                                                                let badgeStyle = isDark 
                                                                    ? 'bg-slate-800 text-slate-300 border-slate-700' 
                                                                    : 'bg-slate-100 text-slate-700 border-slate-200';
                                                                
                                                                if (cond === 'New Stocks') {
                                                                    badgeStyle = isDark
                                                                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                                                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                                                } else if (cond === 'Old Stocks') {
                                                                    badgeStyle = isDark
                                                                        ? 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                                                                        : 'bg-amber-50 text-amber-700 border-amber-200';
                                                                } else if (cond === 'Fabricated') {
                                                                    badgeStyle = isDark
                                                                        ? 'bg-purple-950/60 text-purple-300 border-purple-800/80'
                                                                        : 'bg-purple-50 text-purple-700 border-purple-200';
                                                                }

                                                                return (
                                                                    <span 
                                                                        key={idx} 
                                                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border leading-none inline-flex items-center gap-1 ${badgeStyle}`}
                                                                    >
                                                                        <span>{cond === 'New Stocks' ? '🟢' : cond === 'Old Stocks' ? '🟡' : cond === 'Fabricated' ? '🟣' : '🏷️'}</span>
                                                                        <span>{cond}</span>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}
                                            </td>

                                            <td 
                                                className="py-3 px-4 min-w-[120px] whitespace-normal break-words" 
                                                title={rawMat.Dimension}
                                            >
                                                <RackDimensionCell dimension={rawMat.Dimension} isDark={isDark} />
                                            </td>

                                            <td className="py-3 px-4">
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 w-fit ${currentSegConfig.classes}`}>
                                                    <span>{rawMat.Segment || '—'}</span>
                                                </span>
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <span className={`font-bold font-mono text-sm ${Math.max(0, (Number(rawMat.ActualCount) || 0) - (Number(rawMat.ReserveCount) || 0)) === 0 ? 'text-rose-500 font-extrabold' : (isDark ? 'text-white' : 'text-slate-900')}`}>
                                                        {Math.max(0, (Number(rawMat.ActualCount) || 0) - (Number(rawMat.ReserveCount) || 0)).toLocaleString()}
                                                    </span>
                                                    {Number(rawMat.ReserveCount) > 0 && (
                                                        <span className="text-[10px] text-slate-400 font-mono leading-tight mt-0.5 select-none" title={`Total Physical Stock: ${(Number(rawMat.ActualCount) || 0).toLocaleString()} | Reserved: ${Number(rawMat.ReserveCount).toLocaleString()}`}>
                                                            (Total: {(Number(rawMat.ActualCount) || 0).toLocaleString()})
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                <ReserveCountBadge rawMat={rawMat} isDark={isDark} />
                                            </td>

                                            <td className={`py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {rawMat.UOM}
                                            </td>
                                            <td className="py-3 px-4">
                                                {getRawMaterialHealthBadge(rawMat)}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredRawMaterials.length === 0 && !loading && !error && (
                                    <tr>
                                        <td colSpan="8" className="text-center py-10 text-red-600 font-medium italic">
                                            No records match the selected filters or search queries.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>

            {/* LIGHTBOX CONTAINER FOR FULL IMAGE PREVIEW */}
            {previewImage && (
                <div 
                    className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[60] p-4" 
                    onClick={() => setPreviewImage(null)}
                >
                    <div 
                        className="relative bg-white dark:bg-[#141622] p-2 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border dark:border-slate-700" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setPreviewImage(null)} 
                            className="absolute top-4 right-4 bg-slate-900/80 text-white hover:bg-slate-800 p-2 rounded-full transition-all cursor-pointer z-10 shadow"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <img 
                            src={previewImage} 
                            alt="Preview Material" 
                            className="w-full h-auto max-h-[80vh] object-contain rounded-xl" 
                        />
                    </div>
                </div>
            )}

        </div>
    );
}

export default SharedRackingsView;
