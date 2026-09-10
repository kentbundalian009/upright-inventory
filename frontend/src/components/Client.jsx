import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Building2, Users, Search, Plus, Edit2, Archive, EyeOff, RotateCcw,
  Trash2, Phone, Mail, MapPin, User, FileText, CheckCircle2,
  AlertCircle, X, Filter, Sliders, Truck
} from 'lucide-react';
import PageHeader from './PageHeader';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = '/api';

function Client() {
  const { isDark } = useTheme();
  const userRole = localStorage.getItem('SystemRole') || 'Inventory';
  const isViewer = userRole?.toLowerCase() === 'viewer';

  // Active sub-tab: 'Supplier' | 'Customer' | 'Logistics'
  const [activeType, setActiveType] = useState('Supplier');

  // Client Data States
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Toast Notification States
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Filters and Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [sortBy, setSortBy] = useState('name-asc');

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation Modal States
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    actionType: '',
    selectedItem: null,
  });

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactPerson: '',
    contactNumber: '',
    email: '',
    notes: '',
  });

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

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/clients?includeArchived=true`);
      if (Array.isArray(res.data)) {
        setClients(res.data);
      } else {
        setClients([]);
      }
      setError(null);
    } catch (err) {
      console.error("Error loading clients:", err);
      setError("Failed to load client records from the server.");
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Counts
  const activeSuppliers = useMemo(() => clients.filter(c => c.type === 'Supplier' && !c.isArchived).length, [clients]);
  const archivedSuppliers = useMemo(() => clients.filter(c => c.type === 'Supplier' && c.isArchived).length, [clients]);

  const activeCustomers = useMemo(() => clients.filter(c => c.type === 'Customer' && !c.isArchived).length, [clients]);
  const archivedCustomers = useMemo(() => clients.filter(c => c.type === 'Customer' && c.isArchived).length, [clients]);

  const activeLogistics = useMemo(() => clients.filter(c => c.type === 'Logistics' && !c.isArchived).length, [clients]);
  const archivedLogistics = useMemo(() => clients.filter(c => c.type === 'Logistics' && c.isArchived).length, [clients]);

  const activeCurrentCount =
    activeType === 'Supplier' ? activeSuppliers :
      activeType === 'Customer' ? activeCustomers :
        activeLogistics;

  const archivedCurrentCount =
    activeType === 'Supplier' ? archivedSuppliers :
      activeType === 'Customer' ? archivedCustomers :
        archivedLogistics;

  // Filtered and Sorted Client List
  const filteredClients = useMemo(() => {
    return clients
      .filter(c => {
        if (c.type !== activeType) return false;
        if (showArchivedOnly ? !c.isArchived : c.isArchived) return false;

        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          c.name?.toLowerCase().includes(q) ||
          c.address?.toLowerCase().includes(q) ||
          c.contactPerson?.toLowerCase().includes(q) ||
          c.contactNumber?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.notes?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
        if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
        return 0;
      });
  }, [clients, activeType, showArchivedOnly, searchTerm, sortBy]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedClient(null);
    setFormData({
      name: '',
      address: '',
      contactPerson: '',
      contactNumber: '',
      email: '',
      notes: '',
    });
    setIsEditModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setIsEditing(true);
    setSelectedClient(item);
    setFormData({
      name: item.name || '',
      address: item.address || '',
      contactPerson: item.contactPerson || '',
      contactNumber: item.contactNumber || '',
      email: item.email || '',
      notes: item.notes || '',
    });
    setIsEditModalOpen(true);
  };

  // Submit Add / Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return triggerError(`Please enter a valid ${activeType} name.`);
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        name: formData.name.trim(),
        address: formData.address.trim(),
        contactPerson: formData.contactPerson.trim(),
        contactNumber: formData.contactNumber.trim(),
        email: formData.email.trim(),
        notes: formData.notes.trim(),
        type: activeType,
      };

      if (isEditing && selectedClient) {
        await axios.put(`${API_BASE_URL}/clients/${selectedClient._id}`, payload);
        setIsEditModalOpen(false);
        triggerSuccess(`Successfully updated ${activeType} "${formData.name.trim()}".`);
      } else {
        await axios.post(`${API_BASE_URL}/clients`, payload);
        setIsEditModalOpen(false);
        triggerSuccess(`Successfully registered new ${activeType} "${formData.name.trim()}".`);
      }

      fetchClients();
    } catch (err) {
      const errMsg = err.response?.data?.message || `Failed to save ${activeType} record.`;
      triggerError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmation Modal Openers
  const openArchiveConfirmation = (item) => {
    setConfirmModalConfig({
      title: `Archive ${item.type}`,
      message: `Are you sure you want to archive "${item.name}"? It will be safely hidden from active dropdown selections.`,
      actionType: 'archive',
      selectedItem: item,
    });
    setIsConfirmModalOpen(true);
  };

  const openUnarchiveConfirmation = (item) => {
    setConfirmModalConfig({
      title: `Restore ${item.type}`,
      message: `Are you sure you want to restore "${item.name}" to active records?`,
      actionType: 'unarchive',
      selectedItem: item,
    });
    setIsConfirmModalOpen(true);
  };

  const openPermanentDeleteConfirmation = (item) => {
    setConfirmModalConfig({
      title: `Permanently Delete ${item.type}`,
      message: `Are you sure you want to PERMANENTLY delete "${item.name}"? This action cannot be undone and will permanently remove this record from the database.`,
      actionType: 'permanentDelete',
      selectedItem: item,
    });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmAction = async () => {
    const { actionType, selectedItem } = confirmModalConfig;
    if (!selectedItem) return;
    setIsConfirmModalOpen(false);

    try {
      if (actionType === 'archive') {
        await axios.delete(`${API_BASE_URL}/clients/${selectedItem._id}`);
        triggerSuccess(`Successfully archived ${selectedItem.type} "${selectedItem.name}".`);
      } else if (actionType === 'permanentDelete') {
        await axios.delete(`${API_BASE_URL}/clients/${selectedItem._id}/permanent`);
        triggerSuccess(`Permanently deleted ${selectedItem.type} "${selectedItem.name}".`);
      } else {
        await axios.put(`${API_BASE_URL}/clients/${selectedItem._id}/unarchive`);
        triggerSuccess(`Successfully restored ${selectedItem.type} "${selectedItem.name}".`);
      }
      fetchClients();
    } catch (err) {
      triggerError(err.response?.data?.message || "Failed to process client request.");
    }
  };

  return (
    <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative">
      <PageHeader activeTab="client-records" />

      {/* NOTIFICATION TOASTS */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm font-semibold">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100 text-slate-600'} border rounded-2xl p-6 shadow-sm flex flex-col gap-6 transition-colors duration-200`}>

        {/* FILTER CONTROLS MASTER ROW */}
        <div className="flex flex-col gap-1.5">

          {/* TOP BAR */}
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">

            {/* SUB-TABS: SUPPLIER vs CUSTOMER vs LOGISTICS */}
            <div className={`flex items-center p-1 rounded-xl border flex-wrap sm:flex-nowrap gap-1 ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <button
                type="button"
                onClick={() => { setActiveType('Supplier'); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeType === 'Supplier'
                    ? (isDark ? 'bg-[#ff6600] text-white shadow-sm' : 'bg-[#18174e] text-white shadow-sm')
                    : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
                  }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Suppliers</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${activeType === 'Supplier'
                    ? 'bg-black/20 text-white'
                    : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600')
                  }`}>
                  {showArchivedOnly ? archivedSuppliers : activeSuppliers}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveType('Customer'); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeType === 'Customer'
                    ? (isDark ? 'bg-[#ff6600] text-white shadow-sm' : 'bg-[#18174e] text-white shadow-sm')
                    : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Customers</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${activeType === 'Customer'
                    ? 'bg-black/20 text-white'
                    : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600')
                  }`}>
                  {showArchivedOnly ? archivedCustomers : activeCustomers}
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveType('Logistics'); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeType === 'Logistics'
                    ? (isDark ? 'bg-[#ff6600] text-white shadow-sm' : 'bg-[#18174e] text-white shadow-sm')
                    : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
                  }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Logistics</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${activeType === 'Logistics'
                    ? 'bg-black/20 text-white'
                    : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600')
                  }`}>
                  {showArchivedOnly ? archivedLogistics : activeLogistics}
                </span>
              </button>
            </div>

            {/* ACTION CONTROLS */}
            <div className="flex items-center gap-2.5 ml-auto">

              {!isViewer && (
                <button
                  onClick={handleOpenAdd}
                  title={`Register new ${activeType}`}
                  className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm flex-shrink-0 ${isDark ? 'border-slate-700 bg-[#ff6600] text-white hover:bg-[#ff6600]/90' : 'border-slate-200 bg-[#18174e] text-white hover:bg-[#18174e]/90'
                    }`}
                >
                  <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden md:inline">Add New {activeType}</span>
                  <span className="md:hidden">Add</span>
                </button>
              )}

              {!isViewer && (
                <button
                  onClick={() => setShowArchivedOnly(!showArchivedOnly)}
                  title={showArchivedOnly ? `Show Active ${activeType} records` : `View Archive Vault`}
                  className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${showArchivedOnly
                      ? (isDark ? 'bg-rose-950/40 text-rose-300 border-rose-900/60' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100')
                      : (isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                    }`}
                >
                  {showArchivedOnly ? (
                    <>
                      <EyeOff className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden md:inline">Show Active {activeType}</span>
                      <span className="text-[11px] font-bold">({activeCurrentCount})</span>
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden md:inline">View Archive Vault</span>
                      <span className="text-[11px] font-bold">({archivedCurrentCount})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* SECOND ROW: SEARCH & SORT */}
          <div className="flex overflow-x-auto gap-2 items-center mt-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-4 md:pb-0">

            <div className="min-w-[200px] w-full md:min-w-0 md:col-span-3">
              <div className="relative w-full">
                <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder={
                    activeType === 'Logistics'
                      ? "Search Logistics name..."
                      : `Search ${activeType} name, address, contact person, or phone number...`
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none`}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="min-w-[150px] w-full md:min-w-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border font-semibold rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full`}
              >
                <option value="name-asc">Sort: Name (A - Z)</option>
                <option value="name-desc">Sort: Name (Z - A)</option>
                <option value="newest">Sort: Newly Registered</option>
                <option value="oldest">Sort: Oldest Registered</option>
              </select>
            </div>

          </div>

          <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-full mt-3`}></div>
        </div>

        {/* MAIN CLEAN TABLE MASTERLIST */}
        <div className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'} rounded-xl border shadow-sm overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className={`text-white font-bold uppercase text-sm ${isDark ? 'bg-[#0f111d] border-b border-slate-800' : 'bg-[#18174e]'}`}>
                  {activeType === 'Logistics' ? (
                    <>
                      <th
                        className={`py-3 px-4 whitespace-nowrap static md:sticky md:left-0 z-20 ${isDark ? 'bg-[#0f111d]' : 'bg-[#18174e]'}`}
                        style={{ boxShadow: isDark ? 'inset -2px 0 0 0 #475569, 6px 0 10px -2px rgba(0, 0, 0, 0.4)' : 'inset -2px 0 0 0 #cbd5e1, 6px 0 10px -2px rgba(0, 0, 0, 0.15)' }}
                      >
                        <span className={`hidden md:block absolute right-0 top-0 bottom-0 w-[2px] ${isDark ? 'bg-slate-600' : 'bg-slate-300'} pointer-events-none`} />
                        Logistics Name
                      </th>
                      <th className="py-3 px-4 whitespace-nowrap">Date Added</th>
                      {!isViewer && (
                        <th className="py-3 px-4 text-center whitespace-nowrap w-28">
                          Action
                        </th>
                      )}
                    </>
                  ) : (
                    <>
                      <th
                        className={`py-3 px-4 whitespace-nowrap static md:sticky md:left-0 z-20 ${isDark ? 'bg-[#0f111d]' : 'bg-[#18174e]'}`}
                        style={{ boxShadow: isDark ? 'inset -2px 0 0 0 #475569, 6px 0 10px -2px rgba(0, 0, 0, 0.4)' : 'inset -2px 0 0 0 #cbd5e1, 6px 0 10px -2px rgba(0, 0, 0, 0.15)' }}
                      >
                        <span className={`hidden md:block absolute right-0 top-0 bottom-0 w-[2px] ${isDark ? 'bg-slate-600' : 'bg-slate-300'} pointer-events-none`} />
                        {activeType} Name
                      </th>
                      <th className="py-3 px-4 whitespace-nowrap">
                        {activeType === 'Supplier' ? 'Origin Location Address' : 'Destination Address'}
                      </th>
                      <th className="py-3 px-4 whitespace-nowrap">Contact Person</th>
                      <th className="py-3 px-4 whitespace-nowrap">Contact Number / Email</th>
                      <th className="py-3 px-4 whitespace-nowrap">Remarks / Notes</th>
                      <th className="py-3 px-4 whitespace-nowrap">Date Added</th>
                      {!isViewer && (
                        <th className="py-3 px-4 text-center whitespace-nowrap">
                          Action
                        </th>
                      )}
                    </>
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80 bg-[#090b10]' : 'divide-slate-100 bg-white'}`}>
                {loading ? (
                  <tr>
                    <td
                      colSpan={activeType === 'Logistics' ? (isViewer ? 2 : 3) : (isViewer ? 6 : 7)}
                      className="text-center py-10 text-green-700 font-medium italic"
                    >
                      Fetching secure {activeType.toLowerCase()} records from database...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={activeType === 'Logistics' ? (isViewer ? 2 : 3) : (isViewer ? 6 : 7)}
                      className="text-center py-8 text-rose-600 font-semibold"
                    >
                      {error}
                    </td>
                  </tr>
                ) : filteredClients.map((client) => {
                  if (activeType === 'Logistics') {
                    return (
                      <tr key={client._id} className={`group ${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'} transition-colors font-medium whitespace-nowrap text-sm`}>
                        {/* STICKY LOGISTICS NAME ONLY */}
                        <td
                          className={`py-3.5 px-4 font-semibold static md:sticky md:left-0 z-10 min-w-[200px] transition-colors ${isDark ? 'bg-[#090b10] group-hover:bg-[#141622] text-slate-100' : 'bg-white group-hover:bg-[#f8fafc] text-slate-800'
                            }`}
                          style={{ boxShadow: isDark ? 'inset -2px 0 0 0 #475569, 6px 0 10px -2px rgba(0, 0, 0, 0.4)' : 'inset -2px 0 0 0 #cbd5e1, 6px 0 10px -2px rgba(0, 0, 0, 0.08)' }}
                          title={client.name}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full ${client.isArchived ? 'bg-amber-500' : 'bg-emerald-500'} shrink-0`} />
                            <Truck className={`w-4 h-4 ${isDark ? 'text-[#ff6600]' : 'text-[#18174e]'} shrink-0`} />
                            <span className="font-bold text-sm">{client.name}</span>
                          </div>
                        </td>

                        {/* DATE ADDED */}
                        <td className={`py-3.5 px-4 text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {new Date(client.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>

                        {/* ACTIONS */}
                        {!isViewer && (
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {!showArchivedOnly ? (
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(client)}
                                    title="Edit Details"
                                    className={`p-1 ${isDark ? 'bg-[#181a26] border-slate-700 text-indigo-400 hover:bg-indigo-600 hover:text-white' : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'} border rounded transition-all cursor-pointer`}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => openArchiveConfirmation(client)}
                                    title="Archive"
                                    className={`p-1 ${isDark ? 'bg-[#181a26] border-slate-700 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'} border rounded transition-all cursor-pointer`}
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => openUnarchiveConfirmation(client)}
                                    title="Restore"
                                    className={`p-1 ${isDark ? 'bg-[#181a26] border-emerald-800/80 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'} border rounded transition-all cursor-pointer flex items-center gap-1 text-xs font-bold px-2 py-0.5`}
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                                  </button>
                                  {userRole === 'Admin' && (
                                    <button
                                      onClick={() => openPermanentDeleteConfirmation(client)}
                                      title="Delete Permanently"
                                      className={`p-1 ${isDark ? 'bg-[#181a26] border-rose-800/80 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'} border rounded transition-all cursor-pointer flex items-center gap-1 text-xs font-bold px-2 py-0.5`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  }

                  return (
                    <tr key={client._id} className={`group ${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'} transition-colors font-medium whitespace-nowrap text-sm`}>

                      {/* STICKY CLIENT NAME */}
                      <td
                        className={`py-3 px-4 font-semibold static md:sticky md:left-0 z-10 min-w-[170px] sm:min-w-[210px] md:max-w-[300px] whitespace-normal md:whitespace-nowrap transition-colors ${isDark ? 'bg-[#090b10] group-hover:bg-[#141622] text-slate-100' : 'bg-white group-hover:bg-[#f8fafc] text-slate-800'
                          }`}
                        style={{ boxShadow: isDark ? 'inset -2px 0 0 0 #475569, 6px 0 10px -2px rgba(0, 0, 0, 0.4)' : 'inset -2px 0 0 0 #cbd5e1, 6px 0 10px -2px rgba(0, 0, 0, 0.08)' }}
                        title={client.name}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${client.isArchived ? 'bg-amber-500' : 'bg-emerald-500'} shrink-0`} />
                          <span className="font-bold">{client.name}</span>
                        </div>
                      </td>

                      {/* ADDRESS */}
                      <td className="py-3 px-4 whitespace-normal max-w-xs text-xs">
                        {client.address ? (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span className="font-medium">{client.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No address specified</span>
                        )}
                      </td>

                      {/* CONTACT PERSON */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {client.contactPerson ? (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{client.contactPerson}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* CONTACT NUMBER & EMAIL */}
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        <div className="flex flex-col gap-0.5">
                          {client.contactNumber && (
                            <div className="flex items-center gap-1 text-slate-300 font-mono">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{client.contactNumber}</span>
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-1 text-slate-400">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span>{client.email}</span>
                            </div>
                          )}
                          {!client.contactNumber && !client.email && (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </div>
                      </td>

                      {/* NOTES */}
                      <td className="py-3 px-4 whitespace-normal max-w-xs text-xs">
                        {client.notes ? (
                          <span className="text-slate-400">{client.notes}</span>
                        ) : (
                          <span className="text-slate-500 italic">—</span>
                        )}
                      </td>

                      {/* DATE ADDED */}
                      <td className={`py-3 px-4 text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {new Date(client.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>

                      {/* ACTIONS */}
                      {!isViewer && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {!showArchivedOnly ? (
                              <>
                                <button
                                  onClick={() => handleOpenEdit(client)}
                                  title="Edit Details"
                                  className={`p-1 ${isDark ? 'bg-[#181a26] border-slate-700 text-indigo-400 hover:bg-indigo-600 hover:text-white' : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'} border rounded transition-all cursor-pointer`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => openArchiveConfirmation(client)}
                                  title="Archive"
                                  className={`p-1 ${isDark ? 'bg-[#181a26] border-slate-700 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'} border rounded transition-all cursor-pointer`}
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => openUnarchiveConfirmation(client)}
                                  title="Restore"
                                  className={`p-1 ${isDark ? 'bg-[#181a26] border-emerald-800/80 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'} border rounded transition-all cursor-pointer flex items-center gap-1 text-xs font-bold px-2 py-0.5`}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Restore
                                </button>
                                {userRole === 'Admin' && (
                                  <button
                                    onClick={() => openPermanentDeleteConfirmation(client)}
                                    title="Delete Permanently"
                                    className={`p-1 ${isDark ? 'bg-[#181a26] border-rose-800/80 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'} border rounded transition-all cursor-pointer flex items-center gap-1 text-xs font-bold px-2 py-0.5`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      )}

                    </tr>
                  );
                })}

                {filteredClients.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={activeType === 'Logistics' ? (isViewer ? 2 : 3) : (isViewer ? 6 : 7)}
                      className="text-center py-10 text-red-600 font-medium italic"
                    >
                      No {activeType.toLowerCase()} records match the selected filters or search queries.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* CREATE / EDIT CLIENT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto flex flex-col`}>

            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                  {isEditing ? `Edit ${activeType} Profile` : `Register New ${activeType}`}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className={`${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-50 border-amber-200/60'} rounded-xl border mt-3`}>
              <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                * {activeType} Registry Protocol *
              </span>
              <p className={`text-[11px] ${isDark ? 'text-amber-300/80' : 'text-amber-700'} leading-relaxed`}>
                {activeType === 'Logistics'
                  ? "Register transport carriers and couriers (e.g. Lalamove, J&T, Transportify, In-house Delivery). Once saved, it will be immediately available in the Outbound Logistics dropdown."
                  : `Ensure client details and location address are accurate. This address will auto-populate automatically when processing ${activeType === 'Supplier' ? 'Inbound (Raw Materials)' : 'Outbound (Finished Products)'} transactions.`}
              </p>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 mt-4 flex-1 overflow-y-auto pr-1">

              {/* NAME */}
              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                  {activeType} Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    activeType === 'Supplier'
                      ? "e.g. SteelCorp Industrial Supplies"
                      : activeType === 'Customer'
                        ? "e.g. Metro Builders & Contractors"
                        : "e.g. Lalamove, Transportify, J&T Express, In-house Truck"
                  }
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
                />
              </div>

              {/* SHOW ADDRESS & CONTACT DETAILS ONLY FOR SUPPLIER AND CUSTOMER */}
              {activeType !== 'Logistics' && (
                <>
                  {/* ADDRESS */}
                  <div>
                    <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                      {activeType === 'Supplier' ? 'Origin Location Address' : 'Destination Address'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={activeType === 'Supplier' ? "e.g. Warehouse 4, Industrial Park, Biñan, Laguna" : "e.g. Project Site 2, BGC, Taguig City"}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
                    />
                  </div>

                  {/* CONTACT PERSON & PHONE */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                        Contact Person
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Juan Dela Cruz"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                        className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                        Contact Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 0917-123-4567"
                        value={formData.contactNumber}
                        onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                        className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
                      />
                    </div>
                  </div>

                  {/* EMAIL */}
                  <div>
                    <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. sales@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
                    />
                  </div>
                </>
              )}

              {/* NOTES */}
              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                  {activeType === 'Logistics' ? 'Notes / Vehicle Info' : 'Notes / Remarks'}
                </label>
                <textarea
                  rows={2}
                  placeholder={
                    activeType === 'Logistics'
                      ? "e.g. Plate numbers, vehicle types, or driver contact info..."
                      : "Additional logistics or delivery reminders..."
                  }
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none`}
                />
              </div>

              {/* FOOTER ACTIONS */}
              <div className={`flex items-center justify-end gap-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md disabled:opacity-50`}
                >
                  {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : `Register ${activeType}`}
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

    </div>
  );
}

export default Client;
