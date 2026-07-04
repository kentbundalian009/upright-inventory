import React, { useState } from 'react';
// 🌟 INILAGAY DITO: I-import si axios para sa global header configuration
import axios from 'axios'; 
import Sidebar from "../components/Common/Sidebar"; 
import Topbar from "../components/Common/Topbar";

// Dashboard file imports
import UserManagement from '../components/Admin/UserManagement';
import UserActivity from '../components/Admin/UserActivity';
import InventoryDashboard from '../components/Inventory/InventoryDashboard';
import RawMaterials from '../components/Inventory/RawMaterials';
import InboundRawMat from '../components/Inventory/InboundRawMat';
import WorkInProgress from '../components/Inventory/WorkInProgress';
import Products from '../components/Inventory/Products';
import OutboundProducts from '../components/Inventory/OutboundProducts';
import Supplies from '../components/Inventory/Supplies';
import SuppliesMovements from '../components/Inventory/SuppliesMovements';
import Assets from '../components/Inventory/Assets';

import Settings from '../components/Common/Settings';
import Reports from '../components/Common/Reports';

function Dashboard() {
    // Kunin ang role mula sa localStorage (Fallback sa 'Inventory' kung walang nahanap)
    const userRole = localStorage.getItem("SystemRole") || "Inventory"; 
    
    // 🌟 GLOBAL AXIOS CAPTURE: Bago mag-load ang kahit anong sub-tab,
    // pilit nating isasaksak ang Token sa lahat ng lalabas na Axios request.
    const token = localStorage.getItem("token");
    if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Naka-default sa 'dashboard' para sa parehong Admin at Inventory role
    const [activeTab, setActiveTab] = useState('dashboard');

    const renderContent = () => {
        switch (activeTab) {
            // PINAG-ISANG DASHBOARD (InventoryDashboard ang ipapakita sa parehong role)
            case 'dashboard': 
                return <InventoryDashboard />;

            // ADMIN ACCESSIBLE ONLY
            case 'user-management': 
                return userRole === 'Admin' ? <UserManagement /> : <InventoryDashboard />;
            case 'user-activity': 
                return userRole === 'Admin' ? <UserActivity /> : <InventoryDashboard />;
                
            // INVENTORY ACCESSIBLE ONLY
            case 'raw-materials': return <RawMaterials />;
            case 'products': return <Products />;
            case 'supplies': return <Supplies />;
            case 'assets': return <Assets />;
            case 'inbound-raw-mat': return <InboundRawMat />;
            case 'work-in-progress': return <WorkInProgress />;
            case 'outbound-products': return <OutboundProducts />;
            case 'supplies-movements': return <SuppliesMovements />;
            
            // COMMON SHARED VIEWS
            case 'settings': return <Settings />;

            // INVENTORY ONLY (Naka-hide sa Admin)
            case 'reports': 
                return userRole !== 'Admin' ? <Reports /> : <InventoryDashboard />;
            
            default: 
                return <InventoryDashboard />;
        }
    };

    return (
        <div className="flex min-h-screen bg-[#f5f6f7] text-slate-800">
            {/* 1. SIDEBAR */}
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} />

            {/* 2. MAIN CONTAINER */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                
                {/* 3. TOPBAR */}
                <Topbar activeTab={activeTab} />

                {/* 4. MAIN CONTENT AREA */}
                <main className="flex-1 p-6 md:p-8 overflow-y-auto">
                    <div className="animate-fade-in">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Dashboard;