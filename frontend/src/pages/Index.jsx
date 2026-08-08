import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';

function Index() {
  const navigate = useNavigate();

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

      {/* CALL TO ACTION CARD */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/15 rounded-3xl p-7 shadow-2xl text-center relative z-10">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#ff8533] uppercase bg-[#ff6600]/15 border border-[#ff6600]/30 rounded-full py-1 px-3.5 mb-4 mx-auto w-fit">
          <ShieldCheck className="w-4 h-4" />
          <span>Restricted Portal Access</span>
        </div>

        <p className="text-xs sm:text-sm font-normal text-slate-200 mb-6 leading-relaxed text-center">
          Authorized personnel access only. Please log in with your corporate credentials to manage inventory stock, production movements, and audit records.
        </p>

        <button
          onClick={() => navigate('/login')}
          className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#ff6600] to-[#ff8533] py-3.5 px-8 text-sm font-bold text-white shadow-lg hover:shadow-orange-500/25 active:scale-[0.98] transition-all cursor-pointer w-full"
        >
          <span>Proceed to Login</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
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

export default Index;