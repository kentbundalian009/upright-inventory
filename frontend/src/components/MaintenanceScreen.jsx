import React, { useState } from 'react';
import { ShieldAlert, RefreshCw, LogOut, AlertTriangle, Lock, ServerOff, Terminal, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.MODE === 'production'
  ? 'https://one-inventory.onrender.com/api'
  : 'http://localhost:5000/api';

function MaintenanceScreen({ maintenanceData, onCheckStatus }) {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    try {
      if (onCheckStatus) {
        await onCheckStatus();
      } else {
        const res = await axios.get(`${API_BASE_URL}/system/maintenance`);
        if (!res.data.isMaintenanceActive) {
          window.location.reload();
        }
      }
    } catch (err) {
      console.error("Status check error:", err);
    } finally {
      setTimeout(() => setChecking(false), 600);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const userRole = localStorage.getItem("SystemRole") || "Viewer";
  const userFullname = localStorage.getItem("Fullname") || "User";

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 sm:p-6 select-none ${isDark ? 'bg-[#090b10] text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
      {/* Background ambient accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-[140px] ${isDark ? 'bg-rose-950/40' : 'bg-rose-200/50'}`} />
        <div className={`absolute bottom-1/4 left-1/3 w-80 h-80 rounded-full blur-[120px] ${isDark ? 'bg-amber-950/30' : 'bg-amber-100/60'}`} />
      </div>

      <div className={`relative w-full max-w-xl rounded-3xl border shadow-2xl p-6 sm:p-10 flex flex-col items-center text-center gap-6 backdrop-blur-xl ${
        isDark ? 'bg-[#0f121d]/90 border-slate-800 shadow-rose-950/20' : 'bg-white/95 border-slate-200 shadow-slate-300'
      }`}>
        
        {/* Top Glitch Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider border border-rose-500/30 bg-rose-500/10 text-rose-500 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span>HTTP 404 &bull; Service Shutdown</span>
        </div>

        {/* Big Stylized 404 / Lock Visual */}
        <div className="relative">
          <div className={`text-7xl sm:text-8xl font-black font-mono tracking-tighter select-none ${
            isDark ? 'text-slate-800/80' : 'text-slate-200'
          }`}>
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 rounded-2xl bg-rose-500 text-white shadow-xl shadow-rose-500/30 animate-bounce duration-1000">
              <ServerOff className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
          </div>
        </div>

        {/* Headline & Explanation */}
        <div className="flex flex-col gap-2">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Inventory & Viewer Access Suspended
          </h1>
          <p className={`text-xs sm:text-sm leading-relaxed max-w-md ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Ang system ay kasalukuyang nasa <strong>Maintenance &amp; Shutdown Mode</strong> na itinakda ng pamunuan. Pansamantalang nakasara ang access para sa <span className="font-bold text-rose-500 underline underline-offset-2">{userRole}</span> role.
          </p>
        </div>

        {/* Admin Announcement Message Box */}
        <div className={`w-full rounded-2xl p-4 border text-left flex flex-col gap-2 ${
          isDark ? 'bg-[#141827] border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-400">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#ff6600]" /> Admin Advisory
            </span>
            {maintenanceData?.updatedAt && (
              <span className="font-mono text-[10px]">
                {new Date(maintenanceData.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <p className={`text-xs sm:text-sm italic font-medium leading-relaxed ${
            isDark ? 'text-amber-300' : 'text-amber-800'
          }`}>
            &ldquo;{maintenanceData?.maintenanceMessage || "Scheduled system update and database ledger maintenance are underway. Transactions are temporarily frozen."}&rdquo;
          </p>
        </div>

        {/* Real-time Subsystem Status Grid */}
        <div className={`w-full grid grid-cols-3 gap-2 text-center text-[11px] font-mono p-3 rounded-xl border ${
          isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50/80 border-slate-200/70'
        }`}>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase text-slate-400 font-sans font-bold">Inventory API</span>
            <span className="text-rose-500 font-bold">OFFLINE</span>
          </div>
          <div className="flex flex-col gap-0.5 border-x border-slate-700/30 px-1">
            <span className="text-[9px] uppercase text-slate-400 font-sans font-bold">Viewer Portal</span>
            <span className="text-rose-500 font-bold">OFFLINE</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] uppercase text-slate-400 font-sans font-bold">Admin Console</span>
            <span className="text-emerald-500 font-bold">EXEMPTED</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={checking}
            className="flex-1 w-full flex items-center justify-center gap-2 bg-[#ff6600] hover:bg-[#e05a00] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Status...' : 'Check If System Is Back'}</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500">
          Logged in as: <span className="font-semibold">{userFullname}</span> ({userRole})
        </div>
      </div>
    </div>
  );
}

export default MaintenanceScreen;
