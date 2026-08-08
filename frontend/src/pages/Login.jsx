import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 🌟 SECURITY STATES
  const [attempts, setAttempts] = useState(0);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0); // in seconds

  const navigate = useNavigate();

  // 🌟 EFFECT: I-check kung may umiiral na lockout pagka-load ng page
  useEffect(() => {
    const savedAttempts = parseInt(localStorage.getItem('loginAttempts') || '0', 10);
    const lockoutUntil = localStorage.getItem('lockoutUntil');

    setAttempts(savedAttempts);

    if (lockoutUntil) {
      const currentTime = Date.now();
      const timeLeft = Math.ceil((parseInt(lockoutUntil, 10) - currentTime) / 1000);

      if (timeLeft > 0) {
        setLockoutTimeLeft(timeLeft);
      } else {
        // Tapos na ang 10 minutes, i-reset ang limits
        localStorage.removeItem('lockoutUntil');
        localStorage.setItem('loginAttempts', '0');
        setAttempts(0);
      }
    }
  }, []);

  // 🌟 EFFECT: Timer Countdown para sa Lockout
  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setLockoutTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          localStorage.removeItem('lockoutUntil');
          localStorage.setItem('loginAttempts', '0');
          setAttempts(0);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutTimeLeft]);

  // Helper para i-format ang segundo papuntang MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // 1. I-block agad kung kasalukuyang naka-lockout
    if (lockoutTimeLeft > 0) {
      setError(`Too many failed attempts. Try again in ${formatTime(lockoutTimeLeft)}.`);
      setLoading(false);
      return;
    }

    try {
      // ✅ MATALINONG URL: Gagamit ng Render URL sa production, at localhost naman kapag nag-dedevelop ka sa PC
      const API_BASE_URL = import.meta.env.MODE === 'production'
        ? 'https://one-inventory.onrender.com'
        : 'http://localhost:5000';

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Username: username, Password: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // KUNG SUCCESSFUL ANG LOGIN:
      localStorage.removeItem('loginAttempts');
      localStorage.removeItem('lockoutUntil');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      if (data.user && data.user.SystemRole) {
        localStorage.setItem('SystemRole', data.user.SystemRole);
      } else {
        localStorage.setItem('SystemRole', 'Inventory');
      }

      navigate('/dashboard'); 
    } catch (err) {
      // KUNG NAGKAMALI / FAILED LOGIN:
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      localStorage.setItem('loginAttempts', nextAttempts.toString());

      if (nextAttempts >= 6) {
        const tenMinutes = 10 * 60 * 1000;
        const lockoutEndTime = Date.now() + tenMinutes;
        
        localStorage.setItem('lockoutUntil', lockoutEndTime.toString());
        setLockoutTimeLeft(tenMinutes / 1000);
        setError(`Account locked. Too many failed attempts. Please wait 10:00.`);
      } else {
        setError(`${err.message} (${6 - nextAttempts} attempts remaining)`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#0b0a26] via-[#18174e] to-[#242270] text-white px-6 relative overflow-hidden pb-12 select-none">
      
      {/* Ambient background glow objects */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[#ff6600]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* BRAND LOGO SECTION */}
      <div className="flex flex-col items-center text-center mb-8 relative z-10 animate-fade-in">
        <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 shadow-2xl mb-2">
          <div className="bg-white rounded-full p-2 flex items-center justify-center shadow-inner w-16 h-16">
            <img
              src="/cropped_circle_image.png"
              alt="logo"
              className="w-full h-full object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
        </div>
        <h1 className="font-black text-2xl uppercase text-white mt-3 drop-shadow-md">
          USSP INVENTORY
        </h1>
        <h2 className="text-[11px] font-bold text-slate-300 uppercase opacity-90 mt-0.5">
          Upright Storage Solutions PH
        </h2>
      </div>

      {/* LOGIN CARD */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-7 shadow-2xl relative z-10">
        
        {/* ERROR MESSAGE DISPLAY */}
        {error && (
          <div className="mb-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 p-3.5 text-center text-xs font-semibold text-rose-300 animate-in fade-in duration-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          
          {/* USERNAME INPUT */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              disabled={lockoutTimeLeft > 0}
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-slate-400 transition-all focus:border-[#ff6600] focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#ff6600]/30 disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>

          {/* PASSWORD INPUT WITH HIDE/UNHIDE */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                disabled={lockoutTimeLeft > 0}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder-slate-400 transition-all focus:border-[#ff6600] focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#ff6600]/30 pr-12 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                disabled={lockoutTimeLeft > 0}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-20"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* BUTTON ACTIONS CONTAINER */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || lockoutTimeLeft > 0}
              className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#ff6600] to-[#ff8533] py-3.5 px-8 text-sm font-bold text-white shadow-lg hover:shadow-orange-500/25 active:scale-[0.98] transition-all cursor-pointer w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {lockoutTimeLeft > 0 
                  ? `Locked (${formatTime(lockoutTimeLeft)})` 
                  : loading 
                    ? "Verifying Credentials..." 
                    : "Sign In to Portal"
                }
              </span>
              {!loading && lockoutTimeLeft <= 0 && (
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              )}
            </button>
          </div>

        </form>
      </div>

      {/* SECURITY NOTICE FOOTER */}
      <p className="mt-8 text-[12px] font-medium text-slate-400 text-center relative z-10">
        Corporate Security Protocols Enforced • Encrypted Session
      </p>

      {/* SYSTEM COPYRIGHT FOOTER */}
      <div className="absolute bottom-4 left-0 right-0 text-center px-4 z-10">
        <p className="text-[10px] font-semibold text-slate-400 tracking-wide">
          Copyright © 2026 Upright Storage Solutions PH. All Rights Reserved.
        </p>
      </div>

    </div>
  );
}

export default Login;