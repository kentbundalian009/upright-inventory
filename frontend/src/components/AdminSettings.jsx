import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Power, ShieldAlert, CheckCircle2, AlertCircle, Eye, RefreshCw, Server, Users, Lock, Terminal, Clock, ShieldCheck } from 'lucide-react';
import PageHeader from './PageHeader';
import MaintenanceScreen from './MaintenanceScreen';
import { useTheme } from '../context/ThemeContext';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.MODE === 'production'
  ? 'https://one-inventory.onrender.com/api'
  : 'http://localhost:5000/api';

function AdminSettings() {
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [updatedBy, setUpdatedBy] = useState('');

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
      toast.error("Failed to fetch system settings from server.");
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
        toast.success(
          pendingToggleValue 
            ? "Maintenance / Shutdown mode is now ACTIVE. Standard users are locked out." 
            : "Maintenance mode DEACTIVATED. System is live for all roles."
        );
        window.dispatchEvent(new Event('systemMaintenanceChanged'));
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update maintenance state.";
      toast.error(msg);
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
        toast.success("Advisory announcement message updated!");
      }
    } catch (err) {
      toast.error("Failed to save advisory message.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
      <Toaster position="top-right" />

      {/* Page Header */}
      <PageHeader activeTab="admin-settings" />

      {/* Grid: Maintenance Master Switch + Server Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left 2 Cols: Master Switch & Advisory Message */}
        <div className={`lg:col-span-2 ${isDark ? 'bg-[#0e1017] border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-2xl border shadow-sm flex flex-col gap-6`}>
          
          {/* Section Header */}
          <div className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Power className={`w-5 h-5 ${isMaintenanceActive ? 'text-rose-500' : 'text-emerald-500'}`} />
              <div>
                <h2 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  System Maintenance &amp; Role Lockout Control
                </h2>
                <p className="text-xs text-slate-400">
                  Puwede mong i-shutdown ang access ng Inventory at Viewer roles sa isang pindot lamang.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchMaintenanceStatus}
              disabled={loading}
              title="Refresh status"
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Master Toggle Banner */}
          <div className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isMaintenanceActive 
              ? (isDark ? 'bg-rose-950/20 border-rose-900/60 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900') 
              : (isDark ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-200' : 'bg-emerald-50/70 border-emerald-200 text-emerald-900')
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                isMaintenanceActive ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {isMaintenanceActive ? <Lock className="w-6 h-6 animate-pulse" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold uppercase tracking-wider">
                    {isMaintenanceActive ? 'SHUTDOWN / MAINTENANCE ACTIVE' : 'SYSTEM LIVE & ACCESSIBLE'}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    isMaintenanceActive ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
                  }`}>
                    {isMaintenanceActive ? '404 Active' : 'Normal State'}
                  </span>
                </div>
                <p className="text-xs opacity-80 mt-0.5">
                  {isMaintenanceActive 
                    ? 'Naka-lockout ang Inventory at Viewer roles. Admin lamang ang pwedeng pumasok.' 
                    : 'Lahat ng authorized roles ay may normal na access sa sistema.'}
                </p>
              </div>
            </div>

            {/* Toggle Button */}
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => handleInitiateToggle(!isMaintenanceActive)}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-2 ${
                isMaintenanceActive
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isMaintenanceActive ? 'Restore System Live' : 'Activate Shutdown'}</span>
            </button>
          </div>

          {/* Role Status Matrix */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase text-slate-400">Target Role Impact Status</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Admin Card */}
              <div className={`p-3 rounded-xl border flex flex-col gap-1 ${
                isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Admin Role</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-mono font-bold">EXEMPT</span>
                </div>
                <span className="text-[11px] text-slate-400">May full access kahit naka-shutdown.</span>
              </div>

              {/* Inventory Card */}
              <div className={`p-3 rounded-xl border flex flex-col gap-1 ${
                isMaintenanceActive
                  ? (isDark ? 'bg-rose-950/30 border-rose-900/60' : 'bg-rose-50/80 border-rose-200')
                  : (isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-200')
              }`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Inventory Staff</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    isMaintenanceActive ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {isMaintenanceActive ? '404 BLOCKED' : 'ACTIVE'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {isMaintenanceActive ? 'Makakakita ng 404 / Shutdown screen.' : 'Normal access.'}
                </span>
              </div>

              {/* Viewer Card */}
              <div className={`p-3 rounded-xl border flex flex-col gap-1 ${
                isMaintenanceActive
                  ? (isDark ? 'bg-rose-950/30 border-rose-900/60' : 'bg-rose-50/80 border-rose-200')
                  : (isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-200')
              }`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Viewer Role</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    isMaintenanceActive ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {isMaintenanceActive ? '404 BLOCKED' : 'ACTIVE'}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {isMaintenanceActive ? 'Makakakita ng 404 / Shutdown screen.' : 'Normal access.'}
                </span>
              </div>

            </div>
          </div>

          {/* Advisory Announcement Message Form */}
          <form onSubmit={handleInitiateSaveMessage} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#ff6600]" />
                <span>Custom Maintenance Advisory Announcement</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  isDark ? 'border-slate-700 hover:bg-slate-800 text-indigo-400' : 'border-slate-200 hover:bg-slate-50 text-indigo-600'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview 404 Screen</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="Halimbawa: System update and ledger sync is ongoing. All transactions are temporarily suspended until further notice."
              className={`w-full p-3 text-xs rounded-xl border focus:outline-none transition-colors ${
                isDark ? 'bg-[#141622] border-slate-700 text-slate-200 focus:border-[#ff6600]' : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#18174e]'
              }`}
            />

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#ff6600] hover:bg-[#e05a00] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save Advisory Announcement"}
              </button>
            </div>
          </form>

        </div>

        {/* Right 1 Col: Info, Protocols, Logs */}
        <div className="flex flex-col gap-6">
          
          {/* Server Context Card */}
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800' : 'bg-white border-slate-100'} p-5 rounded-2xl border shadow-sm flex flex-col gap-3.5 text-xs`}>
            <div className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-2 flex items-center gap-2 font-bold`}>
              <Server className="w-4 h-4 text-[#ff6600]" />
              <span>System Node Parameters</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Environment Mode:</span>
              <span className="font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-500/10 border border-slate-500/20 text-indigo-400">
                {import.meta.env.MODE}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Maintenance Protocol:</span>
              <span className={`font-mono font-bold uppercase ${isMaintenanceActive ? 'text-rose-500' : 'text-emerald-500'}`}>
                {isMaintenanceActive ? 'ENGAGED' : 'STANDBY'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Last Modified By:</span>
              <span className="font-semibold">{updatedBy || 'System Admin'}</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Last Status Change:</span>
              <span className="font-mono text-[11px]">
                {lastUpdated ? new Date(lastUpdated).toLocaleString() : '—'}
              </span>
            </div>
          </div>

          {/* Protocol Alert Box */}
          <div className={`p-4 rounded-2xl border flex flex-col gap-2 ${
            isDark ? 'bg-amber-950/20 border-amber-900/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <span className="text-xs font-bold uppercase flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span>Administrative Guideline</span>
            </span>
            <p className="text-[11px] leading-relaxed opacity-90">
              Kapag naka-on ang shutdown, hindi makakapag-create o modify ng inventory records ang standard staff. Tanging mga account na may <strong>Admin</strong> role ang pwedeng mag-login at mag-navigate sa administrative portal upang gumawa ng database updates o data restorations.
            </p>
          </div>

        </div>

      </div>

      {/* Confirmation Dialog for Toggling Shutdown */}
      {isConfirmDialogOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col gap-4 animate-in zoom-in-95 duration-200`}>
            
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                pendingToggleValue ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'
              }`}>
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  {pendingToggleValue ? 'Confirm System Shutdown / Lockout' : 'Restore Live System Access'}
                </h3>
                <p className="text-xs text-slate-400">
                  {pendingToggleValue 
                    ? 'Lahat ng Inventory at Viewer accounts ay agad mai-intercept ng 404 screen.' 
                    : 'Muling mabubuksan ang buong inventory system para sa lahat ng users.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmDialogOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer ${
                  pendingToggleValue ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {pendingToggleValue ? 'Proceed with Shutdown' : 'Restore Live Access'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Dialog for Saving Advisory Message */}
      {isConfirmMessageDialogOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-md p-6 shadow-2xl relative flex flex-col gap-4 animate-in zoom-in-95 duration-200`}>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ff6600]/20 text-[#ff6600] flex items-center justify-center shrink-0">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">
                  Confirm Advisory Announcement Broadcast
                </h3>
                <p className="text-xs text-slate-400">
                  Kumpirmasyon bago i-save at i-broadcast ang mensahe.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-900/40 p-3 rounded-xl border border-slate-800">
              Sigurado ka bang nais mong i-update ang advisory announcement? Agad itong maipapakita sa 404 / Shutdown screen ng lahat ng Inventory at Viewer accounts.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmMessageDialogOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveMessage}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#ff6600] hover:bg-[#e05a00] transition-all shadow-md cursor-pointer"
              >
                Confirm &amp; Broadcast
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Preview 404 Modal */}
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
