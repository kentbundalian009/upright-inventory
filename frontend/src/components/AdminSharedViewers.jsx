import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Search, Edit2, Trash2, Copy, CheckCircle2, 
  ExternalLink, AlertCircle, X, 
  Filter, Ban, RotateCcw
} from 'lucide-react';
import PageHeader from './PageHeader';
import { useTheme } from '../context/ThemeContext';

function AdminSharedViewers() {
  const { isDark } = useTheme();

  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All Status');

  // Toast states
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Edit Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [editViewerName, setEditViewerName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Terminate Modal states
  const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
  const [terminatingLink, setTerminatingLink] = useState(null);
  const [isTerminating, setIsTerminating] = useState(false);

  // Reactivate / Unterminate Modal states
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [reactivatingLink, setReactivatingLink] = useState(null);
  const [isReactivating, setIsReactivating] = useState(false);

  // Delete Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingLink, setDeletingLink] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copied link indicator
  const [copiedId, setCopiedId] = useState(null);

  const API_BASE_URL = import.meta.env.MODE === 'production'
    ? 'https://one-inventory.onrender.com'
    : 'http://localhost:5000';

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

  const fetchSharedLinks = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/shared-links`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: searchQuery }
      });
      setLinks(res.data || []);
    } catch (err) {
      console.error('Error loading shared links:', err);
      triggerError('Failed to load shared links from server.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, API_BASE_URL]);

  useEffect(() => {
    fetchSharedLinks();
    const interval = setInterval(fetchSharedLinks, 20000);
    return () => clearInterval(interval);
  }, [fetchSharedLinks]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchSharedLinks();
  };

  const handleCopyLink = (item) => {
    const fullUrl = item.linkUrl?.startsWith('http')
      ? item.linkUrl
      : `${window.location.origin}${item.linkUrl}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullUrl).then(() => {
        setCopiedId(item.id);
        triggerSuccess(`Copied link for ${item.viewerName}!`);
        setTimeout(() => setCopiedId(null), 2500);
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = fullUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(item.id);
      triggerSuccess(`Copied link for ${item.viewerName}!`);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  // 1. EDIT ACTION
  const openEditModal = (item) => {
    setEditingLink(item);
    setEditViewerName(item.viewerName || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editViewerName.trim()) {
      triggerError('Viewer Fullname cannot be empty.');
      return;
    }

    try {
      setIsUpdating(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/api/shared-links/${editingLink.id}`,
        { viewerName: editViewerName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      triggerSuccess(`Successfully updated viewer: ${editViewerName.trim()}`);
      setIsEditModalOpen(false);
      setEditingLink(null);
      fetchSharedLinks();
    } catch (err) {
      console.error('Error updating viewer link:', err);
      triggerError(err.response?.data?.message || 'Failed to update viewer link.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 2. TERMINATE ACTION (Sets link to 404 Maintenance Mode)
  const openTerminateModal = (item) => {
    setTerminatingLink(item);
    setIsTerminateModalOpen(true);
  };

  const handleTerminateConfirm = async () => {
    if (!terminatingLink) return;
    try {
      setIsTerminating(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/api/shared-links/${terminatingLink.id}/terminate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      triggerSuccess(`Viewer link for ${terminatingLink.viewerName} has been terminated. It now displays the 404 maintenance screen.`);
      setIsTerminateModalOpen(false);
      setTerminatingLink(null);
      fetchSharedLinks();
    } catch (err) {
      console.error('Error terminating viewer link:', err);
      triggerError(err.response?.data?.message || 'Failed to terminate viewer link.');
    } finally {
      setIsTerminating(false);
    }
  };

  // 3. REACTIVATE / UNTERMINATE ACTION (Restores link back to Active)
  const openReactivateModal = (item) => {
    setReactivatingLink(item);
    setIsReactivateModalOpen(true);
  };

  const handleReactivateConfirm = async () => {
    if (!reactivatingLink) return;
    try {
      setIsReactivating(true);
      const token = localStorage.getItem('token');
      await axios.put(
        `${API_BASE_URL}/api/shared-links/${reactivatingLink.id}/unterminate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      triggerSuccess(`Viewer link for ${reactivatingLink.viewerName} has been reactivated. Live access is restored.`);
      setIsReactivateModalOpen(false);
      setReactivatingLink(null);
      fetchSharedLinks();
    } catch (err) {
      console.error('Error reactivating viewer link:', err);
      triggerError(err.response?.data?.message || 'Failed to reactivate viewer link.');
    } finally {
      setIsReactivating(false);
    }
  };

  // 4. DELETE ACTION (Permanently removes from database, resulting in 404)
  const openDeleteModal = (item) => {
    setDeletingLink(item);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLink) return;
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/api/shared-links/${deletingLink.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      triggerSuccess(`Permanently deleted viewer link for ${deletingLink.viewerName} from database.`);
      setIsDeleteModalOpen(false);
      setDeletingLink(null);
      fetchSharedLinks();
    } catch (err) {
      console.error('Error deleting viewer link:', err);
      triggerError('Failed to delete viewer link.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered links list
  const filteredLinks = links.filter((item) => {
    const matchesStatus = selectedStatus === 'All Status' || item.status === selectedStatus;
    const matchesSearch = !searchQuery.trim() || [
      item.viewerName,
      item.sharedBy,
      item.page,
      item.linkUrl,
      item.status
    ].some(val => val && val.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const totalLinks = links.length;
  const activeCount = links.filter(l => l.status === 'Active').length;
  const terminatedCount = links.filter(l => l.status === 'Terminated' || l.status === 'Revoked').length;

  return (
    <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative">
      <PageHeader activeTab="shared-viewers" />

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

      {/* MASTER CARD */}
      <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100 text-slate-600'} border rounded-2xl p-6 shadow-sm flex flex-col gap-6 transition-colors duration-200`}>

        {/* FILTER CONTROLS MASTER ROW */}
        <div className="flex flex-col gap-1.5">

          {/* TOP BAR */}
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'} flex-shrink-0`}>
              <Filter className={`w-4 h-4 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
              <span>Viewer Links ({filteredLinks.length}{links.length !== filteredLinks.length ? ` of ${totalLinks}` : ''})</span>
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              {/* STATUS QUICK BADGES */}
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                isDark ? 'bg-[#141622] border-slate-700 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}>
                <span>Active:</span>
                <span className="font-black">{activeCount}</span>
              </span>

              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                isDark ? 'bg-[#141622] border-slate-700 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}>
                <span>Terminated:</span>
                <span className="font-black">{terminatedCount}</span>
              </span>
            </div>
          </div>

          {/* SEARCH & FILTER CONTROLS GRID */}
          <div className="flex overflow-x-auto gap-2 items-center mt-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-2 md:pb-0">
            {/* SEARCH INPUT */}
            <div className="min-w-[220px] w-full md:min-w-0">
              <div className="relative w-full">
                <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Search Viewer Fullname, Shared By..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(e); }}
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none`}
                />
              </div>
            </div>

            {/* STATUS DROPDOWN */}
            <div className="min-w-[170px] w-full md:min-w-0">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border font-semibold rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full`}
              >
                <option value="All Status">All Status</option>
                <option value="Active">🟢 Active (Access Allowed)</option>
                <option value="Terminated">🔴 Terminated (404 Maintenance)</option>
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
                  <th className="py-3 px-4 whitespace-nowrap">Viewer Fullname</th>
                  <th className="py-3 px-4 whitespace-nowrap">Generated By</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 whitespace-nowrap">Shareable Link</th>
                  <th className="py-3 px-4 whitespace-nowrap text-center">Views</th>
                  <th className="py-3 px-4 whitespace-nowrap text-center">Date Created</th>
                  <th className="py-3 px-4 whitespace-nowrap text-center">Last Accessed</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80 bg-[#090b10]' : 'divide-slate-100 bg-white'}`}>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-10 text-green-700 font-medium italic">
                      Fetching secure viewer links from database...
                    </td>
                  </tr>
                ) : filteredLinks.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-10 text-rose-600 font-semibold italic">
                      No shared viewer links found.
                    </td>
                  </tr>
                ) : (
                  filteredLinks.map((item) => {
                    const fullUrl = item.linkUrl?.startsWith('http')
                      ? item.linkUrl
                      : `${window.location.origin}${item.linkUrl}`;

                    const isTerminated = item.status === 'Terminated' || item.status === 'Revoked';

                    return (
                      <tr 
                        key={item.id} 
                        className={`group ${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'} transition-colors font-medium whitespace-nowrap text-sm`}
                      >
                        {/* 1. VIEWER FULLNAME */}
                        <td className="py-3 px-4 font-semibold whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm ${
                              isDark ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                              {item.viewerName?.charAt(0)?.toUpperCase() || 'V'}
                            </span>
                            <span className={isDark ? 'text-slate-100' : 'text-slate-800'}>
                              {item.viewerName}
                            </span>
                          </div>
                        </td>

                        {/* 2. GENERATED BY */}
                        <td className="py-3 px-4 font-mono text-xs">
                          <span className="font-semibold text-slate-500">{item.sharedBy}</span>
                        </td>

                        {/* 3. STATUS */}
                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
                            item.status === 'Active'
                              ? (isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                              : (isDark ? 'bg-rose-950/60 text-rose-300 border-rose-800' : 'bg-rose-50 text-rose-700 border-rose-200')
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span>{item.status}</span>
                          </span>
                        </td>

                        {/* 4. SHAREABLE LINK */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopyLink(item)}
                              title="Copy Viewer Link"
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                copiedId === item.id
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                                  : (isDark ? 'bg-[#181a26] border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')
                              }`}
                            >
                              {copiedId === item.id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open link in new tab"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono truncate max-w-[200px] inline-flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              <span className="truncate">{item.linkUrl}</span>
                            </a>
                          </div>
                        </td>

                        {/* 5. VIEWS */}
                        <td className={`py-3 px-4 text-center font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {item.viewCount || 0}
                        </td>

                        {/* 6. DATE CREATED */}
                        <td className="py-3 px-4 text-center font-mono text-xs text-slate-500">
                          {item.createdAtFormatted}
                        </td>

                        {/* 7. LAST ACCESSED */}
                        <td className="py-3 px-4 text-center font-mono text-xs text-slate-500">
                          {item.lastOpenedFormatted}
                        </td>

                        {/* 8. ACTIONS: EDIT, TERMINATE/UNTERMINATE, DELETE */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {/* EDIT BUTTON */}
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              title="Edit Viewer Fullname"
                              className={`p-1 border rounded transition-all cursor-pointer ${
                                isDark 
                                  ? 'bg-[#181a26] border-slate-700 text-indigo-400 hover:bg-indigo-600 hover:text-white' 
                                  : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                              }`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* TERMINATE / UNTERMINATE BUTTON */}
                            {isTerminated ? (
                              <button
                                type="button"
                                onClick={() => openReactivateModal(item)}
                                title="Reactivate Link (Remove 404 Maintenance Screen)"
                                className={`p-1 border rounded transition-all cursor-pointer ${
                                  isDark 
                                    ? 'bg-[#181a26] border-slate-700 text-emerald-400 hover:bg-emerald-600 hover:text-white' 
                                    : 'bg-white border-slate-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                                }`}
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openTerminateModal(item)}
                                title="Terminate Link (Set 404 Maintenance Screen)"
                                className={`p-1 border rounded transition-all cursor-pointer ${
                                  isDark
                                    ? 'bg-[#181a26] border-slate-700 text-amber-400 hover:bg-amber-600 hover:text-white'
                                    : 'bg-white border-slate-200 text-amber-600 hover:bg-amber-600 hover:text-white'
                                }`}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* DELETE BUTTON */}
                            <button
                              type="button"
                              onClick={() => openDeleteModal(item)}
                              title="Permanently Delete Link from Database"
                              className={`p-1 border rounded transition-all cursor-pointer ${
                                isDark 
                                  ? 'bg-[#181a26] border-slate-700 text-rose-400 hover:bg-rose-600 hover:text-white' 
                                  : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 1. EDIT VIEWER MODAL (Matching InventoryRawMaterials.jsx modal style) */}
      {isEditModalOpen && editingLink && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-md p-6 shadow-xl relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150`}>
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                Update Viewer Information
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className={`${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
                  Viewer Fullname *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter full name of viewer"
                  value={editViewerName}
                  onChange={(e) => setEditViewerName(e.target.value)}
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
                />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Updating the viewer fullname will generate an updated access link for this viewer.
                </p>
              </div>

              <div className={`flex items-center justify-end gap-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className={`${isDark ? 'bg-[#ff6600] hover:bg-[#ff8533]' : 'bg-[#18174e] hover:bg-[#23216d]'} text-white font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50`}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. TERMINATE CONFIRMATION MODAL */}
      {isTerminateModalOpen && terminatingLink && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-md p-6 shadow-xl relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150`}>
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                Terminate Viewer Link
              </h3>
              <button
                type="button"
                onClick={() => setIsTerminateModalOpen(false)}
                className={`${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm leading-relaxed">
                Are you sure you want to terminate the viewer link for <strong className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{terminatingLink.viewerName}</strong>?
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                When terminated, any user opening this link will encounter the 404 System Maintenance &amp; Link Inactive screen. The link remains in the database and can be reactivated anytime.
              </p>
            </div>

            <div className={`flex items-center justify-end gap-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <button
                type="button"
                onClick={() => setIsTerminateModalOpen(false)}
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTerminateConfirm}
                disabled={isTerminating}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isTerminating ? 'Terminating...' : 'Terminate Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. REACTIVATE / UNTERMINATE CONFIRMATION MODAL */}
      {isReactivateModalOpen && reactivatingLink && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-md p-6 shadow-xl relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150`}>
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                Reactivate Viewer Link
              </h3>
              <button
                type="button"
                onClick={() => setIsReactivateModalOpen(false)}
                className={`${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm leading-relaxed">
                Are you sure you want to reactivate the viewer link for <strong className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{reactivatingLink.viewerName}</strong>?
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will remove the 404 maintenance lockout and restore live rackings view access for this viewer link.
              </p>
            </div>

            <div className={`flex items-center justify-end gap-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <button
                type="button"
                onClick={() => setIsReactivateModalOpen(false)}
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReactivateConfirm}
                disabled={isReactivating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isReactivating ? 'Reactivating...' : 'Reactivate Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && deletingLink && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-md p-6 shadow-xl relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150`}>
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                Permanently Delete Viewer Link
              </h3>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className={`${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm leading-relaxed">
                Are you sure you want to permanently delete the viewer link for <strong className={`${isDark ? 'text-white' : 'text-slate-900'} font-mono`}>{deletingLink.viewerName}</strong>?
              </p>
              <p className="text-xs text-rose-500/90 leading-relaxed font-medium">
                This action cannot be undone. The link record will be permanently deleted from the database. Any future visits to this link will return a 404 page error.
              </p>
            </div>

            <div className={`flex items-center justify-end gap-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminSharedViewers;
