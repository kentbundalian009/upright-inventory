import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Archive, X, Filter, RotateCcw, EyeOff, CheckCircle2, Palette, Trash2 } from 'lucide-react';
import axios from 'axios';
import PageHeader from './layout/PageHeader';
import TablePagination from './common/TablePagination';
import { useTheme } from '../context/ThemeContext';

function InventoryConsumables({ setActiveTab }) {
  const { isDark } = useTheme();
  const isViewer = false;

  const [consumablesList, setConsumablesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [hideZeroQty, setHideZeroQty] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

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

  const segments = ['All Segments', ...[...new Set(consumablesList.map(item => item.Segment).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))];
  const descriptions = ['All Item Descriptions', ...[...new Set(consumablesList.map(item => item.ItemDescription).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))];

  const uniqueCategoriesInDB = [...new Set(consumablesList.map(item => item.Category).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueSegmentsInDB = [...new Set(consumablesList.map(item => item.Segment).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueDescriptionsInDB = [...new Set(consumablesList.map(item => item.ItemDescription).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueBrandsInDB = [...new Set(consumablesList.map(item => item.Brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueDimensionsInDB = [...new Set(consumablesList.map(item => item.Dimension).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueUomsInDB = [...new Set(consumablesList.map(item => item.UOM).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const [selectedSegment, setSelectedSegment] = useState('All Segments');
  const [selectedDescription, setSelectedDescription] = useState('All Item Descriptions');
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [itemCode, setItemCode] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [itemSegment, setItemSegment] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemBrand, setItemBrand] = useState('');
  const [itemDimension, setItemDimension] = useState('');
  const [itemSerial, setItemSerial] = useState('');
  const [actualCount, setActualCount] = useState('');
  const [itemUom, setItemUom] = useState('');
  const [acquisitionCost, setAcquisitionCost] = useState('');

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const fetchConsumablesAndPalette = async () => {
    try {
      setLoading(true);
      const [consumablesRes, paletteRes] = await Promise.all([
        axios.get('/api/consumables?all=true'),
        axios.get('/api/settings/palette-con')
      ]);

      if (Array.isArray(consumablesRes.data)) {
        setConsumablesList(consumablesRes.data);
      } else if (consumablesRes.data && Array.isArray(consumablesRes.data.data)) {
        setConsumablesList(consumablesRes.data.data);
      } else {
        setConsumablesList([]);
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
    fetchConsumablesAndPalette();
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
      await axios.post('/api/settings/palette-con', palette);
      showToast("Palette configurations applied successfully!");
      setIsPaletteModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save palette configuration.");
    } finally {
      setIsSavingPalette(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setItemCode('CON-[Auto]');
    setItemCategory('');
    setItemSegment('');
    setItemDescription('');
    setItemBrand('');
    setItemDimension('');
    setItemSerial('');
    setActualCount('');
    setItemUom('');
    setAcquisitionCost('');
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setIsEditing(true);
    setCurrentId(item._id);
    setItemCode(item.Code || '');
    setItemCategory(item.Category || '');
    setItemSegment(item.Segment || '');
    setItemDescription(item.ItemDescription || '');
    setItemBrand(item.Brand || '');
    setItemDimension(item.Dimension || '');
    setItemSerial(item.SerialNo || '');
    setActualCount(item.ActualCount !== undefined ? String(item.ActualCount) : '0');
    setItemUom(item.UOM || '');
    setAcquisitionCost(item.AcquisitionCost !== undefined ? String(item.AcquisitionCost) : '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      Category: itemCategory.trim(),
      Segment: itemSegment.trim(),
      ItemDescription: itemDescription.trim(),
      Brand: itemBrand.trim() || '—',
      Dimension: itemDimension.trim() || '—',
      SerialNo: itemSerial.trim() || '—',
      ActualCount: Number(actualCount) || 0,
      UOM: itemUom.trim() || '—',
      AcquisitionCost: Number(acquisitionCost) || 0
    };

    if (itemCode && !itemCode.includes('[Auto]')) {
      payload.Code = itemCode.trim();
    }

    try {
      if (isEditing) {
        await axios.put(`/api/consumables/${currentId}`, payload);
        showToast(`Success: Updated consumable "${itemDescription.trim()}"!`);
      } else {
        await axios.post('/api/consumables', payload);
        showToast(`Success: Added new consumable "${itemDescription.trim()}"!`);
      }
      setIsModalOpen(false);
      fetchConsumablesAndPalette();
    } catch (err) {
      showToast(err.response?.data?.message || "Error occurred while saving item.", true);
    }
  };

  const handleArchiveConsumable = (item) => {
    setConfirmModalConfig({
      title: 'Archive Consumable Record',
      message: `Are you sure you want to archive "${item.ItemDescription}"?`,
      actionType: 'archive',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/consumables/${item._id}`);
          showToast(`Success: Archived consumable item.`);
          fetchConsumablesAndPalette();
        } catch (err) { alert("Failed to archive."); }
        finally { setIsConfirmModalOpen(false); }
      }
    });
    setIsConfirmModalOpen(true);
  };

  const handleUnarchiveConsumable = (item) => {
    setConfirmModalConfig({
      title: 'Restore Consumable Record',
      message: `Are you sure you want to restore "${item.ItemDescription}"?`,
      actionType: 'restore',
      onConfirm: async () => {
        try {
          await axios.put(`/api/consumables/${item._id}/unarchive`);
          showToast(`Success: Restored consumable item.`);
          fetchConsumablesAndPalette();
        } catch (err) { alert("Failed to restore."); }
        finally { setIsConfirmModalOpen(false); }
      }
    });
    setIsConfirmModalOpen(true);
  };

  const handlePermanentDeleteConsumable = (item) => {
    setConfirmModalConfig({
      title: 'Delete Consumable Record Permanently',
      message: `Are you sure you want to PERMANENTLY delete "${item.ItemDescription}"? This action cannot be undone.`,
      actionType: 'delete',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/consumables/${item._id}/permanent`);
          showToast(`Success: Permanently deleted consumable item.`);
          fetchConsumablesAndPalette();
        } catch (err) { alert("Failed to delete item."); }
        finally { setIsConfirmModalOpen(false); }
      }
    });
    setIsConfirmModalOpen(true);
  };

  const currentDisplayList = consumablesList.filter(c => showArchivedOnly ? c.isArchived === true : !c.isArchived);
  const filteredConsumables = currentDisplayList.filter(item => {
    const matchesSegment = selectedSegment === 'All Segments' || item.Segment === selectedSegment;
    const matchesDescription = selectedDescription === 'All Item Descriptions' || item.ItemDescription === selectedDescription;
    const matchesZeroQty = !hideZeroQty || (Number(item.ActualCount) || 0) > 0;
    const matchesSearch = !searchTerm || [
      item.Code,
      item.Segment,
      item.ItemDescription,
      item.Brand,
      item.Dimension,
      item.SerialNo
    ].some(v => v && v.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSegment && matchesDescription && matchesSearch && matchesZeroQty;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSegment, selectedDescription, searchTerm, hideZeroQty, showArchivedOnly]);

  const totalRows = filteredConsumables.length;
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const indexOfLastRow = indexOfFirstRow + rowsPerPage;
  const paginatedConsumables = filteredConsumables.slice(indexOfFirstRow, indexOfLastRow);

  const activeCount = consumablesList.filter(s => !s.isArchived).length;
  const archivedCount = consumablesList.filter(s => s.isArchived).length;

  const totalAcquisitionCost = filteredConsumables.reduce(
    (sum, item) => sum + ((Number(item.ActualCount) || 0) * (Number(item.AcquisitionCost) || 0)),
    0
  );

  return (
    <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative">
      <PageHeader activeTab="consumables-records" />

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

          {/* ROW 2: Actions Row (Hide 0 Qty under Filter, Palette Settings, View Archive Vault) */}
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

            {!isViewer && (
              <button
                onClick={() => setIsPaletteModalOpen(true)}
                title="Palette Settings"
                className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm flex-shrink-0 ${isDark ? 'border-slate-700 bg-[#ff6600] text-white hover:bg-[#ff6600]/90' : 'border-slate-200 bg-[#18174e] text-white hover:bg-[#18174e]/90'}`}
              >
                <Palette className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span className="hidden md:inline">Palette Settings</span>
              </button>
            )}

            {!isViewer && (
              <button
                onClick={() => setShowArchivedOnly(!showArchivedOnly)}
                title={showArchivedOnly ? "Show Active Consumables" : "View Archive Vault"}
                className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${showArchivedOnly
                  ? 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20'
                  : (isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                  }`}
              >
                {showArchivedOnly ? (
                  <>
                    <EyeOff className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden md:inline">Show Active Consumables</span>
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

          <div className={`flex overflow-x-auto gap-2 items-center mt-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid ${isViewer ? 'md:grid-cols-3' : 'md:grid-cols-4'} md:pb-0`}>

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

            {!isViewer && (
              <div className="min-w-[160px] w-full md:min-w-0">
                <button onClick={openAddModal} disabled={showArchivedOnly} className={`flex items-center justify-center gap-2 ${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm w-full cursor-pointer transition-all h-[38px]`}>
                  <span className="whitespace-nowrap">Add New Consumable Item</span>
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
                  <th className="py-3 px-4 text-center whitespace-nowrap">Actual Count</th>
                  <th className="py-3 px-4 whitespace-nowrap">UOM</th>
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
                    <td colSpan={isViewer ? "8" : "9"} className="text-center py-10 text-emerald-500 font-medium italic">
                      Fetching consumables records from database...
                    </td>
                  </tr>
                ) : filteredConsumables.length === 0 ? (
                  <tr>
                    <td colSpan={isViewer ? "8" : "9"} className="text-center py-10 text-red-500 font-medium italic">
                      No records match the selected filters or search queries.
                    </td>
                  </tr>
                ) : (
                  paginatedConsumables.map((item) => {
                    const catStyle = getCategoryStyles(item.Category);
                    const segStyle = getSegmentStyles(item.Segment);
                    return (
                      <tr
                        key={item._id}
                        className={`group ${segStyle.rowBg || (isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600')} transition-colors font-medium whitespace-nowrap text-sm`}
                      >
                        {/* 1. Item Description & Segment */}
                        <td className="py-3 px-4 min-w-[200px]">
                          <div className={`font-semibold whitespace-normal break-words transition-colors ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {item.ItemDescription || '—'}
                          </div>
                          {item.Segment && item.Segment !== 'N/A' && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${segStyle.classes}`}>
                                {segStyle.prefix && <span>{segStyle.prefix}</span>}
                                <span>{item.Segment}</span>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 2. Dimension */}
                        <td className={`py-3 px-4 font-mono text-xs whitespace-normal break-words transition-colors ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {item.Dimension || '—'}
                        </td>

                        {/* 3. Brand */}
                        <td className={`py-3 px-4 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {item.Brand || '—'}
                        </td>

                        {/* 4. Serial */}
                        <td className={`py-3 px-4 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-600'} text-xs font-mono`}>
                          {item.SerialNo || '—'}
                        </td>

                        {/* 5. Actual Count */}
                        <td className={`py-3 px-4 text-center font-bold font-mono text-sm whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {item.ActualCount ?? 0}
                        </td>

                        {/* 6. UOM */}
                        <td className={`py-3 px-4 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {item.UOM || '—'}
                        </td>

                        {/* 7. Acquisition Cost */}
                        <td className={`py-3 px-4 text-right font-mono text-xs whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          ₱{(Number(item.AcquisitionCost) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* 8. Total Acquisition Cost */}
                        <td className="py-3 px-4 text-right font-mono text-xs font-bold whitespace-nowrap text-red-600 dark:text-red-400">
                          ₱{((Number(item.ActualCount) || 0) * (Number(item.AcquisitionCost) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* 12. Actions */}
                        {!isViewer && (
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {!item.isArchived ? (
                                <>
                                  <button onClick={() => openEditModal(item)} className={`p-1 ${isDark ? 'bg-[#181a26] border-slate-700 text-indigo-400 hover:bg-indigo-600 hover:text-white' : 'bg-[#18174e]/5 border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'} border rounded transition-all cursor-pointer`} title="Edit Item"><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleArchiveConsumable(item)} className={`p-1 ${isDark ? 'bg-[#181a26] border-slate-700 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-[#18174e]/5 border-slate-200 text-red-500 hover:bg-red-500 hover:text-white'} border rounded transition-all cursor-pointer`} title="Archive Item"><Archive className="w-3.5 h-3.5" /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => handleUnarchiveConsumable(item)} title="Restore" className={`p-1.5 ${isDark ? 'bg-[#181a26] border-emerald-800/80 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'} border rounded transition-all cursor-pointer`}><RotateCcw className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handlePermanentDeleteConsumable(item)} title="Delete Permanently" className={`p-1.5 ${isDark ? 'bg-[#181a26] border-rose-800/80 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'} border rounded transition-all cursor-pointer`}><Trash2 className="w-3.5 h-3.5" /></button>
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
        </div>
      </div>

      {/* Add / Edit Consumable Modal */}
      {isModalOpen && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto`}>

            {/* Header */}
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                  {isEditing ? 'Edit Consumable Item' : 'Add New Consumable Item'}
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

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4 mt-4">
              {error && (
                <div className="text-xs font-semibold text-red-500 bg-red-500/10 border-red-500/30 p-2.5 rounded-lg flex items-center gap-2 border">
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* 1. Segment */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Segment</label>
                  <input
                    type="text"
                    list="con-segments-dl"
                    placeholder="e.g. Consumables"
                    value={itemSegment}
                    onChange={(e) => setItemSegment(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="con-segments-dl">
                    {uniqueSegmentsInDB.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>

                {/* 2. Item Description */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Item Description *</label>
                  <input
                    type="text"
                    required
                    list="con-descriptions-dl"
                    placeholder="Detailed item description"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="con-descriptions-dl">
                    {uniqueDescriptionsInDB.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>

                {/* 3. Dimension */}
                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Dimension</label>
                  <input
                    type="text"
                    list="con-dimensions-dl"
                    placeholder="e.g. A4, Standard, 10x12"
                    value={itemDimension}
                    onChange={(e) => setItemDimension(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="con-dimensions-dl">
                    {uniqueDimensionsInDB.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>

                {/* 4. Serial */}
                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Serial</label>
                  <input
                    type="text"
                    placeholder="S/N Code"
                    value={itemSerial}
                    onChange={(e) => setItemSerial(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                </div>

                {/* 5. Brand */}
                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Brand</label>
                  <input
                    type="text"
                    list="con-brands-dl"
                    placeholder="Brand name"
                    value={itemBrand}
                    onChange={(e) => setItemBrand(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="con-brands-dl">
                    {uniqueBrandsInDB.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>

                {/* 6. UOM */}
                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>UOM *</label>
                  <input
                    type="text"
                    required
                    list="con-uoms-dl"
                    placeholder="pcs, boxes, reams"
                    value={itemUom}
                    onChange={(e) => setItemUom(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="con-uoms-dl">
                    {uniqueUomsInDB.map(u => <option key={u} value={u} />)}
                  </datalist>
                </div>

                {/* 7. Acquisition Cost (Price) */}
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
                  className="bg-[#ff6600] hover:bg-[#e05a00] text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                >
                  {isEditing ? 'Save Changes' : 'Save Details'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Palette Configuration Modal */}
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
                Assign personalized Tailwind color configurations to segments. Changes applied here will update all component badges globally across the consumables registry.
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

      {/* Confirm Modal */}
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

export default InventoryConsumables;
