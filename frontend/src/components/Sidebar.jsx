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
  const [isCollapsed, setIsCollapsed] = useState(true); 
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Inventory'], section: 'main' },
    
    { id: 'user-management', name: 'User Management', icon: Users, roles: ['Admin'], section: 'admin' },
    { id: 'user-activity', name: 'User Activity', icon: Activity, roles: ['Admin'], section: 'admin' },
    
    { id: 'raw-materials', name: 'Rackings (Records)', icon: Layers, roles: ['Inventory'], section: 'rackings' },
    { id: 'inbound-raw-mat', name: 'Inbound (Additions)', icon: ArrowDownCircle, roles: ['Inventory'], section: 'rackings' },
    { id: 'work-in-progress', name: 'WIP (Production)', icon: TrendingUp, roles: ['Inventory'], section: 'rackings' },
    { id: 'outbound-products', name: 'Outbound (Deductions)', icon: Truck, roles: ['Inventory'], section: 'rackings' },
    
    { id: 'supplies', name: 'Supplies (Records)', icon: Package, roles: ['Inventory'], section: 'supplies' },
    { id: 'supplies-movements', name: 'Supplies Movements', icon: History, roles: ['Inventory'], section: 'supplies' },
    
    { id: 'assets', name: 'Assets (Records)', icon: Briefcase, roles: ['Inventory'], section: 'others' },
    { id: 'reports', name: 'Reports', icon: FileSpreadsheet, roles: ['Inventory'], section: 'others' },
    
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

    switch (currentSection) {
      case 'admin':
        return <div className="text-[10px] font-bold text-[#ff6600] uppercase px-3 pt-2 pb-1">User Controls</div>;
      case 'rackings':
        return <div className="text-[10px] font-bold text-[#ff6600] uppercase px-3 pt-2 pb-1 border-t border-white/5 mt-1">Rackings Process</div>;
      case 'supplies':
        return <div className="text-[10px] font-bold text-[#ff6600] uppercase px-3 pt-2 pb-1 border-t border-white/5 mt-1">Supplies Process</div>;
      case 'others':
        return <div className="text-[10px] font-bold text-[#ff6600] uppercase px-3 pt-2 pb-1 border-t border-white/5 mt-1">Assets Management</div>;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="fixed top-2.5 left-2.5 z-50 md:hidden">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2.5 bg-[#18174e] text-white rounded-xl shadow-lg border border-white/10 cursor-pointer active:scale-95 transition-transform"
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-40 md:sticky h-screen max-h-screen
        bg-gradient-to-b from-[#18174e] via-[#1b1a56] to-[#12113d] border-r border-white/10 text-white flex flex-col
        transition-all duration-300 shadow-2xl md:shadow-none relative
        
        ${isMobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>

        <div className="absolute -right-3.5 top-6 z-50 hidden md:block">
          <button
            onClick={handleDesktopCollapse}
            className="w-7 h-7 bg-[#ff6600] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 border border-white/20 cursor-pointer transition-transform"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <div className="flex flex-col overflow-hidden mt-12 md:mt-0 h-full">
          <div className="py-3 px-4 flex flex-col items-center border-b border-white/10 bg-white/5 backdrop-blur-sm shrink-0">
            <div className={`transition-all duration-300 bg-white rounded-full p-2 flex items-center justify-center shadow-md ${isCollapsed ? "md:w-9 md:h-9 w-12 h-12" : "w-12 h-12"}`}>
              <img
                src="/upright.png"
                alt="logo"
                className="w-full h-full object-contain"
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

          <nav className="overflow-y-auto py-2 space-y-1 px-3 custom-scrollbar flex-1">
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
                    className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative cursor-pointer group ${isCollapsed ? 'md:justify-center' : ''} ${
                      isActive
                        ? 'bg-[#28267a] text-white font-bold shadow-sm border border-white/10'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#ff6600] rounded-r-full shadow-sm" />
                    )}
                    <IconComponent size={17} className={`flex-shrink-0 transition-transform ${isActive ? 'text-[#ff8533] scale-105' : 'group-hover:scale-105'}`} />
                    <span className={`truncate ${isCollapsed ? 'md:hidden block' : 'block'}`}>{item.name}</span>
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
