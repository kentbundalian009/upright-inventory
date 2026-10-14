import React from 'react';
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
  Calendar,
  Database,
  Power,
  Building2,
  Share2,
  Boxes,
  ClipboardList,
  FileText
} from "lucide-react";

function PageHeader({ activeTab, title, description, icon, badge, actions, children }) {
  const { isDark } = useTheme();

  const headerConfig = {
    'dashboard': {
      title: 'Dashboard Overview',
      description: 'Centralized view of inventory metrics, key performance indicators, and recent operations.',
      icon: LayoutDashboard
    },
    'documents': {
      title: 'Documents',
      description: 'Create, format, and export operational remarks and documentation.',
      icon: FileText
    },
    'pending-remarks': {
      title: 'Documents',
      description: 'Create, format, and export operational remarks and documentation.',
      icon: FileText
    },
    'inventory-dashboard': {
      title: 'Inventory Dashboard',
      description: 'Centralized view of stock levels, turnover rates, and real-time alerts.',
      icon: LayoutDashboard
    },
    'admin-dashboard': {
      title: 'Admin Dashboard',
      description: 'Overview of system metrics, quick statistics, and administrative controls.',
      icon: LayoutDashboard
    },
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
    'shared-viewers': {
      title: 'Viewer Link Management',
      description: 'Track generated viewer links, edit viewer details, monitor access counts, and revoke active links.',
      icon: Share2
    },
    'admin-backup': {
      title: 'Database Vault & Backup',
      description: 'Generate complete database JSON exports, view collection metrics, and safely restore snapshots.',
      icon: Database
    },
    'admin-settings': {
      title: 'System Maintenance & Lockout',
      description: 'Control live system availability, emergency shutdown, and broadcast advisory notices to users.',
      icon: Power
    },
    'inventory': {
      title: 'Inventory Dashboard',
      description: 'Centralized view of stock levels, turnover rates, and alerts.',
      icon: FileSpreadsheet
    },
    'raw-materials': {
      title: 'Rackings (Records)',
      description: 'Track and manage available rackings stock, raw materials, and components.',
      icon: Layers
    },
    'client-records': {
      title: 'Information Details (Modules)',
      description: 'Master list directory for Inventory Modules.',
      icon: Building2
    },
    'inbound-raw-mat': {
      title: 'Inbound (Additions)',
      description: 'Log and monitor incoming stock shipments and supplier deliveries.',
      icon: ArrowDownCircle
    },
    'purchase-order': {
      title: 'Inbound (Additions)',
      description: 'Log and monitor incoming stock shipments and supplier deliveries.',
      icon: ArrowDownCircle
    },
    'work-in-progress': {
      title: 'Work in Progress (WIP)',
      description: 'Monitor items currently in the production pipeline and assembly.',
      icon: TrendingUp
    },
    'outbound-products': {
      title: 'Outbound',
      description: 'Track outgoing orders, packing lists, and customer fulfillments.',
      icon: Truck
    },
    'packing-list': {
      title: 'Outbound',
      description: 'Track outgoing orders, packing lists, and customer fulfillments.',
      icon: Truck
    },
    'consumables': {
      title: 'Consumable Materials Management',
      description: 'Manage consumable stocks, addition (IN), and release (OUT) transactions.',
      icon: ShoppingBag
    },
    'consumables-records': {
      title: 'Consumables (Records)',
      description: 'Masterlist records of all consumable materials, inventory count, and acquisition value.',
      icon: Boxes
    },
    'inventoryconsumables': {
      title: 'Consumables (Records)',
      description: 'Masterlist records of all consumable materials, inventory count, and acquisition value.',
      icon: Boxes
    },
    'inventory-consumables': {
      title: 'Consumables (Records)',
      description: 'Masterlist records of all consumable materials, inventory count, and acquisition value.',
      icon: Boxes
    },
    'supplies': {
      title: 'Tools & Equipments (Records)',
      description: 'Manage internal maintenance, operating, and office supplies.',
      icon: Package
    },
    'supplies-movements': {
      title: 'Equipment Movements',
      description: 'History of equipment stock-ins, usage, and internal requisitions.',
      icon: History
    },
    'settings': {
      title: 'Personal Information & Settings',
      description: 'Manage your profile, preferences, palette colors, and account settings.',
      icon: Calendar
    },
    'reports': {
      title: 'Reports & Analytics',
      description: 'Generate and view detailed audit ledger reports, monthly summaries, and exports.',
      icon: FileSpreadsheet
    }
  };

  const configured = headerConfig[activeTab] || {
    title: 'Dashboard',
    description: 'Welcome to USSP Inventory Management System.',
    icon: LayoutDashboard
  };

  const finalTitle = title || configured.title;
  const finalDescription = description || configured.description;
  const IconComponent = icon || configured.icon || LayoutDashboard;
  const finalBadge = badge !== undefined ? badge : 'Live System';

  return (
    <header className={`w-full ${isDark
      ? 'bg-gradient-to-r from-[#090a10] via-[#0f111d] to-[#151829] text-white border border-slate-800/90 shadow-xl'
      : 'bg-gradient-to-r from-[#18174e] via-[#1f1d63] to-[#282678] text-white border border-[#2e2c8a] shadow-md'
      } rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 relative overflow-hidden transition-all duration-300`}>
      {/* Background Ambient Glow Accents */}
      <div className={`absolute -top-10 -right-10 w-36 h-36 sm:w-48 sm:h-48 ${isDark ? 'bg-[#ff6600]/10' : 'bg-[#ff6600]/15'} rounded-full blur-3xl pointer-events-none`} />
      <div className={`absolute -bottom-10 -left-10 w-36 h-36 sm:w-48 sm:h-48 ${isDark ? 'bg-indigo-900/20' : 'bg-blue-500/15'} rounded-full blur-3xl pointer-events-none`} />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Left Section: Icon + Title & Description */}
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className={`p-2 sm:p-2.5 md:p-3 ${isDark ? 'bg-black/40 border-slate-700/60' : 'bg-white/10 border-white/15'} backdrop-blur-md border rounded-lg sm:rounded-xl shadow-inner text-[#ff6600] shrink-0`}>
            <IconComponent className="w-5 h-5 sm:w-5 sm:h-5 md:w-[22px] md:h-[22px] stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight leading-snug">
                {finalTitle}
              </h1>
              {finalBadge && (
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase bg-[#ff6600]/20 text-[#ff8533] border border-[#ff6600]/30 px-2 py-0.5 rounded-full shrink-0">
                  {finalBadge}
                </span>
              )}
            </div>
            {finalDescription && (
              <p className={`text-[11px] sm:text-xs md:text-sm font-normal ${isDark ? 'text-slate-300' : 'text-slate-200'} mt-0.5 leading-relaxed line-clamp-2 sm:line-clamp-none`}>
                {finalDescription}
              </p>
            )}
          </div>
        </div>

        {/* Right Section: Optional Action Buttons or Children */}
        {(actions || children) && (
          <div className="flex flex-wrap items-center gap-2 shrink-0 sm:self-center">
            {actions}
            {children}
          </div>
        )}
      </div>
    </header>
  );
}

export default PageHeader;
