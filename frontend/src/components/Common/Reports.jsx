import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Layers, ShoppingCart, ShieldAlert,
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
        { id: 'discrepancy', label: 'Discrepancy & Voided Logs', icon: ShieldAlert },
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
                            const qty = matchedPoItem.qtyReceived ||
                                matchedPoItem.qtyOrdered || matchedPoItem.actualCountReceived || matchedPoItem.qty || matchedPoItem.quantity || 0;
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

                // B. Trace WIP Conversions (Production Movements) sa Reports.jsx
wipConversions.forEach(wip => {
    const txDate = wip.conversionDate || wip.dateProcessed || wip.createdAt;
    if (matchDate(txDate)) {
        
        // --- 1. OUTFLOWS (CONSUMED / DEDUCTED) ---
        const matchedConsumed = (wip.materialsConsumed || wip.inputs)?.find(it =>
            it.materialId?._id === item._id ||
            it.materialId === item._id ||
            it.materialId?.Code === item.Code
        );
        if (matchedConsumed) {
            const qty = matchedConsumed.qtyUsed || 0;
            if (qty > 0) {
                outflows.push({
                    type: 'WIP_OUT',
                    qty: qty,
                    label: wip.conversionNo ? `WIP Cut: ${wip.conversionNo}` : `WIP Deduct`,
                    date: formatDate(txDate)
                });
            }
        }

        // --- 2. INFLOWS (YIELD CONVERSION OUTPUTS / ADDED STOCKS) ---
        // Pinalitan/Idinagdag ang pagbasa sa wip.outputs para sa mga dagdag na stock (+122)
        const matchedOutput = wip.outputs?.find(it =>
            it.itemId?._id === item._id ||
            it.itemId === item._id ||
            it.itemId?.Code === item.Code ||
            it.Code === item.Code
        );
        if (matchedOutput) {
            const qty = matchedOutput.qtyProduced || 0;
            if (qty > 0) {
                inflows.push({
                    type: 'WIP_IN',
                    qty: qty,
                    label: `WIP Yield: ${wip.conversionNo || 'Yield Output'}`,
                    date: formatDate(txDate)
                });
            }
        }

        // --- 3. (OPTIONAL) PRODUCTION RETURNS ---
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

                // C. Trace Packing Lists (Outbound / Reserve Deliveries) - Exclude Voided Logs
                packingLists.filter(pl => !pl.isVoided).forEach(pl => {
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
                                        label: pl.customer || 'Outbound',
                                        date: formatDate(txDate)
                                    });
                                } else if (pl.transactionType === "Reserve") {
                                    outflows.push({
                                        type: 'RESERVE',
                                        qty: qty,
                                        label: pl.customer || 'Reserved',
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

    const getDiscrepancyLogs = () => {
        let logs = packingLists.filter(pl => pl.isVoided).map(pl => ({
            _id: pl._id,
            slipNo: pl.plNo,
            transactionType: pl.transactionType,
            customer: pl.customer || 'N/A',
            voidedAt: pl.voidedAt ? new Date(pl.voidedAt).toLocaleDateString() + ' ' + new Date(pl.voidedAt).toLocaleTimeString() : (pl.updatedAt ? new Date(pl.updatedAt).toLocaleDateString() : 'N/A'),
            voidedBy: pl.voidedBy || pl.preparedBy || 'System User',
            voidReason: pl.voidReason || 'Erroneous transaction entry voided by user',
            itemsRestored: pl.items?.map(i => `${i.materialId?.Code || 'Item'} (${pl.transactionType === "Outbound" ? i.actualCountShipped : i.qtyRequested} ${i.materialId?.UOM || 'PCS'})`).join(', ') || 'N/A'
        }));

        if (globalSearch.trim()) {
            const q = globalSearch.toLowerCase();
            logs = logs.filter(l =>
                l.slipNo.toLowerCase().includes(q) ||
                l.customer.toLowerCase().includes(q) ||
                l.voidReason.toLowerCase().includes(q) ||
                l.voidedBy.toLowerCase().includes(q)
            );
        }
        return logs;
    };

    const consolidatedData = getConsolidatedSummary();

    const handleDownloadPDF = () => {
        if (activeModule === 'discrepancy') {
            const logs = getDiscrepancyLogs();
            if (!logs || logs.length === 0) {
                alert("No discrepancy or voided logs available to export.");
                return;
            }
            try {
                const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
                const pageWidth = 297;
                const pageHeight = 210;
                const centerX = pageWidth / 2;
                const centerY = pageHeight / 2;

                doc.setTextColor(40, 40, 40);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);

                doc.text("Report Module:", 14, 42);
                doc.setFont("helvetica", "normal");
                doc.text("Discrepancy & Voided Audit Log", 45, 42);

                doc.setFont("helvetica", "bold");
                doc.text("Date Generated:", 185, 42);
                doc.setFont("helvetica", "normal");
                doc.text(`${new Date().toLocaleDateString()}`, 220, 42);

                doc.setFont("helvetica", "bold");
                doc.text("Security Class:", 14, 49);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(225, 29, 72);
                doc.text("Internal Audit Discrepancy Registry", 45, 49);

                const columns = ["Slip No", "Type", "Customer / Recipient", "Date Voided", "Voided By", "Discrepancy / Void Reason", "Restored Items & Quantities"];
                const rows = logs.map(l => [
                    l.slipNo,
                    l.transactionType,
                    l.customer,
                    l.voidedAt,
                    l.voidedBy,
                    l.voidReason,
                    l.itemsRestored
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
                            doc.addImage('/cropped_circle_image.png', 'PNG', centerX - 37.5, centerY - 37.5, 75, 75);
                            doc.restoreGraphicsState();
                        } catch (e) {}

                        doc.setFillColor(225, 29, 72);
                        doc.rect(0, 0, pageWidth, 28, 'F');

                        doc.setTextColor(255, 255, 255);
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(14);
                        doc.text("DISCREPANCY & VOIDED TRANSACTION LOGS AUDIT REPORT", centerX, 13, { align: 'center' });

                        doc.setFontSize(8.5);
                        doc.setFont("helvetica", "normal");
                        doc.setTextColor(255, 235, 235);
                        doc.text("System Error Corrective Action Audit Trail Registry", centerX, 20, { align: 'center' });

                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(8);
                        doc.setTextColor(120, 120, 120);
                        doc.text("CONFIDENTIAL AUDIT LEDGER - INTERNAL USE ONLY", 14, pageHeight - 10);

                        const pageNumber = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
                        doc.text(pageNumber, pageWidth - 14, pageHeight - 10, { align: 'right' });
                    },
                    headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
                    bodyStyles: { fontSize: 8, textColor: [60, 60, 60] }
                });

                doc.save(`DISCREPANCY_VOIDED_LOGS_REPORT_${new Date().toISOString().split('T')[0]}.pdf`);
            } catch (e) {
                console.error(e);
                alert("Failed to export Discrepancy PDF Report.");
            }
            return;
        }

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
    // Inflows - Tinanggal ang .slice(0, 8) at ang "...and more logs" condition
    item.inflows && item.inflows.length > 0
        ? item.inflows.map(inf => `${inf.type === 'WIP_IN' ? 'WIP-IN' : inf.type === 'WIP_RET' ? 'WIP-RET' : 'IN'} | Qty: ${inf.qty || 0} | ${inf.label || ''} | ${inf.date || ''}`).join('\n')
        : 'No logs recorded',
    // Outflows - Tinanggal ang .slice(0, 8) at ang "...and more logs" condition
    item.outflows && item.outflows.length > 0
        ? item.outflows.map(out => `${(out.type === 'WIP_OUT' || out.type === 'WIP') ? 'WIP-OUT' : out.type || 'OUT'} | Qty: ${out.qty || 0} | ${out.label || ''} | ${out.date || ''}`).join('\n')
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
                        doc.addImage('/cropped_circle_image.png', 'PNG', centerX - (logoWidth / 2), centerY - (logoHeight / 2), logoWidth, logoHeight);
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

                            const cleanLine = line.trim();

                            // PDF Marker Colors aligning with requirements:
                            if (/^WIP-IN\b|^WIP_IN\b|^WIP_RET\b/i.test(cleanLine)) {
                                doc.setLineWidth(1.8);
                                doc.setDrawColor(217, 119, 6); // Yellow/Amber for WIP-IN
                                doc.line(data.cell.x + 0.5, lineYStart, data.cell.x + 0.5, safeYEnd);
                            } else if (/^WIP-OUT\b|^WIP_OUT\b|^WIP\b/i.test(cleanLine)) {
                                doc.setLineWidth(1.8);
                                doc.setDrawColor(249, 115, 22); // Orange for WIP-OUT
                                doc.line(data.cell.x + 0.5, lineYStart, data.cell.x + 0.5, safeYEnd);
                            } else if (/^IN\b/i.test(cleanLine)) {
                                doc.setLineWidth(1.8);
                                doc.setDrawColor(16, 185, 129); // Green for IN
                                doc.line(data.cell.x + 0.5, lineYStart, data.cell.x + 0.5, safeYEnd);
                            } else if (/^RESERVE\b/i.test(cleanLine)) {
                                doc.setLineWidth(1.8);
                                doc.setDrawColor(168, 85, 247); // Purple for RESERVE
                                doc.line(data.cell.x + 0.5, lineYStart, data.cell.x + 0.5, safeYEnd);
                            } else if (/^OUT\b/i.test(cleanLine)) {
                                doc.setLineWidth(1.8);
                                doc.setDrawColor(239, 68, 68); // Red for OUT
                                doc.line(data.cell.x + 0.5, lineYStart, data.cell.x + 0.5, safeYEnd);
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
        <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative">
            <PageHeader activeTab="reports" />

            {/* MAIN CARD CONTAINER CONTAINER */}
            <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
                
                {/* FILTER CONTROLS MASTER ROW */}
                <div className="flex flex-col gap-1.5">
                    
                    {/* TOP BAR: Title at Module Selector */}
                    <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 flex-shrink-0">
                            <Filter className="w-4 h-4 text-[#18174e]" />
                            <span>Filter Reports Ledger</span>
                        </div>

                        {/* CONTROLS BAR: Module Switcher Tab Buttons */}
                        <div className="flex items-center gap-2 ml-auto">
                            {reportModules.map(mod => {
                                const IconComp = mod.icon;
                                const isActive = activeModule === mod.id;
                                return (
                                    <button
                                        key={mod.id}
                                        onClick={() => setActiveModule(mod.id)}
                                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm ${
                                            isActive
                                                ? 'bg-[#18174e] text-white border-[#18174e] hover:bg-[#18174e]/90'
                                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        <IconComp className="w-3.5 h-3.5" />
                                        <span>{mod.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* INTERACTIVE FILTERS GRID ROW */}
                    <div className="flex overflow-x-auto gap-2 items-center mt-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-5 md:pb-0">
                        {/* Month Filter */}
                        <div className="min-w-[140px] w-full md:min-w-0">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full"
                            >
                                {monthsList.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Year Filter */}
                        <div className="min-w-[110px] w-full md:min-w-0">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full"
                            >
                                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(yr => (
                                    <option key={yr} value={yr}>{yr}</option>
                                ))}
                            </select>
                        </div>

                        {/* View aggregation Mode */}
                        <div className="min-w-[150px] w-full md:min-w-0">
                            <select
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value)}
                                className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full font-medium"
                            >
                                <option value="detailed">🔵 Detailed Inventory</option>
                                <option value="category">🟠 Group By Category</option>
                                <option value="segment">🟣 Group By Segment</option>
                            </select>
                        </div>

                        {/* Search Input Box */}
                        <div className="min-w-[180px] w-full md:min-w-0 md:col-span-2">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search specific record details..."
                                    value={globalSearch}
                                    onChange={(e) => setGlobalSearch(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* EXTRA OPTION ROW: Hide Zero Checkbox & PDF Action Export */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1 gap-2 flex-wrap">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 cursor-pointer select-none bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-all flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={hideZeroQty}
                                onChange={(e) => setHideZeroQty(e.target.checked)}
                                className="w-3.5 h-3.5 accent-[#18174e] rounded cursor-pointer"
                            />
                            <span>Hide 0 Quantity Items</span>
                        </label>

                        <button
                            onClick={handleDownloadPDF}
                            disabled={loading}
                            className="flex items-center gap-1.5 text-xs font-bold bg-[#18174e] text-white hover:bg-[#18174e]/90 transition-all cursor-pointer shadow-md rounded-lg px-4 py-2 disabled:opacity-50 ml-auto"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export Audit Ledger (PDF)</span>
                        </button>
                    </div>

                </div>

                {/* LOG DATA DISPATCH CONTAINER TABLE */}
                <div className="w-full">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="flex flex-col justify-center items-center min-h-[80vh] text-slate-400 gap-3">
                                <Loader2 className="w-10 h-10 animate-spin text-green-700" />
                                <span className="text-center text-green-700 font-medium italic">Compiling system transaction schemas...</span>
                            </div>
                        ) : activeModule === 'discrepancy' ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="text-white font-bold bg-rose-800 uppercase text-xs">
                                            <th className="py-3 px-4 whitespace-nowrap">Slip No</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Type</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Customer / Party</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Date Voided</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Voided By</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Discrepancy / Void Reason</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Restored Items & Quantities</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100 text-slate-700">
                                        {getDiscrepancyLogs().length > 0 ? (
                                            getDiscrepancyLogs().map((log) => (
                                                <tr key={log._id} className="hover:bg-rose-50/40 transition-colors">
                                                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold text-rose-900 font-mono">
                                                        {log.slipNo}
                                                    </td>
                                                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-700">
                                                        {log.transactionType}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                                                        {log.customer}
                                                    </td>
                                                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono text-slate-500">
                                                        {log.voidedAt}
                                                    </td>
                                                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold text-slate-700">
                                                        {log.voidedBy}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs italic text-rose-700 font-medium max-w-[200px]">
                                                        {log.voidReason}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs text-emerald-700 font-semibold max-w-[250px]">
                                                        {log.itemsRestored}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="text-center p-8 text-slate-400 font-medium italic">
                                                    No voided or discrepancy transaction logs recorded.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : consolidatedData.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="text-white font-bold bg-[#18174e] uppercase text-sm">
                                            <th className="py-3 px-4 whitespace-nowrap">Code</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Item Profile</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Category / Seg</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Dimension</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Qty</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Inflows (This Month)</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Outflows (This Month)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-100 text-slate-700">
                                        {consolidatedData.map((row) => (
                                            <tr key={row._id} className="hover:bg-slate-50/80 transition-colors">
                                                {/* Code column */}
                                                <td className="px-4 py-3.5 whitespace-nowrap text-xs font-bold text-slate-900 font-mono truncate">
                                                    {row.Code}
                                                </td>

                                                {/* Description column */}
                                                <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                                                    <div className="line-clamp-2 leading-relaxed">{row.ItemDescription}</div>
                                                </td>

                                                {/* Category/Segment column */}
                                                <td className="px-4 py-3.5 text-xs text-slate-500">
                                                    <div className="font-semibold text-slate-700 truncate">{row.Category}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono truncate">Seg: {row.Segment}</div>
                                                </td>

                                                {/* Dimension column */}
                                                <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500 truncate">
                                                    {row.Dimension}
                                                </td>

                                                {/* Quantity column */}
                                                <td className="px-4 py-3.5 whitespace-nowrap text-center text-xs font-bold">
                                                    <span className="text-slate-900 font-mono">{row.ActualCount}</span>
                                                    <span className="text-[10px] text-slate-400 font-normal ml-1">{row.UOM}</span>
                                                </td>

                                                {/* Inflows column */}
                                                <td className="px-4 py-3.5 text-xs">
                                                    <div className="max-h-[100px] overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                                                        {row.inflows && row.inflows.length > 0 ? (
                                                            row.inflows.map((inf, idx) => {
                                                                const isWip = inf.type === 'WIP_IN' || inf.type === 'WIP_RET';
                                                                const typeTag = inf.type === 'WIP_IN' ? 'WIP-IN' : inf.type === 'WIP_RET' ? 'WIP-RET' : 'IN';
                                                                return (
                                                                    <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium leading-tight border ${
                                                                        isWip
                                                                            ? 'bg-amber-50 border-amber-200/80 text-amber-900'
                                                                            : 'bg-emerald-50/60 border-emerald-100/70 text-emerald-800'
                                                                    }`}>
                                                                        <span className={`font-bold font-mono ${isWip ? 'text-amber-700' : 'text-emerald-700'}`}>
                                                                            {typeTag}: +{inf.qty}
                                                                        </span>
                                                                        <span className="text-slate-400">|</span>
                                                                        <span className="text-slate-600 truncate flex-1 max-w-[100px]">{inf.label}</span>
                                                                        <span className="text-slate-400">|</span>
                                                                        <span className="text-slate-500 font-mono">{inf.date}</span>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 italic px-1">No inflows</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Outflows column */}
                                                <td className="px-4 py-3.5 text-xs">
                                                    <div className="max-h-[100px] overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                                                        {row.outflows && row.outflows.length > 0 ? (
                                                            row.outflows.map((out, idx) => {
                                                                const isWip = out.type === 'WIP_OUT' || out.type === 'WIP';
                                                                const isReserve = out.type === 'RESERVE';
                                                                const typeTag = isWip ? 'WIP-OUT' : isReserve ? 'RESERVE' : 'OUT';
                                                                return (
                                                                    <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium leading-tight border ${
                                                                        isWip
                                                                            ? 'bg-orange-50 border-orange-200/80 text-orange-900'
                                                                            : isReserve
                                                                            ? 'bg-purple-50 border-purple-100/70 text-purple-800'
                                                                            : 'bg-rose-50/60 border-rose-100/70 text-rose-800'
                                                                    }`}>
                                                                        <span className={`font-bold font-mono ${isWip ? 'text-orange-700' : isReserve ? 'text-purple-700' : 'text-rose-700'}`}>
                                                                            {typeTag}: -{out.qty}
                                                                        </span>
                                                                        <span className="text-slate-400">|</span>
                                                                        <span className="text-slate-600 truncate flex-1 max-w-[100px]">{out.label}</span>
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
                            <div className="text-center p-12 text-slate-400 font-medium italic">No records match the selected filters.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Reports;