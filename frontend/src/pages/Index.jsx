import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

function Index() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#18174e] text-white px-6">
      
      {/* BRAND LOGO SECTION (Kapareho ng sa Sidebar mo) */}
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
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-80 mt-0.5">
          Upright Storage Solutions
        </p>
      </div>

      {/* CALL TO ACTION */}
      <div className="text-center max-w-md">
        <p className="text-sm font-medium text-slate-300 mb-6">
          This is a restricted portal. Log in to access dashboards, monitor raw materials, and track inventory movements.
        </p>

        <button
          onClick={() => navigate('/login')}
          className="group inline-flex items-center gap-2.5 rounded-xl bg-[#252375]  py-3.5 px-8 text-sm font-bold text-white shadow-lg hover:bg-[#252375]/80 active:scale-[0.98] transition-all cursor-pointer w-full justify-center"
        >
          Get Started
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </button>
        
        <p className="mt-3 text-[12px] font-medium text-slate-500">
          Authorized personnel only.
        </p>
      </div>

    </div>
  );
}

export default Index;