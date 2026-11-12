import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  Package,
  Truck,
  Layers,
  Users,
  FileSpreadsheet,
  ArrowDownCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  Menu,
  X,
  Building2,
  Database,
  Boxes
} from "lucide-react";

const API_BASE_URL = '/api';

function Sidebar({ activeTab, setActiveTab, userRole }) {
  const { isDark } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pendingOutboundCount, setPendingOutboundCount] = useState(0);
  const [isRackingsOpen, setIsRackingsOpen] = useState(false);

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

  useEffect(() => {
    fetchPendingOutboundCount();

    const handleOutboundUpdate = () => {
      fetchPendingOutboundCount();
    };

    window.addEventListener('packingListUpdated', handleOutboundUpdate);
    window.addEventListener('focus', handleOutboundUpdate);

    const interval = setInterval(() => {
      fetchPendingOutboundCount();
    }, 15000);

    return () => {
      window.removeEventListener('packingListUpdated', handleOutboundUpdate);
      window.removeEventListener('focus', handleOutboundUpdate);
      clearInterval(interval);
    };
  }, [fetchPendingOutboundCount]);

  // Auto-open dropdown if one of the sub-items is currently active
  useEffect(() => {
    const rackingsSubIds = ['rackings-unit', 'inbound-raw-mat', 'work-in-progress', 'outbound-products'];
    if (rackingsSubIds.includes(activeTab)) {
      setIsRackingsOpen(true);
    }
  }, [activeTab]);

  const getMenuItems = () => {
    const defaultMenuItems = [
      { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Inventory', 'Purchasing'], section: 'main' },

      { id: 'user-management', name: 'User Management', icon: Users, roles: ['Admin'], section: 'admin' },
      { id: 'admin-backup', name: 'Data Backup', icon: Database, roles: ['Admin'], section: 'admin' },

      // 1. USSP Inventory (Pinagsama na ang Rackings Item, Tools & Equipments, at Consumables)
      {
        id: 'raw-materials',
        name: 'Rackings Item',
        icon: Layers,
        roles: ['Inventory', 'Purchasing'],
        section: 'ussp-inventory',
        subItems: [
          { id: 'rackings-unit', name: 'Rackings Unit', icon: Layers, roles: ['Inventory', 'Purchasing'] },
          { id: 'inbound-raw-mat', name: 'Inbound Materials', icon: ArrowDownCircle, roles: ['Inventory'] },
          { id: 'work-in-progress', name: 'Work In Progress (WIP)', icon: TrendingUp, roles: ['Inventory'] },
          { id: 'outbound-products', name: 'Outbound Materials', icon: Truck, roles: ['Inventory'] },
        ]
      },
      { id: 'supplies', name: 'Tools & Equipments', icon: Package, roles: ['Inventory', 'Purchasing'], section: 'ussp-inventory' },
      { id: 'consumables-records', name: 'Consumables', icon: Boxes, roles: ['Inventory', 'Purchasing'], section: 'ussp-inventory' },

      // 2. System Settings
      { id: 'client-records', name: 'Directory', icon: Building2, roles: ['Inventory'], section: 'system-settings' },
      { id: 'reports', name: 'Reports', icon: FileSpreadsheet, roles: ['Inventory', 'Purchasing'], section: 'system-settings' },
      { id: 'settings', name: 'Settings', icon: Settings, roles: ['Admin', 'Inventory', 'Purchasing'], section: 'system-settings' },
    ];

    return defaultMenuItems
      .filter(item => {
        if (item.id === 'reports' && userRole === 'Admin') return false;
        return item.roles.includes(userRole);
      })
      .map(item => {
        if (item.subItems) {
          return {
            ...item,
            subItems: item.subItems.filter(sub => sub.roles.includes(userRole))
          };
        }
        return item;
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
      case 'ussp-inventory':
        return <div className={`text-[10px] font-bold text-[#ff6600] uppercase px-3 pt-2 pb-1 border-t ${isDark ? 'border-slate-800/80' : 'border-white/5'} mt-1`}>USSP Inventory</div>;
      case 'system-settings':
        return <div className={`text-[10px] font-bold text-[#ff6600] uppercase px-3 pt-2 pb-1 border-t ${isDark ? 'border-slate-800/80' : 'border-white/5'} mt-1`}>System Settings</div>;
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
          <nav className="overflow-y-auto py-2.5 space-y-1 px-3 custom-scrollbar flex-1 pb-4">
            {allowedMenuItems.map((item, index) => {
              const IconComponent = item.icon;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isChildActive = hasSubItems && item.subItems.some(sub => sub.id === activeTab);
              const isActive = activeTab === item.id ||
                (item.id === 'consumables-records' && (activeTab === 'inventoryconsumables' || activeTab === 'inventory-consumables'));

              const hasOutboundChild = hasSubItems && item.subItems.some(sub => sub.id === 'outbound-products');
              const showParentOutboundBadge = hasOutboundChild && pendingOutboundCount > 0;

              return (
                <React.Fragment key={item.id}>
                  {renderSectionHeader(item.section, index)}

                  {/* Main Menu Item */}
                  <div className="relative flex items-center">
                    <button
                      onClick={() => {
                        setActiveTab(item.id);
                        if (hasSubItems) {
                          if (isCollapsed && window.innerWidth >= 768) {
                            setIsCollapsed(false);
                            window.dispatchEvent(new Event('sidebarToggle'));
                            setIsRackingsOpen(true);
                          } else {
                            setIsRackingsOpen(prev => !prev);
                          }
                        } else {
                          setIsMobileOpen(false);
                        }
                      }}
                      title={isCollapsed ? `${item.name}${showParentOutboundBadge ? ` (${pendingOutboundCount} pending packed)` : ''}` : ''}
                      className={`w-full whitespace-nowrap flex items-center gap-3 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-semibold transition-all relative cursor-pointer group ${isCollapsed ? 'md:justify-center' : ''} ${isActive
                        ? isDark
                          ? 'bg-[#181a26] text-white font-bold shadow-sm border border-slate-700/60'
                          : 'bg-[#28267a] text-white font-bold shadow-sm border border-white/10'
                        : isChildActive
                          ? isDark
                            ? 'bg-white/5 text-white font-bold'
                            : 'bg-white/10 text-white font-bold'
                          : isDark
                            ? 'text-slate-400 hover:bg-white/5 hover:text-white'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                      {(isActive || (isChildActive && isCollapsed)) && (
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#ff6600] rounded-r-full shadow-sm" />
                      )}

                      <div className="relative flex-shrink-0 flex items-center justify-center">
                        <IconComponent size={17} className={`transition-transform ${(isActive || isChildActive) ? 'text-[#ff8533] scale-105' : 'group-hover:scale-105'}`} />
                        {showParentOutboundBadge && isCollapsed && (
                          <span className="hidden md:block absolute -top-1 -right-1 w-2 h-2 bg-[#ff0000] rounded-full" />
                        )}
                      </div>

                      <div className={`flex items-center gap-2 min-w-0 flex-1 text-left ${isCollapsed ? 'md:hidden' : 'flex'}`}>
                        <span className="truncate whitespace-nowrap">{item.name}</span>
                        {showParentOutboundBadge && !isRackingsOpen && (
                          <span className="w-2 h-2 rounded-full bg-[#ff0000] shrink-0" />
                        )}
                      </div>

                      {/* Dropdown Chevron */}
                      {hasSubItems && (
                        <span className={`ml-auto text-slate-400 group-hover:text-white transition-transform duration-200 ${isCollapsed ? 'md:hidden inline-flex' : 'inline-flex'}`}>
                          <ChevronDown size={14} className={`transition-transform duration-200 ${isRackingsOpen ? 'rotate-180 text-[#ff8533]' : ''}`} />
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Dropdown Sub-Items */}
                  {hasSubItems && isRackingsOpen && (
                    <div className={`mt-1 ml-3.5 pl-2.5 border-l ${isDark ? 'border-slate-800' : 'border-white/15'} space-y-1 ${isCollapsed ? 'md:hidden block' : 'block'}`}>
                      {item.subItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = activeTab === subItem.id;

                        return (
                          <button
                            key={subItem.id}
                            onClick={() => {
                              setActiveTab(subItem.id);
                              setIsMobileOpen(false);
                            }}
                            className={`w-full whitespace-nowrap flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all relative cursor-pointer group ${isSubActive
                              ? isDark
                                ? 'bg-[#181a26] text-white font-bold shadow-sm border border-slate-700/60'
                                : 'bg-[#28267a] text-white font-bold shadow-sm border border-white/10'
                              : isDark
                                ? 'text-slate-400 hover:bg-white/5 hover:text-white'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                              }`}
                          >
                            {isSubActive && (
                              <div className="absolute left-0 top-1 bottom-1 w-1 bg-[#ff6600] rounded-r-full shadow-sm" />
                            )}

                            <SubIcon size={14} className={`shrink-0 transition-transform ${isSubActive ? 'text-[#ff8533] scale-105' : 'group-hover:scale-105'}`} />

                            <div className="flex items-center gap-1.5 min-w-0 flex-1 text-left">
                              <span className="truncate whitespace-nowrap">{subItem.name}</span>
                              {subItem.id === 'outbound-products' && pendingOutboundCount > 0 && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ff0000] shrink-0" />
                              )}
                            </div>

                            {subItem.id === 'outbound-products' && pendingOutboundCount > 0 && (
                              <span className="ml-auto text-[11px] font-bold text-white shrink-0">
                                {pendingOutboundCount > 99 ? '99+' : pendingOutboundCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </nav>

          {/* System Version Footer */}
          <div className={`px-3 py-2.5 border-t ${isDark ? 'border-slate-800/80 text-slate-400' : 'border-white/10 text-slate-300'} shrink-0`}>
            <div className={`flex items-center text-xs font-semibold whitespace-nowrap ${isCollapsed ? 'md:justify-center' : 'px-3'}`}>
              <span className={isCollapsed ? 'md:hidden inline' : 'inline'}>System V1.0.2</span>
              {isCollapsed && <span className="hidden md:inline">V1.0.2</span>}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;