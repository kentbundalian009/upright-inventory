import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Building2, Users, Search, Plus, Edit2, Archive, EyeOff, RotateCcw,
  Trash2, Phone, Mail, MapPin, User, FileText, CheckCircle2,
  AlertCircle, X, Filter, Sliders, Truck
} from 'lucide-react';
import PageHeader from './layout/PageHeader';
import TablePagination from './common/TablePagination';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = '/api';

function Client() {
  const { isDark } = useTheme();
  const userRole = localStorage.getItem('SystemRole') || 'Inventory';

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

  const activeEmployees = useMemo(() => clients.filter(c => c.type === 'Employee' && !c.isArchived).length, [clients]);
  const archivedEmployees = useMemo(() => clients.filter(c => c.type === 'Employee' && c.isArchived).length, [clients]);

  const activeCurrentCount =
    activeType === 'Supplier' ? activeSuppliers :
      activeType === 'Customer' ? activeCustomers :
        activeType === 'Logistics' ? activeLogistics :
          activeEmployees;

  const archivedCurrentCount =
    activeType === 'Supplier' ? archivedSuppliers :
      activeType === 'Customer' ? archivedCustomers :
        activeType === 'Logistics' ? archivedLogistics :
          archivedEmployees;

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

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeType, showArchivedOnly, searchTerm, sortBy]);

  const totalRows = filteredClients.length;
  const indexOfFirstRow = (currentPage - 1) * rowsPerPage;
  const indexOfLastRow = indexOfFirstRow + rowsPerPage;
  const paginatedClients = useMemo(() => {
    return filteredClients.slice(indexOfFirstRow, indexOfLastRow);
  }, [filteredClients, indexOfFirstRow, indexOfLastRow]);

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

        {/* SUB-TABS: SUPPLIER vs CUSTOMER vs LOGISTICS */}
        <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
          <div className={`flex items-center p-1 rounded-xl border flex-wrap sm:flex-nowrap gap-1 ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <button
              type="button"
              onClick={() => { setActiveType('Supplier'); setSearchTerm(''); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeType === 'Supplier'
                ? (isDark ? 'bg-[#ff6600] text-white shadow-sm' : 'bg-[#18174e] text-white shadow-sm')
                : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900')
                }`}
            >
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
              <span>Logistics</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${activeType === 'Logistics'
                ? 'bg-black/20 text-white'
                : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600')
                }`}>
                {showArchivedOnly ? archivedLogistics : activeLogistics}
              </span>
            </button>
          </div>
        </div>

        {/* EXCEL-STYLE RIBBON TOOLBAR (WHITE BG, 3-COLUMN STACKED, BG-INDIGO-900/20 BUTTONS) */}
        <div className={`w-full border-b px-4 py-3 transition-colors ${
            isDark 
                ? 'bg-[#141622] border-slate-800 text-slate-200' 
                : 'bg-white border-slate-200 text-slate-800'
        }`}>
            <div className="flex items-stretch gap-4 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                
                {/* COLUMN 1: SEARCH ON TOP, FILTERS BELOW */}
                <div className="flex flex-col justify-between pr-4 border-r border-slate-200 dark:border-slate-800 flex-1 min-w-[300px]">
                    <div className="flex flex-col gap-2">
                        {/* Row 1: Search Input */}
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-400" />
                            <input 
                                type="text" 
                                placeholder={
                                    activeType === 'Logistics'
                                        ? "Find Logistics name..."
                                        : `Find ${activeType} name, address, contact person, or phone number...`
                                }
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className={`w-full h-9 pl-9 pr-8 text-xs font-medium rounded-md border transition-colors focus:outline-none focus:ring-0 focus:border-[#ff6600] ${
                                    isDark 
                                        ? 'bg-[#0f1115] border-slate-700 text-slate-100 placeholder-slate-500' 
                                        : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                                }`} 
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    title="Clear Find"
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer focus:outline-none"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Row 2: Sort Filter */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                title="Sort Directory Records"
                                className={`h-8 px-2.5 text-xs rounded-md border cursor-pointer focus:outline-none focus:ring-0 flex-1 min-w-[170px] truncate ${
                                    sortBy !== 'name-asc'
                                        ? 'bg-indigo-900/20 border-indigo-900/40 text-indigo-950 dark:text-indigo-200 font-semibold'
                                        : (isDark ? 'bg-[#0f1115] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700')
                                }`}
                            >
                                <option value="name-asc">Sort: Name (A - Z)</option>
                                <option value="name-desc">Sort: Name (Z - A)</option>
                                <option value="newest">Sort: Newly Registered</option>
                                <option value="oldest">Sort: Oldest Registered</option>
                            </select>

                            {/* Clear Filter Button */}
                            {(searchTerm !== '' || sortBy !== 'name-asc') && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSortBy('name-asc');
                                    }}
                                    title="Clear All Filters"
                                    className="flex items-center gap-1 h-8 px-2.5 rounded-md bg-indigo-900/20 hover:bg-indigo-900/30 border border-indigo-900/30 text-indigo-950 dark:text-indigo-200 text-xs font-semibold transition-colors cursor-pointer flex-shrink-0 focus:outline-none focus:ring-0"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Reset</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <span className="text-[10px] font-semibold uppercase tracking-wider text-center text-slate-400 mt-2 select-none">
                        {showArchivedOnly ? 'Find & Archive Filters' : 'Find & Filter'}
                    </span>
                </div>

                {/* COLUMN 2: STACKED VIEW BUTTONS */}
                <div className="flex flex-col justify-between pr-4 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 min-w-[155px]">
                    <div className="flex flex-col gap-1.5">
                        {/* 1. Archive Vault Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowArchivedOnly(!showArchivedOnly)}
                            title={showArchivedOnly ? `Back to Active ${activeType}s` : `Open Archive Vault`}
                            className={`flex items-center justify-between gap-2 h-7 px-2.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer w-full focus:outline-none focus:ring-0 ${
                                showArchivedOnly
                                    ? 'bg-red-600 hover:bg-red-700 border-red-600 text-white'
                                    : 'bg-indigo-900/20 hover:bg-indigo-900/30 border-indigo-900/30 text-indigo-950 dark:text-indigo-200'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <Archive className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{showArchivedOnly ? 'Active' : 'Archive'}</span>
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                showArchivedOnly
                                    ? 'bg-white/20 text-white'
                                    : 'bg-indigo-900/20 text-indigo-950 dark:text-indigo-200'
                            }`}>
                                {showArchivedOnly ? activeCurrentCount : archivedCurrentCount}
                            </span>
                        </button>

                        {/* 2. Directory Mode Indicator */}
                        <div
                            title={`Current Directory Category: ${activeType}`}
                            className="flex items-center justify-between gap-2 h-7 px-2.5 rounded-md text-xs font-semibold border bg-indigo-900/20 border-indigo-900/30 text-indigo-950 dark:text-indigo-200 select-none w-full"
                        >
                            <span className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>Category</span>
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-900/20 text-indigo-950 dark:text-indigo-200">
                                {activeType}
                            </span>
                        </div>
                    </div>

                    <span className="text-[10px] font-semibold uppercase tracking-wider text-center text-slate-400 mt-2 select-none">
                        View & Tools
                    </span>
                </div>

                {/* COLUMN 3: ADD ITEM BUTTON & SUMMARY */}
                <div className="flex flex-col justify-between flex-shrink-0 min-w-[175px]">
                    <div className="flex flex-col gap-2">
                        {/* Add Item Button */}
                        <button
                            type="button"
                            onClick={handleOpenAdd}
                            disabled={showArchivedOnly}
                            title={`Register new ${activeType}`}
                            className="flex items-center justify-center gap-2 h-9 px-3.5 rounded-md bg-indigo-900/20 hover:bg-indigo-900/30 border border-indigo-900/30 text-indigo-950 dark:text-indigo-200 text-xs font-bold transition-colors cursor-pointer w-full focus:outline-none focus:ring-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-4 h-4 stroke-[2.5]" />
                            <span>Add New {activeType}</span>
                        </button>

                        {/* Total Count Formula Box */}
                        <div className={`flex items-center justify-between gap-2 h-8 px-2.5 rounded-md border font-mono text-xs ${
                            isDark 
                                ? 'bg-[#0f1115] border-slate-700 text-slate-200' 
                                : 'bg-white border-slate-300 text-slate-800'
                        }`}>
                            <div className="flex items-center gap-1.5">
                                <span className="font-serif italic font-bold text-slate-400 select-none">fx</span>
                                <span className="text-slate-300 dark:text-slate-700">|</span>
                                <span className="font-sans text-[11px] text-slate-500">Total:</span>
                            </div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {filteredClients.length} {activeType}s
                            </span>
                        </div>
                    </div>

                    <span className="text-[10px] font-semibold uppercase tracking-wider text-center text-slate-400 mt-2 select-none">
                        Insert & Summary
                    </span>
                </div>

            </div>
        </div>

        {/* MAIN CLEAN TABLE MASTERLIST */}
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
                      <th className="py-3 px-4 text-center whitespace-nowrap w-28">
                        Action
                      </th>
                    </>
                  ) : (
                    <>
                      <th
                        className={`py-3 px-4 whitespace-nowrap static md:sticky md:left-0 z-20 ${isDark ? 'bg-[#0f111d]' : 'bg-[#18174e]'}`}
                        style={{ boxShadow: isDark ? 'inset -2px 0 0 0 #475569, 6px 0 10px -2px rgba(0, 0, 0, 0.4)' : 'inset -2px 0 0 0 #cbd5e1, 6px 0 10px -2px rgba(0, 0, 0, 0.15)' }}
                      >
                        <span className={`hidden md:block absolute right-0 top-0 bottom-0 w-[2px] ${isDark ? 'bg-slate-600' : 'bg-slate-300'} pointer-events-none`} />
                        {activeType === 'Employee' ? 'Full Name' : `${activeType} Name`}
                      </th>
                      <th className="py-3 px-4 whitespace-nowrap">
                        {activeType === 'Employee' ? 'Department / Area' : activeType === 'Supplier' ? 'Origin Location Address' : 'Destination Address'}
                      </th>
                      <th className="py-3 px-4 whitespace-nowrap">Date Added</th>
                      <th className="py-3 px-4 text-center whitespace-nowrap">
                        Action
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80 bg-[#090b10]' : 'divide-slate-100 bg-white'}`}>
                {loading ? (
                  <tr>
                    <td
                      colSpan={activeType === 'Logistics' ? 3 : 4}
                      className="text-center py-10 text-green-700 font-medium italic"
                    >
                      Fetching secure {activeType.toLowerCase()} records from database...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={activeType === 'Logistics' ? 3 : 4}
                      className="text-center py-8 text-rose-600 font-semibold"
                    >
                      {error}
                    </td>
                  </tr>
                ) : paginatedClients.map((client) => {
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
                                  className={`p-1.5 ${isDark ? 'bg-[#181a26] border-emerald-800/80 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'} border rounded transition-all cursor-pointer`}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => openPermanentDeleteConfirmation(client)}
                                  title="Delete Permanently"
                                  className={`p-1.5 ${isDark ? 'bg-[#181a26] border-rose-800/80 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'} border rounded transition-all cursor-pointer`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
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
                          <span className="font-bold">{client.name}</span>
                        </div>
                      </td>

                      {/* ADDRESS */}
                      <td className="py-3 px-4 whitespace-normal max-w-xs text-xs">
                        {client.address ? (
                          <span className="font-medium">{client.address}</span>
                        ) : (
                          <span className="text-slate-400 italic">No address specified</span>
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
                                className={`p-1.5 ${isDark ? 'bg-[#181a26] border-emerald-800/80 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'} border rounded transition-all cursor-pointer`}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openPermanentDeleteConfirmation(client)}
                                title="Delete Permanently"
                                className={`p-1.5 ${isDark ? 'bg-[#181a26] border-rose-800/80 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'} border rounded transition-all cursor-pointer`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}

                {filteredClients.length === 0 && !loading && (
                  <tr>
                    <td
                      colSpan={activeType === 'Logistics' ? 3 : 4}
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

            <form onSubmit={handleSubmitForm} className="space-y-4 mt-4 flex-1 overflow-y-auto pr-1">

              {/* NAME */}
              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                  {activeType === 'Employee' ? 'Worker / Personnel Full Name' : `${activeType} Name`} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    activeType === 'Supplier'
                      ? "e.g. SteelCorp Industrial Supplies"
                      : activeType === 'Customer'
                        ? "e.g. Metro Builders & Contractors"
                        : activeType === 'Employee'
                          ? "e.g. Juan Dela Cruz, Maria Santos"
                          : "e.g. Lalamove, Transportify, J&T Express, In-house Truck"
                  }
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
                />
              </div>

              {/* ADDRESS (Only for Supplier and Customer) */}
              {activeType !== 'Logistics' && (
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                    {activeType === 'Employee' ? 'Department / Assigned Area' : activeType === 'Supplier' ? 'Origin Location Address' : 'Destination Address'} {activeType !== 'Employee' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={activeType !== 'Employee'}
                    placeholder={
                      activeType === 'Supplier'
                        ? "e.g. Warehouse 4, Industrial Park, Biñan, Laguna"
                        : activeType === 'Customer'
                          ? "e.g. Project Site 2, BGC, Taguig City"
                          : "e.g. Fabrication, Warehouse, Assembly, Production"
                    }
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
                  />
                </div>
              )}

              {/* CONTACT PERSON, PHONE & EMAIL (Only for Employee if needed) */}
              {activeType === 'Employee' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                        Position / Role / Designation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Welder, Fabricator, Machine Operator"
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
