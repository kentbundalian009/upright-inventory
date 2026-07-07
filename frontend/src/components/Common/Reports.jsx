import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Layers, ShoppingCart,
    Search, Download, Loader2, Filter
} from 'lucide-react';
import PageHeader from '../Common/PageHeader';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const BASE_API_URL = import.meta.env.MODE === 'production'
    ? 'https://one-inventory.onrender.com/api'
    : 'http://localhost:5000/api';

function Reports() {
    const [activeModule, setActiveModule] = useState('raw-materials');
    const [globalSearch, setGlobalSearch] = useState('');
    const [loading, setLoading] = useState(false);

    // Filter ng Buwan at Taon (Default sa kasalukuyang petsa)
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear.toString());
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));

    // Bagong Filters para sa Pag-grupo at Pagtatago ng Zero Quantity
    const [viewMode, setViewMode] = useState('detailed'); // 'detailed', 'category', 'segment'
    const [hideZeroQty, setHideZeroQty] = useState(false);

    // Inventory States
    const [rawMaterialsData, setRawMaterialsData] = useState([]);
    const [suppliesData, setSuppliesData] = useState([]);

    // Transaction States
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [wipConversions, setWipConversions] = useState([]);
    const [suppliesMovements, setSuppliesMovements] = useState([]);
    const [packingLists, setPackingLists] = useState([]);

    const monthsList = [
        { value: '01', label: 'January' }, { value: '02', label: 'February' },
        { value: '03', label: 'March' }, { value: '04', label: 'April' },
        { value: '05', label: 'May' }, { value: '06', label: 'June' },
        { value: '07', label: 'July' }, { value: '08', label: 'August' },
        { value: '09', label: 'September' }, { value: '10', label: 'October' },
        { value: '11', label: 'November' }, { value: '12', label: 'December' }
    ];

    const reportModules = [
        { id: 'raw-materials', label: 'Rackings', icon: Layers },
        { id: 'supplies', label: 'Supplies', icon: ShoppingCart },
    ];

    // 🔒 HELPER: Kinukuha ang Token mula sa localStorage para makalusot sa protectRoute
    const getAuthConfig = () => {
        const token = localStorage.getItem("token");
        return {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const config = getAuthConfig();
            const [resRaw, resSupp, resInbound, resWIP, resSuppMove, resPL] = await Promise.all([
                axios.get(`${BASE_API_URL}/raw-materials`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/supplies`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/purchase-orders`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/conversions`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/supplies-movements`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/packing-lists`, config).catch(() => null),
            ]);

            if (resRaw?.status === 200) setRawMaterialsData(resRaw.data);
            if (resSupp?.status === 200) setSuppliesData(resSupp.data);
            if (resInbound?.status === 200) setPurchaseOrders(resInbound.data);
            if (resWIP?.status === 200) setWipConversions(resWIP.data);
            if (resSuppMove?.status === 200) setSuppliesMovements(resSuppMove.data);
            if (resPL?.status === 200) setPackingLists(resPL.data);
        } catch (error) {
            console.error("Error fetching data for reports:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    // --- REPORT TRACING CALCULATION ENGINE ---
    const getConsolidatedSummary = () => {
        let masterList = [];
        let targetInventory = [];

        if (activeModule === 'raw-materials') targetInventory = rawMaterialsData;
        else targetInventory = suppliesData;

        // FILTER AT THE SOURCE: Itago agad ang may 0 quantity kung naka-enable
        if (hideZeroQty) {
            targetInventory = targetInventory.filter(item => (item.ActualCount ?? 0) !== 0);
        }

        targetInventory.forEach(item => {
            let inflows = [];
            let outflows = [];

            const matchDate = (dateStr) => {
                if (!dateStr) return false;
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return false;
                return d.getFullYear().toString() === selectedYear &&
                    (d.getMonth() + 1).toString().padStart(2, '0') === selectedMonth;
            };

            const formatDate = (dateStr) => {
                if (!dateStr) return 'N/A';
                const d = new Date(dateStr);
                return isNaN(d.getTime()) ? 'N/A' : d.toISOString().split('T')[0];
            };

            // 1. RAW MATERIALS MODULE LOGIC
            if (activeModule === 'raw-materials') {
                // A. Trace Purchase Orders (Inbound Logs)
                purchaseOrders.forEach(po => {
                    const txDate = po.deliveryDate || po.createdAt || po.date;
                    if (matchDate(txDate)) {
                        const matchedPoItem = po.items?.find(it =>
                            it.materialId?._id === item._id ||
                            it.materialId === item._id ||
                            it.materialId?.Code === item.Code ||
                            it.Code === item.Code
                        );
                        if (matchedPoItem) {
                            const qty = matchedPoItem.qtyReceived || matchedPoItem.qtyOrdered || matchedPoItem.actualCountReceived || matchedPoItem.qty || matchedPoItem.quantity || 0;
                            if (qty > 0) {
                                inflows.push({
                                    type: 'IN',
                                    qty: qty,
                                    label: po.poNumber ? `PO: ${po.poNumber}` : (po.supplier || 'Supplier Inbound'),
                                    date: formatDate(txDate)
                                });
                            }
                        }
                    }
                });

                // B. Trace WIP Conversions (Production Movements)
                wipConversions.forEach(wip => {
                    const txDate = wip.conversionDate || wip.dateProcessed || wip.createdAt;
                    if (matchDate(txDate)) {
                        // Bawas kapag ginamit sa components/WIP (Outflow / Consumption)
                        const matchedConsumed = (wip.materialsConsumed || wip.inputs)?.find(it =>
                            it.materialId?._id === item._id ||
                            it.materialId === item._id ||
                            it.materialId?.Code === item.Code
                        );
                        if (matchedConsumed) {
                            const qty = matchedConsumed.qtyUsed || 0;
                            if (qty > 0) {
                                outflows.push({
                                    type: 'WIP',
                                    qty: qty,
                                    label: wip.wipOrderNo ? `To WIP: ${wip.wipOrderNo}` : `${wip.conversionNo || 'WIP'} (${wip.productionType || 'Deducted'})`,
                                    date: formatDate(txDate)
                                });
                            }
                        }

                        // Dagdag mula sa production returns (Inflow / Return)
                        const matchedReturned = wip.materialsReturned?.find(it =>
                            it.materialId?._id === item._id ||
                            it.materialId === item._id ||
                            it.materialId?.Code === item.Code
                        );
                        if (matchedReturned) {
                            const qty = matchedReturned.qtyReturned || 0;
                            if (qty > 0) {
                                inflows.push({
                                    type: 'WIP_RET',
                                    qty: qty,
                                    label: `Return: ${wip.wipOrderNo || 'Job Order'}`,
                                    date: formatDate(txDate)
                                });
                            }
                        }
                    }
                });

                // C. Trace Packing Lists (Outbound / Reserve Deliveries)
                packingLists.forEach(pl => {
                    const txDate = pl.shipmentDate || pl.createdAt;
                    if (matchDate(txDate)) {
                        const matchedPLItem = pl.items?.find(it =>
                            it.materialId?._id === item._id ||
                            it.materialId === item._id ||
                            it.materialId?.Code === item.Code
                        );

                        if (matchedPLItem) {
                            const qty = pl.transactionType === "Outbound"
                                ? (matchedPLItem.actualCountShipped || 0)
                                : (matchedPLItem.qtyRequested || 0);

                            if (qty > 0) {
                                if (pl.transactionType === "Outbound") {
                                    outflows.push({
                                        type: 'OUT',
                                        qty: qty,
                                        label: `${pl.plNo || 'PL'} - ${pl.customer || 'Outbound'}`,
                                        date: formatDate(txDate)
                                    });
                                } else if (pl.transactionType === "Reserve") {
                                    outflows.push({
                                        type: 'RESERVE',
                                        qty: qty,
                                        label: `${pl.plNo || 'RES'} - ${pl.customer || 'Reserved'}`,
                                        date: formatDate(txDate)
                                    });
                                }
                            }
                        }
                    }
                });
            }

            // 2. SUPPLIES MODULE LOGIC
            else if (activeModule === 'supplies') {
                suppliesMovements.forEach(slip => {
                    const txDate = slip.transactionDate || slip.createdAt || slip.date;
                    if (matchDate(txDate)) {
                        const matchedSupplyItem = slip.items?.find(it =>
                            it.supplyId?._id === item._id ||
                            it.supplyId === item._id ||
                            it.supplyId?.Code === item.Code
                        );

                        if (matchedSupplyItem) {
                            const qty = matchedSupplyItem.qty || 0;
                            if (qty > 0) {
                                const isDeducting = ['Borrow', 'Reserved', 'Out', 'Scrap', 'Return to Vendor'].includes(slip.transactionType);

                                if (isDeducting) {
                                    let outflowType = 'OUT';
                                    if (slip.transactionType === 'Reserved') outflowType = 'RESERVE';
                                    outflows.push({
                                        type: outflowType,
                                        qty: qty,
                                        label: slip.partyName || slip.originAddress || 'Issued Out',
                                        date: formatDate(txDate)
                                    });
                                } else {
                                    inflows.push({
                                        type: 'IN',
                                        qty: qty,
                                        label: slip.partyName || 'Stock Return/Inbound',
                                        date: formatDate(txDate)
                                    });
                                }
                            }
                        }
                    }
                });
            }

            masterList.push({
                _id: item._id,
                Code: item.Code || 'N/A',
                Category: item.Category || 'N/A',
                Segment: item.Segment || 'N/A',
                ItemDescription: item.ItemDescription || 'N/A',
                Dimension: item.Dimension || 'N/A',
                ActualCount: item.ActualCount ?? 0,
                UOM: item.UOM || 'PCS',
                inflows: inflows,
                outflows: outflows
            });
        });

        // Pag-grupo (Aggregation) base sa napiling View Mode
        if (viewMode === 'category') {
            const grouped = {};
            masterList.forEach(item => {
                const key = item.Category;
                if (!grouped[key]) {
                    grouped[key] = {
                        _id: `cat-${key}`,
                        Code: 'CATEGORY SUMMARY',
                        Category: key,
                        Segment: '—',
                        ItemDescription: `All items under ${key}`,
                        Dimension: '—',
                        ActualCount: 0,
                        UOM: 'Mixed',
                        inflows: [],
                        outflows: []
                    };
                }
                grouped[key].ActualCount += item.ActualCount;
                grouped[key].inflows.push(...item.inflows);
                grouped[key].outflows.push(...item.outflows);
            });
            masterList = Object.values(grouped);
        } else if (viewMode === 'segment') {
            const grouped = {};
            masterList.forEach(item => {
                const key = item.Segment;
                if (!grouped[key]) {
                    grouped[key] = {
                        _id: `seg-${key}`,
                        Code: 'SEGMENT SUMMARY',
                        Category: '—',
                        Segment: key,
                        ItemDescription: `All items under segment ${key}`,
                        Dimension: '—',
                        ActualCount: 0,
                        UOM: 'Mixed',
                        inflows: [],
                        outflows: []
                    };
                }
                grouped[key].ActualCount += item.ActualCount;
                grouped[key].inflows.push(...item.inflows);
                grouped[key].outflows.push(...item.outflows);
            });
            masterList = Object.values(grouped);
        }

        if (globalSearch.trim()) {
            const q = globalSearch.toLowerCase();
            masterList = masterList.filter(i =>
                i.Code.toLowerCase().includes(q) ||
                i.ItemDescription.toLowerCase().includes(q) ||
                i.Category.toLowerCase().includes(q) ||
                i.Segment.toLowerCase().includes(q)
            );
        }

        return masterList;
    };

    const consolidatedData = getConsolidatedSummary();

    const handleDownloadPDF = () => {
        if (!consolidatedData || consolidatedData.length === 0) {
            alert("No data available to export for the selected filters.");
            return;
        }

        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageWidth = 297;
            const pageHeight = 210;
            const centerX = pageWidth / 2;
            const centerY = pageHeight / 2;
            let titleModule = reportModules?.find(m => m.id === activeModule)?.label || activeModule || "Inventory";
            if (viewMode === 'category') titleModule += " (By Category Summary)";
            if (viewMode === 'segment') titleModule += " (By Segment Summary)";
            const targetMonthLabel = monthsList?.find(m => m.value === selectedMonth)?.label || selectedMonth || "Month";
            const currentYearStr = selectedYear || new Date().getFullYear();
            const activeModuleStr = activeModule ? activeModule.toUpperCase() : "REGISTRY";
            const formattedDate = new Date().toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            doc.setTextColor(40, 40, 40);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);

            doc.text("Module Registry:", 14, 42);
            doc.setFont("helvetica", "normal");
            doc.text(`${titleModule} Inventory`, 45, 42);

            doc.setFont("helvetica", "bold");
            doc.text("Date Generated:", 185, 42);
            doc.setFont("helvetica", "normal");
            doc.text(`${new Date().toLocaleDateString()}`, 220, 42);

            doc.setFont("helvetica", "bold");
            doc.text("Covered Period:", 14, 49);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(79, 70, 229);
            doc.text(`${targetMonthLabel} ${currentYearStr}`, 45, 49);

            doc.setTextColor(40, 40, 40);
            doc.setFont("helvetica", "bold");
            doc.text("Security Class:", 185, 49);
            doc.setFont("helvetica", "normal");
            doc.text("Restricted Internal Ledger", 220, 49);

            const columns = ["Code", "Item Description", "Category/Seg", "Dimension", "Count", "UOM", "Inflow History Summary", "Outflow History Summary"];
            const rows = consolidatedData.map(item => [
                item.Code || '—',
                item.ItemDescription || '—',
                `${item.Category || '—'} \n(${item.Segment || 'N/A'})`,
                item.Dimension || '—',
                item.ActualCount ? String(item.ActualCount) : '0',
                item.UOM || '—',
                item.inflows && item.inflows.length > 0
                    ? item.inflows.slice(0, 8).map(inf => `${inf.type || ''} | Qty: ${inf.qty || 0} | ${inf.label || ''} | ${inf.date || ''}`).join('\n') + (item.inflows.length > 8 ? '\n...and more logs' : '')
                    : 'No logs recorded',
                item.outflows && item.outflows.length > 0
                    ? item.outflows.slice(0, 8).map(out => `${out.type || ''} | Qty: ${out.qty || 0} | ${out.label || ''} | ${out.date || ''}`).join('\n') + (item.outflows.length > 8 ? '\n...and more logs' : '')
                    : 'No logs recorded'
            ]);

            autoTable(doc, {
                startY: 58,
                margin: { top: 38 },
                head: [columns],
                body: rows,
                theme: 'grid',
                didDrawPage: (data) => {
                    try {
                        doc.saveGraphicsState();
                        doc.setGState(new doc.GState({ opacity: 0.05 }));
                        const logoWidth = 75;
                        const logoHeight = 75;
                        doc.addImage('/one.logo.png', 'PNG', centerX - (logoWidth / 2), centerY - (logoHeight / 2), logoWidth, logoHeight);
                        doc.restoreGraphicsState();
                    } catch (e) {
                        console.warn("Watermark asset omitted.", e);
                    }

                    doc.setFillColor(24, 23, 78);
                    doc.rect(0, 0, pageWidth, 30, 'F');

                    doc.setTextColor(255, 255, 255);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(14);
                    doc.text(`${titleModule.toUpperCase()} CONSOLIDATED REGISTRY REPORT`, centerX, 13, { align: 'center' });

                    doc.setFontSize(8.5);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(200, 200, 220);
                    doc.text(`Material Flow Logistics & Audit Trail Control Registry  |  System Generated: ${formattedDate}`, centerX, 21, { align: 'center' });
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.setTextColor(120, 120, 120);
                    doc.text("CONFIDENTIAL - SYSTEM CENTRAL LEDGER USE ONLY", 14, pageHeight - 10);
                    const pageNumber = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
                    doc.text(pageNumber, pageWidth - 14, pageHeight - 10, { align: 'right' });
                },
                didDrawCell: (data) => {
                    if (data.section === 'body' && (data.column.index === 6 || data.column.index === 7)) {
                        const lines = data.cell.text;
                        if (!lines || lines.length === 0 || lines[0] === 'No logs recorded') return;

                        const scaleFactor = data.doc.internal.scaleFactor || 1;
                        const fontSize = data.cell.styles.fontSize || 7.5;
                        const lineHeight = (fontSize * 1.25) / scaleFactor;
                        const paddingTop = data.cell.styles.cellPadding.top || 2.5;

                        lines.forEach((line, index) => {
                            if (!line) return;
                            const lineYStart = data.cell.y + paddingTop + (index * lineHeight);
                            const lineYEnd = lineYStart + lineHeight;
                            const cellBottomBound = data.cell.y + data.cell.height;
                            const safeYEnd = lineYEnd > cellBottomBound ? cellBottomBound : lineYEnd;

                            if (isNaN(data.cell.x) || isNaN(lineYStart) || isNaN(safeYEnd)) return;

                            doc.setLineWidth(1.2);
                            const cleanLine = line.trim();

                            // PDF Marker Colors aligning with requirements
                            if (/^RESERVE\b|^WIP\b/i.test(cleanLine)) {
                                doc.setDrawColor(245, 158, 11); // Yellow for WIP and Reserve
                                doc.line(data.cell.x, lineYStart, data.cell.x, safeYEnd);
                            } else if (/^IN\b|^WIP_RET\b/i.test(cleanLine)) {
                                doc.setDrawColor(16, 185, 129); // Green for IN & WIP Return
                                doc.line(data.cell.x, lineYStart, data.cell.x, safeYEnd);
                            } else if (/^OUT\b/i.test(cleanLine)) {
                                doc.setDrawColor(239, 68, 68); // Red for OUT
                                doc.line(data.cell.x, lineYStart, data.cell.x, safeYEnd);
                            }
                        });
                    }
                },
                headStyles: { fillColor: [32, 31, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, valign: 'middle' },
                bodyStyles: { fontSize: 7.5, textColor: [60, 60, 60], valign: 'top' },
                alternateRowStyles: { fillColor: [248, 249, 250] },
                styles: { overflow: 'linebreak', cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2, rowPageBreak: 'avoid' },
                columnStyles: {
                    0: { cellWidth: 20 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 22 },
                    4: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
                    5: { cellWidth: 15, halign: 'center' },
                    6: { cellWidth: 65, fontSize: 7 },
                    7: { cellWidth: 66, fontSize: 7 }
                }
            });
            doc.save(`${activeModuleStr}_${viewMode.toUpperCase()}_CONSOLIDATED_${targetMonthLabel.toUpperCase()}_${currentYearStr}.pdf`);
        } catch (e) {
            console.error("🔴 PDF CRITICAL FAILURE REASON:", e);
            alert(`Failed to download Consolidated Registry: ${e.message}`);
        }
    };

    return (
        <div className="mx-6 md:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased text-slate-600">
            <PageHeader activeTab="reports" />

            <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 flex flex-col gap-6 shadow-xs">

                {/* FILTERS TOP BAR */}
                <div className="flex flex-col md:flex-row gap-4 items-center w-full border-b border-slate-100 pb-4">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Code, Description, Category, or Segment..."
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            className="w-full bg-slate-50 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none border border-transparent focus:border-[#18174e]"
                        />
                    </div>

                    <div className="flex flex-wrap md:flex-nowrap gap-3 items-center w-full md:w-auto">
                        {/* 1. View Grouping Select */}
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                            <Filter className="w-3.5 h-3.5 text-slate-400" />
                            <select
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value)}
                                className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer text-slate-700"
                            >
                                <option value="detailed">Detailed (Per Item)</option>
                                <option value="category">Summary per Category</option>
                                <option value="segment">Summary per Segment</option>
                            </select>
                        </div>

                        {/* 2. Hide Zero Quantity Checkbox */}
                        <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-100">
                            <input
                                type="checkbox"
                                checked={hideZeroQty}
                                onChange={(e) => setHideZeroQty(e.target.checked)}
                                className="accent-[#18174e] cursor-pointer rounded"
                            />
                            Hide 0 Qty
                        </label>

                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none text-slate-700">
                            {monthsList.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none text-slate-700">
                            <option value="2026">2026</option>
                            <option value="2025">2025</option>
                        </select>
                        <button onClick={handleDownloadPDF} className="bg-green-600 hover:bg-green-700 text-white text-xs px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap">
                          Download PDF
                        </button>
                    </div>
                </div>

                {/* CONTENT HOUSING */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* LEFT SIDEBAR NAVIGATION */}
                    <div className="flex flex-col gap-1 w-full px-2">
                        {reportModules.map((m) => {
                            const Icon = m.icon;
                            const isActive = activeModule === m.id;

                            return (
                                <button
                                    key={m.id}
                                    onClick={() => {
                                        setActiveModule(m.id);
                                        setGlobalSearch('');
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all relative cursor-pointer ${isActive
                                        ? 'bg-[#18174e] text-white font-bold shadow-md'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                                    }`}
                                >
                                    <Icon size={16} className="flex-shrink-0" />
                                    <span className="truncate">{m.label}</span>
                                    {isActive && (
                                        <div className="absolute right-2 w-1 h-1/2 bg-white rounded-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* MAIN CONSOLIDATED SHEET GRID */}
                    <div className="lg:col-span-3 flex flex-col gap-3">
                        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden min-h-[350px]">
                            {loading ? (
                                <div className="flex justify-center items-center min-h-[350px]"><Loader2 className="animate-spin text-[#18174e]" /></div>
                            ) : consolidatedData.length > 0 ? (
                                <div className="overflow-x-auto w-full">
                                    <table className="w-full text-left text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-[#18174e] text-white font-bold uppercase whitespace-nowrap">
                                                <th className="p-3">Item Profile (Code)</th>
                                                <th className="p-3">Category/Segment</th>
                                                <th className="p-3">Dimension</th>
                                                <th className="p-3 text-center">Actual Count</th>
                                                <th className="p-3">Inflow Trace Route (From)</th>
                                                <th className="p-3">Outflow Trace Route (To)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-slate-600">
                                            {consolidatedData.map((item) => (
                                                <tr key={item._id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="p-3 whitespace-nowrap">
                                                        <span className="font-bold text-[#18174e] block">{item.Code}</span>
                                                        <span className="text-[10px] text-slate-400 block max-w-[180px] truncate">{item.ItemDescription}</span>
                                                    </td>
                                                    <td className="p-3 whitespace-nowrap">
                                                        <span className="font-semibold block">{item.Category}</span>
                                                        <span className="text-[10px] text-slate-400 block">{item.Segment}</span>
                                                    </td>
                                                    <td className="p-3 whitespace-nowrap align-middle">
                                                        <span className="font-medium text-slate-700">{item.Dimension || '—'}</span>
                                                    </td>
                                                    <td className="p-3 text-center font-bold font-mono bg-slate-50/50 whitespace-nowrap">
                                                        {item.ActualCount} <span className="text-[10px] font-normal text-slate-400">{item.UOM}</span>
                                                    </td>

                                                    {/* INFLOW HISTORY VIEW */}
                                                    <td className="p-3">
                                                        <div className="flex flex-col gap-1 min-w-[220px]">
                                                            {item.inflows.length > 0 ? (
                                                                item.inflows.map((inf, idx) => (
                                                                    <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium border ${
                                                                        inf.type === 'IN' || inf.type === 'WIP_RET' 
                                                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                                                                            : 'bg-amber-50 text-amber-800 border-amber-100'
                                                                    }`}>
                                                                        <span className="font-black text-emerald-600">{inf.type}</span>
                                                                        <span className="text-slate-400">|</span>
                                                                        <span className="font-bold">+{inf.qty}</span>
                                                                        <span className="text-slate-400">|</span>
                                                                        <span className="text-slate-600 font-semibold truncate max-w-[100px]">{inf.label}</span>
                                                                        <span className="text-slate-400">|</span>
                                                                        <span className="text-slate-500 font-mono">{inf.date}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-[10px] text-slate-400 italic px-1">No inflows</span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* OUTFLOW HISTORY VIEW */}
                                                    <td className="p-3">
                                                        <div className="flex flex-col gap-1 min-w-[220px]">
                                                            {item.outflows.length > 0 ? (
                                                                item.outflows.map((out, idx) => {
                                                                    // Determine colors based on requirements
                                                                    let badgeStyles = "bg-rose-50 text-rose-800 border-rose-100";
                                                                    let textStyle = "text-rose-600";
                                                                    
                                                                    if (out.type === 'WIP' || out.type === 'RESERVE') {
                                                                        badgeStyles = "bg-amber-50 text-amber-800 border-amber-100";
                                                                        textStyle = "text-amber-600";
                                                                    }
                                                                    
                                                                    return (
                                                                        <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium border ${badgeStyles}`}>
                                                                            <span className={`font-black ${textStyle}`}>{out.type}</span>
                                                                            <span className="text-slate-400">|</span>
                                                                            <span className="font-bold">-{out.qty}</span>
                                                                            <span className="text-slate-400">|</span>
                                                                            <span className="text-slate-600 font-semibold truncate max-w-[100px]">{out.label}</span>
                                                                            <span className="text-slate-400">|</span>
                                                                            <span className="text-slate-500 font-mono">{out.date}</span>
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <span className="text-[10px] text-slate-400 italic px-1">No outflows</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center p-12 text-slate-400 italic">No records match the selected filters.</div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Reports;