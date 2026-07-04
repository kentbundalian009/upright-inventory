import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Layers, Package, ShoppingCart,
    Search, Download, Loader2
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

    // Inventory States
    const [rawMaterialsData, setRawMaterialsData] = useState([]);
    const [productsData, setProductsData] = useState([]);
    const [suppliesData, setSuppliesData] = useState([]);

    // Transaction States
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [wipConversions, setWipConversions] = useState([]);
    const [outboundProducts, setOutboundProducts] = useState([]);
    const [suppliesMovements, setSuppliesMovements] = useState([]);

    const monthsList = [
        { value: '01', label: 'January' }, { value: '02', label: 'February' },
        { value: '03', label: 'March' }, { value: '04', label: 'April' },
        { value: '05', label: 'May' }, { value: '06', label: 'June' },
        { value: '07', label: 'July' }, { value: '08', label: 'August' },
        { value: '09', label: 'September' }, { value: '10', label: 'October' },
        { value: '11', label: 'November' }, { value: '12', label: 'December' }
    ];

    const reportModules = [
        { id: 'raw-materials', label: 'Raw Materials', icon: Layers },
        { id: 'products', label: 'Products', icon: Package },
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
            const [resRaw, resProd, resSupp, resInbound, resWIP, resOutboundProd, resSuppMove] = await Promise.all([
                axios.get(`${BASE_API_URL}/raw-materials`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/products`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/supplies`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/purchase-orders`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/conversions`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/packing-lists`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/supplies-movements`, config).catch(() => null),
            ]);

            if (resRaw?.status === 200) setRawMaterialsData(resRaw.data);
            if (resProd?.status === 200) setProductsData(resProd.data);
            if (resSupp?.status === 200) setSuppliesData(resSupp.data);

            if (resInbound?.status === 200) setPurchaseOrders(resInbound.data);
            if (resWIP?.status === 200) setWipConversions(resWIP.data);
            if (resOutboundProd?.status === 200) setOutboundProducts(resOutboundProd.data);
            if (resSuppMove?.status === 200) setSuppliesMovements(resSuppMove.data);
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
        else if (activeModule === 'products') targetInventory = productsData;
        else targetInventory = suppliesData;

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
                purchaseOrders.forEach(po => {
                    const txDate = po.deliveryDate || po.createdAt || po.date;
                    if (matchDate(txDate)) {
                        const matchItem = po.items?.find(it =>
                            it.materialId?.Code === item.Code ||
                            it.materialId === item._id ||
                            it.Code === item.Code
                        );
                        const qty = matchItem?.actualCountReceived || matchItem?.qty || matchItem?.quantity || 0;
                        if (qty > 0) {
                            inflows.push({ type: 'IN', qty: qty, label: po.supplier || 'Supplier Inbound', date: formatDate(txDate) });
                        }
                    }
                });

                wipConversions.forEach(wip => {
                    const txDate = wip.dateProcessed || wip.createdAt;
                    if (matchDate(txDate)) {
                        const matchedInput = wip.inputs?.find(input =>
                            input.materialId?._id === item._id ||
                            input.materialId === item._id ||
                            input.materialId?.Code === item.Code
                        );

                        if (matchedInput) {
                            const qty = matchedInput.qtyUsed || 0;
                            if (qty > 0) {
                                outflows.push({
                                    type: 'WIP',
                                    qty: qty,
                                    label: `${wip.conversionNo || 'WIP'} (${wip.productionType || 'Deducted'})`,
                                    date: formatDate(txDate)
                                });
                            }
                        }

                        const matchedOutput = wip.outputs?.find(output =>
                            output.itemType === 'RawMaterial' &&
                            (output.itemId?._id === item._id ||
                            output.itemId === item._id || output.itemId?.Code === item.Code)
                        );
                        if (matchedOutput) {
                            const qty = matchedOutput.qtyProduced || 0;
                            if (qty > 0) {
                                inflows.push({
                                    type: 'WIP_RET',
                                    qty: qty,
                                    label: `${wip.conversionNo || 'WIP'} Return`,
                                    date: formatDate(txDate)
                                });
                            }
                        }
                    }
                });
            }

            // 2. PRODUCTS MODULE LOGIC
            else if (activeModule === 'products') {
                wipConversions.forEach(wip => {
                    const txDate = wip.dateProcessed || wip.createdAt;
                    if (matchDate(txDate)) {
                        const matchedOutput = wip.outputs?.find(output =>
                            output.itemType === 'Product' &&
                            (output.itemId?._id === item._id || output.itemId === item._id || output.itemId?.Code === item.Code)
                        );

                        if (matchedOutput) {
                            const qty = matchedOutput.qtyProduced || 0;
                            if (qty > 0) {
                                inflows.push({
                                    type: 'WIP',
                                    qty: qty,
                                    label: `Produced [${wip.conversionNo || 'WIP'}]`,
                                    date: formatDate(txDate)
                                });
                            }
                        }
                    }
                });

                outboundProducts.forEach(outbound => {
                    const txDate = outbound.shipmentDate || outbound.createdAt;
                    if (matchDate(txDate)) {
                        const matchItem = outbound.items?.find(it =>
                            it.productId?.Code === item.Code ||
                            it.productId === item._id ||
                            it.Code === item.Code
                        );
                        const qty = matchItem?.actualCountShipped || matchItem?.qty || matchItem?.quantity || 0;

                        if (qty > 0) {
                            const isReservedStatus = outbound.transactionType === "Reserve";
                            outflows.push({
                                type: isReservedStatus ? 'RESERVE' : 'OUT',
                                qty: qty,
                                label: outbound.customer || 'N/A',
                                date: formatDate(txDate)
                            });
                        }
                    }
                });
            }

            // 3. SUPPLIES MODULE LOGIC
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

        if (globalSearch.trim()) {
            const q = globalSearch.toLowerCase();
            masterList = masterList.filter(i =>
                i.Code.toLowerCase().includes(q) ||
                i.ItemDescription.toLowerCase().includes(q)
            );
        }

        return masterList;
    };

    const consolidatedData = getConsolidatedSummary();

    // 📄 PREMIUM UI EXPORT ENGINE: (Top Dark Banner, Absolute Headers/Footers & Left Status Stripes)
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

            const titleModule = reportModules?.find(m => m.id === activeModule)?.label || activeModule || "Inventory";
            const targetMonthLabel = monthsList?.find(m => m.value === selectedMonth)?.label || selectedMonth || "Month";
            const currentYearStr = selectedYear || new Date().getFullYear();
            const activeModuleStr = activeModule ? activeModule.toUpperCase() : "REGISTRY";
            const formattedDate = new Date().toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            // Metadata Content Zone
            doc.setTextColor(40, 40, 40);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);

            doc.text("Module Registry:", 14, 42);
            doc.setFont("helvetica", "normal");
            doc.text(`${titleModule} Management`, 45, 42);

            doc.setFont("helvetica", "bold");
            doc.text("Date Generated:", 185, 42);
            doc.setFont("helvetica", "normal");
            doc.text(`${new Date().toLocaleDateString()}`, 220, 42);

            doc.setFont("helvetica", "bold");
            doc.text("Covered Period:", 14, 49);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(79, 70, 229); // Premium Accent Indigo
            doc.text(`${targetMonthLabel} ${currentYearStr}`, 45, 49);

            doc.setTextColor(40, 40, 40);
            doc.setFont("helvetica", "bold");
            doc.text("Security Class:", 185, 49);
            doc.setFont("helvetica", "normal");
            doc.text("Restricted Internal Ledger", 220, 49);

            // 🟢 Inayos ang columns array ng PDF para may sariling kolum ang Dimension
            const columns = ["Code", "Item Description", "Category/Seg", "Dimension", "Count", "UOM", "Inflow History Summary", "Outflow History Summary"];
            
            // 🟢 Inihiwalay ang item.Dimension sa pag-map ng rows ng PDF
            const rows = consolidatedData.map(item => [
                item.Code || '—',
                item.ItemDescription || '—',
                `${item.Category || '—'} \n(${item.Segment || 'N/A'})`,
                item.Dimension || '—',
                item.ActualCount ? String(item.ActualCount) : '0',
                item.UOM || '—',
                item.inflows && item.inflows.length > 0
                    ? item.inflows.map(inf => `${inf.type || ''} | Qty: ${inf.qty || 0} | ${inf.label || ''} | ${inf.date || ''}`).join('\n')
                    : 'No logs recorded',
                item.outflows && item.outflows.length > 0
                    ? item.outflows.map(out => `${out.type || ''} | Qty: ${out.qty || 0} | ${out.label || ''} | ${out.date || ''}`).join('\n')
                    : 'No logs recorded'
            ]);

            autoTable(doc, {
                startY: 58,
                margin: { top: 38 },
                head: [columns],
                body: rows,
                theme: 'grid',

                didDrawPage: (data) => {
                    // 1. Watermark Layer
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

                    // 2. Premium Top Dark Banner Block
                    doc.setFillColor(24, 23, 78);
                    doc.rect(0, 0, pageWidth, 30, 'F');

                    // 3. Header Text Configurations
                    doc.setTextColor(255, 255, 255);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(14);
                    doc.text(`${titleModule.toUpperCase()} CONSOLIDATED REGISTRY REPORT`, centerX, 13, { align: 'center' });

                    doc.setFontSize(8.5);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(200, 200, 220);
                    doc.text(`Material Flow Logistics & Audit Trail Control Registry  |  System Generated: ${formattedDate}`, centerX, 21, { align: 'center' });

                    // 4. Page Absolute Footer Setup
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.setTextColor(120, 120, 120);
                    doc.text("CONFIDENTIAL - SYSTEM CENTRAL LEDGER USE ONLY", 14, pageHeight - 10);

                    const pageNumber = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
                    doc.text(pageNumber, pageWidth - 14, pageHeight - 10, { align: 'right' });
                },

                // 🎨 LINE-BY-LINE MULTI-COLOR STATUS STRIPES
                didDrawCell: (data) => {
                    // 🟢 Inusog ang index sa 6 at 7 para sa Inflow at Outflow logs (dahil sumingit ang Dimension)
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

                            if (/^RESERVE\b/i.test(cleanLine)) {
                                doc.setDrawColor(59, 130, 246); // 🔵 Blue
                                doc.line(data.cell.x, lineYStart, data.cell.x, safeYEnd);
                            } else if (/^IN\b|^WIP_RET\b/i.test(cleanLine)) {
                                doc.setDrawColor(16, 185, 129); // 🟢 Green
                                doc.line(data.cell.x, lineYStart, data.cell.x, safeYEnd);
                            } else if (/^OUT\b/i.test(cleanLine)) {
                                doc.setDrawColor(239, 68, 68); // 🔴 Red
                                doc.line(data.cell.x, lineYStart, data.cell.x, safeYEnd);
                            } else if (/^WIP\b/i.test(cleanLine)) {
                                doc.setDrawColor(245, 158, 11); // 🟡 Amber/Yellow
                                doc.line(data.cell.x, lineYStart, data.cell.x, safeYEnd);
                            }
                        });
                    }
                },

                headStyles: { fillColor: [32, 31, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, valign: 'middle' },
                bodyStyles: { fontSize: 7.5, textColor: [60, 60, 60], valign: 'top' },
                alternateRowStyles: { fillColor: [248, 249, 250] },
                styles: { overflow: 'linebreak', cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2, rowPageBreak: 'avoid' },

                // 🟢 Balanced at adjusted na cellWidths para magkasya lahat sa A4 landscape format ang bagong Dimension kolum
                // 🟢 Balanced at adjusted cellWidths para magkasya ang UOM at lahat ng kolum sa A4 landscape
columnStyles: {
    0: { cellWidth: 20 }, // Code
    1: { cellWidth: 35 }, // Item Description (Binawasan mula 40 para magbigay ng space)
    2: { cellWidth: 30 }, // Category/Seg
    3: { cellWidth: 22 }, // Dimension Column
    4: { cellWidth: 14, halign: 'center', fontStyle: 'bold' }, // Count
    5: { cellWidth: 15, halign: 'center' }, // UOM (Pinalaki mula 11 para kasya ang text gaya ng "PCS", "BOX", atbp.)
    6: { cellWidth: 65, fontSize: 7 }, // Inflow Summary
    7: { cellWidth: 66, fontSize: 7 }  // Outflow Summary (Dinagdagan ng 1mm para saktong 267mm total printable width)
}
            });

            // Signatories Allocation Block
            const lastTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : null;
            const finalY = (lastTableY && !isNaN(lastTableY)) ? (lastTableY + 18) : (pageHeight - 35);

            doc.save(`${activeModuleStr}_CONSOLIDATED_${targetMonthLabel.toUpperCase()}_${currentYearStr}.pdf`);
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
                <div className="flex flex-col md:flex-row gap-3 items-center w-full border-b border-slate-100 pb-4">
                    <div className="flex-1 w-full relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Code or Description..."
                            value={globalSearch}
                            onChange={(e) => setGlobalSearch(e.target.value)}
                            className="w-full bg-slate-50 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none border border-transparent focus:border-[#18174e]"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none">
                            {monthsList.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                        <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:outline-none">
                            <option value="2026">2026</option>
                            <option value="2025">2025</option>
                        </select>
                        <button onClick={handleDownloadPDF} className="bg-[#18174e] hover:bg-[#252375] text-white text-sm px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-2">
                            <Download className="w-4 h-4" /> Export PDF
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
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all relative cursor-pointer ${
                                        isActive
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
                                                <th className="p-3">Dimension</th> {/* 🟢 Bagong Column Header sa UI Table */}
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
                                                    
                                                    {/* 🟢 Bagong Hiwalay na Data Cell para sa Dimension sa UI Table */}
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
                                                                    <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium border ${inf.type === 'IN' || inf.type === 'WIP_RET' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-amber-50 text-amber-800 border-amber-100'}`}>
                                                                        <span className="font-black text-emerald-600">{inf.type}</span>
                                                                        <span className="text-slate-400">|</span>
                                                                        <span className="font-bold">{inf.qty}</span>
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
                                                                item.outflows.map((out, idx) => (
                                                                    <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium border ${out.type === 'RESERVE' ? 'bg-amber-50 text-amber-800 border-amber-100' : 'bg-rose-50 text-rose-800 border-rose-100'}`}>
                                                                        <span className={`font-black ${out.type === 'RESERVE' ? 'text-amber-600' : 'text-rose-600'}`}>{out.type}</span>
                                                                        <span className="text-slate-400">|</span>
                                                                        <span className="font-bold">{out.qty}</span>
                                                                        <span className="text-slate-400">|</span>
                                                                        <span className="text-slate-600 font-semibold truncate max-w-[100px]">{out.label}</span>
                                                                        <span className="text-slate-400">|</span>
                                                                        <span className="text-slate-500 font-mono">{out.date}</span>
                                                                    </div>
                                                                ))
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