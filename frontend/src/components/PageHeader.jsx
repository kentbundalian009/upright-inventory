import React from 'react';
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
  Calendar
} from "lucide-react";

function PageHeader({ activeTab }) {
  const headerConfig = {
    'admin': {
      title: 'Admin Dashboard',
      description: 'Overview of system metrics, quick statistics, and administrative controls.',
      icon: LayoutDashboard
    },
    'user-management': {
      title: 'User Management',
      description: 'Manage system users, roles, permissions, and account statuses.',
      icon: Users
    },
    'user-activity': {
      title: 'User Activity Logs',
      description: 'Monitor real-time user actions, system changes, and security audits.',
      icon: Activity
    },
    'inventory': {
      title: 'Inventory Dashboard',
      description: 'Centralized view of stock levels, turnover rates, and alerts.',
      icon: FileSpreadsheet
    },
    'raw-materials': {
      title: 'Raw Materials Inventory',
      description: 'Track and manage available raw stocks and basic production components.',
      icon: Layers
    },
    'inbound-raw-mat': {
      title: 'Inbound Raw Materials',
      description: 'Log and monitor incoming raw material shipments and supplier deliveries.',
      icon: ArrowDownCircle
    },
    'work-in-progress': {
      title: 'Work in Progress (WIP)',
      description: 'Monitor items currently in the production pipeline and assembly.',
      icon: TrendingUp
    },
    'products': {
      title: 'Finished Products',
      description: 'View and manage items fully processed and ready for distribution.',
      icon: ShoppingBag
    },
    'outbound-products': {
      title: 'Outbound Products',
      description: 'Track outgoing orders, shipments, and customer fulfillments.',
      icon: Truck
    },
    'supplies': {
      title: 'Supplies Inventory',
      description: 'Manage internal maintenance, operating, and office supplies.',
      icon: Package
    },
    'supplies-movements': {
      title: 'Supplies Movements',
      description: 'History of supply stock-ins, usage, and internal requisitions.',
      icon: History
    },
    'assets': {
      title: 'Company Assets',
      description: 'Fixed asset tracking, depreciation, and equipment assignments.',
      icon: Briefcase
    },
    'settings': {
      title: 'Personal Information',
      description: 'Manage your profile, preferences, and account settings.',
      icon: Calendar
    },
    'reports': {
      title: 'Reports & Analytics',
      description: 'Generate and view detailed reports on inventory, sales, and operations.',
      icon: FileSpreadsheet
    }
  };

  const currentHeader = headerConfig[activeTab] || {
    title: 'Dashboard',
    description: 'Welcome to USSP Inventory Management System.',
    icon: LayoutDashboard
  };

  const IconComponent = currentHeader.icon;

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="w-full bg-gradient-to-r from-[#18174e] via-[#1f1d63] to-[#282678] text-white border border-[#2e2c8a] rounded-2xl p-5 shadow-lg relative overflow-hidden transition-all duration-300">
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#ff6600]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl shadow-inner text-[#ff6600] shrink-0">
            <IconComponent size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {currentHeader.title}
              </h1>
              <span className="text-[10px] font-extrabold uppercase bg-[#ff6600]/20 text-[#ff8533] border border-[#ff6600]/30 px-2 py-0.5 rounded-full">
                Live System
              </span>
            </div>
            <p className="text-xs sm:text-sm font-normal text-slate-300 mt-0.5 leading-relaxed max-w-3xl">
              {currentHeader.description}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default PageHeader;
