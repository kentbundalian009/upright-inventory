import React, { useState } from 'react';
import { Users, ShieldAlert, Activity, CheckCircle2, UserCheck, Shield, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import PageHeader from '../Common/PageHeader';

function AdminDashboard() {
    // 1. Data Sources para sa pag-compute ng mga Numero (Dashboard Metrics)
    const [users] = useState([
        { empNo: 'EMP-2026-001', role: 'Admin' },
        { empNo: 'EMP-2026-002', role: 'Inventory' },
        { empNo: 'EMP-2026-003', role: 'Inventory' }
    ]);

    const [logs] = useState([
        { operation: 'CREATE', date: '2026-06-25' },
        { operation: 'UPDATE', date: '2026-06-25' },
        { operation: 'APPROVE', date: '2026-06-25' },
        { operation: 'DELETE', date: '2026-06-25' },
        { operation: 'TRANSFER', date: '2026-06-25' }
    ]);

    // 2. Dashboard Analytics Computations
    const totalUsers = users.length;
    const adminCount = users.filter(u => u.role === 'Admin').length;
    const inventoryCount = users.filter(u => u.role === 'Inventory').length;
    
    const totalLogsToday = logs.length;
    const criticalDeletes = logs.filter(l => l.operation === 'DELETE').length;
    const totalApprovals = logs.filter(l => l.operation === 'APPROVE').length;

    // 3. GRAPH DATA CONFIGURATIONS (Dynamic na karga mula sa state)
    
    // Data para sa Pie Chart (User Roles)
    const rolePieData = [
        { name: 'Admin Accounts', value: adminCount, color: '#7c3aed' },      // Purple-600
        { name: 'Inventory Staff', value: inventoryCount, color: '#2563eb' }  // Blue-600
    ];

    // Data para sa Bar Chart (Activity Breakdown)
    const activityBarData = [
        { name: 'Create', Count: logs.filter(l => l.operation === 'CREATE').length },
        { name: 'Update', Count: logs.filter(l => l.operation === 'UPDATE').length },
        { name: 'Approve', Count: totalApprovals },
        { name: 'Delete', Count: criticalDeletes },
        { name: 'Transfer', Count: logs.filter(l => l.operation === 'TRANSFER').length },
    ];

    return (
        <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased text-slate-700">
            
            {/* Consistent Page Header */}
            <PageHeader activeTab="admin-dashboard" />

            {/* VISUAL CHARTS GRAPH GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Graph 1: User Roles Breakdown (Pie Chart - Occupies 1 Column) */}
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                    
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600 border-b border-slate-100 pb-3">
                        <UserCheck className="w-4 h-4 text-[#18174e]" />
                        <span>Account Role Share</span>
                    </div>
                    <div className="h-64 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={rolePieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {rolePieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`${value} Account(s)`, 'Count']} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Graph 2: System Activity Volume (Bar Chart - Occupies 2 Columns) */}
                <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                    <div className="text-sm font-bold text-slate-600 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#18174e]" />
                        <span>Audit Log Activity Frequencies</span>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activityBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="Count" fill="#18174e" radius={[6, 6, 0, 0]}>
                                    {/* Gawing kulay Pula (Rose) ang bar kapag 'Delete' ang operation para sa visual alert */}
                                    {activityBarData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Delete' && entry.Count > 0 ? '#f43f5e' : '#18174e'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* MAIN DASHBOARD CONTENT GRID (Yung Tables Mo) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* CARD 1: USER MANAGEMENT SUMMARY */}
                <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600 border-b border-slate-100 pb-3">
                        <Users className="w-4 h-4 text-[#18174e]" />
                        <span>User Management Table Summary</span>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="text-white font-bold bg-[#18174e] uppercase tracking-wide text-xs">
                                    <th className="py-3 px-4">Metric Description</th>
                                    <th className="py-3 px-4 text-center bg-indigo-950/40 w-1/3">System Count</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr className="hover:bg-slate-50/80 transition-colors text-slate-600 font-medium">
                                    <td className="py-3.5 px-4 font-bold text-[#18174e]">Total Registered Accounts</td>
                                    <td className="py-3.5 px-4 text-center bg-slate-50/50">
                                        <span className="text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md font-mono text-xs font-bold">
                                            {totalUsers} Users
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/80 transition-colors text-slate-600 font-medium">
                                    <td className="py-3.5 px-4 text-slate-500 pl-8">↳ Administrator Role</td>
                                    <td className="py-3.5 px-4 text-center">
                                        <span className="text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md font-mono text-xs font-bold">
                                            {adminCount} Active
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/80 transition-colors text-slate-600 font-medium">
                                    <td className="py-3.5 px-4 text-slate-500 pl-8">↳ Inventory Staff Role</td>
                                    <td className="py-3.5 px-4 text-center">
                                        <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md font-mono text-xs font-bold">
                                            {inventoryCount} Active
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* CARD 2: SYSTEM ACTIVITY LOGS SUMMARY */}
                <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600 border-b border-slate-100 pb-3">
                        <Activity className="w-4 h-4 text-[#18174e]" />
                        <span>System Activity & Audit Logs</span>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="text-white font-bold bg-[#18174e] uppercase tracking-wide text-xs">
                                    <th className="py-3 px-4">Audit Indicators</th>
                                    <th className="py-3 px-4 text-center bg-emerald-600 w-1/3">Log Count</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                <tr className="hover:bg-slate-50/80 transition-colors text-slate-600 font-medium">
                                    <td className="py-3.5 px-4 font-bold text-[#18174e]">Total Actions Registered Today</td>
                                    <td className="py-3.5 px-4 text-center bg-emerald-50/20">
                                        <span className="text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2.5 py-1 rounded-md font-mono text-xs font-bold">
                                            {totalLogsToday} Logs
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/80 transition-colors text-slate-600 font-medium">
                                    <td className="py-3.5 px-4 text-slate-500 flex items-center gap-2 pl-6">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" /> Authorized Approvals
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                        <span className="text-cyan-700 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-md font-mono text-xs font-bold">
                                            {totalApprovals} Approved
                                        </span>
                                    </td>
                                </tr>
                                <tr className="hover:bg-slate-50/80 transition-colors text-slate-600 font-medium">
                                    <td className="py-3.5 px-4 text-slate-500 flex items-center gap-2 pl-6">
                                        <AlertCircle className={criticalDeletes > 0 ? "w-3.5 h-3.5 text-rose-500 animate-bounce" : "w-3.5 h-3.5 text-slate-400"} /> Data Deletions (Critical)
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-md font-mono text-xs font-bold border ${
                                            criticalDeletes > 0 ? "text-rose-700 bg-rose-50 border-rose-200" : "text-slate-400 bg-slate-50 border-slate-200"
                                        }`}>
                                            {criticalDeletes} Incident(s)
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default AdminDashboard;