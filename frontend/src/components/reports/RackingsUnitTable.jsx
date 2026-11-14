import React from 'react';
import { ImageIcon, Layers } from 'lucide-react';
import { parseRackDimension } from '../common/RackDimensionCell';

function RackingsUnitTable({
    paginatedTableData,
    computeRecordMetrics,
    getUnitSegmentStyles,
    isDark,
    getImageSrc,
    setPreviewImage
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
                <thead>
                    <tr className={`font-bold uppercase text-[11px] tracking-wider whitespace-nowrap ${isDark ? 'bg-[#10121d] text-slate-300 border-b border-slate-800' : 'bg-[#18174e] text-white'}`}>
                        <th className="py-3.5 px-3 text-center whitespace-nowrap w-[70px]">Image</th>
                        <th className="py-3.5 px-4 whitespace-nowrap min-w-[200px]">Item Description</th>
                        <th className="py-3.5 px-4 whitespace-nowrap min-w-[190px]">Rackings</th>
                        <th className="py-3.5 px-4 whitespace-nowrap min-w-[150px]">Dimension</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[130px]">Formula Quantity</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[160px]">Stock Quantity (Need / Total)</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap min-w-[120px]">Total Units</th>
                    </tr>
                </thead>
                <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/70 bg-[#090b10] text-slate-300' : 'divide-slate-100 bg-white text-slate-700'}`}>
                    {paginatedTableData.length > 0 ? (
                        paginatedTableData.map((rec) => {
                            const metrics = computeRecordMetrics(rec);
                            const segStyles = getUnitSegmentStyles(rec.segment);
                            return (
                                <tr
                                    key={rec.id}
                                    className={`transition-colors whitespace-nowrap ${isDark
                                        ? 'hover:bg-slate-800/40 border-l-4 border-l-transparent'
                                        : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                                        }`}
                                >
                                    {/* 1. Image */}
                                    <td className="py-3 px-3 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center">
                                            {rec.imageUrl ? (
                                                <img
                                                    src={getImageSrc(rec.imageUrl)}
                                                    alt={rec.unitName || 'Rackings Unit'}
                                                    className="w-11 h-11 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shrink-0 cursor-zoom-in hover:scale-105 transition-transform shadow-sm"
                                                    onClick={() => setPreviewImage(getImageSrc(rec.imageUrl))}
                                                    title="Click to view full image"
                                                />
                                            ) : (
                                                <div className={`w-11 h-11 rounded-lg flex items-center justify-center border border-dashed shrink-0 ${isDark ? 'bg-slate-800/70 border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-300 text-slate-400'
                                                    }`}>
                                                    <ImageIcon className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* 2. Item Description */}
                                    <td className="py-3 px-4">
                                        <div className="flex flex-col gap-1 min-w-[180px]">
                                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                                {rec.unitName || rec.description}
                                            </span>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border tracking-wide uppercase ${segStyles.classes}`}>
                                                    {rec.segment || 'STANDARD RACKS'}
                                                </span>
                                                {rec.description && rec.description !== rec.unitName && (
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[240px]" title={rec.description}>
                                                        {rec.description}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    {/* 3. Rackings (Components with Material Photos) */}
                                    <td className="py-3 px-4">
                                        <div className="flex flex-col gap-1.5 min-w-[220px]">
                                            {(rec.components || []).map((c, cIdx) => {
                                                const detail = metrics.rowDetails?.[cIdx];
                                                const mat = detail?.mat;
                                                const matDesc = mat ? mat.ItemDescription : (c.role || 'Component');
                                                const matImg = mat?.ImageUrl || c.imageUrl;
                                                return (
                                                    <div
                                                        key={cIdx}
                                                        className={`h-7 flex items-center gap-2 px-1.5 rounded-md text-xs font-semibold border ${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                                                            }`}
                                                        title={matDesc}
                                                    >
                                                        {matImg ? (
                                                            <img
                                                                src={getImageSrc(matImg)}
                                                                alt={matDesc}
                                                                className="w-5 h-5 rounded object-cover border border-slate-300 dark:border-slate-600 shrink-0 cursor-zoom-in hover:scale-125 transition-transform shadow-xs"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPreviewImage(getImageSrc(matImg));
                                                                }}
                                                                title="Click to view full photo"
                                                            />
                                                        ) : (
                                                            <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border border-dashed ${isDark ? 'bg-slate-800/80 border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-300 text-slate-400'
                                                                }`}>
                                                                <Layers className="w-3 h-3" />
                                                            </div>
                                                        )}
                                                        <span className="truncate max-w-[200px]">{matDesc}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 4. Dimension */}
                                    <td className="py-3 px-4">
                                        <div className="flex flex-col gap-1.5 min-w-[150px]">
                                            {(rec.components || []).map((c, cIdx) => {
                                                const detail = metrics.rowDetails?.[cIdx];
                                                const dimension = detail?.dimension || c.dimension || '—';
                                                const parsed = parseRackDimension(dimension);
                                                return (
                                                    <div
                                                        key={cIdx}
                                                        className={`h-7 flex items-center px-2.5 rounded-md text-xs border ${isDark ? 'bg-[#141622] border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                                                            }`}
                                                        title={dimension}
                                                    >
                                                        {parsed.badges && parsed.badges.length > 0 ? (
                                                            <div className="flex items-center gap-1 overflow-hidden">
                                                                {parsed.badges.map((b, bIdx) => (
                                                                    <span
                                                                        key={bIdx}
                                                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border leading-none ${b.type === 'H' ? (isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200') :
                                                                            b.type === 'W' ? (isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200') :
                                                                                b.type === 'L' ? (isDark ? 'bg-teal-950/60 text-teal-300 border-teal-800' : 'bg-teal-50 text-teal-700 border-teal-200') :
                                                                                    b.type === 'D' ? (isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-800 border-amber-200') :
                                                                                        (isDark ? 'bg-purple-950/60 text-purple-300 border-purple-800' : 'bg-purple-50 text-purple-800 border-purple-200')
                                                                            }`}
                                                                    >
                                                                        <span className="font-bold mr-0.5 uppercase">{b.label}:</span>
                                                                        <span>{b.value}</span>
                                                                    </span>
                                                                ))}
                                                                {parsed.extra && (
                                                                    <span className="text-[10px] text-slate-400 truncate max-w-[90px]" title={parsed.extra}>
                                                                        {parsed.extra}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="font-mono text-xs truncate">{dimension}</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 5. Formula Quantity */}
                                    <td className="py-3 px-4 text-center whitespace-nowrap">
                                        <div className="flex flex-col gap-1.5 min-w-[130px]">
                                            {(rec.components || []).map((c, cIdx) => {
                                                const detail = metrics.rowDetails?.[cIdx];
                                                const uom = detail?.uom || c.uom || 'PCS';
                                                return (
                                                    <div
                                                        key={cIdx}
                                                        className={`h-7 flex items-center justify-center px-2.5 rounded-md text-xs font-mono font-bold border ${isDark ? 'bg-[#141622] border-slate-700 text-amber-400' : 'bg-amber-50/70 border-amber-200 text-amber-700'
                                                            }`}
                                                    >
                                                        <span>{c.pcsPerUnit || c.divisor} {uom}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 6. Stock Quantity (Need / Total) */}
                                    <td className="py-3 px-4 text-center whitespace-nowrap">
                                        <div className="flex flex-col gap-1.5 min-w-[160px]">
                                            {(rec.components || []).map((c, cIdx) => {
                                                const detail = metrics.rowDetails?.[cIdx];
                                                const uom = detail?.uom || c.uom || 'PCS';
                                                const usedPcs = (Number(c.pcsPerUnit || c.divisor || 1)) * metrics.maxCompleteUnits;
                                                const totalStock = detail ? Number(detail.stock || 0) : 0;
                                                const remainder = Math.max(0, totalStock - usedPcs);
                                                return (
                                                    <div
                                                        key={cIdx}
                                                        className={`h-7 flex items-center justify-center px-2.5 rounded-md text-xs font-mono font-bold border ${metrics.maxCompleteUnits > 0
                                                            ? (isDark ? 'bg-[#141622] border-slate-700 text-emerald-400' : 'bg-emerald-50/70 border-emerald-200 text-emerald-700')
                                                            : (isDark ? 'bg-[#141622] border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400')
                                                            }`}
                                                        title={`Need: ${usedPcs.toLocaleString()} ${uom} | Total Stock: ${totalStock.toLocaleString()} ${uom}${remainder > 0 ? ` | Butal: ${remainder.toLocaleString()} ${uom}` : ''}`}
                                                    >
                                                        <span>{usedPcs.toLocaleString()}/{totalStock.toLocaleString()} {uom}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>

                                    {/* 7. Total Units */}
                                    <td className="py-3 px-4 text-center whitespace-nowrap">
                                        <div className="flex flex-col gap-1.5 min-w-[120px]">
                                            <div
                                                className={`h-7 flex items-center justify-center px-2.5 rounded-md text-xs font-mono font-bold border ${metrics.maxCompleteUnits > 0
                                                    ? (isDark ? 'bg-[#141622] border-slate-700 text-emerald-400' : 'bg-emerald-50/70 border-emerald-200 text-emerald-700')
                                                    : (isDark ? 'bg-[#141622] border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400')
                                                    }`}
                                            >
                                                <span>{metrics.maxCompleteUnits.toLocaleString()} {rec.uom || 'UNITS'}</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan={7} className="text-center py-12 text-slate-400 italic text-xs">
                                No Rackings Unit calculation records found matching your filters.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default RackingsUnitTable;

