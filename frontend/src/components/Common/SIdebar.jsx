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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Inventory'], section: 'main' },
    
    // ADMIN ACCESSIBLE ONLY
    { id: 'user-management', name: 'User Management', icon: Users, roles: ['Admin'], section: 'admin' },
    { id: 'user-activity', name: 'User Activity', icon: Activity, roles: ['Admin'], section: 'admin' },
    
    // INVENTORY ACCESSIBLE ONLY - RACKINGS
    { id: 'raw-materials', name: 'Rackings (Records)', icon: Layers, roles: ['Inventory'], section: 'rackings' },
    { id: 'inbound-raw-mat', name: 'Inbound Raw Materials', icon: ArrowDownCircle, roles: ['Inventory'], section: 'rackings' },
    { id: 'work-in-progress', name: 'Work in Progress', icon: TrendingUp, roles: ['Inventory'], section: 'rackings' },
    { id: 'outbound-products', name: 'Outbound Products', icon: Truck, roles: ['Inventory'], section: 'rackings' },
    
    // INVENTORY ACCESSIBLE ONLY - SUPPLIES
    { id: 'supplies', name: 'Supplies (Records)', icon: Package, roles: ['Inventory'], section: 'supplies' },
    { id: 'supplies-movements', name: 'Supplies Movements', icon: History, roles: ['Inventory'], section: 'supplies' },
    
    // OTHERS
    { id: 'assets', name: 'Assets (Records)', icon: Briefcase, roles: ['Inventory'], section: 'others' },
    { id: 'reports', name: 'Reports', icon: FileSpreadsheet, roles: ['Inventory'], section: 'others' },
    
    // COMMON
    { id: 'settings', name: 'Settings', icon: Settings, roles: ['Admin', 'Inventory'], section: 'main' },
  ];

  const allowedMenuItems = menuItems.filter(item => {
    if (item.id === 'reports' && userRole === 'Admin') return false;
    return item.roles.includes(userRole);
  });

  const handleDesktopCollapse = () => {
    setIsCollapsed(!isCollapsed);
    window.dispatchEvent(new Event('sidebarToggle'));
  };

  const renderSectionHeader = (currentSection, index) => {
    if (isCollapsed) return null;

    const previousSection = index > 0 ? allowedMenuItems[index - 1].section : null;
    if (currentSection === previousSection) return null;

    // MEDIUM TIMPLA: Tamang spacing para sa labels
    switch (currentSection) {
      case 'admin':
        return <div className="text-[10px] font-bold text-[#ff6600] uppercase tracking-wider px-4 pt-2.5 pb-1">User Controls</div>;
      case 'rackings':
        return <div className="text-[10px] font-bold text-[#ff6600] uppercase tracking-wider px-4 pt-2.5 pb-1 border-t border-white/5 mt-1.5">Rackings Process</div>;
      case 'supplies':
        return <div className="text-[10px] font-bold text-[#ff6600] uppercase tracking-wider px-4 pt-2.5 pb-1 border-t border-white/5 mt-1.5">Supplies Process</div>;
      case 'others':
        return <div className="text-[10px] font-bold text-[#ff6600] uppercase tracking-wider px-4 pt-2.5 pb-1 border-t border-white/5 mt-1.5">Management</div>;
      default:
        return null;
    }
  };

  return (
    <>
      {/* 1. MOBILE FLOATING BUTTON */}
      <div className="fixed top-2.5 left-2.5 z-50 md:hidden">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2.5 bg-[#18174e] text-white rounded-xl shadow-lg border border-white/10 cursor-pointer active:scale-95 transition-transform"
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* 2. BACKDROP */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 3. MAIN SIDEBAR */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 md:sticky min-h-screen
        bg-[#18174e] border-r border-white/10 text-white flex flex-col gap-3 
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
          {/* LOGO SECTION - Balanseng Sukat */}
          <div className="py-3 px-4 flex flex-col items-center border-b border-white/10">
            <div className={`transition-all duration-300 bg-white rounded-full p-2 flex items-center justify-center shadow-inner ${isCollapsed ? "md:w-9 md:h-9 w-14 h-14" : "w-14 h-14"}`}>
              <img
                src="public/upright.png"
                alt="logo"
                className="w-full h-full object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>

            <div className={`text-center mt-1.5 ${isCollapsed ? 'md:hidden block' : 'block'}`}>
              <h1 className="font-black text-base uppercase text-white">USSP INVENTORY</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase opacity-80">Upright Storage Solutions</p>
              <span className="inline-block text-[9px] bg-[#252375] text-[#ff6600] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-white/5 mt-1">
                {userRole}
              </span>
            </div>
          </div>

          {/* NAVIGATION LINKS - Medium Padding & Text size */}
          <nav className="overflow-y-auto py-2.5 space-y-1 px-3 custom-scrollbar flex-1">
            {allowedMenuItems.map((item, index) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;

              return (
                <React.Fragment key={item.id}>
                  {renderSectionHeader(item.section, index)}

                  <button
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileOpen(false);
                    }}
                    title={isCollapsed ? item.name : ''}
                    className={`w-full flex items-center gap-3 px-4 py-1.5 rounded-xl text-[13px] font-semibold transition-all relative cursor-pointer ${isCollapsed ? 'md:justify-center' : ''} ${
                      isActive
                        ? 'bg-[#252375] text-white font-bold shadow-md'
                        : 'text-slate-300 hover:bg-[#252375]/50 hover:text-white'
                    }`}
                  >
                    <IconComponent size={18} className="flex-shrink-0" />
                    <span className={`truncate ${isCollapsed ? 'md:hidden block' : 'block'}`}>{item.name}</span>
                    {isActive && <div className={`absolute right-0 w-1 h-1/2 bg-white rounded-l-full ${isCollapsed ? 'md:hidden block' : 'block'}`} />}
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