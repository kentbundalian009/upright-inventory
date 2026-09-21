import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Package, AlertTriangle, TrendingUp, DollarSign, 
    Layers, Calendar, BarChart3, PieChart as PieIcon, 
    Activity, ShoppingCart, Loader2, Boxes, Database
} from 'lucide-react';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, 
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';
import PageHeader from './layout/PageHeader';
import { useTheme } from '../context/ThemeContext';

// Base URL para sa API (Gumagamit ng relative /api para parehong gumana sa Dev proxy at Production)
const BASE_API_URL = '/api';

function InventoryDashboard() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    
    // States para sa natitirang live data collections (Raw Materials -> Rackings at Supplies lamang)
    const [rawMaterials, setRawMaterials] = useState([]);
    const [supplies, setSupplies] = useState([]);

    // Filters for Dropdowns (Maaari mong gamitin sa filtering kung kinakailangan)
    const [selectedMonth, setSelectedMonth] = useState('June');
    const [selectedYear, setSelectedYear] = useState('2026');

    // 1. Fetch Integration gamit ang Axios (Rackings at Supplies lamang)
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [resRaw, resSupp] = await Promise.all([
                axios.get(`${BASE_API_URL}/raw-materials`)
                    .catch((err) => {
                        console.error("Failed to fetch Raw Materials:", err);
                        return { data: [] };
                    }),
                axios.get(`${BASE_API_URL}/supplies`)
                    .catch((err) => {
                        console.error("Failed to fetch Supplies:", err);
                        return { data: [] };
                    }),
            ]);

            setRawMaterials(Array.isArray(resRaw.data) ? resRaw.data : []);
            setSupplies(Array.isArray(resSupp.data) ? resSupp.data : []);
        } catch (error) {
            console.error("Error fetching live inventory dashboard metrics:", error);
        } finally {
            setLoading(false); 
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // 2. Memoized Computations mula sa MongoDB Live Data

    // Graph 1: Live Stock Status (Inbound, WIP, Outbound)
    const stockPieData = useMemo(() => {
        const allInventoryItems = [...rawMaterials, ...supplies];
        if (allInventoryItems.length === 0) {
            return [
                { name: 'Inbound', value: 0, color: '#10b981' },   // Green
                { name: 'WIP', value: 0, color: '#f59e0b' },       // Yellow
                { name: 'Outbound', value: 0, color: '#ef4444' }    // Red
            ];
        }

        // Pag-grupo base sa Status ng item. Meron ding fallback para hindi maging 0 kung wala pang fields.
        const inbound = allInventoryItems.filter(item => {
            const status = (item.Status || '').toLowerCase();
            if (status) return status === 'inbound' || status === 'incoming';
            return (item.ActualCount ?? 0) > 30; // Fallback
        }).length;

        const wip = allInventoryItems.filter(item => {
            const status = (item.Status || '').toLowerCase();
            if (status) return status === 'wip' || status === 'work in progress' || status === 'processing';
            return (item.ActualCount ?? 0) > 0 && (item.ActualCount ?? 0) <= 30; // Fallback
        }).length;

        const outbound = allInventoryItems.filter(item => {
            const status = (item.Status || '').toLowerCase();
            if (status) return status === 'outbound' || status === 'released';
            return (item.ActualCount ?? 0) === 0; // Fallback
        }).length;

        return [
            { name: 'Inbound', value: inbound, color: '#10b981' }, // Green
            { name: 'WIP', value: wip, color: '#f59e0b' },       // Yellow
            { name: 'Outbound', value: outbound, color: '#ef4444' }  // Red
        ];
    }, [rawMaterials, supplies]);

    // Graph 2: Stock Density Breakdown (Rackings vs Supplies)
    const stockDensityBreakdownData = useMemo(() => {
        return [
            {
                name: 'Total Items',
                'Rackings': rawMaterials.length,
                'Supplies': supplies.length,
            },
            {
                name: 'Available Stock',
                'Rackings': rawMaterials.filter(item => (item.ActualCount ?? 0) > 0).length,
                'Supplies': supplies.filter(item => (item.ActualCount ?? 0) > 0).length,
            },
            {
                name: 'Critical / Low Stock',
                'Rackings': rawMaterials.filter(item => (item.ActualCount ?? 0) <= 15).length,
                'Supplies': supplies.filter(item => (item.ActualCount ?? 0) <= 15).length,
            }
        ];
    }, [rawMaterials, supplies]);

    // Graph 3: MongoDB Cluster0 Database Records Density Distribution
    const databaseDistributionData = useMemo(() => {
        return [
            { name: 'Rackings', Items: rawMaterials.length, color: isDark ? '#ff6600' : '#18174e' },
            { name: 'Supplies', Items: supplies.length, color: '#3b82f6' },
        ];
    }, [rawMaterials, supplies, isDark]);

    // Graph 4: Actual Stock Quantity Breakdown (Pumalit sa Reserved Overview)
    const stockQuantityData = useMemo(() => {
        const totalRackingsStock = rawMaterials.reduce((acc, item) => acc + (item.ActualCount ?? 0), 0);
        const totalSuppliesStock = supplies.reduce((acc, item) => acc + (item.ActualCount ?? 0), 0);

        return [
            { name: 'Rackings', 'Total Stock Qty': totalRackingsStock, color: isDark ? '#ff6600' : '#18174e' },
            { name: 'Supplies', 'Total Stock Qty': totalSuppliesStock, color: '#3b82f6' },
        ];
    }, [rawMaterials, supplies, isDark]);

    if (loading) {
        return (
            <div className={`flex flex-col justify-center items-center min-h-[80vh] ${isDark ? 'text-slate-500' : 'text-slate-400'} gap-3`}>
                <Loader2 className="w-10 h-10 animate-spin text-[#ff6600]" />
                <span className="text-center text-[#ff6600] font-medium italic">Fetching secure rackings data from database...</span>
            </div>
        );
    }

    return (
        <div className={`mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>

            {/* Consistent Page Header */}
            <PageHeader activeTab="inventory-dashboard" />

            {/* SUMMARY CONTAINER */}
            <div className="flex flex-col gap-6">
                
                {/* TOP ROW CHARTS: Status Share Pie Chart + Density Bar Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Graph 1: Live Stock Status Share (Inbound, WIP, Outbound) */}
                    <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100'} border rounded-2xl p-5 shadow-xs flex flex-col gap-4`}>
                        <div className={`flex items-center gap-2 text-sm font-bold ${isDark ? 'text-slate-200 border-slate-800' : 'text-slate-600 border-slate-100'} border-b pb-3`}>
                            <PieIcon className="w-4 h-4 text-[#ff6600]" />
                            <span>Live Stock Flow Status</span>
                        </div>
                        <div className="h-64 w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%" debounce={200}>
                                <PieChart>
                                    <Pie
                                        data={stockPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stockPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value) => [`${value} Item(s)`, 'Count']} 
                                        contentStyle={{ backgroundColor: isDark ? '#141622' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f8fafc' : '#1e293b' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Graph 2: Rackings vs Supplies Stock Density */}
                    <div className={`lg:col-span-2 ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100'} border rounded-2xl p-5 shadow-xs flex flex-col gap-4`}>
                        <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-2`}>
                            <div className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-600'} flex items-center gap-2`}>
                                <BarChart3 className="w-4 h-4 text-[#ff6600]" />
                                <span>Rackings vs Supplies Stock Density Distribution</span>
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%" debounce={200}>
                                <BarChart data={stockDensityBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} vertical={false} />
                                    <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
                                    <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} allowDecimals={false} />
                                    <Tooltip 
                                        cursor={{ fill: isDark ? '#1e293b' : '#f1f5f9', opacity: 0.4 }} 
                                        contentStyle={{ backgroundColor: isDark ? '#141622' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f8fafc' : '#1e293b' }}
                                    />
                                    <Legend verticalAlign="top" height={36} iconType="square" wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="Rackings" fill={isDark ? '#ff6600' : '#18174e'} radius={[6, 6, 0, 0]} />
                                    <Bar dataKey="Supplies" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* BOTTOM ROW CHARTS: Cluster0 Density Distribution + Stock Quantity Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Graph 3: Cluster0 Database Records Distribution */}
                    <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100'} border rounded-2xl p-6 shadow-xs flex flex-col gap-4`}>
                        <div className={`flex items-center gap-2 text-sm font-bold ${isDark ? 'text-slate-200 border-slate-800' : 'text-slate-600 border-slate-100'} border-b pb-3`}>
                            <Activity className="w-4 h-4 text-[#ff6600]" />
                            <span>MongoDB Cluster0 Total Inventory Density</span>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%" debounce={200}>
                                <BarChart data={databaseDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} vertical={false} />
                                    <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
                                    <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} allowDecimals={false} />
                                    <Tooltip 
                                        cursor={{ fill: isDark ? '#1e293b' : '#f1f5f9', opacity: 0.4 }} 
                                        contentStyle={{ backgroundColor: isDark ? '#141622' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f8fafc' : '#1e293b' }}
                                    />
                                    <Bar dataKey="Items" radius={[6, 6, 0, 0]}>
                                        {databaseDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Graph 4: Total Stock Quantity Breakdown (Pumalit sa Reserved Overview) */}
                    <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-[#ffffff] border-slate-100'} border rounded-2xl p-6 shadow-xs flex flex-col gap-4`}>
                        <div className={`flex items-center gap-2 text-sm font-bold ${isDark ? 'text-slate-200 border-slate-800' : 'text-slate-600 border-slate-100'} border-b pb-3`}>
                            <Database className="w-4 h-4 text-[#ff6600]" />
                            <span>Total Stock Quantity Breakdown (Actual Count)</span>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%" debounce={200}>
                                <BarChart data={stockQuantityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} vertical={false} />
                                    <XAxis dataKey="name" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
                                    <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} allowDecimals={false} />
                                    <Tooltip 
                                        cursor={{ fill: isDark ? '#1e293b' : '#f1f5f9', opacity: 0.4 }} 
                                        contentStyle={{ backgroundColor: isDark ? '#141622' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f8fafc' : '#1e293b' }}
                                    />
                                    <Bar dataKey="Total Stock Qty" radius={[6, 6, 0, 0]}>
                                        {stockQuantityData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default InventoryDashboard;
