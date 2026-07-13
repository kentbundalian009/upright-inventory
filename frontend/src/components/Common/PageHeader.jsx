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
  // Config para sa bawat tab para maging dynamic ang text at icon
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

  // Fallback kapag walang nahanap na tab id
  const currentHeader = headerConfig[activeTab] || {
    title: 'Dashboard',
    description: 'Welcome to USSP Inventory Management System.',
    icon: LayoutDashboard
  };

  const IconComponent = currentHeader.icon;

  // Format para sa kasalukuyang petsa
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="w-full bg-[#f8faff] border border-blue-100 rounded-2xl p-4 sm:p-5 transition-all duration-300">
      
      {/* KALIWANG PARTE: Main System Label / Tab Title Indicator */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="text-[#18174e] flex items-center">
          <IconComponent size={20} className="stroke-[2.5]" />
        </div>
        <h1 className="text-base font-bold text-[#18174e] tracking-tight sm:text-lg">
          {currentHeader.title}
        </h1>
      </div>

      {/* INNER CARD: Dynamic content ng active tab na may manipis na height */}
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          
          {/* Active Tab Details */}
          <div className="flex-1">
            <h2 className="text-sm font-bold text-[#18174e] mb-0.5">
              {currentHeader.title} Details
            </h2>
            <p className="text-xs sm:text-sm font-normal text-slate-600 leading-relaxed max-w-4xl">
              {currentHeader.description}
            </p>
          </div>
        </div>
      </div>

    </header>
  );
}

export default PageHeader;