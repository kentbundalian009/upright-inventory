import React, { useState } from 'react';
import { RefreshCw, LogOut, ArrowRight, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.MODE === 'production'
  ? 'https://upright-inventory.onrender.com/api'
  : 'http://localhost:5000/api';

function MaintenanceScreen({ maintenanceData, onCheckStatus }) {
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#0b0a26] via-[#18174e] to-[#242270] text-white px-6 relative overflow-hidden pb-12 select-none font-sans">
      
      {/* Ambient background glow objects (Identical to Login.jsx) */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#ff6600]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* BRAND LOGO SECTION (Identical to Login.jsx) */}
      <div className="flex flex-col items-center text-center mb-8 relative z-10 animate-fade-in">
        <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 shadow-2xl mb-2">
          <div className="bg-white rounded-full p-2 flex items-center justify-center shadow-inner w-16 h-16">
            <img
              src="/cropped_circle_image.png"
              alt="logo"
              className="w-full h-full object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>
        <h1 className="font-black text-2xl uppercase text-white mt-3 drop-shadow-md">
          USSP INVENTORY
        </h1>
        <h2 className="text-[11px] font-bold text-slate-300 uppercase opacity-90 mt-0.5">
          Upright Storage Solutions PH
        </h2>
      </div>

      {/* MAIN CARD CONTAINER (Identical glass card to Login.jsx) */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-7 shadow-2xl relative z-10 flex flex-col gap-5">
        
        {/* Lockout / Status Pill Badge */}
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 border border-rose-500/40 text-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            404 &bull; System Maintenance &amp; Shutdown
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center">
          <h2 className="text-lg font-black uppercase text-white tracking-tight">
            Access Temporarily Suspended
          </h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            The system is currently unavailable for the <span className="font-bold text-[#ff8533] uppercase">{userRole}</span> role due to ongoing administrative maintenance or ledger synchronization.
          </p>
        </div>

        {/* Admin Advisory Announcement Box */}
        <div className="rounded-2xl bg-white/10 border border-white/15 p-4 flex flex-col gap-1.5 text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-[#ff6600]" />
            Admin Advisory Notice
          </span>
          <p className="text-xs text-slate-200 italic leading-relaxed">
            &ldquo;{maintenanceData?.maintenanceMessage || "Scheduled system update and database ledger maintenance are underway. Transactions are temporarily frozen."}&rdquo;
          </p>
        </div>

        {/* User Context Tag */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-center text-xs text-slate-300">
          Account: <span className="font-semibold text-white">{userFullname}</span> &bull; Role: <span className="font-bold text-[#ff8533]">{userRole}</span>
        </div>

        {/* Action Buttons (Matches Login Gradient Button) */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={checking}
            className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#ff6600] to-[#ff8533] py-3.5 px-8 text-sm font-bold text-white shadow-lg hover:shadow-orange-500/25 active:scale-[0.98] transition-all cursor-pointer w-full disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Status...' : 'Check If System Is Back Online'}</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 py-2.5 px-6 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer w-full"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Sign Out from Session</span>
          </button>
        </div>

      </div>

      {/* SECURITY NOTICE FOOTER (Identical to Login.jsx) */}
      <p className="mt-8 text-[12px] font-medium text-slate-400 text-center relative z-10">
        Corporate Security Protocols Enforced &bull; Encrypted Session
      </p>

      {/* SYSTEM COPYRIGHT FOOTER (Identical to Login.jsx) */}
      <div className="absolute bottom-4 left-0 right-0 text-center px-4 z-10">
        <p className="text-[10px] font-semibold text-slate-400 tracking-wide">
          Copyright &copy; 2026 Upright Storage Solutions PH. All Rights Reserved.
        </p>
      </div>

    </div>
  );
}

export default MaintenanceScreen;
