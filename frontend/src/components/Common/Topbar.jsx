import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// 🌟 Idinagdag ang CheckCircle2 at X mula sa lucide-react para sa Toast
import { LogOut, CheckCircle2, X } from 'lucide-react';

function Topbar() {
  const [currentDateTime, setCurrentDateTime] = useState('');
  const navigate = useNavigate();

  // 🌟 MGA BAGONG STATES PARA SA MODAL AT TOAST
  const [successMessage, setSuccessMessage] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    actionType: 'archive' // 'archive' (para sa rose color gaya ng logout) o 'confirm'
  });

  // Target function na tatakbo kapag pinindot ang "Confirm" sa modal
  const [handleConfirmAction, setHandleConfirmAction] = useState(() => {});

  // Effect para sa petsa at oras
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }) + ' ' + now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      setCurrentDateTime(formatted);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // 🌟 EFFECT: Kusang mawawala ang Toast pagkatapos ng 3 segundo
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Aktwal na proseso ng pag-logout (Tatakbo lang kapag nag-confirm sa modal)
  const executeLogout = async () => {
    setIsConfirmModalOpen(false); // Isara agad ang modal

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        localStorage.clear();
        setSuccessMessage("Successfully logged out!");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500); // Bigyan ng kaunting oras para makita ang toast bago mag-redirect
        return;
      }

      // 1. Alamin muna kung production o local development ang tumatakbo
const API_BASE_URL = import.meta.env.MODE === 'production'
    ? 'https://one-inventory.onrender.com'
    : 'http://localhost:5000';

// 2. Tawagin ang backend logout endpoint gamit ang dynamic URL
const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
});

      if (response.ok) {
        console.log("Logout backend success!");
      }
      
    } catch (error) {
      console.error("Failed to clear cloud session:", error);
    }

    // Linisin ang storage at ipakita ang success toast bago mag-redirect
    localStorage.clear(); 
    setSuccessMessage("Successfully logged out!");
    
    setTimeout(() => {
      window.location.href = "/login"; 
    }, 1500);
  };

  // Trigger button handler - Imbes na confirm(), bubuksan nito ang Custom Modal
  const handleLogoutClick = () => {
    setConfirmModalConfig({
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out? This will end your current session.',
      actionType: 'archive' // Gagamit ng kulay Rose/Pula para sa logout action
    });
    setHandleConfirmAction(() => executeLogout);
    setIsConfirmModalOpen(true);
  };

  return (
    <>
      <header className="w-full h-14 bg-white flex justify-between items-center pl-14 sm:pl-6 px-4 sm:px-6 md:px-8 border-b border-slate-100 shadow-sm z-30 flex-shrink-0 select-none">      
        
        {/* DATE AT TIME SECTION */}
        <div className="text-[11px] sm:text-[13px] md:text-[14px] font-semibold text-slate-700 tracking-wide font-sans flex items-center gap-2">
          {currentDateTime || "Wednesday, June 24, 2026 07:16 PM"}
        </div>

        {/* LOGOUT BUTTON SECTION */}
        <button
          onClick={handleLogoutClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors cursor-pointer border border-red-100"
        >
          <LogOut size={16} className="flex-shrink-0" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </header>

      {/* 🎉 SUCCESS NOTIFICATION TOAST */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

{/* 🛑 CUSTOM CONFIRMATION MODAL */}
{isConfirmModalOpen && (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        {/* Eksaktong katulad ng standard container (max-w-md, rounded-2xl, p-6, at zoom animation) */}
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl relative flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <h3 className="font-bold text-slate-800 text-base">
                    {confirmModalConfig.title}
                </h3>
            </div>

            {/* System Inventory Protocol Notification Card (Binalik para sa consistency ng height at visual weights) */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 mt-3 shrink-0">
                <span className="block text-xs font-bold text-amber-800 uppercase mb-1">
                    * System Action Protocol *
                </span>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                    Please review the operation context. Confirming this step commits changes directly to the live system registry.
                </p>
            </div>

            {/* Modal Body Message */}
            <div className="mt-4 flex-1">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {confirmModalConfig.message}
                </p>
            </div>

            {/* Modal Bottom Actions (Pure #18174e at Slate-100 gamit ang standard buttons mo) */}
            <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100 shrink-0">
                <button 
                    type="button" 
                    onClick={() => setIsConfirmModalOpen(false)} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                >
                    Cancel
                </button>
                <button 
                    type="button" 
                    onClick={handleConfirmAction} 
                    className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md"
                >
                    Confirm
                </button>
            </div>

        </div>
    </div>
)}
    </>
  );
}

export default Topbar;