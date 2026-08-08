import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, CheckCircle2, X } from 'lucide-react';

function Topbar() {
  const [currentDateTime, setCurrentDateTime] = useState('');
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
      <header className="w-full h-14 bg-white/90 backdrop-blur-md flex justify-between items-center pl-14 sm:pl-6 px-4 sm:px-6 md:px-8 border-b border-slate-200/80 shadow-sm z-30 flex-shrink-0 select-none">      
        
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/70 px-3.5 py-1.5 rounded-full shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] sm:text-[12px] font-semibold text-slate-700 font-mono tracking-tight">
            {currentDateTime || "Wednesday, June 24, 2026 07:16 PM"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-sm">
            {profileImage ? (
              <img
                src={
                  profileImage.startsWith('http')
                    ? profileImage
                    : import.meta.env.MODE === 'production'
                      ? profileImage
                      : `${window.location.protocol}//${window.location.hostname}:5000${profileImage}`
                }
                alt={userName}
                className="w-7 h-7 rounded-full object-cover shrink-0 border border-[#18174e]/20"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#18174e] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {userInitial}
              </div>
            )}
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[130px] sm:max-w-[180px]">
                {userName}
              </span>
              <span className="text-[9px] font-bold text-[#ff6600] uppercase leading-tight">
                {userRole}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/80 hover:bg-rose-100/90 border border-rose-200/80 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            <LogOut size={15} className="flex-shrink-0" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

{isConfirmModalOpen && (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl relative flex flex-col animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <h3 className="font-bold text-slate-800 text-base">
                    {confirmModalConfig.title}
                </h3>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 mt-3 shrink-0">
                <span className="block text-xs font-bold text-amber-800 uppercase mb-1">
                    * System Action Protocol *
                </span>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                    Please review the operation context. Confirming this step commits changes directly to the live system registry.
                </p>
            </div>

            <div className="mt-4 flex-1">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {confirmModalConfig.message}
                </p>
            </div>

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
