import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Shield, User, Search, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import PageHeader from './PageHeader';
import axios from 'axios';

function AdminUserActivity() {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');

    // 🚀 BAGONG LOGIC: Kumukuha ng parameters para sa server-side search at limitasyon
    const fetchLogs = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");

            // Ipinapasa ang query at limit (50) sa backend para manatiling searchable ang buong DB
            // 1. Alamin muna kung production o local development ang tumatakbo
            const API_BASE_URL = import.meta.env.MODE === 'production'
                ? 'https://one-inventory.onrender.com'
                : 'http://localhost:5000';

            // 2. Gamitin ang API_BASE_URL sa iyong axios request
            const response = await axios.get(`${API_BASE_URL}/api/activity-logs`, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: {
                    limit: 50,
                    search: searchQuery,
                    role: roleFilter
                }
            });

            setActivities(response.data);
        } catch (error) {
            console.error("Error loading activity logs:", error);
        } finally {
            setLoading(false);
        }
    };

    // Kusang magre-refresh kapag pinalitan ang Role Filter sa dropdown
    useEffect(() => {
        fetchLogs();
    }, [roleFilter]);

    // Trinitrigger kapag pinindot ang 'Enter' sa search bar o pinindot ang Refresh/Search button
    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        fetchLogs();
    };

    return (
        <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased">
            <PageHeader activeTab="user-activity" />

            <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 transition-all duration-300 flex flex-col gap-6 shadow-sm">

                {/* FILTER & SEARCH SECTION */}
                <form onSubmit={handleSearchSubmit} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                        <Filter className="w-4 h-4 text-[#18174e]" />
                        <span>Filter Activity Logs (Showing Recent 50)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                        >
                            <option value="All">All Roles</option>
                            <option value="Admin">Admin</option>
                            <option value="Inventory">Inventory</option>
                        </select>

                        <div className="relative sm:col-span-2">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by User, Module, Date (YYYY-MM-DD)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 bg-[#18174e] hover:bg-[#23216d] text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            <span>Search / Refresh</span>
                        </button>
                    </div>
                    <div className="h-px bg-slate-100 w-full mt-3"></div>
                </form>

                {/* TABLE MASTERLIST */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="text-white font-bold bg-[#18174e] uppercase tracking-wide text-sm whitespace-nowrap">
                                    <th className="py-3 px-4">Username</th>
                                    <th className="py-3 px-4 text-center">System Role</th>
                                    <th className="py-3 px-4">Module</th>
                                    <th className="py-3 px-4 text-center">Operation</th>
                                    <th className="py-3 px-4">Action</th>
                                    <th className="py-3 px-4 text-center">Timestamp</th>
                                    <th className="py-3 px-4 text-center bg-indigo-900">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-10 text-green-700 font-medium italic">
                                            <div className="flex items-center justify-center gap-2">
                                                <span>Fetching secure users data from database...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : activities.map((log) => {
                                    const displayUsername = log.Username || log.username || "Unknown User";
                                    const displayRole = log.SystemRole || log.role || "User";
                                    const displayModule = log.Module || log.module || "Auth";
                                    const displayOperation = log.Operation || log.operation || "LOGOUT";
                                    const displayAction = log.Action || log.action || "";
                                    const displayTimestamp = log.Timestamp || log.timestamp || "";
                                    const displayDate = log.Date || log.date || "";

                                    return (
                                        <tr key={log._id || log.id} className="hover:bg-slate-50/80 transition-colors text-slate-600 font-medium text-sm whitespace-nowrap">
                                            <td className="py-3 px-4 font-mono font-bold text-slate-800">{displayUsername}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${displayRole === 'Admin' ? 'bg-rose-100/70 text-rose-700' : 'bg-amber-100/70 text-amber-700'
                                                    }`}>
                                                    {displayRole === 'Admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                    {displayRole}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="inline-flex items-center text-xs text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md font-semibold border border-cyan-100">
                                                    {displayModule}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold border ${displayOperation === 'CREATE' || displayOperation === 'LOGIN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                        displayOperation === 'DELETE' || displayOperation === 'LOGOUT' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                            displayOperation === 'UPDATE' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                'bg-slate-100 text-slate-700 border-slate-200'
                                                    }`}>
                                                    {displayOperation}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={displayAction}>{displayAction}</td>
                                            <td className="py-3 px-4 text-center text-slate-500 font-mono text-xs">
                                                <div className="inline-flex items-center gap-1 justify-center w-full">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    <span>{displayTimestamp}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-center text-slate-500 font-mono text-xs bg-slate-50/50">
                                                <div className="inline-flex items-center gap-1 justify-center w-full font-semibold text-indigo-950">
                                                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                                    <span>{displayDate}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {!loading && activities.length === 0 && (
                                     <tr>
                                        <td colSpan="13" className="text-center py-10 text-red-600 font-medium italic">
                                            No records match the selected filters or search queries.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminUserActivity;
