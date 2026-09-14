import React, { useState, useEffect } from 'react';
import axios from 'axios'; 
import { useTheme } from '../context/ThemeContext';
import Sidebar from "../components/Sidebar"; 
import Topbar from "../components/Topbar";

// Dashboard file imports
import AdminUserManagement from '../components/AdminUserManagement';
import AdminUserActivity from '../components/AdminUserActivity';
import AdminBackup from '../components/AdminBackup';
import AdminSettings from '../components/AdminSettings';
import AdminSharedViewers from '../components/AdminSharedViewers';
import MaintenanceScreen from '../components/MaintenanceScreen';

import InventoryDashboard from '../components/InventoryDashboard';
import InventoryRawMaterials from '../components/InventoryRawMaterials';
import InventoryInboundRawMat from '../components/InventoryInboundRawMat';
import InventoryWIP from '../components/InventoryWIP';
import InventoryProducts from '../components/InventoryProducts';
import InventoryOutboundProducts from '../components/InventoryOutboundProducts';
import InventorySupplies from '../components/InventorySupplies';
import Consumable from '../components/Consumable';
import InventorySuppliesMovements from '../components/InventorySuppliesMovements';
import InventoryAssets from '../components/InventoryAssets';
import Client from '../components/Client';

import Settings from '../components/Settings';
import Reports from '../components/Reports';
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
                return <InventoryDashboard />;

            case 'user-management': 
                return userRole === 'Admin' ? <AdminUserManagement /> : <InventoryDashboard />;
            case 'user-activity': 
                return userRole === 'Admin' ? <AdminUserActivity /> : <InventoryDashboard />;
            case 'admin-backup':
                return userRole === 'Admin' ? <AdminBackup /> : <InventoryDashboard />;
            case 'admin-settings':
                return userRole === 'Admin' ? <AdminSettings /> : <InventoryDashboard />;
            case 'shared-viewers':
                return userRole === 'Admin' ? <AdminSharedViewers /> : <InventoryDashboard />;
                
            case 'raw-materials': return <InventoryRawMaterials />;
            case 'client-records': return <Client />;
            case 'products': return <InventoryProducts />;
            case 'consumables': 
            case 'consumable': return <Consumable />;
            case 'supplies': return <InventorySupplies />;
            case 'assets': return <InventoryAssets />;
            case 'inbound-raw-mat': return <InventoryInboundRawMat />;
            case 'work-in-progress': return <InventoryWIP />;
            case 'outbound-products': return <InventoryOutboundProducts />;
            case 'supplies-movements': return <InventorySuppliesMovements />;
            
            case 'settings': return <Settings />;

            case 'reports': 
                return userRole !== 'Admin' ? <Reports /> : <InventoryDashboard />;
            
            default: 
                return <InventoryDashboard />;
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