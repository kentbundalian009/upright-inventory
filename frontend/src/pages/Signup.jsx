import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';

function Signup() {
  const [employeeNo, setEmployeeNo] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Mga bagong state para sa loading at error handling sa signup
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const systemRole = 'Admin'; 

  const navigate = useNavigate();

  const getPasswordStrength = (pass) => {
    if (!pass) return { label: '', color: 'text-slate-500' };
    if (pass.length < 6) return { label: 'Weak Password', color: 'text-red-400' };
    if (pass.length < 10) return { label: 'Medium Password', color: 'text-yellow-400' };
    return { label: 'Strong Password', color: 'text-emerald-400' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          EmpNo: employeeNo,
          SystemRole: systemRole,
          Username: username,
          Fullname: fullName,
          Email: email,
          Password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      alert('Account created successfully! Redirecting to login...');
      navigate('/login'); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#18174e] text-white px-6 py-12">
      
      {/* BRAND LOGO SECTION */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="bg-white rounded-full p-2 flex items-center justify-center shadow-inner w-16 h-16">
          <img
            src="/one.logo.png"
            alt="logo"
            className="w-full h-full object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <h1 className="font-black text-xl uppercase text-white mt-3">
          ONE INVENTORY
        </h1>
        <h2 className="text-[10px] font-bold text-slate-400 uppercase opacity-80 mt-0.5">
          Upright Storage Solutions
        </h2>
      </div>

      <p className="text-sm font-medium text-slate-300 mb-6">
        Create an Admin Account
      </p>

      {/* SIGNUP CARD */}
      <div className="w-full max-w-sm bg-black/10 border border-white/5 rounded-2xl p-6 shadow-xl">
        
        {/* ERROR MESSAGE DISPLAY */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/20 border border-red-500/30 p-3 text-center text-xs font-semibold text-red-400">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* EMPLOYEE NO. INPUT */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
              Employee No.
            </label>
            <input
              type="text"
              required
              placeholder="e.g. EMP-2026-001"
              value={employeeNo}
              onChange={(e) => setEmployeeNo(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#18174e] px-4 py-3 text-sm text-white placeholder-slate-500 transition-all focus:border-[#252375] focus:outline-none focus:ring-2 focus:ring-[#252375]/40"
            />
          </div>

          {/* FULL NAME INPUT */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#18174e] px-4 py-3 text-sm text-white placeholder-slate-500 transition-all focus:border-[#252375] focus:outline-none focus:ring-2 focus:ring-[#252375]/40"
            />
          </div>

          {/* USERNAME INPUT */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#18174e] px-4 py-3 text-sm text-white placeholder-slate-500 transition-all focus:border-[#252375] focus:outline-none focus:ring-2 focus:ring-[#252375]/40"
            />
          </div>

          {/* EMAIL ADDRESS INPUT */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#18174e] px-4 py-3 text-sm text-white placeholder-slate-500 transition-all focus:border-[#252375] focus:outline-none focus:ring-2 focus:ring-[#252375]/40"
            />
          </div>

          {/* PASSWORD INPUT WITH HIDE/UNHIDE & STRENGTH */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[11px] font-bold uppercase text-slate-400">
                Password
              </label>
              {password && (
                <span className={`text-[10px] font-bold uppercase ${strength.color}`}>
                  {strength.label}
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#18174e] px-4 py-3 text-sm text-white placeholder-slate-500 transition-all focus:border-[#252375] focus:outline-none focus:ring-2 focus:ring-[#252375]/40 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* SYSTEM ROLE (DISABLED / READ-ONLY ADMIN) */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
              System Role
            </label>
            <div className="relative">
              <input
                type="text"
                disabled
                value={systemRole}
                className="w-full rounded-xl border border-white/5 bg-[#141342] px-4 py-3 text-sm text-slate-400 font-semibold cursor-not-allowed pr-12 select-none"
              />
              <ShieldCheck size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />
            </div>
          </div>

          {/* BUTTON ACTIONS CONTAINER */}
          <div className="flex flex-col gap-3 mt-6">
            {/* MAIN SIGN UP BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="group inline-flex items-center gap-2.5 rounded-xl bg-[#252375] py-3.5 px-8 text-sm font-bold text-white shadow-lg hover:bg-[#252375]/80 active:scale-[0.98] transition-all cursor-pointer w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Registering..." : "Register Account"}
              {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
            </button>

            {/* BACK TO LOGIN BUTTON */}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-transparent py-3 px-8 text-sm font-semibold text-slate-300 hover:bg-white/5 hover:text-white active:scale-[0.98] transition-all cursor-pointer w-full justify-center"
            >
              <LogIn size={16} />
              Already have an account? Log In
            </button>
          </div>

        </form>
      </div>

      {/* SECURITY NOTICE FOOTER */}
      <p className="mt-6 text-[12px] font-medium text-slate-500 text-center">
        Authorized registration only. All activities are logged for auditing.
      </p>

    </div>
  );
}

export default Signup;