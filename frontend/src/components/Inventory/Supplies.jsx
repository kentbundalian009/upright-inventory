import React, { useState, useEffect } from 'react';
// 🎨 Idinagdag ang Palette icon dito para sa settings management
import { Search, Plus, Edit2, Archive, X, Filter, RotateCcw, EyeOff, CheckCircle2, AlertCircle, Palette } from 'lucide-react';
import axios from 'axios';
import PageHeader from '../Common/PageHeader';

function Supplies() {
  const [suppliesList, setSuppliesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  
  // 🌟 STATE PARA SA HIDE 0 QTY CHECKBOX
  const [hideZeroQty, setHideZeroQty] = useState(false);

  // 🎉 State para sa Success Notification
  const [successMessage, setSuccessMessage] = useState(null);
  
  // 🔔 States para sa Custom Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    actionType: 'archive', // 'archive' o 'restore'
    onConfirm: () => { }
  });

  // 🎨 NEW STATES PARA SA DYNAMIC BACKEND PALETTES MANAGEMENT
  const [palette, setPalette] = useState({ categoryColors: {}, segmentColors: {} });
  const [isPaletteModalOpen, setIsPaletteModalOpen] = useState(false);
  const [isSavingPalette, setIsSavingPalette] = useState(false);

  // 🎯 Dropdown Filtering Options (Para sa filter bar)
  const categories = ['All Categories', ...new Set(suppliesList.map(item => item.Category).filter(Boolean))];
  const segments = ['All Segments', ...new Set(suppliesList.map(item => item.Segment).filter(Boolean))];
  const descriptions = ['All Item Descriptions', ...new Set(suppliesList.map(item => item.ItemDescription).filter(Boolean))];

  // 🚀 DATALIST OPTIONS PARA SA LOOB NG MODAL (Unique values mula sa DB)
  const uniqueCategoriesInDB = [...new Set(suppliesList.map(item => item.Category).filter(Boolean))];
  const uniqueSegmentsInDB = [...new Set(suppliesList.map(item => item.Segment).filter(Boolean))];
  const uniqueDescriptionsInDB = [...new Set(suppliesList.map(item => item.ItemDescription).filter(Boolean))];
  const uniqueBrandsInDB = [...new Set(suppliesList.map(item => item.Brand).filter(Boolean))];
  const uniqueDimensionsInDB = [...new Set(suppliesList.map(item => item.Dimension).filter(Boolean))];
  const uniqueUomsInDB = [...new Set(suppliesList.map(item => item.UOM).filter(Boolean))];
  const uniqueAccountsInDB = [...new Set(suppliesList.map(item => item.AccountTo).filter(Boolean))];

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSegment, setSelectedSegment] = useState('All Segments');
  const [selectedDescription, setSelectedDescription] = useState('All Item Descriptions');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // Form States (Mga pwedeng baguhin na meta-data)
  const [supplyCode, setSupplyCode] = useState('');
  const [supplyCategory, setSupplyCategory] = useState('');
  const [supplySegment, setSupplySegment] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [supplyBrand, setSupplyBrand] = useState('');
  const [supplyDimension, setSupplyDimension] = useState('');
  const [supplyUom, setSupplyUom] = useState('');
  const [accountTo, setAccountTo] = useState('');

  const [currentActualCount, setCurrentActualCount] = useState(0);
  const [currentGoodCount, setCurrentGoodCount] = useState(0);
  const [currentDamagedCount, setCurrentDamagedCount] = useState(0);

  // Helper para magpakita ng success message na nawawala pagkalipas ng 3 segundo
  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // 🔄 Kukunin nang sabay ang Supplies at ang Palette Settings galing sa Backend
  const fetchSuppliesAndPalette = async () => {
    try {
      setLoading(true);
      const [suppliesRes, paletteRes] = await Promise.all([
        axios.get('/api/supplies'),
        axios.get('/api/settings/palette-sup')
      ]);

      // Handle Supplies List Mapping
      if (Array.isArray(suppliesRes.data)) {
        setSuppliesList(suppliesRes.data);
      } else if (suppliesRes.data && Array.isArray(suppliesRes.data.data)) {
        setSuppliesList(suppliesRes.data.data);
      } else {
        setSuppliesList([]);
      }

      // Handle Palette Data
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

  // 🎨 COLOR BADGE STYLER UTILITIES
  const getCategoryBadgeStyle = (categoryName) => {
    const customColor = palette.categoryColors[categoryName];
    if (customColor) {
      return { backgroundColor: `${customColor}15`, color: customColor, borderColor: `${customColor}30` };
    }
    return { backgroundColor: '#f1f5f9', color: '#334155', borderColor: '#e2e8f0' };
  };

  const getSegmentBadgeStyle = (segmentName) => {
    const customColor = palette.segmentColors[segmentName];
    if (customColor) {
      return { backgroundColor: `${customColor}15`, color: customColor, borderColor: `${customColor}30` };
    }
    return { backgroundColor: '#f8fafc', color: '#475569', borderColor: '#cbd5e1' };
  };

  // 🛠️ HANDLER PARA SA PAG-UPDATE NG PALETTE COLORS VIA PALETTE SETTINGS MODAL
  const handlePaletteColorChange = (type, key, hexColor) => {
    setPalette(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: hexColor
      }
    }));
  };

  const handleSavePaletteConfig = async (e) => {
    e.preventDefault();
    try {
      setIsSavingPalette(true);
      await axios.post('/api/settings/palette-sup', palette);
      showToast("🎨 Supplies dynamic palette colors saved successfully!");
      setIsPaletteModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save palette layout configuration.");
    } finally {
      setIsSavingPalette(false);
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setSupplyCode('');
    setSupplyCategory('');
    setSupplySegment('');
    setItemDescription('');
    setSupplyBrand('');
    setSupplyDimension('');
    setSupplyUom('');
    setAccountTo('');

    // Pag bagong item, default sa 0 dahil dadaan pa sa movement transaction
    setCurrentActualCount(0);
    setCurrentGoodCount(0);
    setCurrentDamagedCount(0);
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
    // 🔒 Kinukuha ang existing quantity conditions nang buo para sa tracking reference
    setCurrentActualCount(supply.ActualCount || 0);
    setCurrentGoodCount(supply.ConditionBreakdown?.Good || supply.ActualCount || 0);
    setCurrentDamagedCount(supply.ConditionBreakdown?.Damaged || supply.DamagedCount || 0);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    // Tanging descriptive fields lang ang ipapasa para walang dayaan sa quantity override
    const payload = {
      Code: supplyCode.trim(),
      Category: supplyCategory.trim(),
      Segment: supplySegment.trim(),
      ItemDescription: itemDescription.trim(),
      Brand: supplyBrand.trim(),
      Dimension: supplyDimension.trim(),
      UOM: supplyUom.trim(),
      AccountTo: accountTo.trim(),
      // Panatilihin ang kasalukuyang billing kung nag-e-edit
      ActualCount: currentActualCount,
      ConditionBreakdown: {
        Good: currentGoodCount,
        Damaged: currentDamagedCount,
      }
    };

    try {
      if (isEditing) {
        await axios.put(`/api/supplies/${currentId}`, payload);
        showToast(`Success: Updated product "${payload.ItemDescription}"!`);
      } else {
        await axios.post('/api/supplies', payload);
        showToast(`Success: Added new product "${payload.ItemDescription}"!`);
      }
      setIsModalOpen(false);
      fetchSuppliesAndPalette();
    } catch (err) {
      alert(err.response?.data?.message || "Nagka-error sa pag-save ng item.");
    }
  };

  // 🛠️ Bagong triggers gamit ang iyong custom confirmation modal
  const handleArchiveSupply = (supply) => {
    setConfirmModalConfig({
      title: 'Archive Supply Record',
      message: `Are you sure you want to archive "${supply.ItemDescription}" (${supply.Code})?`,
      actionType: 'archive',
      onConfirm: async () => {
        try {
          await axios.delete(`/api/supplies/${supply._id}`);
          showToast(`Success: Archived supply "${supply.ItemDescription}"!`);
          fetchSuppliesAndPalette();
        } catch (err) {
          alert("Failed to archive supply.");
        } finally {
          setIsConfirmModalOpen(false);
        }
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
          showToast(`Success: Restored supply "${supply.ItemDescription}"!`);
          fetchSuppliesAndPalette();
        } catch (err) {
          alert("Failed to restore supply.");
        } finally {
          setIsConfirmModalOpen(false);
        }
      }
    });
    setIsConfirmModalOpen(true);
  };

  const currentDisplayList = suppliesList.filter(supply =>
    showArchivedOnly ? supply.isArchived === true : !supply.isArchived
  );

  const filteredSupplies = currentDisplayList.filter(supply => {
    const matchesCategory = selectedCategory === 'All Categories' || supply.Category === selectedCategory;
    const matchesSegment = selectedSegment === 'All Segments' || supply.Segment === selectedSegment;
    const matchesDescription = selectedDescription === 'All Item Descriptions' || supply.ItemDescription === selectedDescription;

    // 🌟 LOGIC CONDITION PARA SA HIDE ZERO QUANTITY
    const matchesZeroQty = !hideZeroQty || supply.ActualCount > 0;

    const matchesSearch =
      (supply.Code && supply.Code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supply.Brand && supply.Brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supply.Dimension && supply.Dimension.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supply.ItemDescription && supply.ItemDescription.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (supply.AccountTo && supply.AccountTo.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSegment && matchesDescription && matchesSearch && matchesZeroQty;
  });

  const activeCount = suppliesList.filter(s => !s.isArchived).length;
  const archivedCount = suppliesList.filter(s => s.isArchived).length;

  return (
    <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative">
      <PageHeader activeTab="supplies" />

      {/* 🎉 SUCCESS NOTIFICATION TOAST */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-6">

        {/* FILTERS BAR */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Filter className="w-4 h-4 text-[#18174e]" />
              <span>{showArchivedOnly ? 'Viewing Archive Supplies Vault' : 'Filter Supplies'}</span>
            </div>

            <div className="flex items-center gap-3">
              {/* 🌟 HIDE 0 QTY CHECKBOX FILTER (Katabi ng View Archive) */}
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all">
                <input 
                  type="checkbox" 
                  checked={hideZeroQty}
                  onChange={(e) => setHideZeroQty(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#18174e] rounded cursor-pointer"
                />
                <span>Hide 0 Qty</span>
              </label>

              {/* 🎨 PALETTE CONFIGURATION TRIGGER BUTTON (IDINAGDAG) */}
              <button 
                onClick={() => setIsPaletteModalOpen(true)} 
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border bg-[#18174e] text-white hover:bg-[#18174e]/90 transition-all cursor-pointer shadow-sm"
              >
                <Palette className="w-3.5 h-3.5" /> Palette Settings
              </button>

              <button
                onClick={() => setShowArchivedOnly(!showArchivedOnly)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${showArchivedOnly ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
              >
                {showArchivedOnly ? (
                  <><EyeOff className="w-3.5 h-3.5" /> Show Active Supplies ({activeCount})</>
                ) : (
                  <><Archive className="w-3.5 h-3.5" /> View Archive Vault ({archivedCount})</>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 items-center mt-2">
            {/* 1. CATEGORY SELECT */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none w-full cursor-pointer"
            >
              {[...categories].sort((a, b) => a.localeCompare(b)).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* 2. SEGMENT SELECT */}
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none w-full cursor-pointer"
            >
              {[...segments].sort((a, b) => a.localeCompare(b)).map(seg => (
                <option key={seg} value={seg}>{seg}</option>
              ))}
            </select>

            {/* 3. DESCRIPTION SELECT */}
            <select
              value={selectedDescription}
              onChange={(e) => setSelectedDescription(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none w-full cursor-pointer"
            >
              {[...descriptions].sort((a, b) => a.localeCompare(b)).map(desc => (
                <option key={desc} value={desc}>{desc}</option>
              ))}
            </select>

            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search Code, Brand, Dimension..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none text-slate-700" />
            </div>

            <button
              onClick={openAddModal}
              disabled={showArchivedOnly}
              className="flex items-center justify-center gap-2 bg-[#18174e] hover:bg-[#18174e]/90 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm w-full cursor-pointer transition-all"
            >
              Add Supply
            </button>
          </div>

          <div className="h-px bg-slate-100 w-full mt-3"></div>
        </div>

        {/* TABLE DATA */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="text-white font-bold bg-[#18174e] uppercase text-nowrap text-sm">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Segment</th>
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Dimension</th>
                  <th className="py-3 px-4 text-center bg-indigo-950">Actual Count</th>
                  <th className="py-3 px-4">UOM</th>
                  <th className="py-3 px-4 text-center">Condition Status Breakdown</th>
                  <th className="py-3 px-4">Account To</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="11" className="text-center py-10 text-slate-400 font-medium italic">
                      <div className="flex items-center justify-center gap-2">
                        <span>Fetching secure asset data from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSupplies.map((supply) => (
                  <tr key={supply._id} className="hover:bg-slate-50/80 text-slate-600 font-medium text-sm whitespace-nowrap">
                    <td className="py-3 px-4 font-mono font-extrabold text-[#18174e]">{supply.Code}</td>
                    
                    {/* 🎨 DYNAMIC CATEGORY COLOR INTEGRATION */}
                    <td className="py-3 px-4">
                      <span 
                        style={getCategoryBadgeStyle(supply.Category)} 
                        className="px-2.5 py-1 rounded-md text-xs font-bold border"
                      >
                        {supply.Category}
                      </span>
                    </td>

                    {/* 🎨 DYNAMIC SEGMENT COLOR INTEGRATION */}
                    <td className="py-3 px-4">
                      <span 
                        style={getSegmentBadgeStyle(supply.Segment)} 
                        className="px-2.5 py-1 rounded-md text-xs font-bold border"
                      >
                        {supply.Segment || '—'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-800 font-semibold">{supply.ItemDescription}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{supply.Brand || '—'}</td>
                    <td className="py-3 px-4">{supply.Dimension || '—'}</td>
                    <td className="py-3 px-4 text-center font-bold font-mono text-base text-slate-900 bg-slate-50/40">{supply.ActualCount}</td>
                    <td className="py-3 px-4 text-slate-500">{supply.UOM}</td>

                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {((supply.ConditionBreakdown?.Good || supply.ActualCount) > 0) && (
                          <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                            Good: {supply.ConditionBreakdown?.Good || supply.ActualCount || 0}
                          </span>
                        )}
                        {((supply.ConditionBreakdown?.Damaged || supply.DamagedCount) > 0) && (
                          <span className="text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-bold">
                            Repair: {supply.ConditionBreakdown?.Damaged || supply.DamagedCount || 0}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-700">{supply.AccountTo || '—'}</td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!showArchivedOnly ? (
                          <>
                            <button onClick={() => openEditModal(supply)} className="p-1 border border-slate-200 rounded text-indigo-600 hover:bg-indigo-600 hover:text-white cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleArchiveSupply(supply)} className="p-1 border border-slate-200 rounded text-rose-600 hover:bg-rose-600 hover:text-white cursor-pointer"><Archive className="w-3.5 h-3.5" /></button>
                          </>
                        ) : (
                          <button onClick={() => handleUnarchiveSupply(supply)} className="flex items-center gap-1 px-2 py-1 bg-white border border-emerald-200 rounded text-emerald-600 hover:bg-emerald-600 hover:text-white text-xs font-bold cursor-pointer">
                            <RotateCcw className="w-3 h-3" /> Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredSupplies.length === 0 && !loading && (
                  <tr>
                    <td colSpan="11" className="text-center py-10 text-slate-400 font-medium italic">
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

      {/* FORM MODAL CONTAINER (ADD/EDIT) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">{isEditing ? 'Update Supply Information' : 'New Record Supply Information'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            {isEditing && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 mt-4">
                <span className="block text-xs font-bold text-amber-800 uppercase mb-1">Quantities Locked</span>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Current stock level: <strong>{currentActualCount} {supplyUom || 'units'}</strong> (Good: {currentGoodCount} | Repair: {currentDamagedCount}). These values cannot be modified here to prevent unauthorized changes. Please process any inventory adjustments through the <strong>Supplies Movements Module</strong>.
                </p>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3 mt-3">
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Supply Code *</label>
                <input type="text" placeholder="Enter supply code" required disabled={isEditing} value={supplyCode} onChange={(e) => setSupplyCode(e.target.value)} className="w-full bg-white disabled:bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Category *</label>
                  <input type="text" required list="modal-categories-list" placeholder="Enter category name" value={supplyCategory} onChange={(e) => setSupplyCategory(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                  <datalist id="modal-categories-list">
                    {uniqueCategoriesInDB.map((cat, i) => <option key={i} value={cat} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Segment *</label>
                  <input type="text" required list="modal-segments-list" placeholder="Enter segment" value={supplySegment} onChange={(e) => setSupplySegment(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                  <datalist id="modal-segments-list">
                    {uniqueSegmentsInDB.map((seg, i) => <option key={i} value={seg} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Item Description *</label>
                <input type="text" required list="modal-descriptions-list" placeholder="Enter item description" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                <datalist id="modal-descriptions-list">
                  {uniqueDescriptionsInDB.map((desc, i) => <option key={i} value={desc} />)}
                </datalist>
              </div>

              {/* BRAND AT DIMENSION GRID */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Brand</label>
                  <input type="text" list="modal-brands-list" placeholder="Enter brand name" value={supplyBrand} onChange={(e) => setSupplyBrand(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                  <datalist id="modal-brands-list">
                    {uniqueBrandsInDB.map((brand, i) => <option key={i} value={brand} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Dimension *</label>
                  <input type="text" list="modal-dimensions-list" placeholder="Enter dimension" value={supplyDimension} onChange={(e) => setSupplyDimension(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                  <datalist id="modal-dimensions-list">
                    {uniqueDimensionsInDB.map((dim, i) => <option key={i} value={dim} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">UOM *</label>
                <input type="text" required list="modal-uoms-list" placeholder="Enter unit of measure" value={supplyUom} onChange={(e) => setSupplyUom(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                <datalist id="modal-uoms-list">
                  {uniqueUomsInDB.map((uom, i) => <option key={i} value={uom} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Account To *</label>
                <input type="text" list="modal-accounts-list" placeholder="Enter account name" value={accountTo} onChange={(e) => setAccountTo(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                <datalist id="modal-accounts-list">
                  {uniqueAccountsInDB.map((acc, i) => <option key={i} value={acc} />)}
                </datalist>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm cursor-pointer">Cancel</button>
                <button type="submit" className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-4 rounded-lg text-sm cursor-pointer">Save Details</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🎨 NEW: DYNAMIC PALETTE SETTINGS MANAGEMENT MODAL CONTAINER */}
      {isPaletteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl relative max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#18174e]" />
                <h3 className="font-bold text-slate-800 text-base">Supplies Custom Design Palette</h3>
              </div>
              <button onClick={() => setIsPaletteModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSavePaletteConfig} className="mt-4 space-y-6">
              
              {/* Category Colors Section */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Category Chips Colors</h4>
                {uniqueCategoriesInDB.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No categories found in active database items.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {uniqueCategoriesInDB.map((cat) => (
                      <div key={cat} className="flex items-center justify-between bg-white p-2 border border-slate-200 rounded-lg">
                        <span className="text-xs font-semibold text-slate-700 truncate mr-2">{cat}</span>
                        <input 
                          type="color" 
                          value={palette.categoryColors[cat] || '#334155'} 
                          onChange={(e) => handlePaletteColorChange('categoryColors', cat, e.target.value)}
                          className="w-8 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Segment Colors Section */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">Segment Chips Colors</h4>
                {uniqueSegmentsInDB.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No segments found in active database items.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {uniqueSegmentsInDB.map((seg) => (
                      <div key={seg} className="flex items-center justify-between bg-white p-2 border border-slate-200 rounded-lg">
                        <span className="text-xs font-semibold text-slate-700 truncate mr-2">{seg}</span>
                        <input 
                          type="color" 
                          value={palette.segmentColors[seg] || '#475569'} 
                          onChange={(e) => handlePaletteColorChange('segmentColors', seg, e.target.value)}
                          className="w-8 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setIsPaletteModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSavingPalette} className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-4 rounded-lg text-sm cursor-pointer disabled:bg-slate-300">
                  {isSavingPalette ? 'Saving Config...' : 'Apply Layout Palette'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔔 CUSTOM CONFIRMATION MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-5 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-5 shadow-2xl relative animate-in slide-in-from-top-5 duration-300">

            {/* Title Block (No Icons) */}
            <div className="border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-sm tracking-wide">
                {confirmModalConfig.title}
              </h3>
            </div>

            {/* Message Body */}
            <p className="text-sm text-slate-600 leading-relaxed mt-3">
              {confirmModalConfig.message}
            </p>

            {/* Action Buttons */}
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
                onClick={confirmModalConfig.onConfirm}
                className={`text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer ${confirmModalConfig.actionType === 'archive' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
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

export default Supplies;