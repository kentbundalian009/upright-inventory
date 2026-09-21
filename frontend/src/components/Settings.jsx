import React, { useState, useEffect } from 'react';
import { Shield, Settings as SettingsIcon, Eye, EyeOff, Key, X, CheckCircle2, Camera, Upload, User, Palette, Sun, Moon } from 'lucide-react';
import PageHeader from './layout/PageHeader';
import { useTheme } from '../context/ThemeContext';

function Settings() {
    const { theme, isDark, toggleTheme, setTheme } = useTheme();
    const [userData, setUserData] = useState(null);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [employeeNo, setEmployeeNo] = useState('EMP-0000-000');
    const [role, setRole] = useState('Inventory');

    const [profileImageFile, setProfileImageFile] = useState(null);
    const [profileImagePreview, setProfileImagePreview] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    const [successMessage, setSuccessMessage] = useState(null);

useEffect(() => {
    const fetchUserData = async () => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!storedUser) {
            console.error("Walang nakitang user sa localStorage.");
            return;
        }

        try {
            const parsedUser = JSON.parse(storedUser);
            
            const userId = parsedUser.id || parsedUser._id || (parsedUser.user && (parsedUser.user.id || parsedUser.user._id));

            if (!userId) {
                console.error("Failed to retrieve user ID from localStorage data.");
            }

const API_BASE_URL = import.meta.env.MODE === 'production'
    ? 'https://one-inventory.onrender.com'
    : 'http://localhost:5000';

const response = await fetch(`${API_BASE_URL}/api/users/profile/${userId}`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
            if (response.ok) {
                const freshUser = await response.json();

                setUserData(freshUser);
                setName(freshUser.Fullname || freshUser.fullname || '');
                setUsername(freshUser.Username || freshUser.username || '');
                setEmail(freshUser.Email || freshUser.email || '');
                setEmployeeNo(freshUser.EmpNo || freshUser.empNo || 'EMP-0000-000');
                setRole(freshUser.SystemRole || freshUser.systemRole || 'Inventory');
                setProfileImagePreview(freshUser.ProfileImage || freshUser.profileImage || '');
            } else {
                console.warn("Failed to reach the profile endpoint, using LocalStorage data.");

                setUserData(parsedUser);
                setName(parsedUser.Fullname || parsedUser.fullname || '');
                setUsername(parsedUser.Username || parsedUser.username || '');
                setEmail(parsedUser.Email || parsedUser.email || '');
                setEmployeeNo(parsedUser.EmpNo || parsedUser.empNo || 'EMP-0000-000');
                setRole(parsedUser.SystemRole || parsedUser.systemRole || 'Inventory');
                setProfileImagePreview(parsedUser.ProfileImage || parsedUser.profileImage || '');
            }
        } catch (error) {
            console.error("Error fetching user profile sa Frontend:", error);
        }
    };

    fetchUserData();
}, []);

    const handleProfileImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfileImageFile(file);
            setProfileImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProfileImage = async () => {
        if (!profileImageFile) return;

        const userId = userData?.id || userData?._id;
        const token = localStorage.getItem('token');

        if (!userId) {
            alert('Failed to retrieve user session ID. Please login again.');
            return;
        }

        try {
            setIsUploadingImage(true);
            const API_BASE_URL = import.meta.env.MODE === 'production'
                ? 'https://one-inventory.onrender.com'
                : 'http://localhost:5000';

            const formData = new FormData();
            formData.append('image', profileImageFile);

            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Failed to upload profile picture');

            setUserData(data);
            setProfileImagePreview(data.ProfileImage || '');
            setProfileImageFile(null);

            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                const updated = { ...parsed, ...data };
                localStorage.setItem('user', JSON.stringify(updated));
            }

            window.dispatchEvent(new Event('userUpdated'));

            setSuccessMessage('Profile picture updated successfully!');
            setTimeout(() => {
                setSuccessMessage(null);
            }, 4000);
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        } finally {
            setIsUploadingImage(false);
        }
    };

    const checkPasswordStrength = (pass) => {
        if (!pass) return { label: '', color: 'text-slate-400', bg: 'bg-slate-200' };

        const hasLetters = /[a-zA-Z]/.test(pass);
        const hasNumbers = /[0-9]/.test(pass);
        const hasSpecial = /[^A-Za-z0-9]/.test(pass);

        const totalCriteria = [hasLetters, hasNumbers, hasSpecial].filter(Boolean).length;

        if (pass.length >= 8 && totalCriteria === 3) {
            return { label: 'Strong', color: 'text-emerald-600', bg: 'bg-emerald-500' };
        } else if (pass.length >= 6 && totalCriteria >= 2) {
            return { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-500' };
        } else {
            return { label: 'Weak', color: 'text-rose-600', bg: 'bg-rose-500' };
        }
    };

    const passwordStrength = checkPasswordStrength(newPassword);

    const isPasswordValid = passwordStrength.label === 'Strong' && newPassword === confirmPassword;

    const handleSaveChanges = async (e) => {
        if (e) e.preventDefault();

        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Mangyaring punan ang lahat ng password fields.');
            return;
        }

        if (!isPasswordValid) {
            alert('Siguraduhing Strong ang password at magkatugma ang fields.');
            return;
        }

        const userId = userData?.id || userData?._id;
        const token = localStorage.getItem('token');

        if (!userId) {
            alert('Failed to retrieve user session ID. Please login again.');
            return;
        }

        try {
const API_BASE_URL = import.meta.env.MODE === 'production'
    ? 'https://one-inventory.onrender.com'
    : 'http://localhost:5000';

const response = await fetch(`${API_BASE_URL}/api/users/change-password/${userId}`, {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        currentPassword,
        newPassword
    })
});

            const data = await response.json();

            if (!response.ok) throw new Error(data.message || 'Failed to update password');

            setSuccessMessage('Your password has been successfully updated!');

            setTimeout(() => {
                setSuccessMessage(null);
            }, 4000);

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setIsPasswordModalOpen(false);
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    };

    const closePasswordModal = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowCurrentPass(false);
        setShowNewPass(false);
        setShowConfirmPass(false);
        setIsPasswordModalOpen(false);
    };

    return (
        <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative">

            {successMessage && (
                <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold">{successMessage}</span>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer flex items-center">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <PageHeader activeTab="settings" />

            {/* 1. SYSTEM THEME & APPEARANCE */}
            <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100 text-slate-600'} border rounded-2xl p-6 flex flex-col gap-6 shadow-xs transition-colors duration-200`}>

                <div className="flex flex-col gap-1.5">
                    <div className={`flex items-center gap-2 text-sm font-bold ${isDark ? 'text-slate-200 border-slate-800' : 'text-slate-600 border-slate-100'} border-b pb-3`}>                      
                        <span>System Theme & Appearance</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-600'} uppercase mb-1.5`}>Display Theme</h3>

                    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-200'} border rounded-xl`}>
                        <div className="flex items-center gap-3.5 w-full sm:w-auto">
                            <div className={`w-12 h-12 rounded-full ${isDark ? 'bg-[#181a26] text-[#ff8533] border-slate-700/60' : 'bg-white text-[#18174e] border-slate-200'} border flex items-center justify-center text-xl font-bold shadow-xs shrink-0`}>
                                {isDark ? <Moon className="w-5 h-5 text-[#ff6600]" /> : <Sun className="w-5 h-5 text-[#ff6600]" />}
                            </div>

                            <div className="flex flex-col text-left">
                                <h4 className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'} uppercase tracking-wide`}>
                                    Dark Mode
                                </h4>
                                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Dark Mode toggle para sa Sidebar, Page Header, at Topbar.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/40">
                            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#ff8533]' : 'text-slate-400'}`}>
                                {isDark ? 'Dark Mode: ON' : 'Dark Mode: OFF'}
                            </span>
                            <button
                                type="button"
                                onClick={toggleTheme}
                                role="switch"
                                aria-checked={isDark}
                                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer shadow-inner shrink-0 ${
                                    isDark ? 'bg-[#ff6600]' : 'bg-slate-300'
                                }`}
                            >
                                <span
                                    className={`inline-flex h-5 w-5 transform items-center justify-center rounded-full bg-white transition-transform duration-300 shadow-md ${
                                        isDark ? 'translate-x-8 text-[#ff6600]' : 'translate-x-1 text-slate-500'
                                    }`}
                                >
                                    {isDark ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. PROFILE SETTINGS */}
            <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100 text-slate-600'} border rounded-2xl p-6 flex flex-col gap-6 shadow-xs transition-colors duration-200`}>

                <div className="flex flex-col gap-1.5">
                    <div className={`flex items-center gap-2 text-sm font-bold ${isDark ? 'text-slate-200 border-slate-800' : 'text-slate-600 border-slate-100'} border-b pb-3`}>                      
                        <span>Profile Settings</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <div className="space-y-4">
                        <h3 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-600'} uppercase mb-1.5`}>Personal Information</h3>

                        <div className={`flex flex-col sm:flex-row items-center gap-4 p-4 ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-200'} border rounded-xl`}>
                            <div className="relative group">
                                {profileImagePreview ? (
                                    <>
                                        <img
                                            src={
                                                profileImagePreview.startsWith('blob:') || profileImagePreview.startsWith('http') || profileImagePreview.startsWith('data:')
                                                    ? profileImagePreview
                                                    : import.meta.env.MODE === 'production'
                                                        ? profileImagePreview
                                                        : `${window.location.protocol}//${window.location.hostname}:5000${profileImagePreview}`
                                            }
                                            alt="Profile Preview"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                if (e.target.nextElementSibling) {
                                                    e.target.nextElementSibling.style.display = 'flex';
                                                }
                                            }}
                                            className="w-20 h-20 rounded-full object-cover border-2 border-[#18174e] shadow-sm"
                                        />
                                        <div style={{ display: 'none' }} className="w-20 h-20 rounded-full bg-[#18174e] text-white items-center justify-center text-2xl font-bold border-2 border-[#18174e] shadow-sm">
                                            {(name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-[#18174e] text-white flex items-center justify-center text-2xl font-bold border-2 border-[#18174e] shadow-sm">
                                        {(name || 'U').charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <label
                                    htmlFor="profile-image-input"
                                    className="absolute bottom-0 right-0 bg-[#18174e] text-white p-1.5 rounded-full cursor-pointer hover:bg-[#18174e]/90 transition-all shadow-md"
                                    title="Change Profile Picture"
                                >
                                    <Camera className="w-3.5 h-3.5" />
                                </label>
                                <input
                                    id="profile-image-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleProfileImageChange}
                                    className="hidden"
                                />
                            </div>

                            <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-1 flex-1">
                                <h4 className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'} uppercase tracking-wide`}>Profile Picture</h4>
                                <p className="text-[11px] text-slate-400">Upload a square image (JPG, PNG). Max 5MB.</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <label
                                        htmlFor="profile-image-input"
                                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'} cursor-pointer transition-all shadow-xs`}
                                    >
                                        Choose File
                                    </label>
                                    {profileImageFile && (
                                        <button
                                            type="button"
                                            onClick={handleSaveProfileImage}
                                            disabled={isUploadingImage}
                                            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-[#18174e] text-white hover:bg-[#18174e]/90 cursor-pointer transition-all shadow-sm disabled:opacity-50"
                                        >
                                            <Upload className="w-3 h-3" />
                                            {isUploadingImage ? 'Uploading...' : 'Save Picture'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Employee No.</label>
                            <input
                                type="text"
                                value={employeeNo}
                                disabled
                                className={`w-full ${isDark ? 'bg-[#141622] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} border rounded-lg px-3 py-2 text-sm font-mono font-bold cursor-not-allowed`}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-1`}>System Role</label>
                            <input
                                type="text"
                                value={role}
                                disabled
                                className={`w-full ${isDark ? 'bg-[#141622] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} border rounded-lg px-3 py-2 text-sm font-semibold cursor-not-allowed`}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Full Name</label>
                            <input
                                type="text"
                                value={name}
                                disabled
                                className={`w-full ${isDark ? 'bg-[#141622] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} border rounded-lg px-3 py-2 text-sm font-semibold cursor-not-allowed`}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Username</label>
                            <input
                                type="text"
                                value={username}
                                disabled
                                className={`w-full ${isDark ? 'bg-[#141622] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} border rounded-lg px-3 py-2 text-sm font-mono cursor-not-allowed`}
                            />
                        </div>

                        <div>
                            <label className={`block text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className={`w-full ${isDark ? 'bg-[#141622] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} border rounded-lg px-3 py-2 text-sm cursor-not-allowed`}
                            />
                        </div>
                    </div>

                    <div className={`space-y-4 border-t md:border-t-0 md:border-l ${isDark ? 'border-slate-800' : 'border-slate-100'} pt-4 md:pt-0 md:pl-6 flex flex-col justify-start`}>
                        <h3 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-600'} uppercase mb-1.5`}>
                            Account Security
                        </h3>
            <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200/60 text-amber-700'} rounded-xl border mt-3 shrink-0`}>
                <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                    * System Action Protocol *
                </span>
                <p className="text-[11px] leading-relaxed">
                    Please review the operation context. Confirming this step commits changes directly to the live system registry.
                </p>
            </div>
                        
                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setIsPasswordModalOpen(true)}
                                className="flex items-center justify-center gap-2 bg-[#18174e] hover:bg-[#18174e]/90 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer w-full sm:w-auto"
                            >
                            Change Account Password
                            </button>
                        </div>
                    </div>

                </div>
            </div>

{isPasswordModalOpen && (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-md p-6 shadow-xl relative flex flex-col animate-in zoom-in-95 duration-200`}>
            
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3 shrink-0`}>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                    Security & Password
                </h3>
                <button 
                    onClick={closePasswordModal} 
                    className={`p-1 rounded-lg ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'} cursor-pointer flex items-center transition-colors`}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200/60 text-amber-700'} rounded-xl border mt-3 shrink-0`}>
                <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                    * System Action Protocol *
                </span>
                <p className="text-[11px] leading-relaxed">
                    Please review the operation context. Confirming this step commits changes directly to the live system registry.
                </p>
            </div>
            
            <div className="mt-4 flex-1 space-y-4">
                
                <div>
                    <label className={`block text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Current Password</label>
                    <div className="relative">
                        <input
                            type={showCurrentPass ? "text" : "password"}
                            placeholder="Enter current password to verify identity"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400'} border rounded-lg px-3 pr-10 py-2 text-sm focus:outline-none focus:border-[#18174e] transition-all`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrentPass(!showCurrentPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex items-center"
                        >
                            {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className={`block text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>New Password</label>
                        {newPassword && (
                            <span className={`text-xs font-bold ${passwordStrength.color}`}>
                                {passwordStrength.label} Password
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <input
                            type={showNewPass ? "text" : "password"}
                            placeholder="Enter new strong password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400'} border rounded-lg px-3 pr-10 py-2 text-sm focus:outline-none focus:border-[#18174e] transition-all`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPass(!showNewPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex items-center"
                        >
                            {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {newPassword && (
                        <div className={`w-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'} h-1 rounded-full mt-1.5 overflow-hidden`}>
                            <div className={`h-full transition-all duration-300 ${passwordStrength.bg} ${
                                passwordStrength.label === 'Weak' ? 'w-1/3' : passwordStrength.label === 'Medium' ? 'w-2/3' : 'w-full'
                            }`} />
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className={`block text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Confirm New Password</label>
                        {confirmPassword && (
                            <span className={`text-xs font-bold ${newPassword === confirmPassword ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {newPassword === confirmPassword ? 'Passwords Match' : 'Passwords Mismatch'}
                            </span>
                        )}
                    </div>
                    <div className="relative">
                        <input
                            type={showConfirmPass ? "text" : "password"}
                            placeholder="Re-type new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400'} border rounded-lg px-3 pr-10 py-2 text-sm focus:outline-none focus:border-[#18174e] transition-all`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex items-center"
                        >
                            {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100 shrink-0">
                <button 
                    type="button" 
                    onClick={closePasswordModal} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                >
                    Cancel
                </button>

                {isPasswordValid ? (
                    <button 
                        type="button" 
                        onClick={handleSaveChanges}
                        className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md"
                    >
                        Confirm Changes
                    </button>
                ) : (
                    <button 
                        type="button"
                        disabled
                        className="bg-slate-100 text-slate-400 font-semibold py-2 px-4 rounded-lg text-sm cursor-not-allowed opacity-65"
                    >
                        Confirm Changes
                    </button>
                )}
            </div>
        </div>
    </div> 
)}
        </div>
    );
}

export default Settings;
