import React, { useState } from 'react';
import { Clock, ShieldAlert, Package, ChevronRight, Info } from 'lucide-react';

/**
 * Renders an interactive Reserve Count badge for materials held in Outbound (PackingList Reserves).
 * Shows a stylish glowing amber pill when reserved, with a detailed breakdown of active slips on hover/click.
 */
export default function ReserveCountBadge({ rawMat, isDark = false, className = '' }) {
  const [showModal, setShowModal] = useState(false);
  const reserveCount = Number(rawMat.ReserveCount) || 0;
  const actualCount = Number(rawMat.ActualCount) || 0;
  const reserveDetails = rawMat.ReserveDetails || [];
  const availableCount = Math.max(0, actualCount - reserveCount);
  const uom = rawMat.UOM || 'pcs';

  if (reserveCount <= 0) {
    return (
      <span className={`font-mono text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'} select-none`}>
        0
      </span>
    );
  }

  return (
    <>
      <div className={`relative inline-block group/reserve ${className}`}>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-medium border shadow-xs leading-none transition-colors cursor-pointer ${
            isDark
              ? 'bg-amber-950/50 text-amber-300 border-amber-800/70 hover:bg-amber-900/50 hover:border-amber-700'
              : 'bg-amber-50/90 text-amber-800 border-amber-200 hover:bg-amber-100/90 hover:border-amber-300'
          }`}
          title="Click to view reservation breakdown"
        >
          <span>{reserveCount.toLocaleString()}</span>
        </button>

        {/* Hover Tooltip Preview */}
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/reserve:flex flex-col w-64 p-3 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl text-left border border-slate-700/80 pointer-events-none transition-all">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Reserved in Outbound</span>
            </span>
            <span className="text-[10px] font-mono text-amber-300 font-bold">
              {reserveCount.toLocaleString()} {uom}
            </span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
            {reserveDetails.length > 0 ? (
              reserveDetails.slice(0, 4).map((slip, idx) => (
                <div key={idx} className="text-[11px] flex items-start justify-between gap-2">
                  <div className="truncate">
                    <span className="font-mono font-semibold text-amber-300">{slip.plNo}</span>
                    <span className="text-slate-400 text-[10px] block truncate">{slip.customer || 'No Customer'}</span>
                  </div>
                  <span className="font-mono font-bold text-white shrink-0">
                    {Number(slip.qty).toLocaleString()} {uom}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-[11px] text-slate-400 italic">Held on active reservation slip</span>
            )}
            {reserveDetails.length > 4 && (
              <div className="text-[10px] text-amber-400/90 font-medium italic pt-0.5">
                +{reserveDetails.length - 4} more slip(s)... click badge for all
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Available to dispatch:</span>
            <span className={`font-mono font-bold ${availableCount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {availableCount.toLocaleString()} {uom}
            </span>
          </div>
          <div className="w-2 h-2 bg-slate-900 border-r border-b border-slate-700 transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
        </div>
      </div>

      {/* Detailed Modal on Click */}
      {showModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[70] p-4 animate-in fade-in duration-150"
          onClick={() => setShowModal(false)}
        >
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 overflow-hidden ${
              isDark ? 'bg-[#0f111d] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-1">
                  <Clock className="w-3 h-3 text-amber-500 shrink-0" /> Active Reservation Hold
                </span>
                <h3 className="font-bold text-base line-clamp-1">{rawMat.ItemDescription}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">Code: {rawMat.Code}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 py-4">
              <div className={`p-2.5 rounded-xl border text-center ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="block text-[10px] text-slate-400 font-bold uppercase">Actual Count</span>
                <span className="font-bold font-mono text-base">{actualCount.toLocaleString()}</span>
              </div>
              <div className={`p-2.5 rounded-xl border text-center ${isDark ? 'bg-amber-950/30 border-amber-800/60 text-amber-400' : 'bg-amber-50/80 border-amber-200 text-amber-700'}`}>
                <span className="block text-[10px] opacity-80 font-bold uppercase">Reserved</span>
                <span className="font-bold font-mono text-base">{reserveCount.toLocaleString()}</span>
              </div>
              <div className={`p-2.5 rounded-xl border text-center ${isDark ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-400' : 'bg-emerald-50/80 border-emerald-200 text-emerald-700'}`}>
                <span className="block text-[10px] opacity-80 font-bold uppercase">Available</span>
                <span className="font-bold font-mono text-base">{availableCount.toLocaleString()}</span>
              </div>
            </div>

            {/* Slip Breakdown List */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Outbound Packing Lists ({reserveDetails.length})
              </label>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                {reserveDetails.map((slip, idx) => (
                  <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">{slip.plNo}</span>
                        {slip.shipmentDate && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(slip.shipmentDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-300 block truncate">
                        {slip.customer || 'Unassigned Customer'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {Number(slip.qty).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{uom}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
