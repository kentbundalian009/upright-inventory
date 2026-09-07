import React, { useState } from 'react';
import axios from 'axios'; 
import { useTheme } from '../context/ThemeContext';
import Sidebar from "../components/Sidebar"; 
import Topbar from "../components/Topbar";

// Dashboard file imports
import AdminUserManagement from '../components/AdminUserManagement';
import AdminUserActivity from '../components/AdminUserActivity';
import InventoryDashboard from '../components/InventoryDashboard';
import InventoryRawMaterials from '../components/InventoryRawMaterials';
import InventoryInboundRawMat from '../components/InventoryInboundRawMat';
import InventoryWIP from '../components/InventoryWIP';
import InventoryProducts from '../components/InventoryProducts';
import InventoryOutboundProducts from '../components/InventoryOutboundProducts';
import InventorySupplies from '../components/InventorySupplies';
import InventorySuppliesMovements from '../components/InventorySuppliesMovements';
import InventoryAssets from '../components/InventoryAssets';

import Settings from '../components/Settings';
import Reports from '../components/Reports';

function Dashboard() {
    const userRole = localStorage.getItem("SystemRole") || "Inventory"; 
    
    const token = localStorage.getItem("token");
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const [activeTab, setActiveTab] = useState('dashboard');

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': 
                return <InventoryDashboard />;

            case 'user-management': 
                return userRole === 'Admin' ? <AdminUserManagement /> : <InventoryDashboard />;
            case 'user-activity': 
                return userRole === 'Admin' ? <AdminUserActivity /> : <InventoryDashboard />;
                
            case 'raw-materials': return <InventoryRawMaterials />;
            case 'products': return userRole === 'Viewer' ? <InventoryDashboard /> : <InventoryProducts />;
            case 'supplies': return <InventorySupplies />;
            case 'assets': return <InventoryAssets />;
            case 'inbound-raw-mat': return userRole === 'Viewer' ? <InventoryDashboard /> : <InventoryInboundRawMat />;
            case 'work-in-progress': return userRole === 'Viewer' ? <InventoryDashboard /> : <InventoryWIP />;
            case 'outbound-products': return userRole === 'Viewer' ? <InventoryDashboard /> : <InventoryOutboundProducts />;
            case 'supplies-movements': return userRole === 'Viewer' ? <InventoryDashboard /> : <InventorySuppliesMovements />;
            
            case 'settings': return <Settings />;

            case 'reports': 
                return userRole !== 'Admin' ? <Reports /> : <InventoryDashboard />;
            
            default: 
                return <InventoryDashboard />;
        }
    };

    const { isDark } = useTheme();

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