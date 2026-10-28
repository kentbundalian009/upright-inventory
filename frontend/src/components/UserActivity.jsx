import React, { useState, useEffect } from 'react';
import { 
  Clock, Calendar, Shield, User, Search, Filter, RefreshCw, 
  Activity, Share2, ExternalLink, Eye, CheckCircle2 
} from 'lucide-react';
import PageHeader from './layout/PageHeader';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';

function AdminUserActivity() {
    const { isDark } = useTheme();
    const [activeSection, setActiveSection] = useState('user-activity'); // 'user-activity' | 'link-clicks'

    // System Activity States
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');

    // Shared Link Clicks States
    const [linkClicks, setLinkClicks] = useState([]);
    const [linkLoading, setLinkLoading] = useState(false);
    const [linkSearchQuery, setLinkSearchQuery] = useState('');

    const API_BASE_URL = import.meta.env.MODE === 'production'
        ? 'https://upright-inventory.onrender.com'
        : 'http://localhost:5000';

    // 1. Fetch System Activity Logs
    const fetchLogs = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");

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

            setActivities(response.data || []);
        } catch (error) {
            console.error("Error loading activity logs:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Fetch Shared Link Click Logs
    const fetchLinkClicks = async () => {
        try {
            setLinkLoading(true);
            const token = localStorage.getItem("token");

            const response = await axios.get(`${API_BASE_URL}/api/logs/click`, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                params: {
                    limit: 50,
                    search: linkSearchQuery
                }
            });

            setLinkClicks(response.data || []);
        } catch (error) {
            console.error("Error loading link click logs:", error);
        } finally {
            setLinkLoading(false);
        }
    };

    // Initial load and role change
    useEffect(() => {
        if (activeSection === 'user-activity') {
            fetchLogs();
        } else {
            fetchLinkClicks();
        }
    }, [activeSection, roleFilter]);

    // Background polling for link clicks when on link-clicks tab
    useEffect(() => {
        if (activeSection === 'link-clicks') {
            const interval = setInterval(() => {
                fetchLinkClicks();
            }, 15000);
            return () => clearInterval(interval);
        }
    }, [activeSection, linkSearchQuery]);

    // Search handlers
    const handleSearchSubmit = (e) => {
        if (e) e.preventDefault();
        fetchLogs();
    };

    const handleLinkSearchSubmit = (e) => {
        if (e) e.preventDefault();
        fetchLinkClicks();
    };

    return (
        <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased">
            <PageHeader activeTab="user-activity" />

            <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800' : 'bg-white border-slate-100'} border rounded-2xl p-6 transition-all duration-300 flex flex-col gap-6 shadow-sm`}>

                {/* TAB SWITCHER: USER ACTIVITY VS SHARED LINK CLICKS */}
                <div className="flex items-center justify-between gap-3 border-b pb-4 flex-wrap border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveSection('user-activity')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                                activeSection === 'user-activity'
                                    ? (isDark ? 'bg-[#ff6600] text-white shadow-lg' : 'bg-[#18174e] text-white shadow-md')
                                    : (isDark ? 'bg-[#141622] text-slate-400 hover:text-white border border-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                            }`}
                        >
                            <Activity className="w-4 h-4" />
                            <span>System Activity Logs</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveSection('link-clicks')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer relative ${
                                activeSection === 'link-clicks'
                                    ? (isDark ? 'bg-[#ff6600] text-white shadow-lg' : 'bg-[#18174e] text-white shadow-md')
                                    : (isDark ? 'bg-[#141622] text-slate-400 hover:text-white border border-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                            }`}
                        >
                            <Share2 className="w-4 h-4" />
                            <span>Shared Link Tracking</span>
                            {linkClicks.length > 0 && (
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    activeSection === 'link-clicks'
                                        ? 'bg-white/25 text-white'
                                        : (isDark ? 'bg-indigo-900/60 text-indigo-300' : 'bg-indigo-100 text-indigo-700')
                                }`}>
                                    {linkClicks.length}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="text-xs font-medium text-slate-400">
                        {activeSection === 'user-activity' ? 'Auditing general user transactions' : 'Real-time shared link access audit'}
                    </div>
                </div>

                {/* 1. VIEW: SYSTEM USER ACTIVITY */}
                {activeSection === 'user-activity' && (
                    <>
                        {/* FILTER & SEARCH SECTION */}
                        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-1.5">
                            <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                                <Filter className={`w-4 h-4 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
                                <span>Filter Activity Logs (Showing Recent 50)</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600] cursor-pointer`}
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
                                        className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none`}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`inline-flex items-center justify-center gap-2 ${isDark ? 'bg-[#ff6600] hover:bg-[#ff8533]' : 'bg-[#18174e] hover:bg-[#23216d]'} text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50`}
                                >
                                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                    <span>Search / Refresh</span>
                                </button>
                            </div>
                            <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-full mt-3`}></div>
                        </form>

                        {/* TABLE MASTERLIST */}
                        <div className={`rounded-xl border ${isDark ? 'border-slate-800 bg-[#12141d]' : 'border-slate-100 bg-white'} shadow-sm overflow-hidden`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className={`text-white font-bold ${isDark ? 'bg-[#1a1d2d]' : 'bg-[#18174e]'} uppercase tracking-wide text-xs whitespace-nowrap`}>
                                            <th className="py-3 px-4">Username</th>
                                            <th className="py-3 px-4 text-center">System Role</th>
                                            <th className="py-3 px-4">Module</th>
                                            <th className="py-3 px-4 text-center">Operation</th>
                                            <th className="py-3 px-4">Action</th>
                                            <th className="py-3 px-4 text-center">Timestamp</th>
                                            <th className="py-3 px-4 text-center bg-indigo-900">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="7" className="text-center py-10 text-green-600 font-medium italic">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <RefreshCw className="w-4 h-4 animate-spin text-green-600" />
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
                                                <tr key={log._id || log.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${isDark ? 'text-slate-300' : 'text-slate-600'} font-medium text-sm whitespace-nowrap`}>
                                                    <td className={`py-3 px-4 font-mono font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{displayUsername}</td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${displayRole === 'Admin' ? 'bg-rose-100/70 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-amber-100/70 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}`}>
                                                            {displayRole === 'Admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                            {displayRole}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="inline-flex items-center text-xs text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/50 px-2 py-0.5 rounded-md font-semibold border border-cyan-100 dark:border-cyan-800/60">
                                                            {displayModule}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold border ${displayOperation === 'CREATE' || displayOperation === 'LOGIN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' :
                                                                displayOperation === 'DELETE' || displayOperation === 'LOGOUT' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800' :
                                                                    displayOperation === 'UPDATE' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' :
                                                                        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                                            }`}>
                                                            {displayOperation}
                                                        </span>
                                                    </td>
                                                    <td className={`py-3 px-4 ${isDark ? 'text-slate-300' : 'text-slate-600'} max-w-xs truncate`} title={displayAction}>{displayAction}</td>
                                                    <td className="py-3 px-4 text-center text-slate-500 font-mono text-xs">
                                                        <div className="inline-flex items-center gap-1 justify-center w-full">
                                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                            <span>{displayTimestamp}</span>
                                                        </div>
                                                    </td>
                                                    <td className={`py-3 px-4 text-center text-slate-500 font-mono text-xs ${isDark ? 'bg-slate-900/40 text-slate-300' : 'bg-slate-50/50'}`}>
                                                        <div className="inline-flex items-center gap-1 justify-center w-full font-semibold text-indigo-950 dark:text-indigo-300">
                                                            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                                            <span>{displayDate}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {!loading && activities.length === 0 && (
                                            <tr>
                                                <td colSpan="7" className="text-center py-10 text-red-600 font-medium italic">
                                                    No records match the selected filters or search queries.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* 2. VIEW: SHARED LINK ACCESS TRACKING */}
                {activeSection === 'link-clicks' && (
                    <>
                        {/* FILTER & SEARCH SECTION FOR LINK CLICKS */}
                        <form onSubmit={handleLinkSearchSubmit} className="flex flex-col gap-1.5">
                            <div className={`flex items-center justify-between text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                                <div className="flex items-center gap-2">
                                    <Share2 className={`w-4 h-4 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
                                    <span>Real-Time Shared Link Access Logs</span>
                                </div>
                                <span className="text-xs text-slate-400 font-normal">Auto-refreshes every 15s</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                <div className="relative sm:col-span-3">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by Clicked By, Shared By, Page, or URL..."
                                        value={linkSearchQuery}
                                        onChange={(e) => setLinkSearchQuery(e.target.value)}
                                        className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none`}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={linkLoading}
                                    className={`inline-flex items-center justify-center gap-2 ${isDark ? 'bg-[#ff6600] hover:bg-[#ff8533]' : 'bg-[#18174e] hover:bg-[#23216d]'} text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50`}
                                >
                                    <RefreshCw className={`w-4 h-4 ${linkLoading ? 'animate-spin' : ''}`} />
                                    <span>Search / Refresh</span>
                                </button>
                            </div>
                            <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-full mt-3`}></div>
                        </form>

                        {/* TABLE LINK CLICKS */}
                        <div className={`rounded-xl border ${isDark ? 'border-slate-800 bg-[#12141d]' : 'border-slate-100 bg-white'} shadow-sm overflow-hidden`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className={`text-white font-bold ${isDark ? 'bg-[#1a1d2d]' : 'bg-[#18174e]'} uppercase tracking-wide text-xs whitespace-nowrap`}>
                                            <th className="py-3 px-4">Opened By</th>
                                            <th className="py-3 px-4">Shared By</th>
                                            <th className="py-3 px-4">Target Page</th>
                                            <th className="py-3 px-4">Accessed URL</th>
                                            <th className="py-3 px-4 text-center">Timestamp</th>
                                            <th className="py-3 px-4 text-center bg-indigo-900">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                        {linkLoading ? (
                                            <tr>
                                                <td colSpan="6" className="text-center py-10 text-green-600 font-medium italic">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <RefreshCw className="w-4 h-4 animate-spin text-green-600" />
                                                        <span>Fetching shared link access logs...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : linkClicks.map((log) => {
                                            const isAnon = log.openedBy === 'Anonymous Viewer' || !log.openedBy;
                                            return (
                                                <tr key={log.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${isDark ? 'text-slate-300' : 'text-slate-600'} font-medium text-sm whitespace-nowrap`}>
                                                    <td className="py-3.5 px-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                                                            isAnon 
                                                                ? (isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-200')
                                                                : (isDark ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                                                        }`}>
                                                            {isAnon ? <Eye className="w-3.5 h-3.5 text-slate-400" /> : <User className="w-3.5 h-3.5 text-emerald-500" />}
                                                            <span>{log.openedBy || 'Anonymous Viewer'}</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono font-bold">
                                                        <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                                            <Share2 className="w-3.5 h-3.5" />
                                                            <span>{log.sharedBy}</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className="inline-flex items-center text-xs text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/50 px-2.5 py-1 rounded-md font-semibold border border-cyan-100 dark:border-cyan-800/60">
                                                            {log.page || 'Rackings (Records)'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 max-w-xs truncate" title={log.url}>
                                                        <a 
                                                            href={log.url || '#'} 
                                                            target="_blank" 
                                                            rel="noreferrer" 
                                                            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono truncate max-w-[260px]"
                                                        >
                                                            <ExternalLink className="w-3 h-3 shrink-0" />
                                                            <span className="truncate">{log.url || '—'}</span>
                                                        </a>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-500">
                                                        <div className="inline-flex items-center gap-1 justify-center w-full">
                                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                            <span>{log.timestamp}</span>
                                                        </div>
                                                    </td>
                                                    <td className={`py-3.5 px-4 text-center font-mono text-xs ${isDark ? 'bg-slate-900/40 text-slate-300' : 'bg-slate-50/50'}`}>
                                                        <div className="inline-flex items-center gap-1 justify-center w-full font-semibold text-indigo-950 dark:text-indigo-300">
                                                            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                                            <span>{log.date}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {!linkLoading && linkClicks.length === 0 && (
                                            <tr>
                                                <td colSpan="6" className="text-center py-10 text-slate-400 font-medium italic">
                                                    No shared link clicks recorded yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}

export default AdminUserActivity;
