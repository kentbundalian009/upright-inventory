import React from 'react';
import { useNavigate } from 'react-router-dom';

function Index() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#18174e] text-white px-6 relative pb-12">
      
      {/* BRAND LOGO SECTION */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="bg-white rounded-full p-2 flex items-center justify-center shadow-inner w-16 h-16">
          <img
            src="public/cropped_circle_image.png"
            alt="logo"
            className="w-full h-full object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
        <h1 className="font-black text-xl uppercase tracking-wider text-white mt-3">
          USSP INVENTORY
        </h1>
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-80 mt-0.5">
          Upright Storage Solutions
        </h2>
      </div>

      <p className="text-sm font-medium text-slate-300 mb-6">
        This is a restricted portal. 
      </p>

      {/* CALL TO ACTION */}
      <div className="w-full max-w-sm bg-black/10 border border-white/5 rounded-2xl p-6 shadow-xl text-center">
        <p className="text-sm font-medium text-slate-300 mb-6 leading-relaxed text-justify">
          Authorized access only. Unauthorized attempts to log in or access this portal are strictly prohibited and may be subject to legal action. Please log in with your corporate credentials to proceed.
        </p>

        <button
          onClick={() => navigate('/login')}
          className="group inline-flex items-center gap-2.5 rounded-xl bg-[#ff6600] py-3.5 px-8 text-sm font-bold text-white shadow-lg hover:bg-[#ff6600]/80 active:scale-[0.98] transition-all cursor-pointer w-full justify-center"
        >
          Get Started
        </button>
      </div>

      {/* SECURITY NOTICE FOOTER */}
      <p className="mt-6 text-[12px] font-medium text-slate-500 text-center">
        Authorized personnel only. Secure login protocols enforced.
      </p>

      {/* SYSTEM COPYRIGHT FOOTER */}
      <div className="absolute bottom-4 left-0 right-0 text-center px-4">
        <p className="text-[10px] font-semibold text-slate-100 tracking-wide">
          Copyright © 2026 Inventory System Upright Storage Solution PH. All Rights Reserved.
        </p>
      </div>

    </div>
  );
}

export default Index;