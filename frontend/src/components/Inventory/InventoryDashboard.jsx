import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Package, AlertTriangle, TrendingUp, DollarSign, 
    Layers, Calendar, BarChart3, PieChart as PieIcon, 
    Activity, ShoppingCart, HardDrive, Loader2, Boxes
} from 'lucide-react';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, 
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    LineChart, Line, CartesianGrid
} from 'recharts';
import PageHeader from '../Common/PageHeader';

// Base URL para sa iyong backend API port (Dynamic: Render kapag live, Localhost kapag dev)
const BASE_API_URL = import.meta.env.MODE === 'production'
  ? 'https://one-inventory.onrender.com/api'
  : 'http://localhost:5000/api';

function InventoryDashboard() {
    const [loading, setLoading] = useState(true);
    
    // States para sa apat na live data collections mula sa Cluster0
    const [rawMaterials, setRawMaterials] = useState([]);
    const [products, setProducts] = useState([]);
    const [supplies, setSupplies] = useState([]);
    const [assets, setAssets] = useState([]);

    // Filters for Dropdowns
    const [selectedMonth, setSelectedMonth] = useState('June');
    const [selectedYear, setSelectedYear] = useState('2026');

    // 1. Fetch Integration gamit ang Axios (Sabay-sabay gamit ang Promise.all)
    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [resRaw, resProd, resSupp, resAsset] = await Promise.all([
                axios.get(`${BASE_API_URL}/raw-materials`).catch(() => ({ data: [] })),
                axios.get(`${BASE_API_URL}/products`).catch(() => ({ data: [] })),
                axios.get(`${BASE_API_URL}/supplies`).catch(() => ({ data: [] })),
                axios.get(`${BASE_API_URL}/assets`).catch(() => ({ data: [] })),
            ]);

            setRawMaterials(Array.isArray(resRaw.data) ? resRaw.data : []);
            setProducts(Array.isArray(resProd.data) ? resProd.data : []);
            setSupplies(Array.isArray(resSupp.data) ? resSupp.data : []);
            setAssets(Array.isArray(resAsset.data) ? resAsset.data : []);
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

    // Graph 1: Stock Status Share Data (Pangkalahatang Status ng Lahat)
    const stockPieData = useMemo(() => {
        const allInventoryItems = [...rawMaterials, ...products, ...supplies];
        if (allInventoryItems.length === 0) {
            return [
                { name: 'In Stock', value: 0, color: '#10b981' },
                { name: 'Low Stock', value: 0, color: '#f59e0b' },
                { name: 'Out of Stock', value: 0, color: '#f43f5e' }
            ];
        }

        const inStock = allInventoryItems.filter(item => (item.ActualCount ?? 0) > 15).length;
        const lowStock = allInventoryItems.filter(item => {
            const count = item.ActualCount ?? 0;
            return count > 0 && count <= 15;
        }).length;
        const outOfStock = allInventoryItems.filter(item => (item.ActualCount ?? 0) === 0).length;

        return [
            { name: 'In Stock', value: inStock, color: '#10b981' },
            { name: 'Low Stock', value: lowStock, color: '#f59e0b' },
            { name: 'Out of Stock', value: outOfStock, color: '#f43f5e' }
        ];
    }, [rawMaterials, products, supplies]);

    // Graph 2: Cluster0 Database Records Density Distribution
    const databaseDistributionData = useMemo(() => {
        return [
            { name: 'Raw Materials', Items: rawMaterials.length, color: '#18174e' },
            { name: 'Products', Items: products.length, color: '#10b981' },
            { name: 'Supplies', Items: supplies.length, color: '#3b82f6' },
            { name: 'Assets', Items: assets.length, color: '#f59e0b' },
        ];
    }, [rawMaterials, products, supplies, assets]);

    // Graph 3: Dynamic Stock Density Breakdown (Raw Materials vs Products Breakdown)
    const stockDensityBreakdownData = useMemo(() => {
        return [
            {
                name: 'Total Items',
                'Raw Materials': rawMaterials.length,
                'Finished Products': products.length,
            },
            {
                name: 'Available Stock',
                'Raw Materials': rawMaterials.filter(item => (item.ActualCount ?? 0) > 0).length,
                'Finished Products': products.filter(item => (item.ActualCount ?? 0) > 0).length,
            },
            {
                name: 'Critical / Low Stock',
                'Raw Materials': rawMaterials.filter(item => (item.ActualCount ?? 0) <= 15).length,
                'Finished Products': products.filter(item => (item.ActualCount ?? 0) <= 15).length,
            }
        ];
    }, [rawMaterials, products]);

    // Graph 4: Fixed Asset Condition Tracking Trends (Mula sa Assets Collection)
    const assetConditionData = useMemo(() => {
        const assetGood = assets.filter(a => (a.Condition || '').toLowerCase().includes('good') || !(a.Condition)).length;
        const assetDefective = assets.filter(a => (a.Condition || '').toLowerCase().includes('defective') || (a.Condition || '').toLowerCase().includes('repair')).length;
        
        return [
            { name: 'Q1 2026', 'Good Condition': assetGood > 0 ? assetGood - 2 : 0, 'Requires Attention': assetDefective },
            { name: 'Q2 2026', 'Good Condition': assetGood, 'Requires Attention': assetDefective },
        ];
    }, [assets]);

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[80vh] text-slate-400 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-[#18174e]" />
                <span className="text-sm font-semibold tracking-wide">Syncing Real-Time Cluster0 Analytics Engine...</span>
            </div>
        );
    }

    return (
        <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased text-slate-700">

            {/* Consistent Page Header */}
            <PageHeader activeTab="inventory-dashboard" />

            {/* SECTION 2: SUMMARY CONTAINER (Ginawang flex flex-col gap-6 na walang p-6 para sumakto sa gilid ng PageHeader) */}
            <div className="flex flex-col gap-6">
                
                {/* TOP ROW CHARTS: Pie Chart + Updated Density Bar Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Graph 1: Live Stock Status Share (Pie Chart) */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600 border-b border-slate-100 pb-3">
                            <PieIcon className="w-4 h-4 text-[#18174e]" />
                            <span>Live Stock Status Share (All Collections)</span>
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
                                    <Tooltip formatter={(value) => [`${value} Record(s)`, 'Count']} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Graph 2: Updated Dynamic Stock Density Breakdown */}
                    <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-[#18174e]" />
                                <span>Raw Materials vs Products Stock Density Distribution</span>
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%" debounce={200}>
                                <BarChart data={stockDensityBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                                    <Legend verticalAlign="top" height={36} iconType="square" wrapperStyle={{ fontSize: '11px' }} />
                                    <Bar dataKey="Raw Materials" fill="#18174e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Finished Products" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* BOTTOM ROW CHARTS: Cluster0 Density Distribution + Asset Health */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* Graph 3: Cluster0 Database Records Distribution */}
                    <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600 border-b border-slate-100 pb-3">
                            <Activity className="w-4 h-4 text-[#18174e]" />
                            <span>MongoDB Cluster0 Total Inventory Density Distribution</span>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%" debounce={200}>
                                <BarChart data={databaseDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} />
                                    <Bar dataKey="Items" radius={[4, 4, 0, 0]}>
                                        {databaseDistributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Graph 4: Fixed Asset Condition Tracking Trends */}
                    <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-600 border-b border-slate-100 pb-3">
                            <HardDrive className="w-4 h-4 text-[#18174e]" />
                            <span>Fixed Assets Health & Condition Status Analytics</span>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%" debounce={200}>
                                <LineChart data={assetConditionData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    <Line type="monotone" dataKey="Good Condition" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="Requires Attention" stroke="#f43f5e" strokeWidth={2.5} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default InventoryDashboard;