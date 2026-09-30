import React, { useState, useEffect, useMemo } from 'react';
import { Search, AlertCircle, Filter, X, Edit2, Archive, EyeOff, Sliders, RotateCcw, CheckCircle2, Palette, Image as ImageIcon, Upload, Trash2, Share2, Copy, Coins, ChevronLeft, ChevronRight, Link2, User, Info, Loader2 } from 'lucide-react';
import axios from 'axios';
import PageHeader from './layout/PageHeader';
import TablePagination from './common/TablePagination';
import { useTheme } from '../context/ThemeContext';

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
    const [materialUom, setMaterialUom] = useState('');
    const [accountTo, setAccountTo] = useState('');
    const [modalActualCount, setModalActualCount] = useState(0);
    const [materialAcquisitionCost, setMaterialAcquisitionCost] = useState('');

    // 🌟 FILE UPLOAD & IMAGE LIBRARY STATES
    const [selectedFile, setSelectedFile] = useState(null);
    const [existingImgPreview, setExistingImgPreview] = useState('');
    const [selectedExistingImage, setSelectedExistingImage] = useState(null);
    const [isImagePickerModalOpen, setIsImagePickerModalOpen] = useState(false);
    const [imagePickerSearch, setImagePickerSearch] = useState('');
    const [dbImageLibrary, setDbImageLibrary] = useState([]);

    // Item-specific threshold states for Add/Edit
    const [criticalAlert, setCriticalAlert] = useState(0);
    const [restockWarning, setRestockWarning] = useState(10);
    const [maxStorage, setMaxStorage] = useState(1000);
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
            fetchImageLibrary();
        } catch (err) {
            setError("Failed to load data from the server.");
            setRawMaterialsList([]);
        } finally { setLoading(false); }
    };

    const fetchImageLibrary = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/raw-materials/image-library', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            if (Array.isArray(res.data)) {
                setDbImageLibrary(res.data);
            }
        } catch (err) {
            console.error("Failed to load unique image library:", err);
        }
    };

    useEffect(() => {
        fetchRawMaterials();
        fetchImageLibrary();
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
        if (!segment) return { classes: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700", rowBg: "hover:bg-slate-50/80 dark:hover:bg-[#141622] border-l-4 border-l-transparent", prefix: "⚪" };
        const cleaned = segment.trim().toUpperCase();
        if (segmentColors[cleaned] !== undefined && COLOR_OPTIONS[segmentColors[cleaned]]) return COLOR_OPTIONS[segmentColors[cleaned]];
        const index = segmentsInDB.findIndex(seg => seg.trim().toUpperCase() === cleaned);
        return COLOR_OPTIONS[(index !== -1 ? index : 0) % COLOR_OPTIONS.length];
    };

    const getRawMaterialHealthBadge = (item) => {
        const actualCount = Number(item?.ActualCount) || 0;
        const critical = item?.CriticalAlert !== undefined ? Number(item.CriticalAlert) : 0;
        const reorder = item?.RestockWarning !== undefined ? Number(item.RestockWarning) : 10;
        const overstock = item?.MaxStorage !== undefined ? Number(item.MaxStorage) : 1000;

        if (actualCount <= critical) return <span className="text-xs bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 px-2 py-0.5 rounded font-medium">🔴 Critical</span>;
        if (actualCount <= reorder) return <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 px-2 py-0.5 rounded font-medium">🟡 Re-Stock</span>;
        if (actualCount > overstock) return <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 px-2 py-0.5 rounded font-medium">🔵 Overstock</span>;
        return <span className="text-xs bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800 px-2 py-0.5 rounded font-medium">🟢 Healthy</span>;
    };

    const availableExistingImages = useMemo(() => {
        if (dbImageLibrary && dbImageLibrary.length > 0) return dbImageLibrary;

        const seenKeys = new Set();
        const images = [];
        rawMaterialsList.forEach(item => {
            if (!item.ImageUrl || !item.ImageUrl.trim()) return;
            const cleanDesc = (item.ItemDescription || '')
                .replace(/\s*\((new|old)\s*stocks?\)/gi, '')
                .replace(/\s*-(new|old)\s*stocks?/gi, '')
                .replace(/\s*\(october stock\)/gi, '')
                .trim();
            const key = `${cleanDesc.toLowerCase()}___${(item.Segment || '').trim().toLowerCase()}`;
            if (seenKeys.has(key)) return;
            seenKeys.add(key);
            images.push({
                materialId: item._id,
                code: item.Code,
                itemDescription: cleanDesc || item.ItemDescription,
                dimension: item.Dimension,
                segment: item.Segment,
                imageUrl: item.ImageUrl.trim(),
                usedCount: 1,
                usedBy: [{
                    materialId: item._id,
                    code: item.Code,
                    itemDescription: item.ItemDescription,
                    segment: item.Segment,
                    dimension: item.Dimension
                }]
            });
        });
        return images;
    }, [dbImageLibrary, rawMaterialsList]);

    const filteredLibraryImages = useMemo(() => {
        if (!imagePickerSearch.trim()) return availableExistingImages;
        const q = imagePickerSearch.toLowerCase();
        return availableExistingImages.filter(img =>
            (img.itemDescription && img.itemDescription.toLowerCase().includes(q)) ||
            (img.segment && img.segment.toLowerCase().includes(q)) ||
            (img.code && img.code.toLowerCase().includes(q)) ||
            (img.dimension && img.dimension.toLowerCase().includes(q)) ||
            (Array.isArray(img.usedBy) && img.usedBy.some(u =>
                (u.code && u.code.toLowerCase().includes(q)) ||
                (u.itemDescription && u.itemDescription.toLowerCase().includes(q))
            ))
        );
    }, [availableExistingImages, imagePickerSearch]);

    const handleSelectExistingImage = (imgItem) => {
        setSelectedExistingImage(imgItem);
        setSelectedFile(null);
        setExistingImgPreview(imgItem.imageUrl);
        setIsImagePickerModalOpen(false);
    };

    const handleClearImage = () => {
        setSelectedFile(null);
        setSelectedExistingImage(null);
        setExistingImgPreview('');
    };

    const openAddModal = () => {
        setIsEditing(false);
        setCurrentId(null);
        setMaterialCode('');
        setMaterialSegment('');
        setItemDescription('');
        setMaterialDimension('');
        setMaterialUom('');
        setAccountTo('');
        setModalActualCount(0);
        setMaterialAcquisitionCost('');
        setCriticalAlert(0);
        setRestockWarning(10);
        setMaxStorage(1000);
        setExistingImgPreview('');
        setSelectedFile(null);
        setSelectedExistingImage(null);
        setIsEditModalOpen(true);
    };

    const openEditModal = (item) => {
        setIsEditing(true);
        setCurrentId(item._id);
        setMaterialCode(item.Code || '');
        setMaterialSegment(item.Segment || '');
        setItemDescription(item.ItemDescription || '');
        setMaterialDimension(item.Dimension || '');
        setMaterialUom(item.UOM || '');
        setAccountTo(item.AccountTo || '');
        setModalActualCount(item.ActualCount ?? 0);
        setMaterialAcquisitionCost(item.AcquisitionCost !== undefined ? String(item.AcquisitionCost) : '0');
        setCriticalAlert(item.CriticalAlert !== undefined ? item.CriticalAlert : 0);
        setRestockWarning(item.RestockWarning !== undefined ? item.RestockWarning : 10);
        setMaxStorage(item.MaxStorage !== undefined ? item.MaxStorage : 1000);

        setExistingImgPreview(item.ImageUrl || '');
        setSelectedFile(null);
        setSelectedExistingImage(null);
        setIsEditModalOpen(true);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setSelectedExistingImage(null);
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
            formData.append("AcquisitionCost", Number(materialAcquisitionCost) || 0);
            formData.append("CriticalAlert", Number(criticalAlert) >= 0 ? Number(criticalAlert) : 0);
            formData.append("RestockWarning", Number(restockWarning) >= 0 ? Number(restockWarning) : 10);
            formData.append("MaxStorage", Number(maxStorage) >= 0 ? Number(maxStorage) : 1000);

            if (selectedFile) {
                formData.append("image", selectedFile);
            } else if (selectedExistingImage) {
                formData.append("selectedImageId", selectedExistingImage.materialId);
                formData.append("ImageUrl", selectedExistingImage.imageUrl);
            } else if (!existingImgPreview) {
                formData.append("ImageUrl", "");
            }

            if (isEditing) {
                await axios.put(`/api/raw-materials/${currentId}`, formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                triggerSuccess("Successfully updated raw material profile details.");
            } else {
                await axios.post(`/api/raw-materials`, formData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                triggerSuccess("Successfully added new raw material item.");
            }

            setIsEditModalOpen(false);
            fetchRawMaterials();
        } catch (err) {
            const errMsg = err.response?.data?.message || (isEditing ? "Error updating item." : "Error creating item.");
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
        const crit = item.CriticalAlert !== undefined ? Number(item.CriticalAlert) : 0;
        const reord = item.RestockWarning !== undefined ? Number(item.RestockWarning) : 10;
        const overstk = item.MaxStorage !== undefined ? Number(item.MaxStorage) : 1000;

        if (item.ActualCount <= crit) statusText = 'Critical';
        else if (item.ActualCount <= reord) statusText = 'Re-Stock';
        else if (item.ActualCount > overstk) statusText = 'Overstock';
        const matchesHealth = selectedHealth === 'All Health Status' || statusText === selectedHealth || (selectedHealth === 'Zero' && (item.ActualCount === 0 || item.ActualCount === '0'));
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
                                    <th className="py-3 px-4 whitespace-nowrap">UOM</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-right">Acquisition Cost</th>
                                    <th className="py-3 px-4 whitespace-nowrap text-right">Total Acquisition Cost</th>
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
                                    <tr><td colSpan={isViewer ? "8" : "9"} className="text-center py-10 text-green-700 font-medium italic">
                                        Fetching secure rackings data from database...
                                    </td></tr>
                                ) : error ? (
                                    <tr><td colSpan={isViewer ? "8" : "9"} className="text-center py-8 text-rose-600 font-semibold">{error}</td></tr>
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
                                                    {rawMat.ItemDescription}
                                                </div>
                                                {rawMat.Segment && rawMat.Segment !== 'N/A' && (
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                                        <span>{currentSegConfig.prefix}</span>
                                                        <span>{rawMat.Segment}</span>
                                                    </span>
                                                )}
                                            </td>

                                            <td 
                                                className={`py-3 px-4 font-mono text-xs whitespace-normal break-words transition-colors ${
                                                    isDark ? 'text-slate-300' : 'text-slate-600'
                                                }`}
                                            >
                                                {rawMat.Dimension || '—'}
                                            </td>

                                            <td className={`py-3 px-4 text-center font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{rawMat.ActualCount}</td>
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
                                        <td colSpan={isViewer ? "8" : "9"} className="text-center py-10 text-red-600 font-medium italic">
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
                                        {availableExistingImages.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setImagePickerSearch('');
                                                    setIsImagePickerModalOpen(true);
                                                }}
                                                className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                                                    isDark 
                                                        ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/60' 
                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                                }`}
                                            >
                                                <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                                                <span>Pick from DB ({availableExistingImages.length} available)</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* PREVIEW BOX OR UPLOAD BUTTONS */}
                                    {(selectedFile || selectedExistingImage || existingImgPreview) ? (
                                        <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                                            isDark ? 'bg-[#141622] border-slate-700' : 'bg-slate-50 border-slate-200'
                                        }`}>
                                            <div className="flex items-center gap-3 min-w-0">
                                                <img
                                                    src={selectedFile ? URL.createObjectURL(selectedFile) : (selectedExistingImage?.imageUrl || existingImgPreview)}
                                                    alt="Preview"
                                                    className={`w-14 h-14 rounded-lg object-cover border ${isDark ? 'border-slate-600' : 'border-slate-300'} shadow-sm shrink-0`}
                                                />
                                                <div className="min-w-0">
                                                    {selectedFile ? (
                                                        <>
                                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                                <span className="truncate">{selectedFile.name}</span>
                                                            </div>
                                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">New image selected from device</span>
                                                        </>
                                                    ) : selectedExistingImage ? (
                                                        <>
                                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                                                <ImageIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                                                <span className="truncate">{selectedExistingImage.itemDescription}</span>
                                                            </div>
                                                            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                                                Reusing DB photo ({selectedExistingImage.segment})
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
                                                {availableExistingImages.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setImagePickerSearch('');
                                                            setIsImagePickerModalOpen(true);
                                                        }}
                                                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                                            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                                        }`}
                                                    >
                                                        Change Photo
                                                    </button>
                                                )}
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
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                            {/* Option 1: Upload from Device */}
                                            <label className={`flex flex-col items-center justify-center ${isDark ? 'bg-[#141622] border-slate-700 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'} border-2 border-dashed rounded-xl py-3 px-3 transition-all cursor-pointer text-center`}>
                                                <Upload className={`w-5 h-5 mb-1 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Upload New File</span>
                                                <span className="text-[10px] text-slate-400">JPG, PNG, WEBP</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                            </label>

                                            {/* Option 2: Select from DB Library */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setImagePickerSearch('');
                                                    setIsImagePickerModalOpen(true);
                                                }}
                                                disabled={availableExistingImages.length === 0}
                                                className={`flex flex-col items-center justify-center ${
                                                    availableExistingImages.length === 0
                                                        ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                                        : isDark 
                                                            ? 'bg-indigo-950/30 border-indigo-800/60 hover:bg-indigo-950/50 text-indigo-300' 
                                                            : 'bg-indigo-50/70 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                                                } border-2 border-dashed rounded-xl py-3 px-3 transition-all cursor-pointer text-center`}
                                            >
                                                <ImageIcon className="w-5 h-5 mb-1 text-indigo-500" />
                                                <span className="text-xs font-bold">Pick from DB Library</span>
                                                <span className="text-[10px] opacity-75">{availableExistingImages.length} unique photos</span>
                                            </button>
                                        </div>
                                    )}

                                    {/* QUICK SELECT THUMBNAILS CAROUSEL STRIP */}
                                    {availableExistingImages.length > 0 && (
                                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                    <span>⚡ Quick Pick from DB (Unique Photos):</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setImagePickerSearch('');
                                                        setIsImagePickerModalOpen(true);
                                                    }}
                                                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                                >
                                                    View All ({availableExistingImages.length}) →
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                                                {availableExistingImages.slice(0, 15).map((img, idx) => {
                                                    const isSelected = selectedExistingImage?.imageUrl === img.imageUrl || (existingImgPreview === img.imageUrl && !selectedFile);
                                                    return (
                                                        <button
                                                            key={idx}
                                                            type="button"
                                                            onClick={() => handleSelectExistingImage(img)}
                                                            title={`${img.itemDescription} (${img.segment})`}
                                                            className={`relative group shrink-0 w-11 h-11 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                                                isSelected 
                                                                    ? 'border-[#ff6600] ring-2 ring-[#ff6600]/40 scale-105' 
                                                                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                                            }`}
                                                        >
                                                            <img
                                                                src={img.imageUrl}
                                                                alt={img.itemDescription}
                                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                                            />
                                                            {isSelected && (
                                                                <div className="absolute inset-0 bg-[#ff6600]/30 flex items-center justify-center">
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-white drop-shadow" />
                                                                </div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
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

                                <div className="md:col-span-2">
                                    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
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

            {/* DATABASE IMAGE PICKER MODAL */}
            {isImagePickerModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[70] p-3 sm:p-5 animate-in fade-in duration-200">
                    <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-4xl max-h-[88vh] shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden`}>
                        
                        {/* Header */}
                        <div className={`p-4 sm:p-5 border-b ${isDark ? 'border-slate-800 bg-[#141622]' : 'border-slate-100 bg-slate-50/70'} flex items-center justify-between shrink-0`}>
                            <div>
                                <h3 className={`font-bold text-base sm:text-lg ${isDark ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
                                    Database Image Library
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isDark ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                                        {availableExistingImages.length} unique {availableExistingImages.length === 1 ? 'photo' : 'photos'}
                                    </span>
                                </h3>
                                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Unique product photos deduplicated across database. Select a photo to link with this item.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsImagePickerModalOpen(false)}
                                className={`p-2 rounded-lg transition-colors cursor-pointer ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search and Filters Bar */}
                        <div className={`p-3 sm:px-5 border-b ${isDark ? 'border-slate-800 bg-[#0e1017]' : 'border-slate-100 bg-white'} shrink-0 flex flex-col sm:flex-row items-center gap-2.5 justify-between`}>
                            <div className="relative w-full sm:max-w-md">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={imagePickerSearch}
                                    onChange={(e) => setImagePickerSearch(e.target.value)}
                                    placeholder="Search by description, code, or segment..."
                                    className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs border ${
                                        isDark 
                                            ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-500' 
                                            : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-600'
                                    } focus:outline-none transition-colors`}
                                    autoFocus
                                />
                                {imagePickerSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setImagePickerSearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 self-end sm:self-center">
                                Showing <span className="font-bold text-indigo-600 dark:text-indigo-400">{filteredLibraryImages.length}</span> of {availableExistingImages.length} items
                            </span>
                        </div>

                        {/* Image Grid Content */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar min-h-[280px]">
                            {filteredLibraryImages.length === 0 ? (
                                <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                                    <div className={`p-4 rounded-2xl mb-3 ${isDark ? 'bg-slate-800/60 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>
                                        <ImageIcon className="w-10 h-10" />
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-1">
                                        No images found
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-3">
                                        {imagePickerSearch ? `No database images match "${imagePickerSearch}". Try searching with a different term.` : 'No previous item images have been uploaded to the database yet.'}
                                    </p>
                                    {imagePickerSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setImagePickerSearch('')}
                                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                        >
                                            Clear search filter
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3.5">
                                    {filteredLibraryImages.map((img, idx) => {
                                        const isSelected = selectedExistingImage?.imageUrl === img.imageUrl || (existingImgPreview === img.imageUrl && !selectedFile);
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => handleSelectExistingImage(img)}
                                                className={`group relative rounded-xl border p-2 flex flex-col justify-between transition-all duration-150 cursor-pointer ${
                                                    isSelected
                                                        ? isDark 
                                                            ? 'border-[#ff6600] bg-[#ff6600]/10 ring-2 ring-[#ff6600]/40 shadow-lg' 
                                                            : 'border-[#ff6600] bg-orange-50/60 ring-2 ring-[#ff6600]/40 shadow-md'
                                                        : isDark 
                                                            ? 'bg-[#141622] border-slate-800 hover:border-indigo-500/70 hover:bg-[#1a1d2e]' 
                                                            : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-slate-50/90 shadow-xs'
                                                }`}
                                            >
                                                {/* Image Thumbnail Container */}
                                                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 mb-2">
                                                    <img
                                                        src={img.imageUrl}
                                                        alt={img.itemDescription || "Database Item"}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                        loading="lazy"
                                                    />
                                                    
                                                    {/* Selected Indicator Badge */}
                                                    {isSelected && (
                                                        <div className="absolute top-1.5 right-1.5 bg-[#ff6600] text-white p-1 rounded-full shadow-md flex items-center justify-center animate-in zoom-in-75">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        </div>
                                                    )}

                                                    {/* Segment Pill */}
                                                    {img.segment && (
                                                        <span className="absolute bottom-1.5 left-1.5 max-w-[85%] truncate text-[10px] font-semibold bg-slate-900/80 backdrop-blur-xs text-white px-1.5 py-0.5 rounded shadow">
                                                            {img.segment}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Details */}
                                                <div className="flex flex-col flex-1 justify-between">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" title={img.itemDescription}>
                                                            {img.itemDescription || 'Unnamed Item'}
                                                        </p>
                                                        {img.dimension && img.dimension !== 'N/A' && (
                                                            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                                {img.dimension}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-1">
                                                        {img.usedCount > 1 ? (
                                                            <span 
                                                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50 truncate max-w-[110px]"
                                                                title={Array.isArray(img.usedBy) ? `Shared across ${img.usedCount} products:\n${img.usedBy.map(u => `• ${u.itemDescription}`).join('\n')}` : ''}
                                                            >
                                                                Used in {img.usedCount} items
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                                                Single product
                                                            </span>
                                                        )}
                                                        <span className={`text-[10px] font-semibold shrink-0 ${isSelected ? 'text-[#ff6600]' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                                            {isSelected ? '✓ Selected' : 'Click to select'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className={`p-3.5 sm:px-5 border-t ${isDark ? 'border-slate-800 bg-[#141622]' : 'border-slate-100 bg-slate-50/80'} flex items-center justify-between shrink-0`}>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="hidden sm:inline">Reusing existing pictures saves database and cloud storage.</span>
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsImagePickerModalOpen(false)}
                                className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer ${
                                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                                }`}
                            >
                                Close
                            </button>
                        </div>
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
