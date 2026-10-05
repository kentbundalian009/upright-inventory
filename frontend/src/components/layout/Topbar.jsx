import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, CheckCircle2, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

function Topbar() {
  const { isDark } = useTheme();
  const [timeStr, setTimeStr] = useState('');
  const [shortDateStr, setShortDateStr] = useState('');
  const [fullDateStr, setFullDateStr] = useState('');
  const navigate = useNavigate();

  const [successMessage, setSuccessMessage] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    actionType: 'archive'
  });

  const [handleConfirmAction, setHandleConfirmAction] = useState(() => {});

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }));
      setShortDateStr(now.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }));
      setFullDateStr(now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const executeLogout = async () => {
    setIsConfirmModalOpen(false);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        localStorage.clear();
        setSuccessMessage("Successfully logged out!");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
        return;
      }

      const API_BASE_URL = import.meta.env.MODE === 'production'
        ? 'https://one-inventory.onrender.com'
        : 'http://localhost:5000';

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

    localStorage.clear(); 
    setSuccessMessage("Successfully logged out!");
    
    setTimeout(() => {
      window.location.href = "/login"; 
    }, 1500);
  };

  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const fetchUserProfile = async () => {
    const storedUserStr = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (!storedUserStr) return;

    try {
      const parsedUser = JSON.parse(storedUserStr);
      setCurrentUser(parsedUser);

      const userId = parsedUser.id || parsedUser._id || (parsedUser.user && (parsedUser.user.id || parsedUser.user._id));
      if (userId && token) {
        const API_BASE_URL = import.meta.env.MODE === 'production'
          ? 'https://one-inventory.onrender.com'
          : 'http://localhost:5000';

        const response = await fetch(`${API_BASE_URL}/api/users/profile/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const freshUser = await response.json();
          setCurrentUser(freshUser);
          localStorage.setItem("user", JSON.stringify({ ...parsedUser, ...freshUser }));
        }
      }
    } catch (err) {
      console.error("Error loading topbar user profile:", err);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    const handleUserUpdate = () => fetchUserProfile();
    window.addEventListener("userUpdated", handleUserUpdate);
    window.addEventListener("storage", handleUserUpdate);
    return () => {
      window.removeEventListener("userUpdated", handleUserUpdate);
      window.removeEventListener("storage", handleUserUpdate);
    };
  }, []);

  const handleLogoutClick = () => {
    setConfirmModalConfig({
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out? This will end your current session.',
      actionType: 'archive'
    });
    setHandleConfirmAction(() => executeLogout);
    setIsConfirmModalOpen(true);
  };

  const userRole = currentUser?.SystemRole || localStorage.getItem("SystemRole") || "Inventory";
  const userName = currentUser?.Fullname || currentUser?.FullName || currentUser?.Username || "System User";
  const userInitial = userName.charAt(0).toUpperCase();
  const profileImage = currentUser?.ProfileImage;

  return (
    <>
      <header className={`w-full h-14 ${
        isDark
          ? 'bg-[#0b0c13]/95 border-slate-800/90 shadow-md text-slate-200'
          : 'bg-white/90 border-slate-200/80 shadow-sm text-slate-800'
      } backdrop-blur-md flex justify-between items-center pl-14 sm:pl-6 px-3 sm:px-6 md:px-8 border-b z-30 flex-shrink-0 select-none transition-colors duration-200`}>      
        
        {/* Adaptive Real-Time Date/Time Badge */}
        <div className={`flex items-center gap-2 sm:gap-2.5 ${
          isDark
            ? 'bg-[#121420] border-slate-800 text-slate-300'
            : 'bg-slate-50 border-slate-200/70 text-slate-700'
        } border px-2.5 sm:px-3.5 py-1.5 rounded-full shadow-inner shrink-0`}>
          <span className="text-[11px] sm:text-xs font-semibold font-mono tracking-tight whitespace-nowrap">
            <span className="hidden xl:inline">{fullDateStr || "Monday, June 24, 2026"} • </span>
            <span className="hidden sm:inline xl:hidden">{shortDateStr || "Mon, Jun 24"} • </span>
            <span>{timeStr || "07:16 PM"}</span>
          </span>
        </div>

        {/* User Profile and Logout */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className={`flex items-center gap-1.5 sm:gap-2 ${
            isDark
              ? 'bg-[#121420] border-slate-800'
              : 'bg-slate-50 border-slate-200/80'
          } border px-2 sm:px-2.5 py-1 rounded-xl shadow-sm max-w-[150px] xs:max-w-[190px] sm:max-w-none`}>
            {profileImage ? (
              <>
                <img
                  src={
                    profileImage.startsWith('http') || profileImage.startsWith('data:')
                      ? profileImage
                      : import.meta.env.MODE === 'production'
                        ? profileImage
                        : `${window.location.protocol}//${window.location.hostname}:5000${profileImage}`
                  }
                  alt={userName}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextElementSibling) {
                      e.target.nextElementSibling.style.display = 'flex';
                    }
                  }}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover shrink-0 border border-[#18174e]/20"
                />
                <div style={{ display: 'none' }} className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#18174e] text-white items-center justify-center text-xs font-bold shrink-0">
                  {userInitial}
                </div>
              </>
            ) : (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#18174e] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {userInitial}
              </div>
            )}
            <div className="flex flex-col text-left overflow-hidden min-w-0">
              <span className={`text-[11px] sm:text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'} leading-tight truncate max-w-[70px] xs:max-w-[100px] sm:max-w-[160px] md:max-w-[200px]`}>
                {userName}
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold text-[#ff6600] uppercase leading-tight truncate">
                {userRole}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogoutClick}
            title="Logout"
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-rose-500 ${
              isDark
                ? 'bg-rose-950/30 hover:bg-rose-900/50 border-rose-900/60'
                : 'bg-rose-50/80 hover:bg-rose-100/90 border-rose-200/80'
            } border transition-all cursor-pointer shadow-sm active:scale-95 shrink-0`}
          >
            <LogOut size={15} className="shrink-0" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300 max-w-[90vw]">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm sm:max-w-md p-5 sm:p-6 shadow-2xl relative flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                {confirmModalConfig.title}
              </h3>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 mt-3 shrink-0">
              <span className="block text-[11px] sm:text-xs font-bold text-amber-800 uppercase mb-1">
                * System Action Protocol *
              </span>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Please review the operation context. Confirming this step commits changes directly to the live system registry.
              </p>
            </div>

            <div className="mt-4 flex-1">
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                {confirmModalConfig.message}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100 shrink-0">
              <button 
                type="button" 
                onClick={() => setIsConfirmModalOpen(false)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-3.5 sm:px-4 rounded-lg text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleConfirmAction} 
                className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-3.5 sm:px-4 rounded-lg text-xs sm:text-sm transition-colors cursor-pointer shadow-md"
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
