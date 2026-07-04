import React, { useState, useEffect } from 'react';
import { Shield, Settings as SettingsIcon, Eye, EyeOff, Key, X, CheckCircle2 } from 'lucide-react'; // 🌟 Idinagdag ang CheckCircle2
import PageHeader from '../Common/PageHeader';

function Settings() {
    // State para sa Naka-login na User Info
    const [userData, setUserData] = useState(null);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [employeeNo, setEmployeeNo] = useState('EMP-0000-000');
    const [role, setRole] = useState('Inventory');

    // Password States
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI Controller States
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    // STATE PARA SA PASSWORD MODAL TOGGLE
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    // 🌟 STATE PARA SA CUSTOM TOAST NOTIFICATION
    const [successMessage, setSuccessMessage] = useState(null);

// READ: I-load ang user info mula sa database o localStorage pagka-load ng page
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
            
            // Hanapin ang ID (Sinisiguro nito na makuha ang ID kahit id o _id ang gamit)
            const userId = parsedUser.id || parsedUser._id || (parsedUser.user && (parsedUser.user.id || parsedUser.user._id));

            if (!userId) {
                console.error("Hindi mahanap ang ID sa user object.");
            }

            // KUNIN ANG SARIWANG DATA SA BACKEND DATABASE NA MAY KASAMANG TOKEN
            const response = await fetch(`http://localhost:5000/api/users/profile/${userId}`, {
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
            } else {
                console.warn("Hindi maabot ang profile endpoint, gagamit ng LocalStorage data.");
                
                // Fallback: Kunin ang data mula sa localStorage at asikasuhin ang Malaki/Maliit na titik
                setUserData(parsedUser);
                setName(parsedUser.Fullname || parsedUser.fullname || '');
                setUsername(parsedUser.Username || parsedUser.username || '');
                setEmail(parsedUser.Email || parsedUser.email || '');
                setEmployeeNo(parsedUser.EmpNo || parsedUser.empNo || 'EMP-0000-000');
                setRole(parsedUser.SystemRole || parsedUser.systemRole || 'Inventory');
            }
        } catch (error) {
            console.error("Error fetching user profile sa Frontend:", error);
        }
    };

    fetchUserData();
}, []);

    // Password Strength Checker Logic
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

    // Guard Validation: Papayagan lang mag-save kapag 'Strong' ang bagong password at pareho sila ng confirmation field
    const isPasswordValid = passwordStrength.label === 'Strong' && newPassword === confirmPassword;

    // UPDATE: Form Save Handler para sa pagbabago ng Password sa Database
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
            alert('Hindi mahanap ang user session ID. Mangyaring mag-login muli.');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/users/change-password/${userId}`, {
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

            // 🌟 PALIT SCRIPT: Pinalitan ang alert ng iyong Custom Toast layout
            setSuccessMessage('Your password has been successfully updated!');

            // Awtomatikong itago ang toast pagkatapos ng 4 na segundo
            setTimeout(() => {
                setSuccessMessage(null);
            }, 4000);

            // I-clear ang password fields at isara ang modal pagkatapos mag-save
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setIsPasswordModalOpen(false);
        } catch (error) {
            alert(`❌ Error: ${error.message}`);
        }
    };

    // Helper function para sa pag-clear ng form kapag kinansela ang modal
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

            {/* 🌟 CUSTOM TOAST NOTIFICATION LAYOUT */}
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

            {/* MAIN CONTENT CARD */}
            <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 flex flex-col gap-6 shadow-xs">

                {/* SETTINGS HEADER */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600 border-b border-slate-100 pb-3">
                        <SettingsIcon className="w-4 h-4 text-[#18174e]" />
                        <span>Profile Settings</span>
                    </div>
                </div>

                {/* FORM START */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* LEFT COLUMN: IDENTITY & INFO (READ-ONLY) */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-600 uppercase mb-1.5">Personal Information</h3>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Employee No.</label>
                            <input
                                type="text"
                                value={employeeNo}
                                disabled
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 font-mono font-bold cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">System Role</label>
                            <input
                                type="text"
                                value={role}
                                disabled
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 font-semibold cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                disabled
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 font-semibold cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                disabled
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 font-mono cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* RIGHT COLUMN: MODAL TRIGGER */}
                    <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6 flex flex-col justify-start">
                        <h3 className="text-sm font-bold text-slate-600 uppercase mb-1.5">
                            Account Security
                        </h3>
                        <p className="block text-xs font-semibold text-slate-500 mb-1">
                            To ensure your account's integrity, regularly update your master password. Keeping a strong password shields corporate system assets from security risks.
                        </p>
                        
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

            <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 flex flex-col gap-6 shadow-xs">
                <img src="/public/manual.png" alt="User Manual" />
            </div>

            {/* 🔒 CUSTOM PASSWORD MODAL */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-10 animate-in fade-in duration-200">
                    <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-2xl relative animate-in slide-in-from-top-5 duration-300">
                        
                        {/* Title Block */}
                        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 text-sm tracking-wide flex items-center gap-2">
                             Security & Password
                            </h3>
                            <button 
                                onClick={closePasswordModal} 
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {/* Message Body / Inputs Content */}
                        <div className="mt-4 space-y-4">
                            
                            {/* FIELD 1: CURRENT PASSWORD */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPass ? "text" : "password"}
                                        placeholder="Enter current password to verify identity"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 pr-10 py-2 text-sm focus:outline-none focus:border-[#18174e] focus:ring-1 focus:ring-[#18174e]/20 text-slate-700 placeholder-slate-400"
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

                            {/* FIELD 2: NEW PASSWORD */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-semibold text-slate-500">New Password</label>
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
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 pr-10 py-2 text-sm focus:outline-none focus:border-[#18174e] focus:ring-1 focus:ring-[#18174e]/20 text-slate-700 placeholder-slate-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPass(!showNewPass)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer flex items-center"
                                    >
                                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>

                                {/* PASSWORD STRENGTH INDICATOR BAR */}
                                {newPassword && (
                                    <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                                        <div className={`h-full transition-all duration-300 ${passwordStrength.bg} ${
                                            passwordStrength.label === 'Weak' ? 'w-1/3' : passwordStrength.label === 'Medium' ? 'w-2/3' : 'w-full'
                                        }`} />
                                    </div>
                                )}
                            </div>

                            {/* FIELD 3: CONFIRM NEW PASSWORD */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-semibold text-slate-500">Confirm New Password</label>
                                    {confirmPassword && (
                                        <span className={`text-xs font-bold ${newPassword === confirmPassword ? 'text-emerald-600' : 'text-rose-600'}`}>
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
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 pr-10 py-2 text-sm focus:outline-none focus:border-[#18174e] focus:ring-1 focus:ring-[#18174e]/20 text-slate-700 placeholder-slate-400"
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

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
                            <button 
                                type="button" 
                                onClick={closePasswordModal} 
                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>

                            {isPasswordValid ? (
                                <button 
                                    type="button" 
                                    onClick={handleSaveChanges}
                                    className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer"
                                >
                                    Save Changes
                                </button>
                            ) : (
                                <button 
                                    type="button"
                                    disabled
                                    className="bg-slate-100 text-slate-400 font-semibold py-1.5 px-4 rounded-lg text-xs cursor-not-allowed opacity-65"
                                >
                                    Save
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