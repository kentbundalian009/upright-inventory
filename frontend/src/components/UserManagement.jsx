import React, { useState, useEffect } from 'react';
import {
    Search,
    AlertCircle,
    Filter,
    X,
    Edit2,
    Archive,
    Eye,
    EyeOff,
    RefreshCw,
    CheckCircle2,
    User
} from 'lucide-react';
import axios from 'axios';
import PageHeader from './layout/PageHeader';

function AdminUserManagement() {
    // Dynamic Environment URL Strategy
    const API_BASE_URL = import.meta.env.MODE === 'production'
        ? 'https://one-inventory.onrender.com'
        : 'http://localhost:5000';

    // 1. DATABASE AT LIFECYCLE STATES
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showArchivedOnly, setShowArchivedOnly] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRole, setSelectedRole] = useState('All Roles');
    const [previewImage, setPreviewImage] = useState(null);

    // Profile Image URL Resolver
    const getProfileImageUrl = (img) => {
        if (!img) return null;
        if (img.startsWith('blob:') || img.startsWith('http') || img.startsWith('data:')) return img;
        if (import.meta.env.MODE === 'production') return img;
        return `${window.location.protocol}//${window.location.hostname}:5000${img}`;
    };

    // Custom UI Notification States
    const [successMessage, setSuccessMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    // Custom Confirmation Modal States (Eksklusibo para sa Archive/Restore)
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmModalConfig, setConfirmModalConfig] = useState({
        title: '',
        message: '',
        actionType: 'archive',
        targetUser: null
    });

    // Modals States (Forms)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form Inputs (Add User)
    const [employeeNo, setEmployeeNo] = useState('');
    const [username, setUsername] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Inventory');
    const [showPassword, setShowPassword] = useState(false);

    // Form Inputs (Edit User)
    const [editingUserId, setEditingUserId] = useState('');
    const [editEmployeeNo, setEditEmployeeNo] = useState('');
    const [editUsername, setEditUsername] = useState('');
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editRole, setEditRole] = useState('Inventory');
    const [editProfileImage, setEditProfileImage] = useState('');

    // Auto-dismiss Success Toast matapos ang 4 na segundo
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // 2. READ: FETCH DATA FROM BACKEND API
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE_URL}/api/users`);

            if (Array.isArray(response.data)) {
                setUsers(response.data);
            } else if (response.data && Array.isArray(response.data.data)) {
                setUsers(response.data.data);
            } else {
                setUsers([]);
            }
            setError(null);
        } catch (err) {
            console.error("Failed to load data from the server.", err);
            setError("Failed to load data from the server.");
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // 3. ACTION HANDLERS
    const openEditModal = (user) => {
        setEditingUserId(user._id);
        setEditEmployeeNo(user.EmpNo);
        setEditUsername(user.Username);
        setEditName(user.Fullname);
        setEditEmail(user.Email);
        setEditRole(user.SystemRole || 'Inventory');
        setEditProfileImage(user.ProfileImage || user.profileImage || '');
        setIsEditModalOpen(true);
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!employeeNo || !username || !name || !email || !password) {
            setErrorMessage('Fill in all required fields before submitting.');
            return;
        }

        if (passwordStrength.label === 'Weak' || !password) {
            setErrorMessage('Failed to add user: Password is too weak. Please use a stronger password.');
            return;
        }

        try {
            await axios.post(`${API_BASE_URL}/api/users`, {
                EmpNo: employeeNo.trim(),
                Username: username.trim().toLowerCase(),
                Fullname: name.trim(),
                Email: email.toLowerCase().trim(),
                Password: password,
                SystemRole: role
            });
            setSuccessMessage(`New user added: ${username.trim().toLowerCase()}`);
            setErrorMessage(null);
            setEmployeeNo(''); setUsername(''); setName(''); setEmail(''); setPassword(''); setRole('Inventory');
            setIsModalOpen(false);
            fetchUsers();
        } catch (err) {
            setErrorMessage(err.response?.data?.message || "Failed to add user: Unable to create new account.");
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        if (!editEmployeeNo || !editUsername || !editName || !editEmail) {
            setErrorMessage('Fill in all required fields before submitting.');
            return;
        }
        try {
            await axios.put(`${API_BASE_URL}/api/users/${editingUserId}`, {
                EmpNo: editEmployeeNo.trim(),
                Username: editUsername.trim().toLowerCase(),
                Fullname: editName.trim(),
                Email: editEmail.toLowerCase().trim(),
                SystemRole: editRole
            });
            setSuccessMessage(`Profile of ${editUsername.trim().toLowerCase()} has been updated successfully.`);
            setErrorMessage(null);
            setIsEditModalOpen(false);
            fetchUsers();
        } catch (err) {
            setErrorMessage(err.response?.data?.message || "Failed to update user profile.");
        }
    };

    const triggerArchiveModal = (user) => {
        setConfirmModalConfig({
            title: 'Archive User Account',
            message: `Are you sure you want to archive the account of "${user.Fullname}" (${user.EmpNo})?`,
            actionType: 'archive',
            targetUser: user
        });
        setIsConfirmModalOpen(true);
    };

    const triggerRestoreModal = (user) => {
        setConfirmModalConfig({
            title: 'Restore User Account',
            message: `Are you sure you want to restore the account of "${user.Fullname}"?`,
            actionType: 'restore',
            targetUser: user
        });
        setIsConfirmModalOpen(true);
    };

    const handleConfirmAction = async () => {
        const { actionType, targetUser } = confirmModalConfig;
        if (!targetUser) return;

        try {
            if (actionType === 'archive') {
                await axios.delete(`${API_BASE_URL}/api/users/${targetUser._id}`);
                setSuccessMessage(`Successfully archived the account of ${targetUser.Fullname}.`);
            } else if (actionType === 'restore') {
                await axios.put(`${API_BASE_URL}/api/users/restore/${targetUser._id}`);
                setSuccessMessage(`Successfully restored the account of ${targetUser.Fullname} to active status.`);
            }
            setIsConfirmModalOpen(false);
            fetchUsers();
        } catch (err) {
            setErrorMessage(actionType === 'archive' ? "Failed to archive the user account." : "Failed to restore the user account.");
            setIsConfirmModalOpen(false);
        }
    };

    // Password strength check utility
    const checkPasswordStrength = (pass) => {
        if (!pass) return { label: 'Empty', color: 'text-slate-400', bg: 'bg-slate-200' };
        const hasLetters = /[a-zA-Z]/.test(pass);
        const hasNumbers = /[0-9]/.test(pass);
        const hasSpecial = /[^A-Za-z0-9]/.test(pass);
        const totalCriteria = [hasLetters, hasNumbers, hasSpecial].filter(Boolean).length;
        if (pass.length >= 8 && totalCriteria === 3) return { label: 'Strong', color: 'text-emerald-600', bg: 'bg-emerald-500' };
        if (pass.length >= 6 && totalCriteria >= 2) return { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-500' };
        return { label: 'Weak', color: 'text-rose-600', bg: 'bg-rose-500' };
    };
    const passwordStrength = checkPasswordStrength(password);

    // 4. SEPARATION & FILTERING LOGIC
    const currentDisplayList = users.filter(item =>
        showArchivedOnly ? item.isArchived === true : !item.isArchived
    );
    const filteredUsers = currentDisplayList.filter(item => {
        const matchesRole = selectedRole === 'All Roles' || item.SystemRole === selectedRole;

        const matchesSearch =
            (item.EmpNo && item.EmpNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.Username && item.Username.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.Fullname && item.Fullname.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.Email && item.Email.toLowerCase().includes(searchTerm.toLowerCase()));

        return matchesRole && matchesSearch;
    });

    const activeCount = users.filter(item => !item.isArchived).length;
    const archivedCount = users.filter(item => item.isArchived).length;

    return (
        <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative">
            <PageHeader activeTab="user-management" />

            {/* SUCCESS NOTIFICATION TOAST */}
            {successMessage && (
                <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold">{successMessage}</span>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-6">

                {/* FILTER & CONTROLS SECTION */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                            <Filter className="w-4 h-4 text-[#18174e]" />
                            <span>{showArchivedOnly ? 'Viewing Archived Employee Directory Vault' : 'Filter User Directory'}</span>
                        </div>

                        {/* BUTTON WRAPPER CONTAINER */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { setErrorMessage(null); setIsModalOpen(true); }}
                                className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border bg-[#18174e] text-white hover:bg-[#18174e]/90 transition-all cursor-pointer"
                            >
                                Add User Account
                            </button>

                            <button
                                onClick={() => setShowArchivedOnly(!showArchivedOnly)}
                                className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${showArchivedOnly ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                            >
                                {showArchivedOnly ? (
                                    <>
                                        <EyeOff className="w-3.5 h-3.5" /> Show Active Accounts ({activeCount})
                                    </>
                                ) : (
                                    <>
                                        <Archive className="w-3.5 h-3.5" /> View Archive Vault ({archivedCount})
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 items-center mt-2">
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full"
                        >
                            <option value="All Roles">All Roles</option>
                            <option value="Admin">Admin</option>
                            <option value="Inventory">Inventory</option>
                            <option value="Purchasing">Purchasing</option>
                        </select>

                        <div className="relative w-full md:col-span-2">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search Employee No, Username, Full Name or Email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none text-slate-700"
                            />
                        </div>
                    </div>
                    <div className="h-px bg-slate-100 w-full mt-3"></div>
                </div>

                {/* TABLE MASTERLIST CONTAINER */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="text-white font-bold bg-[#18174e] uppercase tracking-wide text-sm">
                                    <th className="py-3 px-4 whitespace-nowrap">Emp No.</th>
                                    <th className="py-3 px-4 text-center whitespace-nowrap">Image</th>
                                    <th className="py-3 px-4 whitespace-nowrap">System Role</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Username</th>
                                    <th className="py-3 px-4 whitespace-nowrap">Full Name</th>
                                    <th className="py-3 px-4 whitespace-nowrap bg-indigo-950">Email Address</th>
                                    <th className="py-3 px-4 text-center bg-indigo-900 whitespace-nowrap">Action</th>
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
                                ) : error ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-8 text-rose-600 font-semibold">
                                            {error}
                                        </td>
                                    </tr>
                                ) : filteredUsers.map((user) => {
                                    const userImage = user.ProfileImage || user.profileImage;
                                    const initial = (user.Fullname || user.Username || 'U').charAt(0).toUpperCase();

                                    return (
                                        <tr
                                            key={user._id || user.EmpNo}
                                            className={`hover:bg-slate-50/80 transition-colors text-slate-600 font-medium whitespace-nowrap text-sm ${user.isArchived ? 'bg-rose-50/20' : ''}`}
                                        >
                                            <td className="py-3 px-4 font-mono font-extrabold text-[#18174e]">{user.EmpNo}</td>
                                            <td className="py-2 px-4 text-center">
                                                {userImage ? (
                                                    <div className="relative inline-block">
                                                        <img
                                                            src={getProfileImageUrl(userImage)}
                                                            alt={user.Fullname || user.Username}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                if (e.target.nextElementSibling) {
                                                                    e.target.nextElementSibling.style.display = 'flex';
                                                                }
                                                            }}
                                                            onClick={() => setPreviewImage(getProfileImageUrl(userImage))}
                                                            className="w-10 h-10 object-cover rounded-full border border-slate-200 shadow-sm mx-auto cursor-pointer hover:scale-110 hover:border-indigo-500 transition-all"
                                                            title="Click to preview image"
                                                        />
                                                        <div style={{ display: 'none' }} className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs items-center justify-center mx-auto shadow-sm">
                                                            {initial}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center mx-auto shadow-sm">
                                                        {initial}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    user.SystemRole === 'Admin' 
                                                        ? 'bg-blue-100 text-blue-800' 
                                                        : user.SystemRole === 'Purchasing'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-orange-100 text-orange-800'
                                                }`}>
                                                    {user.SystemRole || 'Inventory'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-slate-700 font-mono">{user.Username}</td>
                                            <td className="py-3 px-4 text-slate-800 font-semibold">{user.Fullname}</td>
                                            <td className="py-3 px-4 text-slate-500 bg-slate-50/30">{user.Email}</td>
                                            <td className="py-3 px-4 bg-slate-50/40 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {!showArchivedOnly ? (
                                                        <>
                                                            <button
                                                                onClick={() => { setErrorMessage(null); openEditModal(user); }}
                                                                className="p-1 bg-white border border-slate-200 rounded text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => triggerArchiveModal(user)}
                                                                className="p-1 bg-white border border-slate-200 rounded text-rose-600 hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
                                                            >
                                                                <Archive className="w-3.5 h-3.5" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => triggerRestoreModal(user)}
                                                            className="p-1 bg-white border border-emerald-200 rounded text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs px-2 py-0.5 font-bold"
                                                        >
                                                            <RefreshCw className="w-3 h-3" /> Restore Account
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredUsers.length === 0 && !loading && (
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
            </div>

            {/* MODAL 1: ADD USER ACCOUNT WITH SECURITY PROTOCOLS */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-800 text-base">Add New User Account</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 mt-3">
                            <span className="block text-xs font-bold text-amber-800 uppercase mb-1">
                                * System Security Protocol *
                            </span>
                            <p className="text-[11px] text-amber-700 leading-relaxed">
                                Account creation requires a verified employee identifier. Submission is automatically halted if the security metrics evaluate the credential standard as <strong>Weak or Empty.</strong>
                            </p>
                        </div>

                        <form onSubmit={handleAddUser} className="space-y-4 mt-4">
                            {errorMessage && (
                                <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessage}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Employee No. *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="EMP-2026-001"
                                        value={employeeNo}
                                        onChange={(e) => setEmployeeNo(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e] text-slate-700 placeholder-slate-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Username *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Unique username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e] text-slate-700 placeholder-slate-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Firstname, Lastname"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e] text-slate-700 placeholder-slate-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="example@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e] text-slate-700 placeholder-slate-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">System Role *</label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e] text-slate-700 cursor-pointer"
                                    >
                                        <option value="Inventory">Inventory</option>
                                        <option value="Admin">Admin</option>
                                        <option value="Purchasing">Purchasing</option>
                                        <option value="Viewer">Viewer</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-sm font-bold text-slate-600 uppercase">Password *</label>
                                        {password && (
                                            <span className={`text-xs font-bold ${passwordStrength.color} transition-all`}>
                                                {passwordStrength.label} Password
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 pr-10 py-2 text-sm focus:outline-none focus:border-[#18174e] text-slate-700 placeholder-slate-400"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer flex items-center"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>

                                {passwordStrength.label !== 'Weak' && passwordStrength.label !== 'Empty' && (
                                    <button
                                        type="submit"
                                        className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer animate-in fade-in duration-200"
                                    >
                                        Create User
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: EDIT USER PROFILE WITH AUDIT PROTOCOLS */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-800 text-base">Edit User Information</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 mt-3">
                            <span className="block text-xs font-bold text-amber-800 uppercase mb-1">
                                * System Administration Protocol *
                            </span>
                            <p className="text-[11px] text-amber-700 leading-relaxed">
                                Modifying system account classifications or directory credentials directly impacts access logs. All profile adjustments are permanently logged to comply with data <strong>Audit Protocols.</strong>
                            </p>
                        </div>

                        {/* USER PROFILE INFO BANNER */}
                        <div className="flex items-center gap-3.5 p-3 bg-slate-50 rounded-xl border border-slate-200/70 mt-3">
                            {editProfileImage ? (
                                <div className="relative inline-block shrink-0">
                                    <img 
                                        src={getProfileImageUrl(editProfileImage)} 
                                        alt="User Profile" 
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            if (e.target.nextElementSibling) {
                                                e.target.nextElementSibling.style.display = 'flex';
                                            }
                                        }}
                                        onClick={() => setPreviewImage(getProfileImageUrl(editProfileImage))}
                                        className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                                        title="Click to preview image"
                                    />
                                    <div style={{ display: 'none' }} className="w-12 h-12 rounded-full bg-[#18174e] text-white font-bold text-base items-center justify-center shadow-sm">
                                        {editName ? editName.charAt(0).toUpperCase() : editUsername ? editUsername.charAt(0).toUpperCase() : <User className="w-6 h-6 text-white" />}
                                    </div>
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-[#18174e] text-white font-bold text-base flex items-center justify-center shadow-sm shrink-0">
                                    {editName ? editName.charAt(0).toUpperCase() : editUsername ? editUsername.charAt(0).toUpperCase() : <User className="w-6 h-6 text-white" />}
                                </div>
                            )}
                            <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-800 truncate">{editName || editUsername}</h4>
                                <p className="text-xs text-slate-500 font-mono">{editEmployeeNo} • <span className="font-semibold text-indigo-600">{editRole}</span></p>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateUser} className="space-y-4 mt-4">
                            {errorMessage && (
                                <div className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessage}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Employee No. *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editEmployeeNo}
                                        onChange={(e) => setEditEmployeeNo(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e] text-slate-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Username *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editUsername}
                                        onChange={(e) => setEditUsername(e.target.value.toLowerCase())}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e] text-slate-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e] text-slate-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Email Address *</label>
                                    <input
                                        type="email"
                                        required
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e] text-slate-700"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">System Role *</label>
                                    <select
                                        value={editRole}
                                        onChange={(e) => setEditRole(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e] text-slate-700 cursor-pointer"
                                    >
                                        <option value="Inventory">Inventory</option>
                                        <option value="Admin">Admin</option>
                                        <option value="Purchasing">Purchasing</option>
                                        <option value="Viewer">Viewer</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CUSTOM CONFIRMATION MODAL (Archive & Restore Only) */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl relative flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                            <h3 className="font-bold text-slate-800 text-base">
                                {confirmModalConfig.title}
                            </h3>
                        </div>

                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 mt-3 shrink-0">
                            <span className="block text-xs font-bold text-amber-800 uppercase mb-1">
                                * System Action Protocol *
                            </span>
                            <p className="text-[11px] text-amber-700 leading-relaxed">
                                Please review the operation context. Confirming this step commits data status updates directly to the live system registry.
                            </p>
                        </div>

                        <div className="mt-4 flex-1">
                            <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                {confirmModalConfig.message}
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100 shrink-0">
                            <button 
                                type="button" 
                                onClick={() => setIsConfirmModalOpen(false)} 
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                onClick={handleConfirmAction} 
                                className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* USER PROFILE IMAGE PREVIEW MODAL */}
            {previewImage && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[100] p-4 transition-all" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-sm max-h-[85vh] bg-white rounded-2xl p-3 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={() => setPreviewImage(null)} 
                            className="absolute -top-3 -right-3 bg-white border border-slate-200 text-slate-700 hover:text-rose-600 shadow-md rounded-full p-1.5 transition-colors cursor-pointer z-10"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <img 
                            src={previewImage} 
                            alt="Profile Preview" 
                            onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextElementSibling) {
                                    e.target.nextElementSibling.style.display = 'flex';
                                }
                            }}
                            className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-sm select-none" 
                        />
                        <div style={{ display: 'none' }} className="p-8 text-center flex flex-col items-center gap-3">
                            <User className="w-16 h-16 text-slate-300" />
                            <p className="text-xs font-semibold text-slate-500">Image file is missing or was uploaded to a different local machine.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminUserManagement;
