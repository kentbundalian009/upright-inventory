import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Archive, X, Filter, AlertCircle, ArchiveRestore, RotateCcw, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';
import PageHeader from './PageHeader';
import { useTheme } from '../context/ThemeContext';

const API_URL = import.meta.env.MODE === 'production'
  ? 'https://one-inventory.onrender.com/api/products'
  : 'http://localhost:5000/api/products';

function InventoryProducts() {
  const { isDark } = useTheme();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = localStorage.getItem("SystemRole") || currentUser?.role || currentUser?.SystemRole || "Inventory";
  const isViewer = userRole?.toLowerCase() === 'viewer';

  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSegment, setSelectedSegment] = useState('All Segments');
  const [selectedDescription, setSelectedDescription] = useState('All Item Descriptions');
  const [selectedHealth, setSelectedHealth] = useState('All Health Status');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [successMessage, setSuccessMessage] = useState(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({ title: '', message: '', actionType: '' });
  const [pendingAction, setPendingAction] = useState(null);

  const [thresholds, setThresholds] = useState({
    critical: 5,
    reorder: 15,
    overstock: 50,
  });

  const [productCode, setProductCode] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productSegment, setProductSegment] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [productDimension, setProductDimension] = useState('');
  const [productUom, setProductUom] = useState('');
  const [accountTo, setAccountTo] = useState('');
  
  const [modalActualCount, setModalActualCount] = useState(0);

  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL);
      
      if (Array.isArray(response.data)) {
        setProductsList(response.data);
      } else if (response.data && Array.isArray(response.data.data)) {
        setProductsList(response.data.data);
      } else {
        setProductsList([]);
      }
      setError(null);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to fetch products from the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const uniqueCategoriesInDB = [...new Set(productsList.map(item => item.Category).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueSegmentsInDB = [...new Set(productsList.map(item => item.Segment).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueDescriptionsInDB = [...new Set(productsList.map(item => item.ItemDescription).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueDimensionsInDB = [...new Set(productsList.map(item => item.Dimension).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueUomsInDB = [...new Set(productsList.map(item => item.UOM).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const uniqueAccountsInDB = [...new Set(productsList.map(item => item.AccountTo).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setProductCode('');
    setProductCategory('');
    setProductSegment('');
    setItemDescription('');
    setProductDimension('');
    setProductUom('');
    setAccountTo('');
    setModalActualCount(0);
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setIsEditing(true);
    setCurrentId(product._id);
    setProductCode(product.Code || '');
    setProductCategory(product.Category || '');
    setProductSegment(product.Segment || '');
    setItemDescription(product.ItemDescription || '');
    setProductDimension(product.Dimension || '');
    setProductUom(product.UOM || '');
    setAccountTo(product.AccountTo || '');
    setModalActualCount(product.ActualCount ?? 0);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      Code: productCode.trim() || `PRD-USSP-${Date.now()}`,
      Category: productCategory.trim(),
      Segment: productSegment.trim(),
      ItemDescription: itemDescription.trim(),
      Dimension: productDimension.trim(),
      UOM: productUom.trim(),
      AccountTo: accountTo.trim(),
    };

    try {
      if (isEditing) {
        await axios.put(`${API_URL}/${currentId}`, payload);
        showToast(`Success: Updated product "${payload.ItemDescription}"!`);
      } else {
        await axios.post(API_URL, payload);
        showToast(`Success: Added new product "${payload.ItemDescription}"!`);
      }
      setIsModalOpen(false);
      fetchProducts(); 
    } catch (err) {
      showToast(err.response?.data?.message || "Nagka-error sa pag-save ng item.");
    }
  };

  const handleArchiveProductClick = (product) => {
    setConfirmModalConfig({
      title: 'Archive Product',
      message: `Are you sure you want to archive "${product.ItemDescription}" (${product.Code})?`,
      actionType: 'archive'
    });
    setPendingAction(() => async () => {
      try {
        await axios.delete(`${API_URL}/${product._id}`);
        showToast(`Na-archive na si "${product.ItemDescription}".`);
        fetchProducts();
      } catch (err) {
        showToast(err.response?.data?.message || "Failed to archive the product.");
      }
    });
    setIsConfirmModalOpen(true);
  };

  const handleUnarchiveProductClick = (product) => {
    setConfirmModalConfig({
      title: 'Restore Product',
      message: `Are you sure you want to restore "${product.ItemDescription}" (${product.Code})?`,
      actionType: 'restore'
    });
    setPendingAction(() => async () => {
      try {
        await axios.put(`${API_URL}/${product._id}/unarchive`);
        showToast(`Na-restore mula sa archive si "${product.ItemDescription}"!`);
        fetchProducts();
      } catch (err) {
        showToast(err.response?.data?.message || "Failed to restore the product from archive.");
      }
    });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (pendingAction) {
      await pendingAction();
    }
    setIsConfirmModalOpen(false);
    setPendingAction(null);
  };

  const filterCategories = ['All Categories', ...uniqueCategoriesInDB];
  const filterSegments = ['All Segments', ...uniqueSegmentsInDB];
  const filterDescriptions = ['All Item Descriptions', ...uniqueDescriptionsInDB];

  const currentDisplayList = productsList.filter(product => 
    showArchivedOnly ? product.isArchived === true : !product.isArchived
  );

  const filteredProducts = currentDisplayList.filter(product => {
    const matchesCategory = selectedCategory === 'All Categories' || product.Category === selectedCategory;
    const matchesSegment = selectedSegment === 'All Segments' || product.Segment === selectedSegment;
    const matchesDescription = selectedDescription === 'All Item Descriptions' || product.ItemDescription === selectedDescription;

    let statusText = 'Healthy';
    if (product.ActualCount <= thresholds.critical) statusText = 'Critical';
    else if (product.ActualCount <= thresholds.reorder) statusText = 'Re-Stock';
    else if (product.ActualCount > thresholds.overstock) statusText = 'Overstock';
    
    const matchesHealth = selectedHealth === 'All Health Status' || statusText === selectedHealth;

    const matchesSearch =
      !searchTerm ||
      (product.Code && product.Code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.Category && product.Category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.Segment && product.Segment.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.Dimension && product.Dimension.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.ItemDescription && product.ItemDescription.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.AccountTo && product.AccountTo.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSegment && matchesDescription && matchesHealth && matchesSearch;
  });

  const activeCount = productsList.filter(p => !p.isArchived).length;
  const archivedCount = productsList.filter(p => p.isArchived).length;

  return (
    <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative">
      <PageHeader activeTab="products" />

      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isConfirmModalOpen && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/30'} backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-5 animate-in fade-in duration-200`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200'} border rounded-xl w-full max-w-sm p-5 shadow-2xl relative animate-in slide-in-from-top-5 duration-300`}>
            <div className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-2`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-sm tracking-wide`}>
                {confirmModalConfig.title}
              </h3>
            </div>
            
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'} leading-relaxed mt-3`}>
              {confirmModalConfig.message}
            </p>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button 
                type="button" 
                onClick={() => { setIsConfirmModalOpen(false); setPendingAction(null); }} 
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer`}
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

      <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100'} border rounded-2xl p-6 shadow-sm flex flex-col gap-6`}>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Filter className="w-4 h-4 text-[#ff6600]" />
              <span>{showArchivedOnly ? 'Viewing Archived Products Vault' : 'Filter Products'}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {!isViewer && (
                <button
                  onClick={() => setShowArchivedOnly(!showArchivedOnly)}
                  className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    showArchivedOnly 
                      ? isDark ? 'bg-rose-950/40 text-rose-300 border-rose-800 hover:bg-rose-900/60' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                      : isDark ? 'bg-[#141622] text-slate-300 border-slate-700 hover:bg-[#1c2032]' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {showArchivedOnly ? (
                    <>
                      <ArchiveRestore className="w-3.5 h-3.5" /> Show Active Products ({activeCount})
                    </>
                  ) : (
                    <>
                      <Archive className="w-3.5 h-3.5" /> View Archive Vault ({archivedCount})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 items-center mt-2">
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)} 
              className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full`}
            >
              {filterCategories.map(cat => <option key={cat} value={cat} className={isDark ? 'bg-[#141622] text-slate-200' : ''}>{cat}</option>)}
            </select>

            <select 
              value={selectedSegment} 
              onChange={(e) => setSelectedSegment(e.target.value)} 
              className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full`}
            >
              {filterSegments.map(seg => <option key={seg} value={seg} className={isDark ? 'bg-[#141622] text-slate-200' : ''}>{seg}</option>)}
            </select>

            <select 
              value={selectedDescription} 
              onChange={(e) => setSelectedDescription(e.target.value)} 
              className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full truncate`}
            >
              {filterDescriptions.map(desc => <option key={desc} value={desc} className={isDark ? 'bg-[#141622] text-slate-200' : ''}>{desc}</option>)}
            </select>

            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search Category, Segment..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-200 placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none`} 
              />
            </div>

            {!isViewer && (
              <button 
                onClick={openAddModal} 
                disabled={showArchivedOnly} 
                className="flex items-center justify-center gap-2 bg-[#ff6600] hover:bg-[#e05a00] disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer w-full"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            )}
          </div>
          <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-full mt-3`}></div>
        </div>

        <div className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'} rounded-xl border shadow-sm overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className={`text-white font-bold ${isDark ? 'bg-[#0f111d]' : 'bg-[#18174e]'} uppercase tracking-wide text-sm`}>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Image</th>
                  <th className="py-3 px-4 whitespace-nowrap">Item Description</th>
                  <th className="py-3 px-4 whitespace-nowrap">Dimension</th>
                  <th className="py-3 px-4 whitespace-nowrap">Category</th>
                  <th className="py-3 px-4 whitespace-nowrap">Segment</th>
                  <th className="py-3 px-4 whitespace-nowrap text-center">Actual Count</th>
                  <th className="py-3 px-4 whitespace-nowrap">UOM</th>
                  <th className={`py-3 px-4 whitespace-nowrap ${isDark ? 'bg-[#141626]' : 'bg-indigo-950'}`}>Account To</th>
                  {!isViewer && (
                    <th className="py-3 px-4 text-center whitespace-nowrap">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 bg-[#090b10]' : 'divide-slate-100'}`}>
                {loading ? (
                  <tr>
                    <td colSpan={isViewer ? "7" : "8"} className={`text-center py-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Kinukuha ang masterlist items...</td>
                  </tr>
                ) : filteredProducts.map((product) => (
                  <tr key={product._id} className={`group ${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'} transition-colors font-medium whitespace-nowrap text-sm`}>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      {product.ImageUrl ? (
                        <img
                          src={product.ImageUrl}
                          alt={product.ItemDescription}
                          className="w-10 h-10 object-cover rounded-lg mx-auto shadow-sm"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-lg ${isDark ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-slate-100 text-slate-400 border-slate-200'} flex items-center justify-center border border-dashed mx-auto`}>
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td 
                      className={`py-3 px-4 font-semibold min-w-[200px] whitespace-normal break-words transition-colors ${
                        isDark ? 'text-slate-100' : 'text-slate-800'
                      }`}
                    >
                      {product.ItemDescription}
                    </td>
                    <td 
                      className={`py-3 px-4 font-mono text-xs whitespace-normal break-words transition-colors ${
                        isDark ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {product.Dimension || '—'}
                    </td>
                    <td className="py-3 px-4"><span className={`${isDark ? 'bg-slate-800/80 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700'} px-2 py-1 rounded text-xs`}>{product.Category}</span></td>
                    <td className={`py-3 px-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{product.Segment || '—'}</td>
                    <td className={`py-3 px-4 text-center font-bold font-mono ${isDark ? 'bg-slate-800/30 text-white' : 'bg-slate-50/30 text-slate-900'}`}>{product.ActualCount ?? 0}</td>
                    <td className={`py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{product.UOM}</td>
                    <td className={`py-3 px-4 font-semibold ${isDark ? 'text-slate-300 bg-slate-800/20' : 'text-slate-700 bg-slate-50/20'}`}>{product.AccountTo || '—'}</td>
                    {!isViewer && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!showArchivedOnly ? (
                            <>
                              <button onClick={() => openEditModal(product)} className={`p-1.5 ${isDark ? 'bg-slate-800/80 border-slate-700 text-indigo-400 hover:bg-indigo-600' : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-600'} border rounded hover:text-white transition-all cursor-pointer`}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleArchiveProductClick(product)} className={`p-1.5 ${isDark ? 'bg-slate-800/80 border-slate-700 text-rose-400 hover:bg-rose-600' : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-600'} border rounded hover:text-white transition-all cursor-pointer`}>
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => handleUnarchiveProductClick(product)} 
                              className={`flex items-center gap-1 px-2 py-1 ${isDark ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400 hover:bg-emerald-600' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-600'} border rounded hover:text-white transition-all cursor-pointer text-xs font-bold`}
                            >
                              <RotateCcw className="w-3 h-3" /> Restore
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                
                {filteredProducts.length === 0 && !loading && (
                  <tr>
                    <td colSpan={isViewer ? "8" : "9"} className="text-center py-8 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <AlertCircle className={`w-6 h-6 ${isDark ? 'text-slate-600' : 'text-[#18174e]/30'}`} />
                        <p className={`italic text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Walang nahanap batay sa iyong napiling filter values o walang laman ang vault.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-md p-6 shadow-xl relative max-h-[90vh] overflow-y-auto`}>
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>{isEditing ? 'Update Products Information' : 'New Record Products Information'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            {isEditing && (
              <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-800/60' : 'bg-amber-50 border-amber-200/60'} rounded-xl border mt-3`}>
                <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>Quantities Locked</span>
                <p className={`text-[11px] ${isDark ? 'text-amber-300/80' : 'text-amber-700'} leading-relaxed`}>
                  Current stock level: <strong>{modalActualCount} {productUom || 'units'}</strong>. 
                  This value cannot be modified here to prevent unauthorized changes. Please process any inventory adjustments through the <strong>Work In Progress & Outbound Products Module</strong>.
                </p>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Category *</label>
                  <input 
                    type="text" 
                    required 
                    list="modal-prod-categories"
                    placeholder="Enter product category" 
                    value={productCategory} 
                    onChange={(e) => setProductCategory(e.target.value)} 
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`} 
                  />
                  <datalist id="modal-prod-categories">
                    {uniqueCategoriesInDB.map((cat, i) => (
                      <option key={i} value={cat} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Segment *</label>
                  <input 
                    type="text" 
                    required
                    list="modal-prod-segments"
                    placeholder="Enter product segment" 
                    value={productSegment} 
                    onChange={(e) => setProductSegment(e.target.value)} 
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`} 
                  />
                  <datalist id="modal-prod-segments">
                    {uniqueSegmentsInDB.map((seg, i) => (
                      <option key={i} value={seg} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Item Description *</label>
                <input 
                  type="text" 
                  required 
                  list="modal-prod-descriptions"
                  placeholder="Enter item description" 
                  value={itemDescription} 
                  onChange={(e) => setItemDescription(e.target.value)} 
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`} 
                />
                <datalist id="modal-prod-descriptions">
                  {uniqueDescriptionsInDB.map((desc, i) => (
                    <option key={i} value={desc} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Dimension *</label>
                <input 
                  type="text" 
                  list="modal-prod-dimensions"
                  placeholder="Enter product dimension" 
                  value={productDimension} 
                  onChange={(e) => setProductDimension(e.target.value)} 
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`} 
                />
                <datalist id="modal-prod-dimensions">
                  {uniqueDimensionsInDB.map((dim, i) => (
                    <option key={i} value={dim} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>UOM *</label>
                <input 
                  type="text" 
                  required 
                  list="modal-prod-uoms"
                  placeholder="Enter unit of measure" 
                  value={productUom} 
                  onChange={(e) => setProductUom(e.target.value)} 
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`} 
                />
                <datalist id="modal-prod-uoms">
                  {uniqueUomsInDB.map((uom, i) => (
                    <option key={i} value={uom} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Account To *</label>
                <input 
                  type="text" 
                  required
                  list="modal-prod-accounts"
                  placeholder="Enter account to" 
                  value={accountTo} 
                  onChange={(e) => setAccountTo(e.target.value)} 
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`} 
                />
                <datalist id="modal-prod-accounts">
                  {uniqueAccountsInDB.map((acc, i) => (
                    <option key={i} value={acc} />
                  ))}
                </datalist>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer`}>Cancel</button>
                <button type="submit" className="bg-[#ff6600] hover:bg-[#e05a00] text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryProducts;
