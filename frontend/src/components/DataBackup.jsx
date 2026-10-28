import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Database, Download, UploadCloud, RefreshCw, Layers, Package, Briefcase, 
  Truck, TrendingUp, Users, ShoppingBag, History, FileSpreadsheet,
  CheckCircle2, AlertCircle, FileJson, X, Search, ShieldCheck, Clock, Calendar,
  Trash2, RotateCcw, AlertTriangle, ShieldAlert
} from 'lucide-react';
import PageHeader from './layout/PageHeader';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = import.meta.env.MODE === 'production'
  ? 'https://upright-inventory.onrender.com/api'
  : 'http://localhost:5000/api';

function AdminBackup() {
  const { isDark } = useTheme();

  const [loadingStats, setLoadingStats] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Schedule & Snapshots State
  const [scheduleData, setScheduleData] = useState({
    frequency: 'daily',
    enabled: true,
    nextRun: null,
    lastRun: null,
    snapshots: []
  });
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [updatingSchedule, setUpdatingSchedule] = useState(false);

  // Snapshot Restore State
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [snapshotPasskey, setSnapshotPasskey] = useState('');
  const [isSnapshotRestoreModalOpen, setIsSnapshotRestoreModalOpen] = useState(false);
  const [snapshotRestoreMode, setSnapshotRestoreMode] = useState('merge');

  // Notifications
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const triggerSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const triggerError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // Upload Restore State
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedBackup, setParsedBackup] = useState(null);
  const [restoreMode, setRestoreMode] = useState('merge');
  const [restorePasskey, setRestorePasskey] = useState('');
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Confirmation Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    actionType: 'export',
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
      triggerError("Failed to load database collection statistics.");
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchScheduleAndSnapshots = async () => {
    try {
      setLoadingSchedule(true);
      const res = await axios.get(`${API_BASE_URL}/backup/schedule`);
      if (res.data) {
        setScheduleData(res.data);
      }
    } catch (err) {
      console.error("Error fetching schedule:", err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchScheduleAndSnapshots();
  }, []);

  const handleUpdateSchedule = async (newFrequency) => {
    try {
      setUpdatingSchedule(true);
      const res = await axios.put(`${API_BASE_URL}/backup/schedule`, {
        frequency: newFrequency,
        enabled: newFrequency !== 'disabled'
      });
      if (res.status === 200) {
        setScheduleData(prev => ({
          ...prev,
          frequency: res.data.frequency,
          enabled: res.data.enabled,
          nextRun: res.data.nextRun,
          snapshots: res.data.snapshots
        }));
        triggerSuccess(`Automated backup schedule set to ${newFrequency.toUpperCase()}!`);
      }
    } catch (err) {
      triggerError("Failed to update backup schedule.");
    } finally {
      setUpdatingSchedule(false);
    }
  };

  const promptScheduleChange = (frequency) => {
    const labels = {
      disabled: 'Disabled (Manual Only)',
      daily: 'Daily (Every Midnight - 12:00 AM)',
      weekly: 'Weekly (Every Sunday - 12:00 AM)',
      monthly: 'Monthly (1st Day of Each Month - 12:00 AM)'
    };
    setConfirmModalConfig({
      isOpen: true,
      title: 'Confirm Backup Schedule Change',
      message: `Sigurado ka bang nais mong baguhin ang automated backup frequency papuntang "${labels[frequency]}"?`,
      confirmText: 'Update Schedule',
      onConfirm: () => {
        setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        handleUpdateSchedule(frequency);
      }
    });
  };

  const handleGenerateServerSnapshot = async () => {
    try {
      setExporting(true);
      const res = await axios.post(`${API_BASE_URL}/backup/snapshots/generate`);
      if (res.status === 200) {
        triggerSuccess("New server backup snapshot generated successfully!");
        fetchScheduleAndSnapshots();
        fetchStats();
      }
    } catch (err) {
      triggerError("Failed to generate server snapshot.");
    } finally {
      setExporting(false);
    }
  };

  const promptGenerateServerSnapshot = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Confirm Immediate Server Snapshot',
      message: 'Nais mo bang lumikha agad ng bagong backup snapshot sa server storage ngayon?',
      confirmText: 'Create Snapshot',
      onConfirm: () => {
        setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        handleGenerateServerSnapshot();
      }
    });
  };

  const handleDownloadSnapshotFile = (filename) => {
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}/backup/snapshots/${filename}/download`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    triggerSuccess(`Downloading snapshot: ${filename}`);
  };

  const handleDeleteSnapshot = async (filename) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/backup/snapshots/${filename}`);
      if (res.status === 200) {
        triggerSuccess(`Deleted snapshot: ${filename}`);
        setScheduleData(prev => ({ ...prev, snapshots: res.data.snapshots }));
      }
    } catch (err) {
      triggerError("Failed to delete snapshot.");
    }
  };

  const promptDeleteSnapshot = (filename) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Confirm Delete Snapshot',
      message: `Sigurado ka bang nais mong tanggalin ang snapshot na "${filename}" mula sa server?`,
      confirmText: 'Delete Snapshot',
      onConfirm: () => {
        setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        handleDeleteSnapshot(filename);
      }
    });
  };

  const handleExecuteSnapshotRestore = async () => {
    if (!snapshotPasskey) {
      triggerError("Please enter authorization passkey.");
      return;
    }

    setIsRestoring(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/backup/snapshots/${selectedSnapshot.filename}/restore`, {
        confirmationPasskey: snapshotPasskey.trim(),
        restoreMode: snapshotRestoreMode
      });

      if (res.status === 200) {
        triggerSuccess(`Database successfully restored from snapshot ${selectedSnapshot.filename}!`);
        setIsSnapshotRestoreModalOpen(false);
        setSelectedSnapshot(null);
        setSnapshotPasskey('');
        fetchStats();
      }
    } catch (err) {
      triggerError(err.response?.data?.message || "Failed to restore database from snapshot.");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDownloadFullBackup = async () => {
    try {
      setExporting(true);
      const res = await axios.get(`${API_BASE_URL}/backup/export`, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `oneinventory_full_backup_${timestamp}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);

      triggerSuccess("Full database JSON backup downloaded successfully!");
      fetchStats();
    } catch (err) {
      console.error("Backup export error:", err);
      triggerError("Failed to generate database export.");
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadCollectionBackup = async (collectionKey, collectionLabel) => {
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

      triggerSuccess(`Exported ${collectionLabel} backup file.`);
    } catch (err) {
      triggerError(`Failed to export ${collectionLabel}.`);
    } finally {
      setExporting(false);
    }
  };

  const promptFullBackup = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Confirm Full Database Backup',
      message: 'Sigurado ka bang nais mong i-export at i-download ang kumpletong JSON backup ng buong database? Naglalaman ito ng live records mula sa Rackings, Tools & Equipments, Consumables, Outbound, at Accounts.',
      confirmText: 'Download Full Backup',
      onConfirm: () => {
        setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        handleDownloadFullBackup();
      }
    });
  };

  const promptCollectionBackup = (item) => {
    setConfirmModalConfig({
      isOpen: true,
      title: `Confirm Export: ${item.label}`,
      message: `Sigurado ka bang nais mong i-export ang backup snapshot para sa ${item.label} (${item.count} records) bilang JSON file?`,
      confirmText: 'Export Collection',
      onConfirm: () => {
        setConfirmModalConfig(prev => ({ ...prev, isOpen: false }));
        handleDownloadCollectionBackup(item.key, item.label);
      }
    });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      triggerError("Please upload a valid .json backup file.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!json.collections) {
          triggerError("Invalid file structure. Missing 'collections' container.");
          setSelectedFile(null);
          setParsedBackup(null);
          return;
        }
        setParsedBackup(json);
        triggerSuccess(`Valid backup loaded (${file.name}).`);
      } catch (err) {
        triggerError("Corrupted JSON file. Could not parse structure.");
        setSelectedFile(null);
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!restorePasskey) {
      triggerError("Please enter the authorization passkey.");
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
        triggerSuccess("Database restored successfully!");
        setIsRestoreModalOpen(false);
        setSelectedFile(null);
        setParsedBackup(null);
        setRestorePasskey('');
        fetchStats();
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to execute restore.";
      triggerError(msg);
    } finally {
      setIsRestoring(false);
    }
  };

  const collections = [
    { key: 'rawMaterials', label: 'Rackings (Raw Materials)', module: 'Rackings', count: stats?.breakdown?.rawMaterials || 0, icon: Layers, badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800' },
    { key: 'supplies', label: 'Tools & Equipments', module: 'Tools & Equipments', count: stats?.breakdown?.supplies || 0, icon: Package, badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' },
    { key: 'consumables', label: 'Consumables Records', module: 'Consumables', count: stats?.breakdown?.consumables || 0, icon: ShoppingBag, badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' },
    { key: 'packingLists', label: 'Outbound Packing Slips', module: 'Outbound', count: stats?.breakdown?.packingLists || 0, icon: Truck, badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' },
    { key: 'conversions', label: 'Work in Progress (WIP)', module: 'WIP Process', count: stats?.breakdown?.conversions || 0, icon: TrendingUp, badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' },
    { key: 'suppliesMovements', label: 'Equipment Movements', module: 'Equipments Log', count: stats?.breakdown?.suppliesMovements || 0, icon: History, badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-400 dark:border-cyan-800' },
    { key: 'purchaseOrders', label: 'Inbound Materials', module: 'Inbound Log', count: stats?.breakdown?.purchaseOrders || 0, icon: FileSpreadsheet, badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' },
    { key: 'users', label: 'User Staff Accounts', module: 'Administration', count: stats?.breakdown?.users || 0, icon: Users, badgeClass: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' }
  ];

  const filteredCollections = collections.filter(c => 
    c.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
      
      {/* Toast Notifications */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm font-semibold">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 ml-2 cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader activeTab="admin-backup" />

      {/* Main Container Card matching Rackings & Supplies */}
      <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100 text-slate-600'} border rounded-2xl p-6 shadow-sm flex flex-col gap-6 transition-colors duration-200`}>

        {/* TOP CONTROLS MASTER ROW */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'} flex-shrink-0`}>
              <Database className={`w-4 h-4 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
              <span>Data Vault Summary</span>
              <span className="text-xs font-bold text-slate-400 ml-1">
                ({stats?.totalRecords ?? 0} Total Records)
              </span>
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={() => { fetchStats(); fetchScheduleAndSnapshots(); }}
                disabled={loadingStats}
                title="Refresh database counts"
                className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                  isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Refresh Vault</span>
              </button>

              <button
                type="button"
                onClick={promptFullBackup}
                disabled={exporting}
                className={`flex items-center justify-center gap-2 ${
                  isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'
                } disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all h-[38px] whitespace-nowrap`}
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? 'Generating...' : 'Download Full JSON Backup'}</span>
              </button>
            </div>
          </div>

          <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-full mt-3`}></div>
        </div>

        {/* AUTOMATED SCHEDULE CONTROL CARD */}
        <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
          isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50/70 border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-slate-700/20">
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
              <div>
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  Automated Backup Scheduler (Daily, Weekly, Monthly)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Awtomatikong mag-iimbak ng database snapshot sa server base sa itinakdang iskedyul.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={promptGenerateServerSnapshot}
              disabled={exporting}
              className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer ${
                isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90 text-white' : 'bg-[#18174e] hover:bg-[#18174e]/90 text-white'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Run Immediate Server Snapshot</span>
            </button>
          </div>

          {/* Schedule Frequency Selector Buttons */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase text-slate-400">
              Piliin ang Dalas ng Awtomatikong Backup (Schedule Frequency)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              
              {/* Daily */}
              <button
                type="button"
                disabled={updatingSchedule}
                onClick={() => promptScheduleChange('daily')}
                className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1 cursor-pointer transition-all ${
                  scheduleData.frequency === 'daily'
                    ? (isDark ? 'bg-orange-950/40 border-[#ff6600] text-white shadow-sm' : 'bg-orange-50 border-[#ff6600] text-orange-950 shadow-sm')
                    : (isDark ? 'bg-[#090b10] border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')
                }`}
              >
                <span className="text-xs font-bold">Daily Schedule</span>
                <span className="text-[10px] opacity-75 font-mono">12:00 AM Midnight</span>
                {scheduleData.frequency === 'daily' && (
                  <span className="text-[9px] font-bold bg-[#ff6600] text-white px-2 py-0.5 rounded-full mt-1">ACTIVE</span>
                )}
              </button>

              {/* Weekly */}
              <button
                type="button"
                disabled={updatingSchedule}
                onClick={() => promptScheduleChange('weekly')}
                className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1 cursor-pointer transition-all ${
                  scheduleData.frequency === 'weekly'
                    ? (isDark ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-sm' : 'bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm')
                    : (isDark ? 'bg-[#090b10] border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')
                }`}
              >
                <span className="text-xs font-bold">Weekly Schedule</span>
                <span className="text-[10px] opacity-75 font-mono">Every Sunday 12:00 AM</span>
                {scheduleData.frequency === 'weekly' && (
                  <span className="text-[9px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full mt-1">ACTIVE</span>
                )}
              </button>

              {/* Monthly */}
              <button
                type="button"
                disabled={updatingSchedule}
                onClick={() => promptScheduleChange('monthly')}
                className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1 cursor-pointer transition-all ${
                  scheduleData.frequency === 'monthly'
                    ? (isDark ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-sm' : 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-sm')
                    : (isDark ? 'bg-[#090b10] border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')
                }`}
              >
                <span className="text-xs font-bold">Monthly Schedule</span>
                <span className="text-[10px] opacity-75 font-mono">1st Day of Month</span>
                {scheduleData.frequency === 'monthly' && (
                  <span className="text-[9px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full mt-1">ACTIVE</span>
                )}
              </button>

              {/* Disabled */}
              <button
                type="button"
                disabled={updatingSchedule}
                onClick={() => promptScheduleChange('disabled')}
                className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1 cursor-pointer transition-all ${
                  scheduleData.frequency === 'disabled'
                    ? (isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-200 border-slate-400 text-slate-800')
                    : (isDark ? 'bg-[#090b10] border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')
                }`}
              >
                <span className="text-xs font-bold">Manual Only</span>
                <span className="text-[10px] opacity-75 font-mono">No auto-schedule</span>
                {scheduleData.frequency === 'disabled' && (
                  <span className="text-[9px] font-bold bg-slate-500 text-white px-2 py-0.5 rounded-full mt-1">ACTIVE</span>
                )}
              </button>

            </div>
          </div>

          {/* Schedule Info Summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Susunod na Auto-Backup:</span>
              <span className="font-mono font-bold text-emerald-500">
                {scheduleData.nextRun ? new Date(scheduleData.nextRun).toLocaleString() : 'Naka-disable (Manual Only)'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Huling Pagpapatakbo:</span>
              <span className="font-mono">
                {scheduleData.lastRun ? new Date(scheduleData.lastRun).toLocaleString() : 'Wala pa'}
              </span>
            </div>
          </div>
        </div>

        {/* SERVER SNAPSHOTS HISTORY TABLE */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#ff6600]" />
              <span>Server Snapshots Vault ({scheduleData.snapshots?.length || 0} Saved Files)</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Awtomatikong pinapanatili ang huling 10 snapshots sa server
            </span>
          </div>

          <div className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'} rounded-xl border shadow-sm overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className={`text-white font-bold uppercase text-nowrap text-sm ${isDark ? 'bg-[#0f111d] border-b border-slate-800' : 'bg-[#18174e]'}`}>
                    <th className="py-3 px-4">Snapshot Filename</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-center">File Size</th>
                    <th className="py-3 px-4">Created Date &amp; Time</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/80 bg-[#090b10]' : 'divide-slate-100 bg-white'}`}>
                  {loadingSchedule ? (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-green-700 font-medium italic">
                        Loading server snapshots...
                      </td>
                    </tr>
                  ) : scheduleData.snapshots?.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-slate-400 italic">
                        Wala pang naka-save na snapshot sa server. Pindutin ang "Run Immediate Server Snapshot" sa itaas para lumikha.
                      </td>
                    </tr>
                  ) : (
                    scheduleData.snapshots.map((snap) => (
                      <tr key={snap.filename} className={`group ${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'} transition-colors font-medium whitespace-nowrap text-sm`}>
                        <td className="py-3 px-4 font-mono font-bold text-xs">
                          {snap.filename}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            snap.type.includes('Daily')
                              ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800'
                              : snap.type.includes('Weekly')
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800'
                              : snap.type.includes('Monthly')
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}>
                            {snap.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs">
                          {snap.sizeFormatted}
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">
                          {new Date(snap.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadSnapshotFile(snap.filename)}
                              title="Download JSON Snapshot"
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isDark ? 'bg-[#181a26] border-slate-700 text-indigo-400 hover:bg-indigo-600 hover:text-white' : 'bg-indigo-50 border-slate-200 text-indigo-700 hover:bg-indigo-600 hover:text-white'
                              }`}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSnapshot(snap);
                                setIsSnapshotRestoreModalOpen(true);
                              }}
                              title="Restore live database from this snapshot"
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isDark ? 'bg-[#181a26] border-slate-700 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-emerald-50 border-slate-200 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                              }`}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => promptDeleteSnapshot(snap.filename)}
                              title="Delete snapshot from server"
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isDark ? 'bg-[#181a26] border-slate-700 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-rose-50 border-slate-200 text-rose-700 hover:bg-rose-600 hover:text-white'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* COLLECTIONS BREAKDOWN & MODULAR EXPORT (GRID LAYOUT) */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold uppercase text-slate-400">
                Collections Breakdown &amp; Modular Export
              </span>
              <p className="text-[11px] text-slate-400">
                Pumili ng partikular na module o koleksyon upang i-export bilang standalone JSON backup.
              </p>
            </div>
            <div className="w-full sm:w-64">
              <div className="relative w-full">
                <Search className={`absolute left-3 top-2.5 w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Filter collections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full ${
                    isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'
                  } border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none`}
                />
              </div>
            </div>
          </div>

          {loadingStats ? (
            <div className={`p-8 text-center rounded-xl border ${isDark ? 'bg-[#0c0e14] border-slate-800 text-green-500' : 'bg-white border-slate-200 text-green-700'} italic text-sm`}>
              Fetching database collection counts...
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className={`p-8 text-center rounded-xl border ${isDark ? 'bg-[#0c0e14] border-slate-800 text-red-400' : 'bg-white border-slate-200 text-red-600'} italic text-sm`}>
              No collections match the search query.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredCollections.map((item) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.key}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3.5 transition-all duration-200 ${
                      isDark 
                        ? 'bg-[#0c0e14] border-slate-800 hover:border-[#ff6600]/50 hover:bg-[#121420]' 
                        : 'bg-white border-slate-200 hover:border-[#18174e]/40 hover:shadow-sm'
                    }`}
                  >
                    {/* Top Row: Icon + Collection Name & Module Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${isDark ? 'bg-slate-800 text-[#ff8533]' : 'bg-slate-100 text-[#18174e]'}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`font-bold text-xs truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`} title={item.label}>
                            {item.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            MongoDB Collection
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 text-nowrap ${item.badgeClass}`}>
                        {item.module}
                      </span>
                    </div>

                    {/* Middle Row: Active Records count + Status Pill */}
                    <div className="flex items-baseline justify-between pt-1 border-t border-slate-700/10 dark:border-slate-800/60">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Active Records
                        </span>
                        <span className={`text-xl font-mono font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {item.count.toLocaleString()}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                        <ShieldCheck className="w-3 h-3" /> Ready
                      </span>
                    </div>

                    {/* Bottom Row: Export Button */}
                    <button
                      type="button"
                      onClick={() => promptCollectionBackup(item)}
                      disabled={exporting}
                      className={`w-full flex items-center justify-center gap-2 text-xs font-bold py-2 px-3 rounded-lg border transition-all cursor-pointer ${
                        isDark 
                          ? 'bg-[#181a26] border-slate-700 text-[#ff8533] hover:bg-[#ff6600] hover:text-white hover:border-[#ff6600]' 
                          : 'bg-[#18174e]/5 border-slate-200 text-[#18174e] hover:bg-[#18174e] hover:text-white hover:border-[#18174e]'
                      }`}
                      title={`Export ${item.label}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export JSON</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RESTORE DATABASE PANEL (Upload file) */}
        <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
          isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50/70 border-slate-200'
        }`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-700/20">
            <div className="flex items-center gap-2">
              <UploadCloud className={`w-4 h-4 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
              <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Upload &amp; Restore from External JSON Backup
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Only official ONEINVENTORY JSON backup snapshots supported
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2">
              <label className={`block text-xs font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Select JSON Backup File
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleFileChange}
                  className={`w-full p-2 text-xs rounded-lg border cursor-pointer ${
                    isDark ? 'bg-[#090b10] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                />
              </div>
              {selectedFile && (
                <p className="text-[11px] text-emerald-500 font-semibold mt-1">
                  &bull; Loaded: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="flex flex-col justify-end h-full pt-1">
              <button
                type="button"
                disabled={!parsedBackup}
                onClick={() => setIsRestoreModalOpen(true)}
                className={`w-full flex items-center justify-center gap-2 ${
                  isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'
                } disabled:bg-slate-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all disabled:opacity-50`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Open Restore Wizard</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* CONFIRMATION MODAL */}
      {confirmModalConfig.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-md p-6 shadow-xl relative flex flex-col animate-in zoom-in-95 duration-200`}>
            
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3 shrink-0`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                {confirmModalConfig.title}
              </h3>
              <button
                type="button"
                onClick={() => setConfirmModalConfig(prev => ({ ...prev, isOpen: false }))}
                className={`${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-900/50 text-amber-300' : 'bg-amber-50 border-amber-200/60 text-amber-800'} rounded-xl border mt-3 shrink-0`}>
              <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                * System Action Protocol *
              </span>
              <p className={`text-[11px] ${isDark ? 'text-amber-300/80' : 'text-amber-700'} leading-relaxed`}>
                Please review the action details. Ang aksyong ito ay direktang makakaapekto sa mga operasyon ng Database Vault.
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
                onClick={() => setConfirmModalConfig(prev => ({ ...prev, isOpen: false }))}
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModalConfig.onConfirm}
                className={`${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md`}
              >
                {confirmModalConfig.confirmText}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 1-CLICK SNAPSHOT RESTORE AUTHORIZATION MODAL */}
      {isSnapshotRestoreModalOpen && selectedSnapshot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-lg p-6 shadow-xl relative flex flex-col gap-4 animate-in zoom-in-95 duration-200`}>
            
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3 shrink-0`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                Restore Live Database from Snapshot
              </h3>
              <button
                type="button"
                onClick={() => setIsSnapshotRestoreModalOpen(false)}
                className={`${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-900/50 text-amber-300' : 'bg-amber-50 border-amber-200/60 text-amber-800'} rounded-xl border shrink-0`}>
              <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                * Critical System Protocol *
              </span>
              <p className={`text-[11px] ${isDark ? 'text-amber-300/80' : 'text-amber-700'} leading-relaxed`}>
                I-re-restore ang database gamit ang snapshot na <strong className="text-white font-mono">{selectedSnapshot.filename}</strong> ({selectedSnapshot.sizeFormatted}).
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                snapshotRestoreMode === 'merge'
                  ? (isDark ? 'bg-[#141622] border-[#ff6600]' : 'bg-orange-50/50 border-[#18174e]')
                  : (isDark ? 'bg-[#090b10] border-slate-800' : 'bg-white border-slate-200')
              }`}>
                <input 
                  type="radio" 
                  name="snapshotRestoreMode" 
                  value="merge" 
                  checked={snapshotRestoreMode === 'merge'} 
                  onChange={() => setSnapshotRestoreMode('merge')} 
                  className="mt-0.5" 
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Merge / Safe Upsert (Recommended)</span>
                  <span className="text-[11px] opacity-75">I-a-update ang existing records at idadagdag ang mga bago nang hindi binubura ang iba pang data.</span>
                </div>
              </label>

              <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                snapshotRestoreMode === 'replace'
                  ? (isDark ? 'bg-rose-950/30 border-rose-600' : 'bg-rose-50 border-rose-400')
                  : (isDark ? 'bg-[#090b10] border-slate-800' : 'bg-white border-slate-200')
              }`}>
                <input 
                  type="radio" 
                  name="snapshotRestoreMode" 
                  value="replace" 
                  checked={snapshotRestoreMode === 'replace'} 
                  onChange={() => setSnapshotRestoreMode('replace')} 
                  className="mt-0.5" 
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-rose-500">Clean Replace / Complete Overwrite</span>
                  <span className="text-[11px] opacity-75">Buburahin ang laman ng apektadong koleksyon bago ilagay ang nasa backup snapshot.</span>
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={`block text-xs font-bold uppercase ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Authorization Passkey (Type: RESTORE-CONFIRM-2026)
              </label>
              <input
                type="password"
                placeholder="RESTORE-CONFIRM-2026"
                value={snapshotPasskey}
                onChange={(e) => setSnapshotPasskey(e.target.value)}
                className={`w-full p-2.5 text-xs font-mono rounded-lg border focus:outline-none ${
                  isDark ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#18174e]'
                }`}
              />
            </div>

            <div className={`flex items-center justify-end gap-2 mt-3 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'} shrink-0`}>
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setIsSnapshotRestoreModalOpen(false)}
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleExecuteSnapshotRestore}
                className={`${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md disabled:opacity-50`}
              >
                {isRestoring ? "Restoring Snapshot..." : "Confirm & Restore Live DB"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EXTERNAL FILE RESTORE AUTHORIZATION MODAL */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-lg p-6 shadow-xl relative flex flex-col gap-4 animate-in zoom-in-95 duration-200`}>
            
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3 shrink-0`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                Authorize External File Restore
              </h3>
              <button
                type="button"
                onClick={() => setIsRestoreModalOpen(false)}
                className={`${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-900/50 text-amber-300' : 'bg-amber-50 border-amber-200/60 text-amber-800'} rounded-xl border shrink-0`}>
              <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                * Critical System Protocol *
              </span>
              <p className={`text-[11px] ${isDark ? 'text-amber-300/80' : 'text-amber-700'} leading-relaxed`}>
                Restoring will modify the live database collections. Piliin nang maigi ang mode ng restore at i-type ang security authorization passkey.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                restoreMode === 'merge'
                  ? (isDark ? 'bg-[#141622] border-[#ff6600]' : 'bg-orange-50/50 border-[#18174e]')
                  : (isDark ? 'bg-[#090b10] border-slate-800' : 'bg-white border-slate-200')
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
                  <span className="text-[11px] opacity-75">I-a-update ang existing records at idadagdag ang mga bago nang hindi binubura ang iba pang data.</span>
                </div>
              </label>

              <label className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                restoreMode === 'replace'
                  ? (isDark ? 'bg-rose-950/30 border-rose-600' : 'bg-rose-50 border-rose-400')
                  : (isDark ? 'bg-[#090b10] border-slate-800' : 'bg-white border-slate-200')
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
                  <span className="text-[11px] opacity-75">Buburahin ang laman ng apektadong koleksyon bago ilagay ang nasa backup file.</span>
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={`block text-xs font-bold uppercase ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Authorization Passkey (Type: RESTORE-CONFIRM-2026)
              </label>
              <input
                type="password"
                placeholder="RESTORE-CONFIRM-2026"
                value={restorePasskey}
                onChange={(e) => setRestorePasskey(e.target.value)}
                className={`w-full p-2.5 text-xs font-mono rounded-lg border focus:outline-none ${
                  isDark ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#18174e]'
                }`}
              />
            </div>

            <div className={`flex items-center justify-end gap-2 mt-3 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'} shrink-0`}>
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setIsRestoreModalOpen(false)}
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleExecuteRestore}
                className={`${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md disabled:opacity-50`}
              >
                {isRestoring ? "Restoring Database..." : "Confirm & Execute Restore"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default AdminBackup;
