import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Archive, X, Filter, RotateCcw, EyeOff, CheckCircle2, Palette, Trash2 } from 'lucide-react';
import axios from 'axios';
import PageHeader from './layout/PageHeader';
import TablePagination from './common/TablePagination';
import { useTheme } from '../context/ThemeContext';

function InventorySupplies() {
  const { isDark } = useTheme();
  const userRole = localStorage.getItem("SystemRole") || "Inventory";
  const isPurchasing = userRole === 'Purchasing';
  const isViewer = false;

  const [suppliesList, setSuppliesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [hideZeroQty, setHideZeroQty] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Direct Inline Quantity Editing States
  const [isEditingQty, setIsEditingQty] = useState(false);
  const [editedQuantities, setEditedQuantities] = useState({});
  const [isSavingQty, setIsSavingQty] = useState(false);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '', message: '', actionType: 'archive', onConfirm: () => { }
  });

  const [palette, setPalette] = useState({ categoryColors: {}, segmentColors: {} });
  const [isPaletteModalOpen, setIsPaletteModalOpen] = useState(false);
  const [isSavingPalette, setIsSavingPalette] = useState(false);

  const COLOR_OPTIONS = [
    { name: 'Emerald / Green', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800', rowBg: 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.16] dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border-l-4 border-l-emerald-500', prefix: '🟢' },
    { name: 'Blue / Indigo', classes: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800', rowBg: 'bg-blue-500/[0.08] hover:bg-blue-500/[0.16] dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border-l-4 border-l-blue-500', prefix: '🔵' },
    { name: 'Amber / Orange', classes: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800', rowBg: 'bg-amber-500/[0.08] hover:bg-amber-500/[0.16] dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border-l-4 border-l-amber-500', prefix: '🟡' },
    { name: 'Rose / Red', classes: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800', rowBg: 'bg-rose-500/[0.08] hover:bg-rose-500/[0.16] dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border-l-4 border-l-rose-500', prefix: '🔴' },
    { name: 'Orange', classes: 'bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800', rowBg: 'bg-orange-500/[0.08] hover:bg-orange-500/[0.16] dark:bg-orange-950/30 dark:hover:bg-orange-950/50 border-l-4 border-l-orange-500', prefix: '🟠' },
    { name: 'Purple / Violet', classes: 'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800', rowBg: 'bg-purple-500/[0.08] hover:bg-purple-500/[0.16] dark:bg-purple-950/30 dark:hover:bg-purple-950/50 border-l-4 border-l-purple-500', prefix: '🟣' },
    { name: 'Slate / Muted Gray', classes: 'bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', rowBg: 'bg-slate-500/[0.08] hover:bg-slate-500/[0.16] dark:bg-slate-900/40 dark:hover:bg-slate-900/60 border-l-4 border-l-slate-400', prefix: '⚪' },
    { name: 'Cyan / Teal', classes: 'bg-cyan-50 text-cyan-700 border-cyan-200/60 dark:bg-cyan-950/60 dark:text-cyan-400 dark:border-cyan-800', rowBg: 'bg-cyan-500/[0.08] hover:bg-cyan-500/[0.16] dark:bg-cyan-950/30 dark:hover:bg-cyan-950/50 border-l-4 border-l-cyan-500', prefix: '🌐' }
  ];

  const segments = ['All Segments', ...[...new Set(suppliesList.map(item => item.Segment).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))];
  const descriptions = ['All Item Descriptions', ...[...new Set(suppliesList.map(item => item.ItemDescription).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))];

  const uniqueCategoriesInDB = [...new Set(suppliesList.map(item => item.Category).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueSegmentsInDB = [...new Set(suppliesList.map(item => item.Segment).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueDescriptionsInDB = [...new Set(suppliesList.map(item => item.ItemDescription).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueBrandsInDB = [...new Set(suppliesList.map(item => item.Brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueDimensionsInDB = [...new Set(suppliesList.map(item => item.Dimension).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueUomsInDB = [...new Set(suppliesList.map(item => item.UOM).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueAccountsInDB = [...new Set(suppliesList.map(item => item.AccountTo).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const [selectedSegment, setSelectedSegment] = useState('All Segments');
  const [selectedDescription, setSelectedDescription] = useState('All Item Descriptions');
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [supplyCode, setSupplyCode] = useState('');
  const [supplyCategory, setSupplyCategory] = useState('');
  const [supplySegment, setSupplySegment] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [supplyBrand, setSupplyBrand] = useState('');
  const [supplyDimension, setSupplyDimension] = useState('');
  const [supplyUom, setSupplyUom] = useState('');
  const [accountTo, setAccountTo] = useState('');
  const [serialNo, setSerialNo] = useState('');
  const [actualCount, setActualCount] = useState('');
  const [damagedCount, setDamagedCount] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState('');

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const fetchSuppliesAndPalette = async () => {
    try {
      setLoading(true);
      const [suppliesRes, paletteRes] = await Promise.all([
        axios.get('/api/supplies'),
        axios.get('/api/settings/palette-sup')
      ]);

      if (Array.isArray(suppliesRes.data)) {
        setSuppliesList(suppliesRes.data);
      } else if (suppliesRes.data && Array.isArray(suppliesRes.data.data)) {
        setSuppliesList(suppliesRes.data.data);
      } else {
        setSuppliesList([]);
      }

      if (paletteRes.data) {
        setPalette({
          categoryColors: paletteRes.data.categoryColors || {},
          segmentColors: paletteRes.data.segmentColors || {}
        });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch database records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliesAndPalette();
  }, []);

  const getCategoryStyles = (categoryName) => {
    if (!categoryName) return { classes: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700", prefix: "⚪" };
    const assignedIdx = palette.categoryColors[categoryName];
    if (assignedIdx !== undefined && COLOR_OPTIONS[assignedIdx]) {
      return COLOR_OPTIONS[assignedIdx];
    }
    const idx = uniqueCategoriesInDB.indexOf(categoryName);
    return COLOR_OPTIONS[(idx !== -1 ? idx : 0) % COLOR_OPTIONS.length];
  };

  const getSegmentStyles = (segmentName) => {
    if (!segmentName) return { classes: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700", rowBg: "hover:bg-slate-50/80 dark:hover:bg-[#141622] border-l-4 border-l-transparent", prefix: "⚪" };
    const assignedIdx = palette.segmentColors[segmentName];
    if (assignedIdx !== undefined && COLOR_OPTIONS[assignedIdx]) {
      return COLOR_OPTIONS[assignedIdx];
    }
    const idx = uniqueSegmentsInDB.indexOf(segmentName);
    return COLOR_OPTIONS[(idx !== -1 ? idx : 0) % COLOR_OPTIONS.length];
  };

  const handleCategoryColorChange = (catName, indexValue) => {
    setPalette(prev => ({
      ...prev,
      categoryColors: { ...prev.categoryColors, [catName]: parseInt(indexValue, 10) }
    }));
  };

  const handleSegmentColorChange = (segName, indexValue) => {
    setPalette(prev => ({
      ...prev,
      segmentColors: { ...prev.segmentColors, [segName]: parseInt(indexValue, 10) }
    }));
  };

  const handleSavePaletteConfig = async (e) => {
    e.preventDefault();
    try {
      setIsSavingPalette(true);
      await axios.post('/api/settings/palette-sup', palette);
      showToast("Palette configurations applied successfully!");
      setIsPaletteModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to load data from the server.");
    } finally {
      setIsSavingPalette(false);
    }
  };

  const handleToggleEditQty = () => {
    if (isEditingQty) {
      setIsEditingQty(false);
      setEditedQuantities({});
    } else {
      setIsEditingQty(true);
    }
  };

  const handleActualCountChange = (id, value) => {
    setEditedQuantities(prev => {
      const item = suppliesList.find(s => s._id === id);
      const existing = prev[id] || {
        actualCount: item?.ActualCount ?? 0,
        damagedCount: item?.DamagedCount ?? 0
      };

      const parsedActual = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
      const numActual = value === '' ? 0 : parsedActual;
      
      const currentDamaged = existing.damagedCount === '' ? 0 : (parseInt(existing.damagedCount, 10) || 0);
      const newDamaged = Math.min(currentDamaged, numActual);

      return {
        ...prev,
        [id]: {
          actualCount: value,
          damagedCount: newDamaged
        }
      };
    });
  };

  const handleDamagedQtyChange = (id, value) => {
    setEditedQuantities(prev => {
      const item = suppliesList.find(s => s._id === id);
      const existing = prev[id] || {
        actualCount: item?.ActualCount ?? 0,
        damagedCount: item?.DamagedCount ?? 0
      };

      const numActual = existing.actualCount === '' ? 0 : (parseInt(existing.actualCount, 10) || 0);
      let parsedDamaged = value === '' ? '' : Math.max(0, parseInt(value, 10) || 0);
      if (parsedDamaged !== '' && parsedDamaged > numActual) {
        parsedDamaged = numActual;
      }

      return {
        ...prev,
        [id]: {
          actualCount: existing.actualCount,
          damagedCount: parsedDamaged
        }
      };
    });
  };

  const handleGoodConditionQtyChange = (id, value) => {
    setEditedQuantities(prev => {
      const item = suppliesList.find(s => s._id === id);
      const existing = prev[id] || {
        actualCount: item?.ActualCount ?? 0,
        damagedCount: item?.DamagedCount ?? 0
      };

      const numActual = existing.actualCount === '' ? 0 : (parseInt(existing.actualCount, 10) || 0);
      let parsedGood = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
      if (parsedGood > numActual) {
        parsedGood = numActual;
      }
      const newDamaged = Math.max(0, numActual - parsedGood);

      return {
        ...prev,
        [id]: {
          actualCount: existing.actualCount,
          damagedCount: newDamaged
        }
      };
    });
  };

  const handleQtyChange = handleActualCountChange;

  const handleCancelEditQty = () => {
    setEditedQuantities({});
    setIsEditingQty(false);
  };

  const handleSaveQtyChanges = async () => {
    // Find all items that differ from their database ActualCount or DamagedCount
    const updates = [];
    for (const [id, val] of Object.entries(editedQuantities)) {
      const item = suppliesList.find(s => s._id === id);
      if (!item) continue;

      const parsedActual = typeof val === 'object'
        ? (val.actualCount === '' ? 0 : Math.max(0, parseInt(val.actualCount, 10) || 0))
        : Math.max(0, parseInt(val, 10) || 0);

      const parsedDamaged = typeof val === 'object' && val.damagedCount !== undefined
        ? (val.damagedCount === '' ? 0 : Math.max(0, parseInt(val.damagedCount, 10) || 0))
        : (item.DamagedCount ?? 0);

      const actualChanged = parsedActual !== (item.ActualCount ?? 0);
      const damagedChanged = parsedDamaged !== (item.DamagedCount ?? 0);

      if (actualChanged || damagedChanged) {
        updates.push({
          id,
          actualCount: parsedActual,
          damagedCount: parsedDamaged
        });
      }
    }

    if (updates.length === 0) {
      showToast("No quantity changes detected.");
      setIsEditingQty(false);
      setEditedQuantities({});
      return;
    }

    setIsSavingQty(true);
    try {
      try {
        await axios.put('/api/supplies/batch-counts', { updates });
      } catch (batchErr) {
        // Fallback to updating individually if batch route unavailable
        await Promise.all(
          updates.map(u => axios.put(`/api/supplies/${u.id}`, {
            ActualCount: u.actualCount,
            DamagedCount: u.damagedCount
          }))
        );
      }

      showToast(`Successfully saved quantities for ${updates.length} item${updates.length > 1 ? 's' : ''}!`);
      setIsEditingQty(false);
      setEditedQuantities({});
      await fetchSuppliesAndPalette();
    } catch (err) {
      console.error("Error saving quantities:", err);
      showToast(err.response?.data?.message || "Failed to save quantity changes.", true);
    } finally {
      setIsSavingQty(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setSupplyCode('SPL-USSP-[Auto]');
    setSupplyCategory('');
    setSupplySegment('');
    setItemDescription('');
    setSupplyBrand('');
    setSupplyDimension('');
    setSupplyUom('');
    setAccountTo('');
    setSerialNo('');
    setActualCount('');
    setDamagedCount('');
    setAcquisitionCost('');
    setIsModalOpen(true);
  };

  const openEditModal = (supply) => {
    setIsEditing(true);
    setCurrentId(supply._id);
    setSupplyCode(supply.Code || '');
    setSupplyCategory(supply.Category || '');
    setSupplySegment(supply.Segment || '');
    setItemDescription(supply.ItemDescription || '');
    setSupplyBrand(supply.Brand || '');
    setSupplyDimension(supply.Dimension || '');
    setSupplyUom(supply.UOM || '');
    setAccountTo(supply.AccountTo || '');
    setSerialNo(supply.SerialNo || '');
    setActualCount(supply.ActualCount !== undefined ? String(supply.ActualCount) : '0');
    setDamagedCount(supply.DamagedCount !== undefined ? String(supply.DamagedCount) : '0');
    setAcquisitionCost(supply.AcquisitionCost !== undefined ? String(supply.AcquisitionCost) : '');
    setIsModalOpen(true);
  };

  const modalActual = actualCount === '' ? 0 : (Math.max(0, parseInt(actualCount, 10) || 0));
  const modalDamaged = damagedCount === '' ? 0 : (Math.max(0, parseInt(damagedCount, 10) || 0));
  const modalGood = Math.max(0, modalActual - modalDamaged);

  const handleModalActualChange = (val) => {
    setActualCount(val);
    const num = val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0);
    if (modalDamaged > num) {
      setDamagedCount(String(num));
    }
  };

  const handleModalDamagedChange = (val) => {
    if (val === '') {
      setDamagedCount('');
      return;
    }
    let num = Math.max(0, parseInt(val, 10) || 0);
    if (num > modalActual) {
      num = modalActual;
    }
    setDamagedCount(String(num));
  };

  const handleModalGoodChange = (val) => {
    const num = val === '' ? 0 : Math.max(0, parseInt(val, 10) || 0);
    const clampedGood = Math.min(modalActual, num);
    const newDamaged = Math.max(0, modalActual - clampedGood);
    setDamagedCount(String(newDamaged));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      Code: supplyCode.trim(),
      Category: supplyCategory.trim(),
      Segment: supplySegment.trim(),
      ItemDescription: itemDescription.trim(),
      Brand: supplyBrand.trim(),
      Dimension: supplyDimension.trim(),
      UOM: supplyUom.trim(),
      AccountTo: accountTo.trim(),
      SerialNo: serialNo.trim(),
      ActualCount: Number(actualCount) || 0,
      DamagedCount: Number(damagedCount) || 0,
      AcquisitionCost: Number(acquisitionCost) || 0
    };

    try {
      if (isEditing) {
        await axios.put(`/api/supplies/${currentId}`, payload);
        showToast(`Success: Updated product "${itemDescription.trim()}"!`);
      } else {
        await axios.post('/api/supplies', payload);
        showToast(`Success: Added new product "${itemDescription.trim()}"!`);
      }
      setIsModalOpen(false);
      fetchSuppliesAndPalette();
    } catch (err) {
      showToast(err.response?.data?.message || "Nagka-error sa pag-save ng item.", true);
    }
  };

  const handleArchiveSupply = (supply) => {
    setConfirmModalConfig({
      title: 'Archive Supply Record',
      message: `Are you sure you want to archive "${supply.ItemDescription}"?`,
      actionType: 'archive',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/supplies/${supply._id}`);
          showToast(`Success: Archived supply item.`);
          fetchSuppliesAndPalette();
        } catch (err) { alert("Failed to archive."); }
        finally { setIsConfirmModalOpen(false); }
      }
    });
    setIsConfirmModalOpen(true);
  };

  const handleUnarchiveSupply = (supply) => {
    setConfirmModalConfig({
      title: 'Restore Supply Record',
      message: `Are you sure you want to restore "${supply.ItemDescription}"?`,
      actionType: 'restore',
      onConfirm: async () => {
        try {
          await axios.put(`/api/supplies/${supply._id}/unarchive`, { ...supply, isArchived: false });
          showToast(`Success: Restored supply item.`);
          fetchSuppliesAndPalette();
        } catch (err) { alert("Failed to restore."); }
        finally { setIsConfirmModalOpen(false); }
      }
    });
    setIsConfirmModalOpen(true);
  };

  const handlePermanentDeleteSupply = (supply) => {
    setConfirmModalConfig({
      title: 'Delete Supply Record Permanently',
      message: `Are you sure you want to PERMANENTLY delete "${supply.ItemDescription}"? This action cannot be undone.`,
      actionType: 'delete',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/supplies/${supply._id}/permanent`);
          showToast(`Success: Permanently deleted supply item.`);
          fetchSuppliesAndPalette();
        } catch (err) { alert("Failed to delete item."); }
        finally { setIsConfirmModalOpen(false); }
      }
    });
    setIsConfirmModalOpen(true);
  };

  const currentDisplayList = suppliesList.filter(supply => showArchivedOnly ? supply.isArchived === true : !supply.isArchived);
  const filteredSupplies = currentDisplayList.filter(supply => {
    const matchesSegment = selectedSegment === 'All Segments' || supply.Segment === selectedSegment;
    const matchesDescription = selectedDescription === 'All Item Descriptions' || supply.ItemDescription === selectedDescription;
    const matchesZeroQty = !hideZeroQty || supply.ActualCount > 0;
    const matchesSearch = !searchTerm || [
      supply.Code,
      supply.Segment,
      supply.ItemDescription,
      supply.Brand,
      supply.Dimension,
      supply.SerialNo,
      supply.AccountTo
    ].some(v => v && v.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSegment && matchesDescription && matchesSearch && matchesZeroQty;
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
  }, [selectedSegment, selectedDescription, searchTerm, hideZeroQty, showArchivedOnly]);

  const totalRows = filteredSupplies.length;
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const indexOfLastRow = indexOfFirstRow + rowsPerPage;
  const paginatedSupplies = filteredSupplies.slice(indexOfFirstRow, indexOfLastRow);

  const activeCount = suppliesList.filter(s => !s.isArchived).length;
  const archivedCount = suppliesList.filter(s => s.isArchived).length;

  const totalAcquisitionCost = filteredSupplies.reduce((sum, item) => {
    const editState = editedQuantities[item._id];
    const qty = (isEditingQty && editState !== undefined)
      ? (typeof editState === 'object'
          ? Math.max(0, parseInt(editState.actualCount, 10) || 0)
          : Math.max(0, parseInt(editState, 10) || 0))
      : (Number(item.ActualCount) || 0);
    return sum + (qty * (Number(item.AcquisitionCost) || 0));
  }, 0);

  return (
    <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative">
      <PageHeader activeTab="supplies" />

      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100 text-slate-600'} border rounded-2xl p-6 shadow-sm flex flex-col gap-6 transition-colors duration-200`}>

        <div className="flex flex-col gap-1.5">
          {/* ROW 1: Filter & Acquisition Cost */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'} flex-shrink-0`}>
              <Filter className={`w-4 h-4 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
              <span>{showArchivedOnly ? 'Archive' : 'Filter'}</span>
            </div>

            {/* TOTAL ACQUISITION COST BADGE IN TOOLBAR */}
            <div className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border select-none flex-shrink-0 transition-all ${isDark ? 'bg-[#141622] text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
              <span>Total Acquisition Cost:</span>
              <span className="font-mono font-black text-red-600 dark:text-red-400">
                ₱{totalAcquisitionCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* ROW 2: Actions Row (Hide 0 Qty under Filter, Palette Settings, Edit Qty, View Archive Vault) */}
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <label
              className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none border px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 ${hideZeroQty
                ? (isDark ? 'bg-red-950/40 border-red-900/60 text-red-400' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100')
                : (isDark ? 'bg-[#141622] border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')
                }`}
            >
              <input
                type="checkbox"
                checked={hideZeroQty}
                onChange={(e) => setHideZeroQty(e.target.checked)}
                className={`w-3.5 h-3.5 rounded cursor-pointer transition-all ${hideZeroQty ? 'accent-red-500' : 'accent-[#ff6600]'}`}
              />
              <span className="hidden sm:inline">Hide 0 Qty</span>
              <span className="sm:hidden text-[10px] font-bold">0 Qty</span>
            </label>

            {!isViewer && !isPurchasing && (
              <button
                onClick={() => setIsPaletteModalOpen(true)}
                title="Palette Settings"
                className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm flex-shrink-0 ${isDark ? 'border-slate-700 bg-[#ff6600] text-white hover:bg-[#ff6600]/90' : 'border-slate-200 bg-[#18174e] text-white hover:bg-[#18174e]/90'}`}
              >
                <Palette className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span className="hidden md:inline">Palette Settings</span>
              </button>
            )}

            {/* EDIT QTY BUTTON DIRECTLY IN TABLE */}
            {!isViewer && !isPurchasing && !showArchivedOnly && (
              <button
                onClick={handleToggleEditQty}
                title={isEditingQty ? "Cancel Edit Qty Mode" : "Directly Edit Actual Count Column"}
                className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm flex-shrink-0 ${
                  isEditingQty
                    ? (isDark ? 'border-amber-500 bg-amber-500 text-white ring-2 ring-amber-400/50 shadow-md' : 'border-amber-600 bg-amber-600 text-white ring-2 ring-amber-500/40 shadow-md')
                    : (isDark ? 'border-slate-700 bg-[#ff6600] text-white hover:bg-[#ff6600]/90' : 'border-slate-200 bg-[#18174e] text-white hover:bg-[#18174e]/90')
                }`}
              >
                <Edit2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-white" />
                <span className="hidden md:inline">{isEditingQty ? 'Editing Qty (Active)' : 'Edit Qty'}</span>
                <span className="md:hidden">{isEditingQty ? 'Editing' : 'Edit Qty'}</span>
              </button>
            )}

            {!isViewer && !isPurchasing && (
              <button
                onClick={() => {
                  if (isEditingQty) {
                    setIsEditingQty(false);
                    setEditedQuantities({});
                  }
                  setShowArchivedOnly(!showArchivedOnly);
                }}
                title={showArchivedOnly ? "Show Active Supplies" : "View Archive Vault"}
                className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${showArchivedOnly
                  ? 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20'
                  : (isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                  }`}
              >
                {showArchivedOnly ? (
                  <>
                    <EyeOff className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden md:inline">Show Active Supplies</span>
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

          <div className={`flex overflow-x-auto gap-2 items-center mt-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid ${isViewer || isPurchasing ? 'md:grid-cols-3' : 'md:grid-cols-4'} md:pb-0`}>

            <div className="min-w-[180px] w-full md:min-w-0">
              <div className="relative w-full">
                <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input type="text" placeholder="Search Description, Segment, Brand..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none`} />
              </div>
            </div>

            <div className="min-w-[150px] w-full md:min-w-0">
              <select value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)} className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none w-full cursor-pointer truncate`}>
                {(segments || []).map(seg => <option key={seg} value={seg}>{seg}</option>)}
              </select>
            </div>

            <div className="min-w-[170px] w-full md:min-w-0">
              <select value={selectedDescription} onChange={(e) => setSelectedDescription(e.target.value)} className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none w-full cursor-pointer truncate`}>
                {(descriptions || []).map(desc => <option key={desc} value={desc}>{desc}</option>)}
              </select>
            </div>

            {!isViewer && !isPurchasing && (
              <div className="min-w-[160px] w-full md:min-w-0">
                <button onClick={openAddModal} disabled={showArchivedOnly} className={`flex items-center justify-center gap-2 ${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm w-full cursor-pointer transition-all h-[38px]`}>
                  <span className="whitespace-nowrap">Add New Tools & Equipments</span>
                </button>
              </div>
            )}

          </div>
          <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-full mt-3`}></div>
        </div>

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
                <tr className={`text-white font-bold uppercase text-nowrap text-sm ${isDark ? 'bg-[#0f111d] border-b border-slate-800' : 'bg-[#18174e]'}`}>
                  <th className="py-3 px-4 whitespace-nowrap">Item Description</th>
                  <th className="py-3 px-4 whitespace-nowrap">Dimension</th>
                  <th className="py-3 px-4 whitespace-nowrap">Brand</th>
                  <th className="py-3 px-4 whitespace-nowrap">Serial</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">
                    Actual Count{isEditingQty ? ' (Editing)' : ''}
                  </th>
                  <th className="py-3 px-4 whitespace-nowrap">UOM</th>
                  {!isPurchasing && (
                    <th className="py-3 px-4 text-center whitespace-nowrap">
                      Breakdown{isEditingQty ? ' (Editing)' : ''}
                    </th>
                  )}
                  <th className="py-3 px-4 whitespace-nowrap text-right">Acquisition Cost</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Total Acquisition Cost</th>
                  {!isViewer && (
                    <th className="py-3 px-4 text-center whitespace-nowrap">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80 bg-[#090b10]' : 'divide-slate-100 bg-white'}`}>
                {loading ? (
                  <tr>
                    <td colSpan={isPurchasing ? "9" : (isViewer ? "9" : "10")} className="text-center py-10 text-green-500 font-medium italic">
                      Fetching secure rackings data from database...
                    </td>
                  </tr>
                ) : filteredSupplies.length === 0 ? (
                  <tr>
                    <td colSpan={isPurchasing ? "9" : (isViewer ? "9" : "10")} className="text-center py-10 text-red-500 font-medium italic">
                      No records match the selected filters or search queries.
                    </td>
                  </tr>) : (
                  paginatedSupplies.map((supply) => {
                    const catStyle = getCategoryStyles(supply.Category);
                    const segStyle = getSegmentStyles(supply.Segment);
                    const editState = editedQuantities[supply._id];
                    const totalQty = (isEditingQty && editState !== undefined)
                      ? (typeof editState === 'object'
                          ? (editState.actualCount === '' ? 0 : Math.max(0, parseInt(editState.actualCount, 10) || 0))
                          : Math.max(0, parseInt(editState, 10) || 0))
                      : (Number(supply.ActualCount) || 0);

                    const damagedQty = (isEditingQty && editState !== undefined && typeof editState === 'object' && editState.damagedCount !== undefined)
                      ? (editState.damagedCount === '' ? 0 : Math.max(0, parseInt(editState.damagedCount, 10) || 0))
                      : (Number(supply.DamagedCount) || 0);

                    const goodConditionQty = Math.max(0, totalQty - damagedQty);

                    const isRowQtyModified = isEditingQty && editState !== undefined && (
                      typeof editState === 'object'
                        ? ((parseInt(editState.actualCount, 10) || 0) !== (supply.ActualCount ?? 0) ||
                           (parseInt(editState.damagedCount, 10) || 0) !== (supply.DamagedCount ?? 0))
                        : (parseInt(editState, 10) || 0) !== (supply.ActualCount ?? 0)
                    );

                    return (
                      <tr
                        key={supply._id}
                        className={`group ${segStyle.rowBg || (isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600')} transition-colors font-medium whitespace-nowrap text-sm`}
                      >
                        {/* 1. Item Description & Segment */}
                        <td className="py-3 px-4 min-w-[200px]">
                          <div className={`font-semibold whitespace-normal break-words transition-colors ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {supply.ItemDescription}
                          </div>
                          {supply.Segment && supply.Segment !== 'N/A' && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${segStyle.classes}`}>
                                {segStyle.prefix && <span>{segStyle.prefix}</span>}
                                <span>{supply.Segment}</span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 2. Dimension */}
                        <td className={`py-3 px-4 font-mono text-xs whitespace-normal break-words transition-colors ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {supply.Dimension || '—'}
                        </td>

                        {/* 3. Brand */}
                        <td className={`py-3 px-4 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {supply.Brand || '—'}
                        </td>

                        {/* 4. Serial */}
                        <td className={`py-3 px-4 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-600'} text-xs font-mono`}>
                          {supply.SerialNo || '—'}
                        </td>

                        {/* 5. Actual Count */}
                        <td className={`py-3 px-4 text-center font-bold font-mono text-sm whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {isEditingQty ? (
                            <div className="flex items-center justify-center">
                              <input
                                type="number"
                                min="0"
                                value={editState !== undefined ? (typeof editState === 'object' ? editState.actualCount : editState) : (supply.ActualCount ?? 0)}
                                onChange={(e) => handleActualCountChange(supply._id, e.target.value)}
                                className={`w-24 text-center font-mono font-bold text-sm py-1 px-2 rounded-lg border focus:outline-none transition-all ${
                                  isDark
                                    ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600] focus:ring-2 focus:ring-[#ff6600]/30'
                                    : 'bg-white border-slate-300 text-slate-900 focus:border-[#18174e] focus:ring-2 focus:ring-[#18174e]/20 shadow-sm'
                                } ${
                                  isRowQtyModified
                                    ? (isDark
                                        ? 'border-[#ff6600] ring-2 ring-[#ff6600]/50 bg-[#ff6600]/10 text-[#ff8533] font-black'
                                        : 'border-[#18174e] ring-2 ring-[#18174e]/30 bg-[#18174e]/5 text-[#18174e] font-black')
                                    : ''
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          ) : (
                            supply.ActualCount ?? 0
                          )}
                        </td>

                        {/* 6. UOM */}
                        <td className={`py-3 px-4 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {supply.UOM || 'pcs'}
                        </td>

                        {/* 7. Breakdown (Good Condition QTY & Damaged QTY) */}
                        {!isPurchasing && (
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {isEditingQty ? (
                              <div className="inline-flex flex-col gap-1.5 items-center min-w-[170px]" onClick={(e) => e.stopPropagation()}>
                                <div className="inline-flex items-center justify-between w-full gap-2 px-2 py-1 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                  <span className="whitespace-nowrap">Good Condition QTY:</span>
                                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" title="Auto-computed: Actual Count - Damaged QTY">
                                    {goodConditionQty}
                                  </span>
                                </div>
                                <div className={`inline-flex items-center justify-between w-full gap-2 px-2 py-1 rounded text-[11px] font-semibold border ${
                                  damagedQty > 0
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                    : isDark ? 'bg-slate-800/60 text-slate-400 border-slate-700/60' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                  <span className="whitespace-nowrap">Damaged QTY:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={totalQty}
                                    value={editState !== undefined && typeof editState === 'object' && editState.damagedCount !== undefined ? editState.damagedCount : damagedQty}
                                    onChange={(e) => handleDamagedQtyChange(supply._id, e.target.value)}
                                    className={`w-14 text-center font-mono font-bold text-xs py-0.5 px-1 rounded border focus:outline-none transition-all ${
                                      isDark
                                        ? 'bg-[#141622] border-rose-500/50 text-white focus:ring-2 focus:ring-rose-400/40'
                                        : 'bg-white border-rose-300 text-slate-900 focus:ring-2 focus:ring-rose-500/30'
                                    }`}
                                    title={`Max ${totalQty} based on Actual Count`}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="inline-flex flex-col gap-1 items-center min-w-[140px]">
                                <span className="inline-flex items-center justify-between w-full gap-2 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <span>Good Condition QTY:</span>
                                  <span className="font-mono font-bold">{goodConditionQty}</span>
                                </span>
                                <span className={`inline-flex items-center justify-between w-full gap-2 px-2 py-0.5 rounded text-[11px] font-semibold ${damagedQty > 0
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  : isDark ? 'bg-slate-800/60 text-slate-400 border border-slate-700/60' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                  }`}>
                                  <span>Damaged QTY:</span>
                                  <span className="font-mono font-bold">{damagedQty}</span>
                                </span>
                              </div>
                            )}
                          </td>
                        )}

                        {/* 8. Acquisition Cost */}
                        <td className={`py-3 px-4 text-right font-mono text-xs whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          ₱{(Number(supply.AcquisitionCost) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* 9. Total Acquisition Cost */}
                        <td className="py-3 px-4 text-right font-mono text-xs font-bold whitespace-nowrap text-red-600 dark:text-red-400">
                          ₱{(totalQty * (Number(supply.AcquisitionCost) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* 12. Actions */}
                        {!isViewer && (
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {!supply.isArchived ? (
                                <>
                                  <button onClick={() => openEditModal(supply)} className={`p-1 ${isDark ? 'bg-[#181a26] border-slate-700 text-indigo-400 hover:bg-indigo-600 hover:text-white' : 'bg-[#18174e]/5 border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'} border rounded transition-all cursor-pointer`} title={isPurchasing ? "Edit Acquisition Cost" : "Edit Item"}><Edit2 className="w-3.5 h-3.5" /></button>
                                  {!isPurchasing && (
                                    <button onClick={() => handleArchiveSupply(supply)} className={`p-1 ${isDark ? 'bg-[#181a26] border-slate-700 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-[#18174e]/5 border-slate-200 text-red-500 hover:bg-red-500 hover:text-white'} border rounded transition-all cursor-pointer`} title="Archive Item"><Archive className="w-3.5 h-3.5" /></button>
                                  )}
                                </>
                              ) : (
                                <>
                                  <button onClick={() => handleUnarchiveSupply(supply)} title="Restore" className={`p-1.5 ${isDark ? 'bg-[#181a26] border-emerald-800/80 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'} border rounded transition-all cursor-pointer`}><RotateCcw className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handlePermanentDeleteSupply(supply)} title="Delete Permanently" className={`p-1.5 ${isDark ? 'bg-[#181a26] border-rose-800/80 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'} border rounded transition-all cursor-pointer`}><Trash2 className="w-3.5 h-3.5" /></button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TABLE BOTTOM ACTIONS: SAVE CHANGES BAR */}
          {isEditingQty && (
            <div className={`p-4 border-t flex items-center justify-between flex-wrap gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 ${isDark ? 'bg-[#0f111d] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Editing mode enabled: Adjust <strong>Actual Count</strong> or <strong>Damaged QTY</strong> directly in the table. Good Condition QTY updates automatically.
                </span>
                {(() => {
                  const countChanged = Object.entries(editedQuantities).filter(([id, val]) => {
                    const it = suppliesList.find(s => s._id === id);
                    if (!it) return false;
                    const parsedActual = typeof val === 'object'
                      ? (val.actualCount === '' ? 0 : Math.max(0, parseInt(val.actualCount, 10) || 0))
                      : Math.max(0, parseInt(val, 10) || 0);
                    const parsedDamaged = typeof val === 'object' && val.damagedCount !== undefined
                      ? (val.damagedCount === '' ? 0 : Math.max(0, parseInt(val.damagedCount, 10) || 0))
                      : (it.DamagedCount ?? 0);
                    return parsedActual !== (it.ActualCount ?? 0) || parsedDamaged !== (it.DamagedCount ?? 0);
                  }).length;
                  return countChanged > 0 ? (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                      isDark 
                        ? 'bg-[#ff6600]/15 text-[#ff8533] border-[#ff6600]/30' 
                        : 'bg-[#18174e]/10 text-[#18174e] border-[#18174e]/20'
                    }`}>
                      {countChanged} {countChanged === 1 ? 'item' : 'items'} modified
                    </span>
                  ) : null;
                })()}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEditQty}
                  disabled={isSavingQty}
                  className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveQtyChanges}
                  disabled={isSavingQty}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 cursor-pointer shadow-md transition-all ${
                    isDark
                      ? 'bg-[#ff6600] hover:bg-[#ff6600]/90'
                      : 'bg-[#18174e] hover:bg-[#18174e]/90'
                  }`}
                >
                  {isSavingQty ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto`}>

            {/* Header */}
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                  {isPurchasing ? 'Edit Acquisition Cost' : (isEditing ? 'Edit Tools & Equipments Item' : 'Add New Tools & Equipments')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isPurchasing && (
              <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-50 border-amber-200/60'} rounded-xl border mt-3`}>
                <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                  * Purchasing Pricing Protocol *
                </span>
                <p className={`text-[11px] ${isDark ? 'text-amber-300/80' : 'text-amber-700'} leading-relaxed`}>
                  You are editing the <strong>Acquisition Cost</strong> for this equipment. All equipment specifications and records are locked as read-only.
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4 mt-4">
              {error && (
                <div className="text-xs font-semibold text-red-500 bg-red-500/10 border-red-500/30 p-2.5 rounded-lg flex items-center gap-2 border">
                  <span>{error}</span>
                </div>
              )}

              {isPurchasing ? (
                <div className="space-y-4">
                  {/* READ-ONLY ITEM PROFILE DISPLAY */}
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Segment</span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold border ${getSegmentStyles(supplySegment).classes || (isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white text-slate-800 border-slate-200')}`}>
                          <span>{getSegmentStyles(supplySegment).prefix}</span>
                          <span>{supplySegment || "N/A"}</span>
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">UOM & Actual Count</span>
                        <span className={`text-xs font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {actualCount || 0} {supplyUom || 'pcs'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Item Description</span>
                      <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'} leading-snug break-words`}>
                        {itemDescription || "—"}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Dimension</span>
                        <span className={`font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{supplyDimension || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Brand</span>
                        <span className={`${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{supplyBrand || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Serial No</span>
                        <span className={`font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{serialNo || "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* The ONLY Editable Input: Acquisition Cost */}
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0f111a] border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-[#18174e]'}`}>
                        Acquisition Cost (Price) *
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">Editable for Purchasing</span>
                    </div>
                    <div className="relative">
                      <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-lg select-none pointer-events-none ${isDark ? 'text-amber-400' : 'text-[#18174e]'}`}>
                        ₱
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={acquisitionCost}
                        autoFocus
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^\d*\.?\d*$/.test(val)) {
                            setAcquisitionCost(val);
                          }
                        }}
                        className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#18174e]'} border-2 rounded-xl pl-9 pr-4 py-2.5 text-base font-mono font-bold focus:outline-none transition-all shadow-inner`}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                      <span className="text-[11px] text-slate-400">Formatted Cost Preview:</span>
                      <span className="font-mono font-black text-sm text-red-600 dark:text-red-400">
                        ₱{(Number(acquisitionCost) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* 1. Segment */}
                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Segment</label>
                  <input
                    type="text"
                    list="segments-dl"
                    placeholder="e.g. Tools, Fixtures"
                    value={supplySegment}
                    onChange={(e) => setSupplySegment(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="segments-dl">
                    {uniqueSegmentsInDB?.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>

                {/* 2. Item Description */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Item Description *</label>
                  <input
                    type="text"
                    required
                    list="descriptions-dl"
                    placeholder="Detailed item description"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="descriptions-dl">
                    {uniqueDescriptionsInDB?.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>

                {/* 3. Dimension */}
                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Dimension</label>
                  <input
                    type="text"
                    list="dimensions-dl"
                    placeholder="e.g. Standard, 10x12"
                    value={supplyDimension}
                    onChange={(e) => setSupplyDimension(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="dimensions-dl">
                    {uniqueDimensionsInDB?.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>

                {/* 4. Serial */}
                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Serial</label>
                  <input
                    type="text"
                    placeholder="S/N Code"
                    value={serialNo}
                    onChange={(e) => setSerialNo(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                </div>

                {/* 5. Brand */}
                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Brand</label>
                  <input
                    type="text"
                    list="brands-dl"
                    placeholder="Brand name"
                    value={supplyBrand}
                    onChange={(e) => setSupplyBrand(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="brands-dl">
                    {uniqueBrandsInDB?.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>

                {/* 6. UOM */}
                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>UOM *</label>
                  <input
                    type="text"
                    required
                    list="uoms-dl"
                    placeholder="pcs, set, unit"
                    value={supplyUom}
                    onChange={(e) => setSupplyUom(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="uoms-dl">
                    {uniqueUomsInDB?.map(u => <option key={u} value={u} />)}
                  </datalist>
                </div>

                {/* 7. Quantity & Condition Breakdown */}
                <div className={`md:col-span-2 p-3.5 rounded-xl border ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Quantity & Condition Breakdown
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Actual Count = Good Condition + Damaged
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Actual Count */}
                    <div>
                      <label className={`block text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                        Actual Count *
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={actualCount}
                        onChange={(e) => handleModalActualChange(e.target.value)}
                        className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-[#ff6600]`}
                      />
                    </div>

                    {/* Good Condition QTY (Auto-calculated, Read-only) */}
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">
                        Good Condition QTY
                      </label>
                      <div className={`w-full ${isDark ? 'bg-[#0e1017]/80 border-slate-700/70 text-emerald-400' : 'bg-slate-100 border-slate-200 text-emerald-700'} border rounded-lg px-3 py-2 text-sm font-mono font-bold select-none flex items-center justify-between`}>
                        <span>{modalGood}</span>
                        <span className="text-[10px] text-slate-400 font-medium italic">Auto (Count - Damaged)</span>
                      </div>
                    </div>

                    {/* Damaged QTY */}
                    <div>
                      <label className="block text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase mb-1">
                        Damaged QTY
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={modalActual}
                        value={damagedCount}
                        onChange={(e) => handleModalDamagedChange(e.target.value)}
                        className={`w-full ${isDark ? 'bg-[#0e1017] border-rose-500/40 text-rose-400' : 'bg-white border-rose-300 text-rose-700'} border rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20`}
                      />
                    </div>
                  </div>
                </div>

                {/* 8. Acquisition Cost */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Acquisition Cost (Price)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={acquisitionCost}
                    onChange={(e) => setAcquisitionCost(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                </div>

              </div>
            )}

              {/* Action Buttons */}
              <div className={`flex items-center justify-end gap-2 mt-6 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#ff6600] hover:bg-[#e05a00] text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md"
                >
                  {isPurchasing ? 'Save Changes' : (isEditing ? 'Save Changes' : 'Save Details')}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {isPaletteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200`}>

            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3 shrink-0`}>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>Color Palette Mapping</h3>
              </div>
              <button
                onClick={() => setIsPaletteModalOpen(false)}
                className={`${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-50 border-amber-200/60'} rounded-xl border mt-3 shrink-0`}>
              <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                * System Palette Protocol *
              </span>
              <p className={`text-[11px] ${isDark ? 'text-amber-300/80' : 'text-amber-700'} leading-relaxed`}>
                Assign personalized Tailwind color configurations to segments. Changes applied here will update all component badges globally across the system environment.
              </p>
            </div>

            <div className="space-y-4 mt-4 flex-1 overflow-y-auto pr-1">

              <div>
                <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Segment Color Configuration</label>
                <div className={`space-y-2.5 ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50/50 border-slate-100'} p-3 rounded-xl border`}>
                  {uniqueSegmentsInDB.length === 0 ? (
                    <p className="text-xs italic text-slate-400 pl-1">No segments logged in current context...</p>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {uniqueSegmentsInDB.map((seg, segIdx) => {
                        const config = getSegmentStyles(seg);
                        const currentIdx = palette.segmentColors[seg] !== undefined ? palette.segmentColors[seg] : (segIdx % COLOR_OPTIONS.length);
                        return (
                          <div key={seg} className={`flex items-center justify-between gap-4 ${isDark ? 'bg-[#090b10] border-slate-800' : 'bg-white border-slate-200/60'} p-2 rounded-lg border shadow-sm`}>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded border flex items-center gap-1.5 truncate max-w-[220px] ${config.classes}`}>
                              {config.prefix && <span>{config.prefix}</span>} <span>{seg}</span>
                            </span>
                            <select
                              value={currentIdx}
                              onChange={(e) => handleSegmentColorChange(seg, e.target.value)}
                              className={`text-xs ${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'} border rounded-md px-2 py-1 cursor-pointer font-medium focus:outline-none`}
                            >
                              {COLOR_OPTIONS.map((opt, i) => (
                                <option key={i} value={i} className={isDark ? 'bg-[#141622] text-slate-200' : 'bg-white text-slate-700'}>
                                  {opt.prefix} {opt.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>

            <div className={`flex items-center justify-end gap-2 mt-6 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'} shrink-0`}>
              <button
                type="button"
                onClick={() => setIsPaletteModalOpen(false)}
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer`}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePaletteConfig}
                disabled={isSavingPalette}
                className={`${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} disabled:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg text-sm cursor-pointer shadow-md transition-colors text-center`}
              >
                {isSavingPalette ? "Saving Palette..." : "Save Palette Configuration"}
              </button>
            </div>

          </div>
        </div>
      )}

      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-md p-6 shadow-xl relative flex flex-col animate-in zoom-in-95 duration-200`}>

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
                onClick={confirmModalConfig.onConfirm}
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

export default InventorySupplies;
