import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Archive, X, Filter, AlertCircle, ArchiveRestore, RotateCcw, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import PageHeader from '../Common/PageHeader';

// 🛠️ ABSOLUTE URL: Ginawa nating pareho sa Outbound para sigurado ang salpakan sa backend network port mo
const API_URL = import.meta.env.MODE === 'production'
  ? 'https://one-inventory.onrender.com/api/products'
  : 'http://localhost:5000/api/products';

function Products() {
  // 1. DATABASE AT LIFECYCLE STATES
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Toggle feature para sa Active vs Archived view
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  // States para sa Filtering at Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSegment, setSelectedSegment] = useState('All Segments');
  const [selectedDescription, setSelectedDescription] = useState('All Item Descriptions');
  const [selectedHealth, setSelectedHealth] = useState('All Health Status');

  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);             // Add/Edit modal
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);                  // Hawak ang MongoDB _id

  // 🎉 State para sa Success Notification
  const [successMessage, setSuccessMessage] = useState(null);

  // 🤝 CUSTOM CONFIRMATION MODAL STATES
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({ title: '', message: '', actionType: '' });
  const [pendingAction, setPendingAction] = useState(null);

  // Live Threshold Points mula sa Reference Code
  const [thresholds, setThresholds] = useState({
    critical: 5,    // <= 5 ay Critical
    reorder: 15,    // 6 hanggang 15 ay Restock Point
    overstock: 50,  // > 50 ay Overstock
  });

  // Form Field States (Walang Actual Stock Count na binabago rito)
  const [productCode, setProductCode] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [productSegment, setProductSegment] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [productDimension, setProductDimension] = useState('');
  const [productUom, setProductUom] = useState('');
  const [accountTo, setAccountTo] = useState('');
  
  // 🔒 State para sa Callout display habang nag-eedit
  const [modalActualCount, setModalActualCount] = useState(0);

  // Helper para magpakita ng success message na nawawala pagkalipas ng 3 segundo
  const showToast = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // 2. READ: FETCH DATA FROM BACKEND API
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_URL);
      
      // 🤝 PAGTUGMA: Dahil res.status(200).json(products) ay direct array mula sa Product.find()
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
      setError("Hindi makuha ang mga produkto mula sa server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Kumuha ng mga unique lists mula sa mga nakaraang records sa DB para sa bawat Datalist dropdown
  const uniqueCategoriesInDB = [...new Set(productsList.map(item => item.Category).filter(Boolean))];
  const uniqueSegmentsInDB = [...new Set(productsList.map(item => item.Segment).filter(Boolean))];
  const uniqueDescriptionsInDB = [...new Set(productsList.map(item => item.ItemDescription).filter(Boolean))];
  const uniqueDimensionsInDB = [...new Set(productsList.map(item => item.Dimension).filter(Boolean))];
  const uniqueUomsInDB = [...new Set(productsList.map(item => item.UOM).filter(Boolean))];
  const uniqueAccountsInDB = [...new Set(productsList.map(item => item.AccountTo).filter(Boolean))];

  // Open Modal Add Product (Pure Details Mode)
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

  // Open Modal Edit Product (Pure Details Mode)
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
    setModalActualCount(product.ActualCount ?? 0); // Isinasave natin pansamantala para sa view notice mo
    setIsModalOpen(true);
  };

  // 3. CREATE & UPDATE SUBMIT HANDLER (Walang pinapasang ActualCount)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      Code: productCode.trim(),
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

  // Trigger Custom Confirm Modal para sa Archive
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
        showToast(err.response?.data?.message || `Hindi mai-archive ang produkto.`);
      }
    });
    setIsConfirmModalOpen(true);
  };

  // Trigger Custom Confirm Modal para sa Unarchive
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
        showToast(err.response?.data?.message || "Hindi mai-restore ang produkto mula sa archive.");
      }
    });
    setIsConfirmModalOpen(true);
  };

  // Master handler kapag pinindot ang "Confirm" sa custom modal
  const handleConfirmAction = async () => {
    if (pendingAction) {
      await pendingAction();
    }
    setIsConfirmModalOpen(false);
    setPendingAction(null);
  };

  // Toolbar Filters Layout Config
  const filterCategories = ['All Categories', ...uniqueCategoriesInDB];
  const filterSegments = ['All Segments', ...uniqueSegmentsInDB];
  const filterDescriptions = ['All Item Descriptions', ...uniqueDescriptionsInDB];

  // 6. SEPARATION & FILTERING LOGIC
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
      (product.Code && product.Code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.Dimension && product.Dimension.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.ItemDescription && product.ItemDescription.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.AccountTo && product.AccountTo.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSegment && matchesDescription && matchesHealth && matchesSearch;
  });

  // Counters para sa Badges ng Active vs Archived items
  const activeCount = productsList.filter(p => !p.isArchived).length;
  const archivedCount = productsList.filter(p => p.isArchived).length;

  return (
    <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative">
      <PageHeader activeTab="products" />

      {/* 🎉 SUCCESS NOTIFICATION TOAST: Lumalabas sa kanang itaas kapag may ginawang aksyon */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 🤝 CUSTOM CONFIRMATION MODAL */}
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
                onClick={() => { setIsConfirmModalOpen(false); setPendingAction(null); }} 
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

      <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-6">

        {/* FILTER & CONTROLS SECTION */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Filter className="w-4 h-4 text-[#18174e]" />
              <span>{showArchivedOnly ? 'Viewing Archived Products Vault' : 'Filter Products'}</span>
            </div>
            
            <div className="flex items-center gap-2">
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
                    <ArchiveRestore className="w-3.5 h-3.5" /> Show Active Products ({activeCount})
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

            <select value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)} className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full">
              {filterSegments.map(seg => <option key={seg} value={seg}>{seg}</option>)}
            </select>

            <select value={selectedDescription} onChange={(e) => setSelectedDescription(e.target.value)} className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full">
              {filterDescriptions.map(desc => <option key={desc} value={desc}>{desc}</option>)}
            </select>

            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search Code, Dimension, Owner..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none text-slate-700" />
            </div>

            <button onClick={openAddModal} disabled={showArchivedOnly} className="flex items-center justify-center gap-2 bg-[#18174e] hover:bg-[#18174e]/90 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all cursor-pointer w-full">
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
          <div className="h-px bg-slate-100 w-full mt-3"></div>
        </div>

        {/* TABLE MASTERLIST CONTAINER */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="text-white font-bold bg-[#18174e] uppercase tracking-wide text-sm">
                  <th className="py-3 px-4 whitespace-nowrap">Code</th>
                  <th className="py-3 px-4 whitespace-nowrap">Category</th>
                  <th className="py-3 px-4 whitespace-nowrap">Segment</th>
                  <th className="py-3 px-4 whitespace-nowrap">Item Description</th>
                  <th className="py-3 px-4 whitespace-nowrap">Dimension</th>
                  <th className="py-3 px-4 whitespace-nowrap text-center">Actual Count</th>
                  <th className="py-3 px-4 whitespace-nowrap">UOM</th>
                  <th className="py-3 px-4 whitespace-nowrap bg-indigo-950">Account To</th>
                  <th className="py-3 px-4 text-center bg-indigo-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-slate-500">Kinukuha ang masterlist items...</td>
                  </tr>
                ) : filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-slate-50/80 transition-colors text-slate-600 font-medium whitespace-nowrap text-sm">
                    <td className="py-3 px-4 font-mono font-extrabold text-[#18174e]">{product.Code}</td>
                    <td className="py-3 px-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-700">{product.Category}</span></td>
                    <td className="py-3 px-4 text-slate-700">{product.Segment || '—'}</td>
                    <td className="py-3 px-4 text-slate-800 font-semibold">{product.ItemDescription}</td>
                    <td className="py-3 px-4 font-medium">{product.Dimension || '—'}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900 font-mono bg-slate-50/30">{product.ActualCount ?? 0}</td>
                    <td className="py-3 px-4 text-slate-500">{product.UOM}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700 bg-slate-50/20">{product.AccountTo || '—'}</td>
                    <td className="py-3 px-4 bg-slate-50/40 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!showArchivedOnly ? (
                          <>
                            <button onClick={() => openEditModal(product)} className="p-1 bg-white border border-slate-200 rounded text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleArchiveProductClick(product)} className="p-1 bg-white border border-slate-200 rounded text-rose-600 hover:bg-rose-600 hover:text-white transition-all cursor-pointer">
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => handleUnarchiveProductClick(product)} 
                            className="flex items-center gap-1 px-2 py-1 bg-white border border-emerald-200 rounded text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer text-xs font-bold"
                          >
                            <RotateCcw className="w-3 h-3" /> Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredProducts.length === 0 && !loading && (
                  <tr>
                    <td colSpan="9" className="text-center py-8 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <AlertCircle className="w-6 h-6 text-[#18174e]/30" />
                        <p className="italic text-sm text-slate-500">Walang nahanap batay sa iyong napiling filter values o walang laman ang vault.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FORM MODAL: ADD & EDIT PRODUCT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">{isEditing ? 'Update Products Information' : 'New Record Products Information'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            {/* 🔒 INFO CALLOUT STATUS PANEL: Lumalabas lang kapag Edit Mode */}
            {isEditing && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 mt-3">
                <span className="block text-xs font-bold text-amber-800 uppercase mb-1">Quantities Locked</span>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Current stock level: <strong>{modalActualCount} {productUom || 'units'}</strong>. 
                  This value cannot be modified here to prevent unauthorized changes. Please process any inventory adjustments through the <strong>Work In Progress & Outbound Products Module</strong>.
                </p>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3 mt-3">
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Product Code *</label>
                <input type="text" required disabled={isEditing} placeholder="Enter product code" value={productCode} onChange={(e) => setProductCode(e.target.value)} className="w-full bg-white disabled:bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Category *</label>
                  <input 
                    type="text" 
                    required 
                    list="modal-prod-categories"
                    placeholder="Enter product category" 
                    value={productCategory} 
                    onChange={(e) => setProductCategory(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" 
                  />
                  <datalist id="modal-prod-categories">
                    {uniqueCategoriesInDB.map((cat, i) => (
                      <option key={i} value={cat} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Segment *</label>
                  <input 
                    type="text" 
                    required
                    list="modal-prod-segments"
                    placeholder="Enter product segment" 
                    value={productSegment} 
                    onChange={(e) => setProductSegment(e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" 
                  />
                  <datalist id="modal-prod-segments">
                    {uniqueSegmentsInDB.map((seg, i) => (
                      <option key={i} value={seg} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Item Description *</label>
                <input 
                  type="text" 
                  required 
                  list="modal-prod-descriptions"
                  placeholder="Enter item description" 
                  value={itemDescription} 
                  onChange={(e) => setItemDescription(e.target.value)} 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" 
                />
                <datalist id="modal-prod-descriptions">
                  {uniqueDescriptionsInDB.map((desc, i) => (
                    <option key={i} value={desc} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Dimension *</label>
                <input 
                  type="text" 
                  list="modal-prod-dimensions"
                  placeholder="Enter product dimension" 
                  value={productDimension} 
                  onChange={(e) => setProductDimension(e.target.value)} 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" 
                />
                <datalist id="modal-prod-dimensions">
                  {uniqueDimensionsInDB.map((dim, i) => (
                    <option key={i} value={dim} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">UOM *</label>
                <input 
                  type="text" 
                  required 
                  list="modal-prod-uoms"
                  placeholder="Enter unit of measure" 
                  value={productUom} 
                  onChange={(e) => setProductUom(e.target.value)} 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" 
                />
                <datalist id="modal-prod-uoms">
                  {uniqueUomsInDB.map((uom, i) => (
                    <option key={i} value={uom} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Account To *</label>
                <input 
                  type="text" 
                  required
                  list="modal-prod-accounts"
                  placeholder="Enter account to" 
                  value={accountTo} 
                  onChange={(e) => setAccountTo(e.target.value)} 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" 
                />
                <datalist id="modal-prod-accounts">
                  {uniqueAccountsInDB.map((acc, i) => (
                    <option key={i} value={acc} />
                  ))}
                </datalist>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">Cancel</button>
                <button type="submit" className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Products;