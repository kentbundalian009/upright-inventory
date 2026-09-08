import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Database, Download, UploadCloud, RefreshCw, Layers, Package, Briefcase, 
  Truck, TrendingUp, Users, ShoppingBag, History, FileSpreadsheet, ShieldAlert,
  CheckCircle2, AlertCircle, FileJson, ArrowRight, ShieldCheck, Lock
} from 'lucide-react';
import PageHeader from './PageHeader';
import { useTheme } from '../context/ThemeContext';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.MODE === 'production'
  ? 'https://one-inventory.onrender.com/api'
  : 'http://localhost:5000/api';

function AdminBackup() {
  const { isDark } = useTheme();

  const [loadingStats, setLoadingStats] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState(null);

  // Restore State
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedBackup, setParsedBackup] = useState(null);
  const [restoreMode, setRestoreMode] = useState('merge');
  const [restorePasskey, setRestorePasskey] = useState('');
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // General Action Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    confirmColor: 'bg-[#ff6600] hover:bg-[#e05a00]',
    onConfirm: () => {}
  });

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await axios.get(`${API_BASE_URL}/backup/stats`);
      if (res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Error fetching backup stats:", err);
      toast.error("Failed to load database collection statistics.");
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDownloadFullBackup = async () => {
    try {
      setExporting(true);
      const res = await axios.get(`${API_BASE_URL}/backup/export`, { responseType: 'blob' });
      
      // Trigger browser download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `oneinventory_full_backup_${timestamp}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      toast.success("Full database JSON backup downloaded successfully!");
      fetchStats();
    } catch (err) {
      console.error("Backup export error:", err);
      toast.error("Failed to generate database export.");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadCollectionBackup = async (collectionKey) => {
    try {
      setExporting(true);
      const res = await axios.get(`${API_BASE_URL}/backup/export?collection=${collectionKey}`, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `oneinventory_${collectionKey}_${timestamp}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      toast.success(`Exported ${collectionKey} backup file!`);
    } catch (err) {
      toast.error(`Failed to export ${collectionKey}.`);
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error("Please upload a valid .json backup file.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json.collections) {
          toast.error("Invalid file structure. Missing 'collections' property.");
          setSelectedFile(null);
          setParsedBackup(null);
          return;
        }
        setParsedBackup(json);
        toast.success(`Valid backup loaded (${file.name})`);
      } catch (err) {
        toast.error("Corrupted JSON file. Could not parse.");
        setSelectedFile(null);
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!restorePasskey) {
      toast.error("Please enter the confirmation passkey.");
      return;
    }

    setIsRestoring(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/backup/restore`, {
        backupData: parsedBackup,
        restoreMode,
        confirmationPasskey: restorePasskey.trim()
      });

      if (res.status === 200) {
        toast.success("Database restored successfully!");
        setIsRestoreModalOpen(false);
        setSelectedFile(null);
        setParsedBackup(null);
        setRestorePasskey('');
        fetchStats();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to execute restore.";
      toast.error(msg);
    } finally {
      setIsRestoring(false);
    }
  };

  const collectionCards = [
    { key: 'rawMaterials', label: 'Rackings / Raw Materials', count: stats?.breakdown?.rawMaterials || 0, icon: Layers, color: 'text-[#ff6600]' },
    { key: 'supplies', label: 'Supplies Records', count: stats?.breakdown?.supplies || 0, icon: Package, color: 'text-blue-500' },
    { key: 'products', label: 'Finished Products', count: stats?.breakdown?.products || 0, icon: ShoppingBag, color: 'text-emerald-500' },
    { key: 'assets', label: 'Company Assets', count: stats?.breakdown?.assets || 0, icon: Briefcase, color: 'text-purple-500' },
    { key: 'packingLists', label: 'Outbound Packing Slips', count: stats?.breakdown?.packingLists || 0, icon: Truck, color: 'text-amber-500' },
    { key: 'conversions', label: 'WIP Conversions', count: stats?.breakdown?.conversions || 0, icon: TrendingUp, color: 'text-rose-500' },
    { key: 'suppliesMovements', label: 'Supplies Movements', count: stats?.breakdown?.suppliesMovements || 0, icon: History, color: 'text-cyan-500' },
    { key: 'purchaseOrders', label: 'Purchase Inbound Orders', count: stats?.breakdown?.purchaseOrders || 0, icon: FileSpreadsheet, color: 'text-indigo-500' },
    { key: 'users', label: 'Staff & User Accounts', count: stats?.breakdown?.users || 0, icon: Users, color: 'text-slate-400' }
  ];

  return (
    <div className={`mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
      <Toaster position="top-right" />

      {/* Page Header */}
      <PageHeader activeTab="admin-backup" />

      {/* Overview Metric Banner */}
      <div className={`${isDark ? 'bg-[#0e1017] border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#18174e] to-[#ff6600] flex items-center justify-center text-white shadow-lg shrink-0">
            <Database className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-[#18174e]'}`}>
                OneInventory Central Data Vault
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-bold uppercase">
                Ready
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Kabuuang bilang ng mga tala sa system: <strong className="font-mono text-emerald-500 text-sm">{stats?.totalRecords ?? '...'}</strong> mga tala sa lahat ng koleksyon.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={fetchStats}
            disabled={loadingStats}
            title="Refresh database statistics"
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Confirm Full Database Backup',
                message: 'Sigurado ka bang nais mong i-generate at i-download ang kumpletong JSON backup ng buong database? Naglalaman ito ng live records mula sa Rackings, Supplies, Products, Assets, Outbound, at Accounts.',
                confirmText: 'Download Backup',
                confirmColor: 'bg-[#ff6600] hover:bg-[#e05a00]',
                onConfirm: () => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  handleDownloadFullBackup();
                }
              });
            }}
            disabled={exporting}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-[#ff6600] hover:bg-[#e05a00] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Generating Backup...' : 'Download Full JSON Backup'}</span>
          </button>
        </div>
      </div>

      {/* Grid: Collections Breakdown & Restore Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left 2 Cols: Collection Cards Grid */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">
              Collections Breakdown &amp; Modular Export
            </span>
            <span className="text-[11px] text-slate-500">
              Maaaring i-export nang paisa-isa ang bawat koleksyon
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {collectionCards.map((item) => {
              const IconComp = item.icon;
              return (
                <div
                  key={item.key}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
                    isDark ? 'bg-[#0e1017] border-slate-800 hover:border-slate-700' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-slate-50 border border-slate-100'} ${item.color}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: `Confirm Export: ${item.label}`,
                          message: `Sigurado ka bang nais mong i-download ang ${item.label} collection (${item.count} records) bilang hiwalay na JSON backup snapshot?`,
                          confirmText: 'Export Collection',
                          confirmColor: 'bg-indigo-600 hover:bg-indigo-700',
                          onConfirm: () => {
                            setConfirmModal(prev => ({ ...prev, isOpen: false }));
                            handleDownloadCollectionBackup(item.key);
                          }
                        });
                      }}
                      disabled={exporting}
                      title={`Export only ${item.label}`}
                      className={`text-[11px] font-bold flex items-center gap-1 p-1 px-2 rounded-lg border transition-colors cursor-pointer ${
                        isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-[#18174e]'
                      }`}
                    >
                      <Download className="w-3 h-3" />
                      <span>JSON</span>
                    </button>
                  </div>

                  <div>
                    <div className="text-xl font-extrabold font-mono leading-tight">
                      {loadingStats ? '—' : item.count}
                    </div>
                    <div className="text-xs font-medium text-slate-400 truncate mt-0.5" title={item.label}>
                      {item.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Restore Panel */}
        <div className={`${isDark ? 'bg-[#0e1017] border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-2xl border shadow-sm flex flex-col gap-5`}>
          
          <div className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3 flex items-center gap-2`}>
            <UploadCloud className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Restore Database from JSON
              </h3>
              <p className="text-[11px] text-slate-400">
                I-upload ang na-export na JSON backup file.
              </p>
            </div>
          </div>

          {/* Drop/Input Zone */}
          <div className={`border-2 border-dashed rounded-xl p-5 text-center flex flex-col items-center gap-3 transition-colors ${
            selectedFile
              ? (isDark ? 'border-emerald-700 bg-emerald-950/20 text-emerald-300' : 'border-emerald-300 bg-emerald-50/50 text-emerald-800')
              : (isDark ? 'border-slate-800 hover:border-slate-700 bg-[#141622]' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50')
          }`}>
            <FileJson className={`w-8 h-8 ${selectedFile ? 'text-emerald-500' : 'text-slate-400'}`} />
            
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold">
                {selectedFile ? selectedFile.name : 'Select or drag backup .json file'}
              </span>
              <span className="text-[10px] text-slate-400">
                {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Only official JSON backup files supported'}
              </span>
            </div>

            <label className="bg-[#18174e] hover:bg-[#1f1d63] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm">
              <span>Browse File</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleFileChange} 
                className="hidden" 
              />
            </label>
          </div>

          {/* Parsed Inspection Box */}
          {parsedBackup && (
            <div className={`p-3.5 rounded-xl border text-xs flex flex-col gap-2 ${
              isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between font-bold text-emerald-500">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Structure Verified
                </span>
                <span className="font-mono text-[10px]">{parsedBackup.version ? `v${parsedBackup.version}` : 'v1.0'}</span>
              </div>
              <div className="text-[11px] text-slate-400 flex flex-col gap-1">
                <span>Export Date: <strong className="text-slate-300">{new Date(parsedBackup.exportDate).toLocaleDateString()}</strong></span>
                <span>Collections Detected: <strong className="text-slate-300">{Object.keys(parsedBackup.collections || {}).join(', ')}</strong></span>
              </div>
            </div>
          )}

          {/* Action to trigger modal */}
          <button
            type="button"
            disabled={!parsedBackup}
            onClick={() => setIsRestoreModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <span>Proceed to Restore Wizard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Safety Warning */}
          <div className={`p-3 rounded-xl border text-[11px] flex items-start gap-2 ${
            isDark ? 'bg-amber-950/20 border-amber-900/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>Ang pag-restore ay nangangailangan ng Master Confirmation Passkey para maiwasan ang aksidenteng pag-overwrite.</span>
          </div>

        </div>

      </div>

      {/* RESTORE CONFIRMATION MODAL */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative flex flex-col gap-5 animate-in zoom-in-95 duration-200`}>
            
            <div className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3 flex items-center gap-3`}>
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  Authorize Database Restore Operation
                </h3>
                <p className="text-xs text-slate-400">
                  Pakitukoy ang restore mode at i-type ang security passkey.
                </p>
              </div>
            </div>

            {/* Restore Mode Radio Options */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase text-slate-400">Piliin ang Mode ng Restore</span>
              
              <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                restoreMode === 'merge'
                  ? (isDark ? 'bg-indigo-950/30 border-indigo-700 text-white' : 'bg-indigo-50 border-indigo-400 text-indigo-900')
                  : (isDark ? 'bg-[#141622] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600')
              }`}>
                <input 
                  type="radio" 
                  name="restoreMode" 
                  value="merge" 
                  checked={restoreMode === 'merge'} 
                  onChange={() => setRestoreMode('merge')} 
                  className="mt-0.5" 
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Merge / Safe Upsert (Recommended)</span>
                  <span className="text-[11px] opacity-80">I-a-update ang mga existing records at idadagdag ang mga bago nang hindi binubura ang ibang laman.</span>
                </div>
              </label>

              <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                restoreMode === 'replace'
                  ? (isDark ? 'bg-rose-950/30 border-rose-700 text-white' : 'bg-rose-50 border-rose-400 text-rose-900')
                  : (isDark ? 'bg-[#141622] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600')
              }`}>
                <input 
                  type="radio" 
                  name="restoreMode" 
                  value="replace" 
                  checked={restoreMode === 'replace'} 
                  onChange={() => setRestoreMode('replace')} 
                  className="mt-0.5" 
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-rose-500">Clean Replace / Complete Overwrite</span>
                  <span className="text-[11px] opacity-80">Buburahin ang mga existing records sa mga apektadong koleksyon at papalitan ng nasa backup file.</span>
                </div>
              </label>
            </div>

            {/* Passkey Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-slate-400">
                Security Authorization Passkey (Type: RESTORE-CONFIRM-2026)
              </label>
              <input
                type="password"
                placeholder="RESTORE-CONFIRM-2026"
                value={restorePasskey}
                onChange={(e) => setRestorePasskey(e.target.value)}
                className={`w-full p-2.5 text-xs font-mono rounded-xl border focus:outline-none ${
                  isDark ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#18174e]'
                }`}
              />
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setIsRestoreModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleExecuteRestore}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-all shadow-md cursor-pointer"
              >
                {isRestoring ? "Restoring Database..." : "Confirm & Execute Restore"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* GENERAL ACTION CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col gap-4 animate-in zoom-in-95 duration-200`}>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Kumpirmasyon bago isagawa ang operasyon sa data vault.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-900/40 p-3 rounded-xl border border-slate-800">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer ${confirmModal.confirmColor}`}
              >
                {confirmModal.confirmText}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default AdminBackup;
