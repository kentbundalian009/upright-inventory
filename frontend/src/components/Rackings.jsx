import React, { useState, useEffect, useMemo } from 'react';
import { Search, AlertCircle, Filter, X, Edit2, Archive, EyeOff, Sliders, RotateCcw, CheckCircle2, Palette, Image as ImageIcon, Upload, Trash2, Share2, Copy, Coins, ChevronLeft, ChevronRight, Link2, User, Info, Loader2 } from 'lucide-react';
import axios from 'axios';
import PageHeader from './layout/PageHeader';
import TablePagination from './common/TablePagination';
import { useTheme } from '../context/ThemeContext';
import RackDimensionCell, { parseToFormFields, buildDimensionString } from './common/RackDimensionCell';
import ReserveCountBadge from './common/ReserveCountBadge';

// Lahat ng pagpipiliang kulay na gagamitin sa system globally
const COLOR_OPTIONS = [
    { name: 'Emerald / Green', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800', rowBg: 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.16] dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border-l-4 border-l-emerald-500', prefix: '🟢' },
    { name: 'Blue / Indigo', classes: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800', rowBg: 'bg-blue-500/[0.08] hover:bg-blue-500/[0.16] dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border-l-4 border-l-blue-500', prefix: '🔵' },
    { name: 'Amber / Orange', classes: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800', rowBg: 'bg-amber-500/[0.08] hover:bg-amber-500/[0.16] dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border-l-4 border-l-amber-500', prefix: '🟡' },
    { name: 'Rose / Red', classes: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800', rowBg: 'bg-rose-500/[0.08] hover:bg-rose-500/[0.16] dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border-l-4 border-l-rose-500', prefix: '🔴' },
    { name: 'Orange', classes: 'bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800', rowBg: 'bg-orange-500/[0.08] hover:bg-orange-500/[0.16] dark:bg-orange-950/30 dark:hover:bg-orange-950/50 border-l-4 border-l-orange-500', prefix: '🟠' },
    { name: 'Purple / Violet', classes: 'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800', rowBg: 'bg-purple-500/[0.08] hover:bg-purple-500/[0.16] dark:bg-purple-950/30 dark:hover:bg-purple-950/50 border-l-4 border-l-purple-500', prefix: '🟣' },
    { name: 'Slate / Muted Gray', classes: 'bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', rowBg: 'bg-slate-500/[0.08] hover:bg-slate-500/[0.16] dark:bg-slate-900/40 dark:hover:bg-slate-900/60 border-l-4 border-l-slate-400', prefix: '⚪' },
    { name: 'Cyan / Teal', classes: 'bg-cyan-50 text-cyan-700 border-cyan-200/60 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800', rowBg: 'bg-cyan-500/[0.08] hover:bg-cyan-500/[0.16] dark:bg-cyan-950/30 dark:hover:bg-cyan-950/50 border-l-4 border-l-cyan-500', prefix: '🌐' }
];

function InventoryRawMaterials() {
    const { isDark } = useTheme();
    const userRole = localStorage.getItem("SystemRole") || "Inventory";
    const isViewer = false;

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

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Modals visibility states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isPaletteModalOpen, setIsPaletteModalOpen] = useState(false);
    const [currentId, setCurrentId] = useState(null);

    // Share Link Modal States
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [viewerFullname, setViewerFullname] = useState('');
    const [generatedShareLink, setGeneratedShareLink] = useState(null);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [isLinkCopied, setIsLinkCopied] = useState(false);

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
    const [dimHeight, setDimHeight] = useState('');
    const [dimWidth, setDimWidth] = useState('');
    const [dimWidthType, setDimWidthType] = useState('W');
    const [dimDepth, setDimDepth] = useState('');
    const [dimProfile, setDimProfile] = useState('');
    const [isCustomDim, setIsCustomDim] = useState(false);
    const [materialUom, setMaterialUom] = useState('');
    const [accountTo, setAccountTo] = useState('');
    const [modalActualCount, setModalActualCount] = useState(0);
    const [materialAcquisitionCost, setMaterialAcquisitionCost] = useState('');

    // 🌟 FILE UPLOAD STATES
    const [selectedFile, setSelectedFile] = useState(null);
    const [existingImgPreview, setExistingImgPreview] = useState('');
    const [isCompressingImg, setIsCompressingImg] = useState(false);
    const [isSavingMat, setIsSavingMat] = useState(false);

    // Item-specific threshold states for Add/Edit
    const [criticalAlert, setCriticalAlert] = useState(0);
    const [restockWarning, setRestockWarning] = useState(10);
    const [maxStorage, setMaxStorage] = useState(1000);

    // Condition states for Add / Edit Rackings item
    const [isOldStocks, setIsOldStocks] = useState(false);
    const [isNewStocks, setIsNewStocks] = useState(false);
    const [isFabricated, setIsFabricated] = useState(false);

    const handleToggleOldStocks = (e) => {
        const checked = e.target.checked;
        setIsOldStocks(checked);
        if (checked) {
            setIsNewStocks(false); // Old Stocks and New Stocks are mutually exclusive
        }
    };

    const handleToggleNewStocks = (e) => {
        const checked = e.target.checked;
        setIsNewStocks(checked);
        if (checked) {
            setIsOldStocks(false); // New Stocks and Old Stocks are mutually exclusive
        }
    };

    const handleToggleFabricated = (e) => {
        setIsFabricated(e.target.checked);
    };

    const buildConditionString = () => {
        const parts = [];
        if (isNewStocks) parts.push("New Stocks");
        else if (isOldStocks) parts.push("Old Stocks");
        if (isFabricated) parts.push("Fabricated");
        return parts.length > 0 ? parts.join(", ") : "Good";
    };

    // ⚡ Fast client-side image compressor (converts 10MB phone camera shots to lightweight ~150KB JPEGs in <100ms)
    const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.82) => {
        return new Promise((resolve) => {
            if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
                return resolve(file);
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth || height > maxHeight) {
                        if (width > height) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        } else {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (!blob || blob.size >= file.size) {
                                return resolve(file);
                            }
                            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        },
                        'image/jpeg',
                        quality
                    );
                };
                img.onerror = () => resolve(file);
            };
            reader.onerror = () => resolve(file);
        });
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

    const openShareModal = () => {
        setViewerFullname('');
        setGeneratedShareLink(null);
        setIsLinkCopied(false);
        setIsShareModalOpen(true);
    };

    const handleSaveAndGenerateLink = async (e) => {
        if (e) e.preventDefault();
        if (!viewerFullname.trim()) {
            triggerError("Please enter the Fullname of viewer.");
            return;
        }

        try {
            setIsGeneratingLink(true);
            let currentUserName = 'Inventory';
            try {
                const stored = localStorage.getItem('user');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    currentUserName = parsed.Username || parsed.username || parsed.Fullname || 'Inventory';
                } else if (localStorage.getItem('Fullname')) {
                    currentUserName = localStorage.getItem('Fullname');
                }
            } catch (err) {}

            const token = localStorage.getItem('token');
            const res = await axios.post('/api/shared-links', {
                viewerName: viewerFullname.trim(),
                sharedBy: currentUserName,
                page: 'Rackings (Records)'
            }, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            const linkPath = res.data.linkUrl || `/shared/rackings?linkId=${res.data.data?._id}&viewer=${encodeURIComponent(viewerFullname.trim())}&sharedBy=${encodeURIComponent(currentUserName)}`;
            const fullUrl = `${window.location.origin}${linkPath}`;
            setGeneratedShareLink(fullUrl);
            triggerSuccess("Viewer link saved! You can now copy the link.");
        } catch (err) {
            console.error("Error generating viewer link:", err);
            triggerError(err.response?.data?.message || "Failed to generate viewer link.");
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const handleCopyGeneratedLink = () => {
        if (!generatedShareLink) return;

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(generatedShareLink)
                .then(() => {
                    setIsLinkCopied(true);
                    triggerSuccess("Link copied to clipboard!");
                    setTimeout(() => setIsLinkCopied(false), 2500);
                })
                .catch(() => {
                    fallbackCopyText(generatedShareLink);
                });
        } else {
            fallbackCopyText(generatedShareLink);
        }
    };

    const fallbackCopyText = (text) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand("copy");
            document.body.removeChild(textArea);
            if (successful) {
                setIsLinkCopied(true);
                triggerSuccess("Link copied to clipboard!");
                setTimeout(() => setIsLinkCopied(false), 2500);
            } else {
                triggerError("Failed to copy link.");
            }
        } catch (err) {
            console.error("Fallback copy failed:", err);
            triggerError("Could not copy link to clipboard.");
        }
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



    const fetchRawMaterials = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const endpoint = token ? '/api/raw-materials' : '/api/raw-materials/shared';
            const response = await axios.get(endpoint).catch(() => axios.get('/api/raw-materials/shared'));
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
        fetchRawMaterials();
        fetchPaletteSettings();

        // 🔄 Sync immediately when an outbound reservation/slip is updated
        const handlePackingListSync = () => {
            fetchRawMaterials();
        };
        window.addEventListener('packingListUpdated', handlePackingListSync);
        return () => {
            window.removeEventListener('packingListUpdated', handlePackingListSync);
        };
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
        if (!segment) return { classes: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700", rowBg: "hover:bg-slate-50/80 dark:hover:bg-[#141622] border-l-4 border-l-transparent", prefix: "⚪" };
        const cleaned = segment.trim().toUpperCase();
        if (segmentColors[cleaned] !== undefined && COLOR_OPTIONS[segmentColors[cleaned]]) return COLOR_OPTIONS[segmentColors[cleaned]];
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

        if (actualCount <= critical) return <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 px-2 py-0.5 rounded font-medium">🔴 Critical</span>;
        if (actualCount <= reorder) return <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 px-2 py-0.5 rounded font-medium">🟡 Re-Stock</span>;
        if (actualCount > overstock) return <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 px-2 py-0.5 rounded font-medium">🔵 Overstock</span>;
        return <span className="text-xs bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800 px-2 py-0.5 rounded font-medium">🟢 Healthy</span>;
    };

    const handleClearImage = () => {
        setSelectedFile(null);
        setExistingImgPreview('');
    };

    const openAddModal = () => {
        setIsEditing(false);
        setCurrentId(null);
        setMaterialCode('');
        setMaterialSegment('');
        setItemDescription('');
        setMaterialDimension('');
        setDimHeight('');
        setDimWidth('');
        setDimWidthType('W');
        setDimDepth('');
        setDimProfile('');
        setIsCustomDim(false);
        setMaterialUom('');
        setAccountTo('');
        setModalActualCount(0);
        setMaterialAcquisitionCost('');
        setCriticalAlert(0);
        setRestockWarning(10);
        setMaxStorage(1000);
        setIsOldStocks(false);
        setIsNewStocks(false);
        setIsFabricated(false);
        setExistingImgPreview('');
        setSelectedFile(null);
        setIsEditModalOpen(true);
    };

    const openEditModal = (item) => {
        setIsEditing(true);
        setCurrentId(item._id);
        setMaterialCode(item.Code || '');
        setMaterialSegment(item.Segment || '');
        
        // Parse and prefill condition state
        const condStr = (item.Condition || '').toLowerCase().trim();
        const descStr = (item.ItemDescription || '').toLowerCase();

        let hasOld = false;
        let hasNew = false;
        let hasFab = false;

        if (condStr && condStr !== 'good' && condStr !== 'n/a') {
            hasOld = condStr.includes('old stocks') || condStr.includes('old stock');
            hasNew = condStr.includes('new stocks') || condStr.includes('new stock');
            hasFab = condStr.includes('fabricated');
        } else {
            hasOld = descStr.includes('(old stocks)') || descStr.includes('(old stock)') || descStr.includes('-old stocks') || descStr.includes('-old stock');
            hasNew = descStr.includes('(new stocks)') || descStr.includes('(new stock)') || descStr.includes('-new stocks') || descStr.includes('-new stock');
            hasFab = descStr.includes('(fabricated)') || descStr.includes('-fabricated');
        }

        setIsOldStocks(hasOld && !hasNew);
        setIsNewStocks(hasNew);
        setIsFabricated(hasFab);

        const cleanDesc = getCleanItemDescription(item.ItemDescription || '', item.Segment);
        setItemDescription(cleanDesc || item.ItemDescription || '');

        setMaterialDimension(item.Dimension || '');
        const parsedDim = parseToFormFields(item.Dimension || '');
        setDimHeight(parsedDim.height);
        setDimWidth(parsedDim.width);
        setDimWidthType(parsedDim.widthType || 'W');
        setDimDepth(parsedDim.depth);
        setDimProfile(parsedDim.profile);
        setIsCustomDim(parsedDim.isCustom);
        setMaterialUom(item.UOM || '');
        setAccountTo(item.AccountTo || '');
        setModalActualCount(item.ActualCount ?? 0);
        setMaterialAcquisitionCost(item.AcquisitionCost !== undefined ? String(item.AcquisitionCost) : '0');
        setCriticalAlert(item.CriticalAlert !== undefined ? item.CriticalAlert : 0);
        setRestockWarning(item.RestockWarning !== undefined ? item.RestockWarning : 10);
        setMaxStorage(item.MaxStorage !== undefined ? item.MaxStorage : 1000);

        setExistingImgPreview(item.ImageUrl || '');
        setSelectedFile(null);
        setIsEditModalOpen(true);
    };

    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsCompressingImg(true);
            try {
                const compressed = await compressImage(file);
                setSelectedFile(compressed);
            } catch (err) {
                console.error("Compression error, fallback to original file:", err);
                setSelectedFile(file);
            } finally {
                setIsCompressingImg(false);
            }
        }
    };

    const handleEditFormSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSavingMat(true);
            const formData = new FormData();
            formData.append("Code", materialCode.trim());
            formData.append("Category", "");
            formData.append("Segment", materialSegment.trim());
            formData.append("ItemDescription", itemDescription.trim());
            formData.append("Condition", buildConditionString());
            const finalDimension = isCustomDim 
                ? materialDimension.trim() 
                : buildDimensionString({
                    height: dimHeight,
                    width: dimWidth,
                    widthType: dimWidthType,
                    depth: dimDepth,
                    profile: dimProfile
                });
            formData.append("Dimension", finalDimension !== '—' ? finalDimension.trim() : '');
            formData.append("UOM", materialUom.trim());
            formData.append("AccountTo", accountTo.trim());
            formData.append("AcquisitionCost", Number(materialAcquisitionCost) || 0);
            formData.append("CriticalAlert", Number(criticalAlert) >= 0 ? Number(criticalAlert) : 0);
            formData.append("RestockWarning", Number(restockWarning) >= 0 ? Number(restockWarning) : 10);
            formData.append("MaxStorage", Number(maxStorage) >= 0 ? Number(maxStorage) : 1000);

            if (selectedFile) {
                formData.append("image", selectedFile);
            } else if (!existingImgPreview) {
                formData.append("ImageUrl", "");
            }

            let updatedItem = null;
            if (isEditing) {
                const res = await axios.put(`/api/raw-materials/${currentId}`, formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                updatedItem = res.data;
                triggerSuccess("Successfully updated raw material profile details.");
            } else {
                const res = await axios.post(`/api/raw-materials`, formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                updatedItem = res.data;
                triggerSuccess("Successfully added new raw material item.");
            }

            // ⚡ REALTIME LOCAL UPDATE: Instantly reflect the updated item and fresh image in the table
            if (updatedItem && updatedItem._id) {
                const freshUrl = updatedItem.ImageUrl 
                    ? `${updatedItem.ImageUrl}${updatedItem.ImageUrl.includes('?') ? '&' : '?'}t=${Date.now()}` 
                    : '';
                if (isEditing) {
                    setRawMaterialsList(prev => prev.map(m => m._id === currentId ? { ...m, ...updatedItem, ImageUrl: freshUrl } : m));
                } else {
                    setRawMaterialsList(prev => [{ ...updatedItem, ImageUrl: freshUrl }, ...prev]);
                }
            }

            setIsEditModalOpen(false);
            fetchRawMaterials();
        } catch (err) {
            const errMsg = err.response?.data?.message || (isEditing ? "Error updating item." : "Error creating item.");
            triggerError(errMsg);
        } finally {
            setIsSavingMat(false);
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
        const physical = Number(item?.ActualCount) || 0;
        const reserved = Number(item?.ReserveCount) || 0;
        const available = Math.max(0, physical - reserved);
        const matchesZeroQty = !hideZeroQty || (available > 0);
        let statusText = 'Healthy';
        const crit = item.CriticalAlert !== undefined ? Number(item.CriticalAlert) : 0;
        const reord = item.RestockWarning !== undefined ? Number(item.RestockWarning) : 10;
        const overstk = item.MaxStorage !== undefined ? Number(item.MaxStorage) : 1000;

        if (available <= crit) statusText = 'Critical';
        else if (available <= reord) statusText = 'Re-Stock';
        else if (available > overstk) statusText = 'Overstock';
        const matchesHealth = selectedHealth === 'All Health Status' || statusText === selectedHealth || (selectedHealth === 'Zero' && available === 0);
        const matchesSearch = !searchTerm || [
            item.Code,
            item.Segment,
            item.ItemDescription,
            item.Dimension,
            item.AccountTo
        ].some(val => val && val.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSegment && matchesDescription && matchesHealth && matchesSearch && matchesZeroQty;
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

    const activeCount = rawMaterialsList.filter(item => !item.isArchived).length;
    const archivedCount = rawMaterialsList.filter(item => item.isArchived).length;

    const totalAcquisitionCost = filteredRawMaterials.reduce(
        (sum, item) => sum + ((Number(item.ActualCount) || 0) * (Number(item.AcquisitionCost) || 0)), 
        0
    );
    const totalActualCount = filteredRawMaterials.reduce(
        (sum, item) => sum + (Number(item.ActualCount) || 0), 
        0
    );

    // Reset pagination to page 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedSegment, selectedDescription, selectedHealth, hideZeroQty, showArchivedOnly]);

    // Pagination calculations
    const totalRows = filteredRawMaterials.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const paginatedRawMaterials = filteredRawMaterials.slice(indexOfFirstRow, indexOfLastRow);

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
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'} flex-shrink-0`}>
                                <Filter className={`w-4 h-4 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
                                <span>{showArchivedOnly ? 'Archive' : 'Filter'}</span>
                            </div>

                            {/* TOTAL ACQUISITION COST BADGE IN TOOLBAR */}
                            <div className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border select-none flex-shrink-0 transition-all ${
                                isDark ? 'bg-[#141622] text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                                <span>Total Acquisition Cost:</span>
                                <span className="font-mono font-black text-red-600 dark:text-red-400">
                                    ₱{totalAcquisitionCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">

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

                            {/* SHARE LINK BUTTON (Opens Modal for Viewer Name) */}
                            {!isViewer && (
                                <button
                                    onClick={openShareModal}
                                    title="Generate Shareable Link for Viewer"
                                    className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 shadow-sm ${
                                        isDark 
                                            ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/60' 
                                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                    }`}
                                >
                                    <Share2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-indigo-500" />
                                    <span className="hidden sm:inline">Share Link</span>
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

                    <div className="flex overflow-x-auto gap-2 items-center mt-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-5 md:pb-0">

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
                                <option value="Critical">🔴 Critical Reorder</option>
                                <option value="Zero">⚪ Out of Stock</option>
                            </select>
                        </div>

                        {!isViewer && (
                            <div className="min-w-[160px] w-full md:min-w-0">
                                <button
                                    onClick={openAddModal}
                                    disabled={showArchivedOnly}
                                    className={`flex items-center justify-center gap-2 ${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm w-full cursor-pointer transition-all h-[38px]`}
                                >
                                    <span className="whitespace-nowrap">Add New Rackings Item</span>
                                </button>
                            </div>
                        )}

                    </div>

                    <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-full mt-3`}></div>
                </div>

                {/* MAIN CLEAN TABLE MASTERLIST */}
                <div className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'} rounded-xl border shadow-sm overflow-hidden`}>
                    <TablePagination
                        currentPage={currentPage}
                        setCurrentPage={setCurrentPage}
                        rowsPerPage={rowsPerPage}
                        setRowsPerPage={setRowsPerPage}
                        totalRows={totalRows}
                        options={[5, 10, 20, 50, 100]}
                    />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className={`text-white font-bold uppercase text-sm ${isDark ? 'bg-[#0f111d] border-b border-slate-800' : 'bg-[#18174e]'}`}>
                                    <th className="py-3 px-3 text-center whitespace-nowrap">Image</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Item Description</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Dimension</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-center">Actual Count</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-center">Reserve Count</th>
                                    <th className="py-3 px-4 whitespace-nowrap">UOM</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-right">Acquisition Cost</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-right">Total Acquisition Cost</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Stock Health</th>
                                    {!isViewer && (
                                        <th className="py-3 px-4 text-center whitespace-nowrap">
                                             Action
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDark ? 'divide-slate-800/80 bg-[#090b10]' : 'divide-slate-100 bg-white'}`}>
                                {loading ? (
                                    <tr><td colSpan={isViewer ? "9" : "10"} className="text-center py-10 text-green-700 font-medium italic">
                                        Fetching secure rackings data from database...
                                    </td></tr>
                                ) : error ? (
                                    <tr><td colSpan={isViewer ? "9" : "10"} className="text-center py-8 text-rose-600 font-semibold">{error}</td></tr>
                                ) : paginatedRawMaterials.map((rawMat) => {
                                    const currentSegConfig = getSegmentStyles(rawMat.Segment);

                                    return (
                                        <tr key={rawMat._id || rawMat.Code} className={`group ${currentSegConfig.rowBg || (isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600')} transition-colors font-medium whitespace-nowrap text-sm`}>
                                            <td className="py-2 px-3 text-center whitespace-nowrap">
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

                                            <td className="py-3 px-4 min-w-[200px]">
                                                <div className={`font-semibold whitespace-normal break-words transition-colors ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                                                    {getCleanItemDescription(rawMat.ItemDescription, rawMat.Segment)}
                                                </div>

                                                {/* CONDITION BADGES (baba ng item description) */}
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
                                                className={`py-3 px-4 min-w-[120px] whitespace-normal break-words transition-colors ${
                                                    isDark ? 'text-slate-300' : 'text-slate-600'
                                                }`}
                                                title={rawMat.Dimension}
                                            >
                                                <RackDimensionCell dimension={rawMat.Dimension} isDark={isDark} />
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
                                            <td className={`py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{rawMat.UOM}</td>
                                            <td className={`py-3 px-4 text-right font-mono text-xs whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                ₱{(Number(rawMat.AcquisitionCost) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono text-xs font-bold whitespace-nowrap text-red-600 dark:text-red-400">
                                                ₱{((Number(rawMat.ActualCount) || 0) * (Number(rawMat.AcquisitionCost) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4">{getRawMaterialHealthBadge(rawMat)}</td>
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
                                                                <button onClick={() => openUnarchiveConfirmation(rawMat)} title="Restore" className={`p-1 ${isDark ? 'bg-[#181a26] border-emerald-800/80 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'} border rounded transition-all cursor-pointer`}><RotateCcw className="w-3.5 h-3.5" /></button>
                                                                <button onClick={() => openPermanentDeleteConfirmation(rawMat)} title="Delete Permanently" className={`p-1 ${isDark ? 'bg-[#181a26] border-rose-800/80 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'} border rounded transition-all cursor-pointer`}><Trash2 className="w-3.5 h-3.5" /></button>
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
                                        <td colSpan={isViewer ? "9" : "10"} className="text-center py-10 text-red-600 font-medium italic">
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
                    <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-xl sm:max-w-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto`}>

                        <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
                            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                                {isEditing ? "Update Rackings Details" : "Add New Rackings Item"}
                            </h3>
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

                                {/* Stock Threshold & Reorder Limits (Moved to top of modal) */}
                                <div className={`md:col-span-2 rounded-xl p-4 border transition-colors ${
                                    isDark 
                                        ? 'bg-[#141622]/80 border-slate-800' 
                                        : 'bg-slate-50/80 border-slate-200'
                                }`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Sliders className={`w-4 h-4 shrink-0 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
                                                <h4 className={`text-sm font-bold tracking-tight whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                                    Stock Threshold & Reorder Limits
                                                </h4>
                                            </div>
                                            <p className={`text-[11px] mt-0.5 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                Item-specific rules evaluated for condition badges & replenishment warnings.
                                            </p>
                                        </div>

                                        <div className="self-start sm:self-center shrink-0">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm whitespace-nowrap">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                                                Safe: {Math.max(0, (parseInt(restockWarning) || 0) + 1)} - {parseInt(maxStorage) || 0} {materialUom?.trim() ? materialUom.trim().toUpperCase() : 'PCS'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                                        {/* Critical Alert */}
                                        <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                                            isDark ? 'bg-[#0e1017] border-slate-800/80' : 'bg-white border-slate-200/80'
                                        }`}>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1 whitespace-nowrap">
                                                Critical Alert (≤)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={criticalAlert}
                                                onChange={(e) => setCriticalAlert(Math.max(0, parseInt(e.target.value) || 0))}
                                                className={`w-full font-mono font-bold text-sm px-3 py-1.5 rounded-lg border ${
                                                    isDark 
                                                        ? 'bg-[#141622] border-slate-700 text-white focus:border-rose-500' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-500'
                                                } focus:outline-none transition-all`}
                                            />
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium whitespace-nowrap">
                                                Default: 0 (Emergency)
                                            </span>
                                        </div>

                                        {/* Restock Warning */}
                                        <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                                            isDark ? 'bg-[#0e1017] border-slate-800/80' : 'bg-white border-slate-200/80'
                                        }`}>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1 whitespace-nowrap">
                                                Restock Warning (≤)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={restockWarning}
                                                onChange={(e) => setRestockWarning(Math.max(0, parseInt(e.target.value) || 0))}
                                                className={`w-full font-mono font-bold text-sm px-3 py-1.5 rounded-lg border ${
                                                    isDark 
                                                        ? 'bg-[#141622] border-slate-700 text-white focus:border-amber-500' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                                                } focus:outline-none transition-all`}
                                            />
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium whitespace-nowrap">
                                                Default: 10 (Reorder)
                                            </span>
                                        </div>

                                        {/* Max Storage */}
                                        <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                                            isDark ? 'bg-[#0e1017] border-slate-800/80' : 'bg-white border-slate-200/80'
                                        }`}>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1 whitespace-nowrap">
                                                Max Storage (Overstock)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={maxStorage}
                                                onChange={(e) => setMaxStorage(Math.max(0, parseInt(e.target.value) || 0))}
                                                className={`w-full font-mono font-bold text-sm px-3 py-1.5 rounded-lg border ${
                                                    isDark 
                                                        ? 'bg-[#141622] border-slate-700 text-white focus:border-blue-500' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                                                } focus:outline-none transition-all`}
                                            />
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium whitespace-nowrap">
                                                Default: 1000 (Max Capacity)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase`}>Item Image Upload</label>
                                    </div>

                                    {/* IMAGE PREVIEW OR UPLOAD BOX */}
                                    {(selectedFile || existingImgPreview || isCompressingImg) ? (
                                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                            isDark ? 'bg-[#141622] border-slate-700' : 'bg-slate-50 border-slate-200'
                                        }`}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                {isCompressingImg ? (
                                                    <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-slate-200 dark:bg-slate-800 shrink-0">
                                                        <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={selectedFile ? URL.createObjectURL(selectedFile) : existingImgPreview}
                                                        alt="Preview"
                                                        className={`w-14 h-14 rounded-lg object-cover border ${isDark ? 'border-slate-600' : 'border-slate-300'} shadow-sm shrink-0`}
                                                    />
                                                )}
                                                <div className="min-w-0">
                                                    {isCompressingImg ? (
                                                        <>
                                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500 shrink-0" />
                                                                <span>Optimizing photo...</span>
                                                            </div>
                                                            <span className="text-[10px] text-orange-500 font-medium">Compressing for instant upload</span>
                                                        </>
                                                    ) : selectedFile ? (
                                                        <>
                                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                                <span className="truncate">{selectedFile.name}</span>
                                                            </div>
                                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                                                Optimized ({(selectedFile.size / 1024).toFixed(0)} KB) • Ready for upload
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                                                Current Material Image
                                                            </div>
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Saved in database</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Direct Replace from device */}
                                                <label className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                                }`} title="Replace with new photo from device">
                                                    <Upload className="w-3.5 h-3.5" />
                                                    <span>Replace</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                                </label>

                                                <button
                                                    type="button"
                                                    onClick={handleClearImage}
                                                    title="Remove Image"
                                                    className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className={`flex flex-col items-center justify-center ${isDark ? 'bg-[#141622] border-slate-700 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'} border-2 border-dashed rounded-xl py-4 px-3 transition-all cursor-pointer text-center mt-1`}>
                                            <Upload className={`w-6 h-6 mb-1.5 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Upload Image from Device</span>
                                            <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP (Auto-optimized)</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                        </label>
                                    )}
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

                                {/* Condition Specifications Card */}
                                <div className={`md:col-span-2 p-3.5 rounded-xl border ${isDark ? 'bg-[#0b0d14]/70 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'} space-y-3`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-wide flex items-center gap-1.5 whitespace-nowrap`}>
                                            <span>Condition Specifications</span>
                                        </label>
                                        <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                                            (Old Stocks or New Stocks + Fabricated)
                                        </span>
                                    </div>

                                    {/* Grid for Old Stocks, New Stocks, Fabricated */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                        {/* 1. Old Stocks */}
                                        <label 
                                            className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                                                isOldStocks 
                                                    ? (isDark ? 'bg-amber-950/40 border-amber-500/80 text-amber-300 ring-1 ring-amber-500/30' : 'bg-amber-50 border-amber-300 text-amber-800 ring-1 ring-amber-300/50')
                                                    : (isDark ? 'bg-[#141622] border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')
                                            }`}
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={isOldStocks} 
                                                onChange={handleToggleOldStocks}
                                                className="w-4 h-4 rounded accent-amber-600 cursor-pointer shrink-0" 
                                            />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                                                    <span>🟡</span> Old Stocks
                                                </span>
                                                <span className="text-[10px] opacity-75 whitespace-nowrap">Existing / previous batch</span>
                                            </div>
                                        </label>

                                        {/* 2. New Stocks */}
                                        <label 
                                            className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                                                isNewStocks 
                                                    ? (isDark ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-1 ring-emerald-300/50')
                                                    : (isDark ? 'bg-[#141622] border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')
                                            }`}
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={isNewStocks} 
                                                onChange={handleToggleNewStocks}
                                                className="w-4 h-4 rounded accent-emerald-600 cursor-pointer shrink-0" 
                                            />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                                                    <span>🟢</span> New Stocks
                                                </span>
                                                <span className="text-[10px] opacity-75 whitespace-nowrap">Fresh inbound delivery</span>
                                            </div>
                                        </label>

                                        {/* 3. Fabricated */}
                                        <label 
                                            className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                                                isFabricated 
                                                    ? (isDark ? 'bg-purple-950/40 border-purple-500/80 text-purple-300 ring-1 ring-purple-500/30' : 'bg-purple-50 border-purple-300 text-purple-800 ring-1 ring-purple-300/50')
                                                    : (isDark ? 'bg-[#141622] border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')
                                            }`}
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={isFabricated} 
                                                onChange={handleToggleFabricated}
                                                className="w-4 h-4 rounded accent-purple-600 cursor-pointer shrink-0" 
                                            />
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                                                    <span>🟣</span> Fabricated
                                                </span>
                                                <span className="text-[10px] opacity-75 whitespace-nowrap">Custom fabricated item</span>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Live Condition Preview Bar */}
                                    <div className={`pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-between text-xs`}>
                                        <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Condition Preview:</span>
                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            {(!isOldStocks && !isNewStocks && !isFabricated) && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                                    ⚪ Standard / Good
                                                </span>
                                            )}
                                            {isOldStocks && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs whitespace-nowrap">
                                                    🟡 Old Stocks
                                                </span>
                                            )}
                                            {isNewStocks && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs whitespace-nowrap">
                                                    🟢 New Stocks
                                                </span>
                                            )}
                                            {isFabricated && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 shadow-xs whitespace-nowrap">
                                                    🟣 Fabricated
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Dimension Specifications Card */}
                                <div className={`md:col-span-2 p-3.5 rounded-xl border ${isDark ? 'bg-[#0b0d14]/70 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'} space-y-3`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'} uppercase tracking-wide flex items-center gap-1.5 whitespace-nowrap`}>
                                            <span>Dimension Specifications</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!isCustomDim) {
                                                    const built = buildDimensionString({
                                                        height: dimHeight,
                                                        width: dimWidth,
                                                        widthType: dimWidthType,
                                                        depth: dimDepth,
                                                        profile: dimProfile
                                                    });
                                                    setMaterialDimension(built !== '—' ? built : '');
                                                    setIsCustomDim(true);
                                                } else {
                                                    const parsed = parseToFormFields(materialDimension);
                                                    setDimHeight(parsed.height);
                                                    setDimWidth(parsed.width);
                                                    setDimWidthType(parsed.widthType || 'W');
                                                    setDimDepth(parsed.depth);
                                                    setDimProfile(parsed.profile);
                                                    setIsCustomDim(false);
                                                }
                                            }}
                                            className={`text-[11px] font-semibold transition-colors cursor-pointer hover:underline whitespace-nowrap ${
                                                isDark ? 'text-amber-400 hover:text-amber-300' : 'text-indigo-600 hover:text-indigo-800'
                                            }`}
                                        >
                                            {isCustomDim ? "Switch to H / W / D fields" : "Switch to Freeform / Manual"}
                                        </button>
                                    </div>

                                    {isCustomDim ? (
                                        <div>
                                            <input
                                                type="text"
                                                value={materialDimension}
                                                onChange={(e) => setMaterialDimension(e.target.value)}
                                                placeholder="e.g. M10*65 (4.8), 80*60mm, Φ14*47"
                                                className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
                                            />
                                            <p className="text-[11px] text-slate-500 mt-1 whitespace-nowrap">Manual freeform dimension mode (for bolts, shimplates, and special hardware).</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Grid for H, W/L, D */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                {/* 1. Height (H) */}
                                                <div>
                                                    <label className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase mb-1 whitespace-nowrap">
                                                        <span className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] shrink-0 font-mono">H</span>
                                                        <span className="whitespace-nowrap">Height (H)</span>
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={dimHeight}
                                                            onChange={(e) => setDimHeight(e.target.value)}
                                                            placeholder="e.g. 5550"
                                                            className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-700 focus:border-blue-600'} border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none pr-8`}
                                                        />
                                                        <span className="absolute right-2 top-1.5 text-[11px] text-slate-400 font-mono pointer-events-none whitespace-nowrap">mm</span>
                                                    </div>
                                                </div>

                                                {/* 2. Width (W) or Length (L) */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-1 gap-1">
                                                        <label className={`flex items-center gap-1 text-[11px] font-bold ${dimWidthType === 'L' ? 'text-teal-600 dark:text-teal-400' : 'text-emerald-600 dark:text-emerald-400'} uppercase whitespace-nowrap`}>
                                                            <span className={`w-4 h-4 rounded ${dimWidthType === 'L' ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300' : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'} flex items-center justify-center text-[10px] shrink-0 font-mono`}>
                                                                {dimWidthType}
                                                            </span>
                                                            <span className="whitespace-nowrap">{dimWidthType === 'L' ? 'Length (L)' : 'Width (W)'}</span>
                                                        </label>
                                                        <div className="flex items-center rounded border border-slate-200 dark:border-slate-700 overflow-hidden text-[10px] shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => setDimWidthType('W')}
                                                                className={`px-1.5 py-0.5 cursor-pointer font-bold whitespace-nowrap ${dimWidthType === 'W' ? 'bg-emerald-600 text-white' : 'bg-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                                            >
                                                                W
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDimWidthType('L')}
                                                                className={`px-1.5 py-0.5 cursor-pointer font-bold whitespace-nowrap ${dimWidthType === 'L' ? 'bg-teal-600 text-white' : 'bg-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                                            >
                                                                L
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={dimWidth}
                                                            onChange={(e) => setDimWidth(e.target.value)}
                                                            placeholder="e.g. 2700"
                                                            className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-emerald-500' : 'bg-white border-slate-200 text-slate-700 focus:border-emerald-600'} border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none pr-8`}
                                                        />
                                                        <span className="absolute right-2 top-1.5 text-[11px] text-slate-400 font-mono pointer-events-none whitespace-nowrap">mm</span>
                                                    </div>
                                                </div>

                                                {/* 3. Depth (D) */}
                                                <div>
                                                    <label className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1 whitespace-nowrap">
                                                        <span className="w-4 h-4 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px] shrink-0 font-mono">D</span>
                                                        <span className="whitespace-nowrap">Depth (D)</span>
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={dimDepth}
                                                            onChange={(e) => setDimDepth(e.target.value)}
                                                            placeholder="e.g. 1050"
                                                            className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-amber-500' : 'bg-white border-slate-200 text-slate-700 focus:border-amber-600'} border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none pr-8`}
                                                        />
                                                        <span className="absolute right-2 top-1.5 text-[11px] text-slate-400 font-mono pointer-events-none whitespace-nowrap">mm</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Profile / Additional specifications */}
                                            <div>
                                                <label className={`block text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-1 whitespace-nowrap`}>
                                                    Profile / Thickness / Additional Specs (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={dimProfile}
                                                    onChange={(e) => setDimProfile(e.target.value)}
                                                    placeholder="e.g. (90*70*1.8mm) or (120*50*1.5) T TYPE"
                                                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none`}
                                                />
                                            </div>

                                            {/* Live Dimension Preview Bar */}
                                            <div className={`pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-between text-xs`}>
                                                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Dimension Preview:</span>
                                                <div className="whitespace-nowrap">
                                                    <RackDimensionCell
                                                        dimension={buildDimensionString({
                                                            height: dimHeight,
                                                            width: dimWidth,
                                                            widthType: dimWidthType,
                                                            depth: dimDepth,
                                                            profile: dimProfile
                                                        })}
                                                        isDark={isDark}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5 whitespace-nowrap`}>UOM</label>
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

                                <div>
                                    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5 whitespace-nowrap`}>
                                        Acquisition Cost (Price)
                                    </label>
                                    <div className="relative">
                                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-base select-none pointer-events-none ${isDark ? 'text-amber-400' : 'text-[#18174e]'}`}>
                                            ₱
                                        </span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0.00"
                                            value={materialAcquisitionCost}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                    setMaterialAcquisitionCost(val);
                                                }
                                            }}
                                            className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg pl-8 pr-3 py-2 text-sm font-mono focus:outline-none`}
                                        />
                                    </div>
                                </div>

                            </div>

                            <div className={`flex items-center justify-end gap-2 mt-6 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    disabled={isSavingMat || isCompressingImg}
                                    className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingMat || isCompressingImg}
                                    className={`${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                                >
                                    {isCompressingImg ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Optimizing photo...</span>
                                        </>
                                    ) : isSavingMat ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>{isEditing ? "Save Changes" : "Add Material"}</span>
                                    )}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}





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

            {/* SHARE LINK MODAL (Fullname of viewer input -> Save -> Copy link revealed) */}
            {isShareModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`w-full max-w-lg ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 relative`}>
                        
                        {/* Header */}
                        <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3.5`}>
                            <div className="flex items-center gap-2.5">
                                <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/80' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`}>
                                    <Share2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                        Share Rackings Link
                                    </h3>
                                    <p className="text-[11px] text-slate-400">Generate a personalized read-only view for recipients</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsShareModalOpen(false)}
                                className={`${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer transition-colors`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {!generatedShareLink ? (
                            <form onSubmit={handleSaveAndGenerateLink} className="flex flex-col gap-4 mt-1">
                                <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                                    isDark ? 'bg-[#141622] border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}>
                                    <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                    <p className="text-xs leading-relaxed">
                                        Enter the recipient's full name below. The generated link provides a secure, read-only preview of the Rackings inventory without editing privileges.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                        Fullname of Viewer <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <User className={`absolute left-3.5 top-3 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                                        <input
                                            type="text"
                                            placeholder="e.g. John Doe, Auditor, Client..."
                                            value={viewerFullname}
                                            onChange={(e) => setViewerFullname(e.target.value)}
                                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium ${
                                                isDark 
                                                    ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]' 
                                                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#18174e]'
                                            } focus:outline-none transition-all shadow-sm`}
                                            autoFocus
                                            required
                                        />
                                    </div>
                                </div>

                                <div className={`flex items-center justify-end gap-2.5 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                    <button
                                        type="button"
                                        onClick={() => setIsShareModalOpen(false)}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg border ${
                                            isDark 
                                                ? 'border-slate-700 text-slate-300 hover:bg-slate-800' 
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                        } cursor-pointer transition-colors`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isGeneratingLink || !viewerFullname.trim()}
                                        className={`flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg ${
                                            isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90 shadow-orange-500/20' : 'bg-[#18174e] hover:bg-[#18174e]/90 shadow-indigo-950/20'
                                        } text-white cursor-pointer disabled:opacity-50 transition-all shadow-md`}
                                    >
                                        {isGeneratingLink ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span>Saving & Generating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Link2 className="w-3.5 h-3.5" />
                                                <span>Generate Share Link</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex flex-col gap-4 mt-1">
                                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                                    isDark ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                }`}>
                                    <div className="p-1 rounded-full bg-emerald-500/20 shrink-0 mt-0.5">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold">
                                            Shareable Link Generated for: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{viewerFullname}</span>
                                        </p>
                                        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-emerald-400/80' : 'text-emerald-700'}`}>
                                            Anyone with this link will be able to view the Rackings inventory in read-only mode.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                        Shareable URL
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <Link2 className={`absolute left-3.5 top-3 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                                            <input
                                                type="text"
                                                readOnly
                                                value={generatedShareLink}
                                                className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-xs font-mono select-all ${
                                                    isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                                                } focus:outline-none`}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleCopyGeneratedLink}
                                            className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-sm ${
                                                isLinkCopied
                                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                                    : (isDark ? 'bg-[#ff6600] text-white border-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] text-white border-[#18174e] hover:bg-[#18174e]/90')
                                            }`}
                                        >
                                            {isLinkCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            <span>{isLinkCopied ? 'Copied!' : 'Copy Link'}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className={`flex items-center justify-between pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setGeneratedShareLink(null);
                                            setViewerFullname('');
                                            setIsLinkCopied(false);
                                        }}
                                        className={`text-xs font-semibold ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'} cursor-pointer underline flex items-center gap-1`}
                                    >
                                        Create another link
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsShareModalOpen(false)}
                                        className={`px-5 py-2 text-xs font-bold rounded-lg ${
                                            isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        } cursor-pointer transition-colors`}
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default InventoryRawMaterials;
