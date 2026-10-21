import React, { useState, useEffect } from 'react';
import axios from 'axios'; 
import { useTheme } from '../context/ThemeContext';
import Sidebar from "../components/layout/Sidebar"; 
import Topbar from "../components/layout/Topbar";

// Dashboard file imports
import UserManagement from '../components/UserManagement';
import UserActivity from '../components/UserActivity';
import DataBackup from '../components/DataBackup';
import SystemMaintenance from '../components/SystemMaintenance';
import ViewerLinks from '../components/ViewerLinks';
import MaintenanceScreen from '../components/common/MaintenanceScreen';

import DashboardOverview from '../components/DashboardOverview';
import Rackings from '../components/Rackings';
import InboundMaterials from '../components/InboundMaterials';
import WorkInProgress from '../components/WorkInProgress';
import OutboundMaterials from '../components/OutboundMaterials';
import ToolsAndEquipments from '../components/ToolsAndEquipments';
import Consumables from '../components/Consumables';
import ConsumablesMovements from '../components/ConsumablesMovements';
import EquipmentMovements from '../components/EquipmentMovements';
import InformationModules from '../components/InformationModules';

import Settings from '../components/Settings';
import Reports from '../components/Reports';
import RackingsUnit from '../components/RackingsUnit';
import SharedRackingsView from './SharedRackingsView';
import { trackSharedLinkClick } from '../utils/linkTracker';

const API_BASE_URL = import.meta.env.MODE === 'production'
  ? 'https://one-inventory.onrender.com/api'
  : 'http://localhost:5000/api';

function Dashboard() {
    const userRole = localStorage.getItem("SystemRole") || "Inventory"; 
    
    const token = localStorage.getItem("token");
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const [activeTab, setActiveTab] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const view = params.get('view');
            const tab = params.get('tab');
            if (view === 'rackings' || tab === 'raw-materials') {
                return 'raw-materials';
            }
            if (tab === 'consumables-records' || tab === 'inventoryconsumables' || tab === 'inventory-consumables') {
                return 'consumables-records';
            }
        } catch (e) {}
        return 'dashboard';
    });
    const [maintenanceData, setMaintenanceData] = useState({
        isMaintenanceActive: false,
        maintenanceMessage: '',
        updatedAt: null
    });

    const checkMaintenanceStatus = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/system/maintenance`);
            if (res.data) {
                setMaintenanceData(res.data);
            }
        } catch (err) {
            console.error("Maintenance check error:", err);
        }
    };

    useEffect(() => {
        trackSharedLinkClick();
        checkMaintenanceStatus();

        const handleStatusChange = () => {
            checkMaintenanceStatus();
        };

        window.addEventListener('systemMaintenanceChanged', handleStatusChange);
        window.addEventListener('focus', handleStatusChange);

        const interval = setInterval(checkMaintenanceStatus, 20000);

        return () => {
            window.removeEventListener('systemMaintenanceChanged', handleStatusChange);
            window.removeEventListener('focus', handleStatusChange);
            clearInterval(interval);
        };
    }, []);

    const { isDark } = useTheme();

    // 🔒 SYSTEM SHUTDOWN / MAINTENANCE INTERCEPTOR:
    // If maintenance mode is active, lock out non-admin users and display the 404 / System Shutdown screen
    if (userRole !== 'Admin' && maintenanceData.isMaintenanceActive) {
        return <MaintenanceScreen maintenanceData={maintenanceData} onCheckStatus={checkMaintenanceStatus} />;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const isSharedLink = Boolean(searchParams.get('sharedBy')) && (searchParams.get('view') === 'rackings' || searchParams.get('tab') === 'raw-materials');
    if (isSharedLink) {
        return <SharedRackingsView />;
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': 
                return <DashboardOverview />;

            case 'user-management': 
                return userRole === 'Admin' ? <UserManagement /> : <DashboardOverview />;
            case 'user-activity': 
                return userRole === 'Admin' ? <UserActivity /> : <DashboardOverview />;
            case 'admin-backup':
                return userRole === 'Admin' ? <DataBackup /> : <DashboardOverview />;
            case 'admin-settings':
                return userRole === 'Admin' ? <SystemMaintenance /> : <DashboardOverview />;
            case 'shared-viewers':
                return userRole === 'Admin' ? <ViewerLinks /> : <DashboardOverview />;
                
            case 'raw-materials': return <Rackings />;
            case 'client-records': return userRole === 'Purchasing' ? <DashboardOverview /> : <InformationModules />;
            case 'consumables': 
            case 'consumable': return <ConsumablesMovements setActiveTab={setActiveTab} />;
            case 'supplies': return <ToolsAndEquipments />;
            case 'consumables-records': 
            case 'inventoryconsumables':
            case 'inventory-consumables':
                return <Consumables setActiveTab={setActiveTab} />;
            case 'inbound-raw-mat': return userRole === 'Purchasing' ? <DashboardOverview /> : <InboundMaterials />;
            case 'work-in-progress': return userRole === 'Purchasing' ? <DashboardOverview /> : <WorkInProgress />;
            case 'outbound-products': return userRole === 'Purchasing' ? <DashboardOverview /> : <OutboundMaterials />;
            case 'supplies-movements': return userRole === 'Purchasing' ? <DashboardOverview /> : <EquipmentMovements />;
            case 'rackings-unit':
            case 'unit-calculator': 
                return <RackingsUnit />;
            
            case 'settings': return <Settings />;

            case 'reports': 
                return userRole !== 'Admin' ? <Reports /> : <DashboardOverview />;
            
            default: 
                return <DashboardOverview />;
        }
    };

    return (
        <div className={`flex min-h-screen ${isDark ? 'bg-[#090a0f] text-slate-100' : 'bg-[#f5f6f7] text-slate-800'} transition-colors duration-200`}>
            {/* 1. SIDEBAR */}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} />

            {/* 2. MAIN CONTAINER */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                
                {/* 3. TOPBAR */}
                <Topbar activeTab={activeTab} />

                {/* 4. MAIN CONTENT AREA */}
                <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto">
                    <div className="animate-fade-in">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Dashboard;