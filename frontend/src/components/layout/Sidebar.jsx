import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Truck,
  Layers,
  History,
  Briefcase,
  Users,
  Activity,
  FileSpreadsheet,
  ArrowDownCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Settings,
  Menu,
  X,
  Building2,
  Database,
  Power,
  Share2,
  Boxes
} from "lucide-react";

const API_BASE_URL = '/api';

function Sidebar({ activeTab, setActiveTab, userRole }) {
  const { isDark } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pendingOutboundCount, setPendingOutboundCount] = useState(0);
  const [pendingSuppliesCount, setPendingSuppliesCount] = useState(0);

  // Close mobile drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen]);

  // Auto-close mobile drawer when window expands past md breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileOpen]);

  const fetchPendingOutboundCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_BASE_URL}/packing-lists`, { headers });
      if (res.data && Array.isArray(res.data)) {
        const records = res.data;
        const completedPlNumbers = records
          .filter(r => r.transactionType?.toLowerCase() === "outbound" && r.referencePlNo)
          .map(r => r.referencePlNo.toString().replace("REF: ", "").trim().toLowerCase());

        const activeReserves = records.filter(r =>
          !r.isVoided &&
          r.transactionType?.toLowerCase() === "reserve" &&
          !completedPlNumbers.includes(r.plNo?.toString().trim().toLowerCase())
        );
        setPendingOutboundCount(activeReserves.length);
      }
    } catch (err) {
      console.error("Error fetching pending outbound count for sidebar:", err);
    }
  }, []);

  const fetchPendingSuppliesCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_BASE_URL}/supplies-movements`, { headers });
      if (res.data && Array.isArray(res.data)) {
        const activeBorrows = res.data.filter(r =>
          (r.transactionType === "Borrow" || r.transactionType === "Reserved") && r.isReturned === false
        );
        setPendingSuppliesCount(activeBorrows.length);
      }
    } catch (err) {
      console.error("Error fetching pending supplies movements count for sidebar:", err);
    }
  }, []);

  useEffect(() => {
    fetchPendingOutboundCount();
    fetchPendingSuppliesCount();

    const handleOutboundUpdate = () => {
      fetchPendingOutboundCount();
    };

    const handleSuppliesUpdate = () => {
      fetchPendingSuppliesCount();
    };

    window.addEventListener('packingListUpdated', handleOutboundUpdate);
    window.addEventListener('suppliesMovementUpdated', handleSuppliesUpdate);
    window.addEventListener('focus', handleOutboundUpdate);
    window.addEventListener('focus', handleSuppliesUpdate);

    const interval = setInterval(() => {
      fetchPendingOutboundCount();
      fetchPendingSuppliesCount();
    }, 15000);

    return () => {
      window.removeEventListener('packingListUpdated', handleOutboundUpdate);
      window.removeEventListener('suppliesMovementUpdated', handleSuppliesUpdate);
      window.removeEventListener('focus', handleOutboundUpdate);
      window.removeEventListener('focus', handleSuppliesUpdate);
      clearInterval(interval);
    };
  }, [fetchPendingOutboundCount, fetchPendingSuppliesCount]);

  const getMenuItems = () => {
    const defaultMenuItems = [
      { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Inventory'], section: 'main' },

      { id: 'user-management', name: 'User Management', icon: Users, roles: ['Admin'], section: 'admin' },
      { id: 'user-activity', name: 'User Activity', icon: Activity, roles: ['Admin'], section: 'admin' },
      { id: 'shared-viewers', name: 'Viewer Links', icon: Share2, roles: ['Admin'], section: 'admin' },
      { id: 'admin-backup', name: 'Data Backup', icon: Database, roles: ['Admin'], section: 'admin' },
      { id: 'admin-settings', name: 'System Maintenance', icon: Power, roles: ['Admin'], section: 'admin' },

      { id: 'inbound-raw-mat', name: 'Inbound Materials', icon: ArrowDownCircle, roles: ['Inventory'], section: 'rackings' },
      { id: 'work-in-progress', name: 'Work In Progress (WIP)', icon: TrendingUp, roles: ['Inventory'], section: 'rackings' },
      { id: 'outbound-products', name: 'Outbound Materials', icon: Truck, roles: ['Inventory'], section: 'rackings' },

      { id: 'consumables', name: 'Consumables Movements', icon: ShoppingBag, roles: ['Inventory', 'Admin'], section: 'supplies' },
      { id: 'supplies-movements', name: 'Equipment Movements', icon: History, roles: ['Inventory', 'Admin'], section: 'supplies' },

      { id: 'raw-materials', name: 'Rackings', icon: Layers, roles: ['Inventory', 'Admin'], section: 'records' },
      { id: 'supplies', name: 'Tools & Equipments', icon: Package, roles: ['Inventory', 'Admin'], section: 'records' },
      { id: 'consumables-records', name: 'Consumables', icon: Boxes, roles: ['Inventory', 'Admin'], section: 'records' },
      { id: 'client-records', name: 'Information (Modules)', icon: Building2, roles: ['Inventory', 'Admin'], section: 'records' },

      { id: 'reports', name: 'Reports', icon: FileSpreadsheet, roles: ['Inventory'], section: 'reports' },

      { id: 'settings', name: 'Settings', icon: Settings, roles: ['Admin', 'Inventory'], section: 'main' },
    ];

    return defaultMenuItems.filter(item => {
      if (item.id === 'reports' && userRole === 'Admin') return false;
      return item.roles.includes(userRole);
    });
  };

  const allowedMenuItems = getMenuItems();

  const handleDesktopCollapse = () => {
    setIsCollapsed(!isCollapsed);
    window.dispatchEvent(new Event('sidebarToggle'));
  };

  const renderSectionHeader = (currentSection, index) => {
    if (isCollapsed) return null;

    const previousSection = index > 0 ? allowedMenuItems[index - 1].section : null;
    if (currentSection === previousSection) return null;

    switch (currentSection) {
      case 'admin':
        return <div className="text-[10px] font-bold text-[#ff6600] uppercase px-3 pt-2 pb-1">Admin Controls</div>;
      case 'rackings':
        return <div className={`text-[10px] font-bold text-[#ff6600] uppercase px-3 pt-2 pb-1 border-t ${isDark ? 'border-slate-800/80' : 'border-white/5'} mt-1`}>Process Management</div>;
      case 'records':
        return <div className={`text-[10px] font-bold text-[#ff6600] uppercase px-3 pt-2 pb-1 border-t ${isDark ? 'border-slate-800/80' : 'border-white/5'} mt-1`}>Records Management</div>;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Mobile Floating Toggle Button */}
      <div className="fixed top-2.5 left-2.5 z-50 md:hidden">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}
          className={`p-2.5 ${isDark ? 'bg-[#0f111a] border-slate-800 text-white' : 'bg-[#18174e] border-white/10 text-white'} rounded-xl shadow-lg border cursor-pointer active:scale-95 transition-transform flex items-center justify-center`}
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 animate-in fade-in"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 md:sticky h-screen max-h-screen
        ${isDark
          ? 'bg-gradient-to-b from-[#0a0b10] via-[#0e1017] to-[#07070b] border-r border-slate-800/80 text-slate-100'
          : 'bg-gradient-to-b from-[#18174e] via-[#1b1a56] to-[#12113d] border-r border-white/10 text-white'
        } flex flex-col
        transition-all duration-300 shadow-2xl md:shadow-none
        
        ${isMobileOpen ? 'w-64 max-w-[85vw] translate-x-0' : 'w-64 max-w-[85vw] -translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>

        {/* Desktop Collapse Toggle Button */}
        <div className="absolute -right-3.5 top-6 z-50 hidden md:block">
          <button
            onClick={handleDesktopCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-7 h-7 bg-[#ff6600] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 border border-white/20 cursor-pointer transition-transform"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="flex flex-col overflow-hidden mt-12 md:mt-0 h-full">
          {/* Logo & System Brand Header */}
          <div className={`py-3.5 px-4 flex flex-col items-center border-b ${isDark ? 'border-slate-800/80 bg-black/30' : 'border-white/10 bg-white/5'} backdrop-blur-sm shrink-0 relative`}>
            {/* Mobile close button inside drawer header */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden absolute top-2 right-2 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>

            <div className={`transition-all duration-300 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'} rounded-full p-1 flex items-center justify-center shadow-md overflow-hidden ${isCollapsed ? "md:w-9 md:h-9 w-12 h-12" : "w-12 h-12"}`}>
              <img
                src="/cropped_circle_image.png"
                alt="logo"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>

            <div className={`text-center mt-1.5 ${isCollapsed ? 'md:hidden block' : 'block'}`}>
              <h1 className="font-black text-sm uppercase text-white tracking-wide leading-tight">USSP INVENTORY</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase opacity-90 leading-tight">Upright Storage Solutions</p>
              <span className="inline-block text-[9px] bg-[#ff6600]/20 text-[#ff8533] px-2.5 py-0.5 rounded-full font-bold uppercase border border-[#ff6600]/30 mt-1">
                {userRole}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="overflow-y-auto py-2.5 space-y-1 px-3 custom-scrollbar flex-1 pb-8 md:pb-4">
            {allowedMenuItems.map((item, index) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id ||
                (item.id === 'consumables-records' && (activeTab === 'inventoryconsumables' || activeTab === 'inventory-consumables'));

              return (
                <React.Fragment key={item.id}>
                  {renderSectionHeader(item.section, index)}

                  <button
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileOpen(false);
                    }}
                    title={isCollapsed ? `${item.name}${item.id === 'outbound-products' && pendingOutboundCount > 0 ? ` (${pendingOutboundCount} pending packed)` : ''}${item.id === 'supplies-movements' && pendingSuppliesCount > 0 ? ` (${pendingSuppliesCount} active borrow/reserved)` : ''}` : ''}
                    className={`w-full whitespace-nowrap flex items-center gap-3 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all relative cursor-pointer group ${isCollapsed ? 'md:justify-center' : ''} ${isActive
                      ? isDark
                        ? 'bg-[#181a26] text-white font-bold shadow-sm border border-slate-700/60'
                        : 'bg-[#28267a] text-white font-bold shadow-sm border border-white/10'
                      : isDark
                        ? 'text-slate-400 hover:bg-white/5 hover:text-white'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#ff6600] rounded-r-full shadow-sm" />
                    )}

                    <div className="relative flex-shrink-0 flex items-center justify-center">
                      <IconComponent size={17} className={`transition-transform ${isActive ? 'text-[#ff8533] scale-105' : 'group-hover:scale-105'}`} />
                      {item.id === 'outbound-products' && pendingOutboundCount > 0 && isCollapsed && (
                        <span className={`hidden md:flex absolute -top-1.5 -right-2 items-center justify-center min-w-[17px] h-[17px] px-0.5 text-[9px] font-black text-white bg-yellow-400 rounded-full ring-2 ${isDark ? 'ring-[#0a0b10]' : 'ring-[#18174e]'} shadow-sm shadow-yellow-400/40`}>
                          {pendingOutboundCount > 99 ? '99+' : pendingOutboundCount}
                        </span>
                      )}
                      {item.id === 'supplies-movements' && pendingSuppliesCount > 0 && isCollapsed && (
                        <span className={`hidden md:flex absolute -top-1.5 -right-2 items-center justify-center min-w-[17px] h-[17px] px-0.5 text-[9px] font-black text-white bg-yellow-400 rounded-full ring-2 ${isDark ? 'ring-[#0a0b10]' : 'ring-[#18174e]'} shadow-sm shadow-yellow-400/40`}>
                          {pendingSuppliesCount > 99 ? '99+' : pendingSuppliesCount}
                        </span>
                      )}
                    </div>

                    <span className={`truncate whitespace-nowrap flex-1 text-left ${isCollapsed ? 'md:hidden block' : 'block'}`}>{item.name}</span>

                    {item.id === 'outbound-products' && pendingOutboundCount > 0 && (
                      <span className={`ml-auto items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black text-white bg-yellow-400 rounded-full shadow-md shadow-yellow-400/30 shrink-0 ${isCollapsed ? 'md:hidden flex' : 'flex'}`}>
                        {pendingOutboundCount > 99 ? '99+' : pendingOutboundCount}
                      </span>
                    )}
                    {item.id === 'supplies-movements' && pendingSuppliesCount > 0 && (
                      <span className={`ml-auto items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black text-white bg-yellow-400 rounded-full shadow-md shadow-yellow-400/30 shrink-0 ${isCollapsed ? 'md:hidden flex' : 'flex'}`}>
                        {pendingSuppliesCount > 99 ? '99+' : pendingSuppliesCount}
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
