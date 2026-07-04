import React, { useState } from 'react';
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
  X
} from "lucide-react";

function Sidebar({ activeTab, setActiveTab, userRole }) {
  // State para sa Desktop Collapse
  const [isCollapsed, setIsCollapsed] = useState(false);
  // State para sa Mobile Open/Close Toggle
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Inayos ang menuItems para maging 'dashboard' ang id at 'Dashboard' ang pangalan para sa lahat
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Inventory'] },
    
    // ADMIN ACCESSIBLE ONLY
    { id: 'user-management', name: 'User Management', icon: Users, roles: ['Admin'] },
    { id: 'user-activity', name: 'User Activity', icon: Activity, roles: ['Admin'] },
    
    // INVENTORY ACCESSIBLE ONLY
    { id: 'raw-materials', name: 'Raw Materials (Records)', icon: Layers, roles: ['Inventory'] },
    { id: 'inbound-raw-mat', name: 'Inbound Raw Materials', icon: ArrowDownCircle, roles: ['Inventory'] },
    { id: 'products', name: 'Products (Records)', icon: ShoppingBag, roles: ['Inventory'] },
    { id: 'work-in-progress', name: 'Work in Progress', icon: TrendingUp, roles: ['Inventory'] },
    { id: 'outbound-products', name: 'Outbound Products', icon: Truck, roles: ['Inventory'] },
    { id: 'supplies', name: 'Supplies (Records)', icon: Package, roles: ['Inventory'] },
    { id: 'supplies-movements', name: 'Supplies Movements', icon: History, roles: ['Inventory'] },
    { id: 'assets', name: 'Assets (Records)', icon: Briefcase, roles: ['Inventory'] },
    
    // 🌟 BINAGO DITO: Ginawang 'Inventory' na lamang ang role para hindi na ito lumabas kay Admin
    { id: 'reports', name: 'Reports', icon: FileSpreadsheet, roles: ['Inventory'] },
    
    // COMMON SHARED VIEWS
    { id: 'settings', name: 'Settings', icon: Settings, roles: ['Admin', 'Inventory'] },
  ];

  // I-filter ang menu items base sa kung anong role ang kasalukuyang naka-login
  const allowedMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  // Handler para sa Desktop Collapse na nag-ti-trigger din ng resize event
  const handleDesktopCollapse = () => {
    setIsCollapsed(!isCollapsed);
    window.dispatchEvent(new Event('sidebarToggle'));
  };

  return (
    <>
      {/* 1. FLOATING TOGGLE BUTTON (Mobile View) */}
      <div className="fixed top-2.5 left-2.5 z-50 md:hidden">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2.5 bg-[#18174e] text-white rounded-xl shadow-lg border border-white/10 cursor-pointer active:scale-95 transition-transform"
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* 2. BACKDROP OVERLAY */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 3. MAIN SIDEBAR COMPONENT */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 md:sticky min-h-screen
        bg-[#18174e] border-r border-white/10 text-white flex flex-col gap-4 
        transition-all duration-300 shadow-2xl md:shadow-none
        
        ${isMobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>

        {/* DESKTOP TOGGLE BUTTON */}
        <div className="absolute -right-3.5 top-6 z-50 hidden md:block">
          <button
            onClick={handleDesktopCollapse}
            className="w-7 h-7 bg-[#252375] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 border border-white/10 cursor-pointer transition"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* INNER CONTAINER */}
        <div className="flex flex-col overflow-hidden mt-14 md:mt-0 h-full">
          {/* LOGO SECTION */}
          <div className="py-4 px-4 flex flex-col items-center border-b border-white/10">
            <div className={`transition-all duration-300 bg-white rounded-full p-2 flex items-center justify-center shadow-inner ${isCollapsed ? "md:w-9 md:h-9 w-16 h-16" : "w-16 h-16"}`}>
              <img
                src="/one.logo.png"
                alt="logo"
                className="w-full h-full object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>

            <div className={`text-center mt-2 ${isCollapsed ? 'md:hidden block' : 'block'}`}>
              <h1 className="font-black text-lg uppercase text-white tracking-wider">ONE INVENTORY</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase opacity-80 mt-0.5">Upright Storage Solutions</p>
              {/* Badge Indicator para sa Kasalukuyang Role */}
              <span className="inline-block mt-1 text-[10px] bg-[#252375] text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-white/5">
                {userRole}
              </span>
            </div>
          </div>

          {/* NAVIGATION LINKS */}
<nav className="overflow-y-auto py-3 space-y-1 px-3 custom-scrollbar flex-1">
  {allowedMenuItems.map((item) => {
    // 🌟 DAGDAG NA HARANG: Kung ang item ay 'reports' at ang role ay Admin, HUWAG I-RENDER (i-skip)
    if (item.id === 'reports' && userRole === 'Admin') {
      return null;
    }

    const IconComponent = item.icon;
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveTab(item.id);
          setIsMobileOpen(false);
        }}
        title={isCollapsed ? item.name : ''}
        className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all relative cursor-pointer ${isCollapsed ? 'md:justify-center' : ''} ${
          isActive
            ? 'bg-[#252375] text-white font-bold shadow-md'
            : 'text-slate-300 hover:bg-[#252375]/50 hover:text-white'
        }`}
      >
        <IconComponent size={18} className="flex-shrink-0" />
        <span className={`truncate ${isCollapsed ? 'md:hidden block' : 'block'}`}>{item.name}</span>
        {isActive && <div className={`absolute right-0 w-1 h-1/2 bg-white rounded-l-full ${isCollapsed ? 'md:hidden block' : 'block'}`} />}
      </button>
    );
  })}
</nav>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;