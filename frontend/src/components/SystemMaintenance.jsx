import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Power, ShieldAlert, CheckCircle2, AlertCircle, Eye, RefreshCw, Server, X, ShieldCheck, Terminal } from 'lucide-react';
import PageHeader from './layout/PageHeader';
import MaintenanceScreen from './common/MaintenanceScreen';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = import.meta.env.MODE === 'production'
  ? 'https://upright-inventory.onrender.com/api'
  : 'http://localhost:5000/api';

function AdminSettings() {
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [updatedBy, setUpdatedBy] = useState('');

  // Notifications (Matches Rackings & Supplies)
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

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isConfirmMessageDialogOpen, setIsConfirmMessageDialogOpen] = useState(false);
  const [pendingToggleValue, setPendingToggleValue] = useState(false);

  const fetchMaintenanceStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/system/maintenance`);
      if (res.data) {
        setIsMaintenanceActive(!!res.data.isMaintenanceActive);
        setMaintenanceMessage(res.data.maintenanceMessage || '');
        setLastUpdated(res.data.updatedAt);
        setUpdatedBy(res.data.updatedBy || 'Admin');
      }
    } catch (err) {
      console.error("Error fetching system maintenance status:", err);
      triggerError("Failed to fetch system settings from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceStatus();
  }, []);

  const handleInitiateToggle = (nextState) => {
    setPendingToggleValue(nextState);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmToggle = async () => {
    setIsConfirmDialogOpen(false);
    setSaving(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/system/maintenance`, {
        isMaintenanceActive: pendingToggleValue,
        maintenanceMessage: maintenanceMessage.trim() || undefined
      });

      if (res.status === 200) {
        setIsMaintenanceActive(pendingToggleValue);
        setLastUpdated(new Date().toISOString());
        triggerSuccess(
          pendingToggleValue 
            ? "Shutdown / Maintenance mode is now ACTIVE. Inventory and Viewer roles are locked out." 
            : "Maintenance mode DEACTIVATED. System is live for all user roles."
        );
        window.dispatchEvent(new Event('systemMaintenanceChanged'));
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update maintenance state.";
      triggerError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleInitiateSaveMessage = (e) => {
    e.preventDefault();
    setIsConfirmMessageDialogOpen(true);
  };

  const handleConfirmSaveMessage = async () => {
    setIsConfirmMessageDialogOpen(false);
    setSaving(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/system/maintenance`, {
        isMaintenanceActive,
        maintenanceMessage: maintenanceMessage.trim()
      });

      if (res.status === 200) {
        triggerSuccess("Advisory announcement notice updated successfully.");
      }
    } catch (err) {
      triggerError("Failed to save advisory announcement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
      
      {/* Toast Notifications matching Rackings/Supplies */}
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
      <PageHeader activeTab="admin-settings" />

      {/* Main Card Container matching Rackings & Supplies */}
      <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100 text-slate-600'} border rounded-2xl p-6 shadow-sm flex flex-col gap-6 transition-colors duration-200`}>

        {/* TOP ACTION BAR (Matches Rackings & Supplies) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'} flex-shrink-0`}>
              <Power className={`w-4 h-4 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
              <span>System Maintenance Controls</span>
            </div>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={fetchMaintenanceStatus}
                disabled={loading}
                title="Refresh status"
                className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                  isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">Refresh Status</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                  isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview 404 Screen</span>
              </button>
            </div>
          </div>
          <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-full mt-3`}></div>
        </div>

        {/* SYSTEM SHUTDOWN STATUS BANNER */}
        <div className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isMaintenanceActive 
            ? (isDark ? 'bg-rose-950/20 border-rose-900/60 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900') 
            : (isDark ? 'bg-[#141622] border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700')
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              isMaintenanceActive ? 'bg-rose-600 text-white' : (isDark ? 'bg-[#ff6600] text-white' : 'bg-[#18174e] text-white')
            }`}>
              <Power className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-wide">
                  {isMaintenanceActive ? 'SYSTEM SHUTDOWN ACTIVE' : 'LIVE SYSTEM OPERATIONAL'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase border ${
                  isMaintenanceActive 
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
                    : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                }`}>
                  {isMaintenanceActive ? '404 Screen Active' : 'Normal Access'}
                </span>
              </div>
              <p className="text-xs opacity-75 mt-0.5">
                {isMaintenanceActive 
                  ? 'Naka-lockout ang Inventory at Viewer roles. Admin lamang ang pwedeng pumasok.' 
                  : 'Lahat ng awtorisadong user roles ay may normal na access sa system.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={saving || loading}
            onClick={() => handleInitiateToggle(!isMaintenanceActive)}
            className={`flex items-center justify-center gap-2 ${
              isMaintenanceActive 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : (isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90 text-white' : 'bg-[#18174e] hover:bg-[#18174e]/90 text-white')
            } px-5 py-2.5 rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all whitespace-nowrap`}
          >
            <Power className="w-4 h-4" />
            <span>{isMaintenanceActive ? 'Restore System Live' : 'Activate Shutdown'}</span>
          </button>
        </div>

        {/* ROLE IMPACT GRID (Matches Supplies badge and card styles) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
            isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Admin Role</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                EXEMPTED
              </span>
            </div>
            <span className="text-xs text-slate-400">May buong access kahit naka-shutdown ang system.</span>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
            isMaintenanceActive 
              ? (isDark ? 'bg-rose-950/30 border-rose-900/60' : 'bg-rose-50 border-rose-200')
              : (isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-200')
          }`}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Inventory Staff</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                isMaintenanceActive 
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' 
                  : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
              }`}>
                {isMaintenanceActive ? '404 BLOCKED' : 'ACTIVE'}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {isMaintenanceActive ? 'Makikita ang 404 / Shutdown screen.' : 'Normal access.'}
            </span>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
            isMaintenanceActive 
              ? (isDark ? 'bg-rose-950/30 border-rose-900/60' : 'bg-rose-50 border-rose-200')
              : (isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-200')
          }`}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Viewer Role</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                isMaintenanceActive 
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' 
                  : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}>
                {isMaintenanceActive ? '404 BLOCKED' : 'ACTIVE'}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {isMaintenanceActive ? 'Makikita ang 404 / Shutdown screen.' : 'Normal access.'}
            </span>
          </div>
        </div>

        {/* ADVISORY BROADCAST FORM (Matches form inputs of Supplies/Rackings) */}
        <form onSubmit={handleInitiateSaveMessage} className={`p-5 rounded-2xl border flex flex-col gap-3.5 ${
          isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50/70 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <label className={`block text-xs font-bold uppercase ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Maintenance Advisory Announcement
            </label>
            <span className="text-[11px] text-slate-400">
              Lalabas sa 404 screen ng mga naka-lockout na staff
            </span>
          </div>

          <textarea
            rows={3}
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
            placeholder="Halimbawa: System update and database ledger maintenance are underway. Transactions are temporarily frozen."
            className={`w-full p-3 text-xs rounded-lg border focus:outline-none transition-colors ${
              isDark ? 'bg-[#090b10] border-slate-700 text-slate-200 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'
            }`}
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className={`flex items-center justify-center gap-2 ${
                isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'
              } disabled:bg-slate-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all disabled:opacity-50`}
            >
              <span>{saving ? "Saving Changes..." : "Save Advisory Announcement"}</span>
            </button>
          </div>
        </form>

        {/* SYSTEM PROTOCOL NOTE (Matches Rackings System Action Protocol) */}
        <div className={`p-4 rounded-xl border flex flex-col gap-1.5 ${
          isDark ? 'bg-amber-950/30 border-amber-900/50 text-amber-300' : 'bg-amber-50 border-amber-200/60 text-amber-800'
        }`}>
          <span className="text-xs font-bold uppercase flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>* System Action Protocol *</span>
          </span>
          <p className="text-[11px] leading-relaxed">
            Ang pag-shutdown ng sistema ay para sa pagsasaayos ng database, audit, o inventory synchronization. Ang Admin role lamang ang makakapasok upang magsagawa ng mga kailangang administrative tasks.
          </p>
        </div>

      </div>

      {/* CONFIRMATION DIALOG FOR TOGGLING SHUTDOWN (Matches Rackings & Supplies) */}
      {isConfirmDialogOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-md p-6 shadow-xl relative flex flex-col animate-in zoom-in-95 duration-200`}>
            
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3 shrink-0`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                {pendingToggleValue ? 'Confirm System Shutdown / Lockout' : 'Restore Live System Access'}
              </h3>
              <button
                type="button"
                onClick={() => setIsConfirmDialogOpen(false)}
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
                {pendingToggleValue 
                  ? 'Ang pagsara ng system ay pansamantalang magpapakita ng 404 / Shutdown screen sa lahat ng Inventory at Viewer accounts.'
                  : 'Ang muling pagbukas ay magbabalik ng normal na access sa lahat ng authorized staff.'}
              </p>
            </div>

            <div className="mt-4 flex-1">
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'} leading-relaxed font-medium`}>
                Sigurado ka bang nais mong {pendingToggleValue ? 'i-shutdown ang access' : 'ibalik sa live access'} ang sistema?
              </p>
            </div>

            <div className={`flex items-center justify-end gap-2 mt-6 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'} shrink-0`}>
              <button
                type="button"
                onClick={() => setIsConfirmDialogOpen(false)}
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                className={`${
                  pendingToggleValue ? 'bg-rose-600 hover:bg-rose-700' : (isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90')
                } text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md`}
              >
                {pendingToggleValue ? 'Confirm Shutdown' : 'Restore Live Access'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR SAVING ADVISORY ANNOUNCEMENT */}
      {isConfirmMessageDialogOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-md p-6 shadow-xl relative flex flex-col animate-in zoom-in-95 duration-200`}>
            
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3 shrink-0`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                Confirm Advisory Broadcast
              </h3>
              <button
                type="button"
                onClick={() => setIsConfirmMessageDialogOpen(false)}
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
                Ang mensaheng ito ay agad na magiging aktibo at makikita ng lahat ng mga naka-lockout na staff.
              </p>
            </div>

            <div className="mt-4 flex-1">
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'} leading-relaxed font-medium`}>
                Sigurado ka bang nais mong i-save at i-broadcast ang advisory announcement?
              </p>
            </div>

            <div className={`flex items-center justify-end gap-2 mt-6 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'} shrink-0`}>
              <button
                type="button"
                onClick={() => setIsConfirmMessageDialogOpen(false)}
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveMessage}
                className={`${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md`}
              >
                Confirm &amp; Broadcast
              </button>
            </div>

          </div>
        </div>
      )}

      {/* PREVIEW 404 MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[120] flex flex-col">
          <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 z-50">
            <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-2">
              <Eye className="w-4 h-4" /> PREVIEW MODE: Eto ang makikita ng Inventory at Viewer staff kapag naka-shutdown.
            </span>
            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-lg cursor-pointer transition-colors"
            >
              Exit Preview
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <MaintenanceScreen 
              maintenanceData={{
                isMaintenanceActive: true,
                maintenanceMessage: maintenanceMessage || "Scheduled system update and database ledger maintenance are underway.",
                updatedAt: new Date().toISOString()
              }}
              onCheckStatus={() => setShowPreviewModal(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminSettings;
