import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Archive, X, Filter, RotateCcw, EyeOff, CheckCircle2, Palette, Image as ImageIcon, Trash2 } from 'lucide-react';
import axios from 'axios';
import PageHeader from './PageHeader';
import { useTheme } from '../context/ThemeContext';

function InventorySupplies() {
  const { isDark } = useTheme();
  const userRole = localStorage.getItem("SystemRole") || "Inventory";
  const isViewer = userRole?.toLowerCase() === 'viewer';

  const [suppliesList, setSuppliesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [hideZeroQty, setHideZeroQty] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  const [previewImage, setPreviewImage] = useState(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '', message: '', actionType: 'archive', onConfirm: () => { }
  });

  const [palette, setPalette] = useState({ categoryColors: {}, segmentColors: {} });
  const [isPaletteModalOpen, setIsPaletteModalOpen] = useState(false);
  const [isSavingPalette, setIsSavingPalette] = useState(false);

  const COLOR_OPTIONS = [
    { name: 'Emerald / Green', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800', prefix: '🟢' },
    { name: 'Blue / Indigo', classes: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800', prefix: '🔵' },
    { name: 'Amber / Orange', classes: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800', prefix: '🟡' },
    { name: 'Rose / Red', classes: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800', prefix: '🔴' },
    { name: 'Orange', classes: 'bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800', prefix: '🟠' },
    { name: 'Purple / Violet', classes: 'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800', prefix: '🟣' },
    { name: 'Slate / Muted Gray', classes: 'bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', prefix: '⚪' },
    { name: 'Cyan / Teal', classes: 'bg-cyan-50 text-cyan-700 border-cyan-200/60 dark:bg-cyan-950/60 dark:text-cyan-400 dark:border-cyan-800', prefix: '🌐' }
  ];

  const categories = ['All Categories', ...[...new Set(suppliesList.map(item => item.Category).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))];
  const segments = ['All Segments', ...[...new Set(suppliesList.map(item => item.Segment).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))];
  const descriptions = ['All Item Descriptions', ...[...new Set(suppliesList.map(item => item.ItemDescription).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))];

  const uniqueCategoriesInDB = [...new Set(suppliesList.map(item => item.Category).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueSegmentsInDB = [...new Set(suppliesList.map(item => item.Segment).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueDescriptionsInDB = [...new Set(suppliesList.map(item => item.ItemDescription).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueBrandsInDB = [...new Set(suppliesList.map(item => item.Brand).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueDimensionsInDB = [...new Set(suppliesList.map(item => item.Dimension).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueUomsInDB = [...new Set(suppliesList.map(item => item.UOM).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueAccountsInDB = [...new Set(suppliesList.map(item => item.AccountTo).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const [selectedCategory, setSelectedCategory] = useState('All Categories');
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

  const [imageFile, setImageFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');

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
    if (!segmentName) return { classes: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700", prefix: "⚪" };
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
    setImageFile(null);
    setExistingImageUrl('');
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
    setExistingImageUrl(supply.ImageUrl || '');
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('Code', supplyCode.trim());
    formData.append('Category', supplyCategory.trim());
    formData.append('Segment', supplySegment.trim());
    formData.append('ItemDescription', itemDescription.trim());
    formData.append('Brand', supplyBrand.trim());
    formData.append('Dimension', supplyDimension.trim());
    formData.append('UOM', supplyUom.trim());
    formData.append('AccountTo', accountTo.trim());
    formData.append('SerialNo', serialNo.trim());
    if (imageFile) {
      formData.append('image', imageFile);
    } else {
      formData.append('ImageUrl', existingImageUrl);
    }

    try {
      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (isEditing) {
        await axios.put(`/api/supplies/${currentId}`, formData, config);
        showToast(`Success: Updated product "${itemDescription.trim()}"!`);
      } else {
        await axios.post('/api/supplies', formData, config);
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
      message: `Are you sure you want to archive "${supply.ItemDescription}" (${supply.Code})?`,
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
      message: `Are you sure you want to restore "${supply.ItemDescription}" (${supply.Code})?`,
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
      message: `Are you sure you want to PERMANENTLY delete "${supply.ItemDescription}" (${supply.Code})? This action cannot be undone.`,
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
    const matchesCategory = selectedCategory === 'All Categories' || supply.Category === selectedCategory;
    const matchesSegment = selectedSegment === 'All Segments' || supply.Segment === selectedSegment;
    const matchesDescription = selectedDescription === 'All Item Descriptions' || supply.ItemDescription === selectedDescription;
    const matchesZeroQty = !hideZeroQty || supply.ActualCount > 0;
    const matchesSearch = !searchTerm || [
      supply.Code,
      supply.Category,
      supply.Segment,
      supply.ItemDescription,
      supply.Brand,
      supply.Dimension,
      supply.SerialNo,
      supply.AccountTo
    ].some(v => v && v.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSegment && matchesDescription && matchesSearch && matchesZeroQty;
  });

  const activeCount = suppliesList.filter(s => !s.isArchived).length;
  const archivedCount = suppliesList.filter(s => s.isArchived).length;

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
                  className={`w-3.5 h-3.5 rounded cursor-pointer transition-all ${
                    hideZeroQty ? 'accent-red-600' : 'accent-[#ff6600]'
                  }`} 
                />
                <span className="hidden sm:inline">Hide 0 Qty</span>
                <span className="sm:hidden text-[10px] font-bold">0 Qty</span>
              </label>

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
                  title={showArchivedOnly ? "Show Active Supplies" : "View Archive Vault"}
                  className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${showArchivedOnly 
                    ? (isDark ? 'bg-rose-950/40 text-rose-300 border-rose-900/60' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100') 
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
          </div>

          <div className={`flex overflow-x-auto gap-2 items-center mt-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid ${isViewer ? 'md:grid-cols-4' : 'md:grid-cols-5'} md:pb-0`}>

            <div className="min-w-[150px] w-full lg:min-w-0">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none w-full cursor-pointer`}>
                {(categories || []).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="min-w-[150px] w-full lg:min-w-0">
              <select value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)} className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none w-full cursor-pointer`}>
                {(segments || []).map(seg => <option key={seg} value={seg}>{seg}</option>)}
              </select>
            </div>

            <div className="min-w-[170px] w-full lg:min-w-0">
              <select value={selectedDescription} onChange={(e) => setSelectedDescription(e.target.value)} className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none w-full cursor-pointer truncate`}>
                {(descriptions || []).map(desc => <option key={desc} value={desc}>{desc}</option>)}
              </select>
            </div>

            <div className="min-w-[180px] w-full lg:min-w-0">
              <div className="relative w-full">
                <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input type="text" placeholder="Search Code, Category, Segment, Description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none`} />
              </div>
            </div>

            {!isViewer && (
              <div className="min-w-[140px] w-full lg:min-w-0">
                <button onClick={openAddModal} disabled={showArchivedOnly} className={`flex items-center justify-center gap-2 ${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm w-full cursor-pointer transition-all h-[38px]`}>
                  <Plus className="w-4 h-4" /> <span className="whitespace-nowrap">Add Supply</span>
                </button>
              </div>
            )}

          </div>
          <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-full mt-3`}></div>
        </div>

        <div className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'} rounded-xl border shadow-sm overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className={`text-white font-bold uppercase text-nowrap text-sm ${isDark ? 'bg-[#0f111d] border-b border-slate-800' : 'bg-[#18174e]'}`}>
                  <th 
                    className={`py-3 px-4 whitespace-nowrap static md:sticky md:left-0 z-20 ${isDark ? 'bg-[#0f111d]' : 'bg-[#18174e]'}`}
                    style={{ boxShadow: isDark ? 'inset -2px 0 0 0 #475569, 6px 0 10px -2px rgba(0, 0, 0, 0.4)' : 'inset -2px 0 0 0 #cbd5e1, 6px 0 10px -2px rgba(0, 0, 0, 0.15)' }}
                  >
                    <span className={`hidden md:block absolute right-0 top-0 bottom-0 w-[2px] ${isDark ? 'bg-slate-600' : 'bg-slate-300'} pointer-events-none`} />
                    Item Description
                  </th>
                  <th className="py-3 px-4 text-center">Image</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Dimension</th>
                  <th className="py-3 px-4">Serial No.</th>
                  <th className="py-3 px-4 text-center">Actual Count</th>
                  <th className="py-3 px-4 text-center">Damaged</th>
                  <th className="py-3 px-4">UOM</th>
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
                    <td colSpan={isViewer ? "10" : "11"} className="text-center py-10 text-green-700 font-medium italic">
                      Fetching secure rackings data from database...
                    </td>
                  </tr>
                ) : filteredSupplies.length === 0 ? (
                  <tr>
                    <td colSpan={isViewer ? "10" : "11"} className="text-center py-10 text-red-600 font-medium italic">
                      No records match the selected filters or search queries.
                    </td>
                  </tr>) : (
                  filteredSupplies.map((supply) => {
                    const catStyle = getCategoryStyles(supply.Category);
                    return (
                      <tr key={supply._id} className={`group ${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'} transition-colors font-medium whitespace-nowrap text-sm`}>
                        <td 
                          className={`py-3.5 px-4 font-semibold static md:sticky md:left-0 z-10 min-w-[160px] sm:min-w-[190px] md:max-w-[280px] whitespace-normal md:whitespace-nowrap transition-colors ${
                            isDark ? 'bg-[#090b10] group-hover:bg-[#141622] text-slate-100' : 'bg-white group-hover:bg-[#f8fafc] text-slate-800'
                          }`}
                          style={{ boxShadow: isDark ? 'inset -2px 0 0 0 #475569, 6px 0 10px -2px rgba(0, 0, 0, 0.4)' : 'inset -2px 0 0 0 #cbd5e1, 6px 0 10px -2px rgba(0, 0, 0, 0.08)' }}
                          title={supply.ItemDescription}
                        >
                          <span className={`hidden md:block absolute right-0 top-0 bottom-0 w-[2px] ${isDark ? 'bg-slate-600' : 'bg-slate-300'} pointer-events-none`} />
                          <div className="line-clamp-2 md:truncate font-semibold" title={supply.ItemDescription}>
                            {supply.ItemDescription}
                          </div>
                        </td>

                        <td className="py-2 px-4 text-center">
                          {supply.ImageUrl ? (
                            <div className="relative inline-block">
                              <img
                                src={supply.ImageUrl.startsWith('http') || supply.ImageUrl.startsWith('data:') ? supply.ImageUrl : `${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}${supply.ImageUrl}`}
                                alt={supply.ItemDescription}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextElementSibling) {
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }
                                }}
                                onClick={() => setPreviewImage(supply.ImageUrl.startsWith('http') || supply.ImageUrl.startsWith('data:') ? supply.ImageUrl : `${window.location.hostname === 'localhost' ? 'http://localhost:5000' : ''}${supply.ImageUrl}`)}
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

                        <td className={`py-3 px-4 font-mono font-extrabold ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`}>{supply.Code || '—'}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border text-nowrap ${catStyle.classes}`}>
                            {supply.Category || 'Uncategorized'}
                          </span>
                        </td>
                        <td className={`py-3.5 px-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{supply.Brand || '—'}</td>
                        <td className={`py-3.5 px-4 ${isDark ? 'text-slate-400 bg-slate-800/30' : 'text-slate-600 bg-slate-50/20'} text-xs font-mono`}>{supply.Dimension || '—'}</td>
                        <td className={`py-3.5 px-4 ${isDark ? 'text-slate-400' : 'text-slate-600'} text-xs font-mono`}>{supply.SerialNo || '—'}</td>
                        <td className={`py-3.5 px-4 text-center font-bold font-mono ${isDark ? 'text-white' : 'text-slate-700 bg-slate-50/40'}`}>{supply.ActualCount}</td>
                        <td className="py-3.5 px-4 text-center font-semibold text-rose-500">{supply.DamagedCount || 0}</td>
                        <td className={`py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{supply.UOM || 'pcs'}</td>
                        {!isViewer && (
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {!supply.isArchived ? (
                                <>
                                  <button onClick={() => openEditModal(supply)} className={`p-1 ${isDark ? 'bg-[#181a26] border-slate-700 text-indigo-400 hover:bg-indigo-600 hover:text-white' : 'bg-[#18174e]/5 border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'} border rounded transition-all cursor-pointer`}><Edit2 className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => handleArchiveSupply(supply)} className={`p-1 ${isDark ? 'bg-[#181a26] border-slate-700 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-[#18174e]/5 border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'} border rounded transition-all cursor-pointer`}><Archive className="w-3.5 h-3.5" /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => handleUnarchiveSupply(supply)} className={`flex items-center gap-1 text-xs font-bold ${isDark ? 'text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-800/60' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'} px-2.5 py-1 rounded-lg border transition-colors cursor-pointer`}><RotateCcw className="w-3 h-3" /> Restore</button>
                                  <button onClick={() => handlePermanentDeleteSupply(supply)} className={`flex items-center gap-1 text-xs font-bold ${isDark ? 'text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border-rose-800/60' : 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200'} px-2.5 py-1 rounded-lg border transition-colors cursor-pointer`}><Trash2 className="w-3 h-3" /> Delete</button>
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto`}>

            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>Add Supply Information</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={`${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'} p-1 rounded-lg cursor-pointer transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-50 border-amber-200/60'} rounded-xl border mt-3`}>
              <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                * System Inventory Protocol *
              </span>
              <p className={`text-[11px] ${isDark ? 'text-amber-300/80' : 'text-amber-700'} leading-relaxed`}>
                Manual quantity inputs are disabled to comply with audit protocols. Supplies images and related media must be uploaded through the <strong>Supplies Components.</strong>
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 mt-4">
              {error && (
                <div className={`text-xs font-semibold ${isDark ? 'text-rose-400 bg-rose-950/40 border-rose-900/60' : 'text-rose-600 bg-rose-50 border-rose-100'} p-2.5 rounded-lg flex items-center gap-2 border`}>
                  <span>⚠️ {error}</span>
                </div>
              )}

<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

  <div className="md:col-span-2">
    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Supply Code *</label>
    <input
      type="text"
      required
      value={supplyCode}
      onChange={(e) => setSupplyCode(e.target.value)}
      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none`}
    />
  </div>

  <div>
    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Category *</label>
    <input
      type="text"
      required
      list="categories-dl"
      placeholder="e.g. Office Supplies"
      value={supplyCategory}
      onChange={(e) => setSupplyCategory(e.target.value)}
      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
    />
    <datalist id="categories-dl">
      {uniqueCategoriesInDB.map(c => <option key={c} value={c} />)}
    </datalist>
  </div>

  <div>
    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Segment *</label>
    <input
      type="text"
      required
      list="segments-dl"
      placeholder="e.g. Admin"
      value={supplySegment}
      onChange={(e) => setSupplySegment(e.target.value)}
      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
    />
    <datalist id="segments-dl">
      {uniqueSegmentsInDB.map(s => <option key={s} value={s} />)}
    </datalist>
  </div>

  <div className="md:col-span-2">
    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Item Description *</label>
    <input
      type="text"
      required
      list="descriptions-dl"
      placeholder="Detailed item description"
      value={itemDescription}
      onChange={(e) => setItemDescription(e.target.value)}
      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
    />
    <datalist id="descriptions-dl">
      {uniqueDescriptionsInDB.map(d => <option key={d} value={d} />)}
    </datalist>
  </div>

  <div>
    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Brand</label>
    <input
      type="text"
      list="brands-dl"
      placeholder="Brand name"
      value={supplyBrand}
      onChange={(e) => setSupplyBrand(e.target.value)}
      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
    />
    <datalist id="brands-dl">
      {uniqueBrandsInDB.map(b => <option key={b} value={b} />)}
    </datalist>
  </div>

  <div>
    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Dimension</label>
    <input
      type="text"
      list="dimensions-dl"
      placeholder="e.g. A4, 10x12"
      value={supplyDimension}
      onChange={(e) => setSupplyDimension(e.target.value)}
      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 font-mono placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none font-mono`}
    />
    <datalist id="dimensions-dl">
      {uniqueDimensionsInDB.map(d => <option key={d} value={d} />)}
    </datalist>
  </div>

  <div>
    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Serial No.</label>
    <input
      type="text"
      placeholder="S/N Code"
      value={serialNo}
      onChange={(e) => setSerialNo(e.target.value)}
      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
    />
  </div>

  <div>
    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>UOM *</label>
    <input
      type="text"
      required
      list="uoms-dl"
      placeholder="pcs, boxes, reams"
      value={supplyUom}
      onChange={(e) => setSupplyUom(e.target.value)}
      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
    />
    <datalist id="uoms-dl">
      {uniqueUomsInDB.map(u => <option key={u} value={u} />)}
    </datalist>
  </div>

  <div className="md:col-span-2">
    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Item Image</label>
    <input
      type="file"
      accept="image/*"
      onChange={handleFileChange}
      className={`w-full text-xs ${isDark ? 'text-slate-400 file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700' : 'text-slate-500 file:bg-indigo-50 file:text-[#18174e] hover:file:bg-indigo-100'} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold cursor-pointer`}
    />
  </div>

</div>

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
                  className={`${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md`}
                >
                  {isEditing ? 'Save Changes' : 'Save Details'}
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
                Assign personalized Tailwind color configurations to categories and segments. Changes applied here will update all component badges globally across the system environment.
              </p>
            </div>

            <div className="space-y-4 mt-4 flex-1 overflow-y-auto pr-1">

              <div>
                <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Category Color Configuration</label>
                <div className={`space-y-2.5 ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50/50 border-slate-100'} p-3 rounded-xl border`}>
                  {uniqueCategoriesInDB.length === 0 ? (
                    <p className="text-xs italic text-slate-400 pl-1">No categories logged in current context...</p>
                  ) : (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {uniqueCategoriesInDB.map((cat, catIdx) => {
                        const config = getCategoryStyles(cat);
                        const currentIdx = palette.categoryColors[cat] !== undefined ? palette.categoryColors[cat] : (catIdx % COLOR_OPTIONS.length);
                        return (
                          <div key={cat} className={`flex items-center justify-between gap-4 ${isDark ? 'bg-[#090b10] border-slate-800' : 'bg-white border-slate-200/60'} p-2 rounded-lg border shadow-sm`}>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded border truncate max-w-[220px] ${config.classes}`}>{cat}</span>
                            <select
                              value={currentIdx}
                              onChange={(e) => handleCategoryColorChange(cat, e.target.value)}
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

      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[100] p-4 transition-all" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl p-2 shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} className="absolute -top-3 -right-3 bg-white border border-slate-200 text-slate-700 hover:text-rose-600 shadow-md rounded-full p-1.5 transition-colors cursor-pointer z-10">
              <X className="w-4 h-4" />
            </button>
            <img src={previewImage} alt="Preview Zoom" className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-sm select-none" />
          </div>
        </div>
      )}

    </div>
  );
}

export default InventorySupplies;
