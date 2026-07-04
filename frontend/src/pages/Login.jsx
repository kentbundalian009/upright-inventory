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
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Username: username, Password: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // KUNG SUCCESSFUL ANG LOGIN:
      // I-reset ang mga counter sa storage
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
      // KUNG NAGkamali / FAILED LOGIN:
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      localStorage.setItem('loginAttempts', nextAttempts.toString());

      if (nextAttempts >= 6) {
        // Pag umabot sa 6, i-lockout ng 10 minuto (10 * 60 * 1000 ms)
        const tenMinutes = 10 * 60 * 1000;
        const lockoutEndTime = Date.now() + tenMinutes;
        
        localStorage.setItem('lockoutUntil', lockoutEndTime.toString());
        setLockoutTimeLeft(tenMinutes / 1000);
        setError(`Account locked. Too many failed attempts. Please wait 10:00.`);
      } else {
        // Paalalahanan kung ilang attempts na lang ang natitira
        setError(`${err.message} (${6 - nextAttempts} attempts remaining)`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#18174e] text-white px-6">
      
      {/* BRAND LOGO SECTION */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="bg-white rounded-full p-2 flex items-center justify-center shadow-inner w-16 h-16">
          <img
            src="/public/one.logo.png"
            alt="logo"
            className="w-full h-full object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <h1 className="font-black text-xl uppercase tracking-wider text-white mt-3">
          ONE INVENTORY
        </h1>
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-80 mt-0.5">
          Upright Storage Solutions
        </h2>
      </div>

      <p className="text-sm font-medium text-slate-300 mb-6">
        This is a restricted portal. 
      </p>

      {/* LOGIN CARD */}
      <div className="w-full max-w-sm bg-black/10 border border-white/5 rounded-2xl p-6 shadow-xl">
        
        {/* ERROR MESSAGE DISPLAY */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/20 border border-red-500/30 p-3 text-center text-xs font-semibold text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* USERNAME INPUT */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              disabled={lockoutTimeLeft > 0} // I-disable kapag naka-lockout
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#18174e] px-4 py-3 text-sm text-white placeholder-slate-500 transition-all focus:border-[#252375] focus:outline-none focus:ring-2 focus:ring-[#252375]/40 disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>

          {/* PASSWORD INPUT WITH HIDE/UNHIDE */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                disabled={lockoutTimeLeft > 0} // I-disable kapag naka-lockout
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#18174e] px-4 py-3 text-sm text-white placeholder-slate-500 transition-all focus:border-[#252375] focus:outline-none focus:ring-2 focus:ring-[#252375]/40 pr-12 disabled:opacity-40 disabled:cursor-not-allowed"
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
          <div className="flex flex-col gap-3 mt-4">
            <button
              type="submit"
              disabled={loading || lockoutTimeLeft > 0} // I-disable ang button
              className="group inline-flex items-center gap-2.5 rounded-xl bg-[#252375] py-3.5 px-8 text-sm font-bold text-white shadow-lg hover:bg-[#252375]/80 active:scale-[0.98] transition-all cursor-pointer w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {lockoutTimeLeft > 0 
                ? `Locked (${formatTime(lockoutTimeLeft)})` 
                : loading 
                  ? "Verifying..." 
                  : "Sign In"
              }
              {(!loading && lockoutTimeLeft === 0) && (
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              )}
            </button>
          </div>

        </form>
      </div>

      {/* SECURITY NOTICE FOOTER */}
      <p className="mt-6 text-[12px] font-medium text-slate-500 text-center">
        Authorized personnel only. Secure login protocols enforced.
      </p>

    </div>
  );
}

export default Login;