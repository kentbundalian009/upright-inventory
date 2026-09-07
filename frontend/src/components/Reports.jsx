import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Layers, ShoppingCart, ShieldAlert,
    Search, Download, Loader2, Filter, FileText
} from 'lucide-react';
import PageHeader from './PageHeader';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from '../context/ThemeContext';

const BASE_API_URL = import.meta.env.MODE === 'production'
    ? 'https://one-inventory.onrender.com/api'
    : 'http://localhost:5000/api';

function Reports() {
    const { isDark } = useTheme();
    const [activeModule, setActiveModule] = useState('raw-materials');
    const [globalSearch, setGlobalSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear.toString());
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));

    const [viewMode, setViewMode] = useState('detailed');
    const [hideZeroQty, setHideZeroQty] = useState(false);

    const [rawMaterialsData, setRawMaterialsData] = useState([]);
    const [suppliesData, setSuppliesData] = useState([]);

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

    const getConsolidatedSummary = () => {
        let masterList = [];
        let targetInventory = [];

        if (activeModule === 'raw-materials') {
            targetInventory = rawMaterialsData.filter(item => !item.isArchived);
        } else {
            targetInventory = suppliesData.filter(item => !item.isArchived);
        }

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

            if (activeModule === 'raw-materials') {
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

                wipConversions.forEach(wip => {
                    const txDate = wip.conversionDate || wip.dateProcessed || wip.createdAt;
                    if (matchDate(txDate)) {
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
            } else if (activeModule === 'supplies') {
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
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
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
                item.inflows && item.inflows.length > 0
                    ? item.inflows.map(inf => `${inf.type === 'WIP_IN' ? 'WIP-IN' : inf.type === 'WIP_RET' ? 'WIP-RET' : 'IN'} | Qty: ${inf.qty || 0} | ${inf.label || ''} | ${inf.date || ''}`).join('\n')
                    : 'No logs recorded',
                item.outflows && item.outflows.length > 0
                    ? item.outflows.map(out => `${(out.type === 'WIP_OUT' || out.type === 'WIP') ? 'WIP-OUT' : out.type || 'OUT'} | Qty: ${out.qty || 0} | ${out.label || ''} | ${out.date || ''}`).join('\n')
                    : 'No logs recorded'
            ]);

            autoTable(doc, {
                startY: 58,
                margin: { top: 38, bottom: 20, left: 14, right: 14 },
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

                            if (/^WIP-IN\b|^WIP_IN\b|^WIP_RET\b/i.test(cleanLine)) {
                                doc.setLineWidth(1.8);
                                doc.setDrawColor(217, 119, 6);
                                doc.line(data.cell.x + 0.5, lineYStart, data.cell.x + 0.5, safeYEnd);
                            } else if (/^WIP-OUT\b|^WIP_OUT\b|^WIP\b/i.test(cleanLine)) {
                                doc.setLineWidth(1.8);
                                doc.setDrawColor(249, 115, 22);
                                doc.line(data.cell.x + 0.5, lineYStart, data.cell.x + 0.5, safeYEnd);
                            } else if (/^IN\b/i.test(cleanLine)) {
                                doc.setLineWidth(1.8);
                                doc.setDrawColor(16, 185, 129);
                                doc.line(data.cell.x + 0.5, lineYStart, data.cell.x + 0.5, safeYEnd);
                            } else if (/^RESERVE\b/i.test(cleanLine)) {
                                doc.setLineWidth(1.8);
                                doc.setDrawColor(168, 85, 247);
                                doc.line(data.cell.x + 0.5, lineYStart, data.cell.x + 0.5, safeYEnd);
                            } else if (/^OUT\b/i.test(cleanLine)) {
                                doc.setLineWidth(1.8);
                                doc.setDrawColor(239, 68, 68);
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

    const handleDownloadMonthlySummaryPDF = () => {
        const targetMonthLabel = monthsList?.find(m => m.value === selectedMonth)?.label || selectedMonth;
        const currentYearStr = selectedYear || new Date().getFullYear().toString();
        const formattedDate = new Date().toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        const matchSelectedDate = (dateStr) => {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return false;
            return d.getFullYear().toString() === currentYearStr &&
                (d.getMonth() + 1).toString().padStart(2, '0') === selectedMonth;
        };

        const formatShortDate = (dateStr) => {
            if (!dateStr) return '—';
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        };

        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const pageWidth = 297;
            const pageHeight = 210;
            const centerX = pageWidth / 2;
            const centerY = pageHeight / 2;

            if (activeModule === 'raw-materials') {
                // Filter Inbound (Purchase Orders)
                const monthPOs = purchaseOrders.filter(po => matchSelectedDate(po.deliveryDate || po.createdAt || po.date));
                // Filter WIP Conversions
                const monthWIP = wipConversions.filter(wip => matchSelectedDate(wip.conversionDate || wip.dateProcessed || wip.createdAt));
                // Filter Outbound (Packing Lists)
                const monthPLs = packingLists.filter(pl => !pl.isVoided && matchSelectedDate(pl.shipmentDate || pl.createdAt));

                if (monthPOs.length === 0 && monthWIP.length === 0 && monthPLs.length === 0) {
                    alert(`No Rackings activities (Inbound, WIP, or Outbound) logged for ${targetMonthLabel} ${currentYearStr}.`);
                    return;
                }

                // Compute KPI metrics
                const totalInboundQty = monthPOs.reduce((acc, po) => {
                    const poTotal = (po.items || []).reduce((sum, it) => sum + (it.actualCountReceived ?? it.qty ?? 0), 0);
                    return acc + poTotal;
                }, 0);

                let totalConsumedQty = 0;
                let totalProducedQty = 0;
                monthWIP.forEach(w => {
                    totalConsumedQty += (w.inputs || []).reduce((s, it) => s + (it.qtyUsed || 0), 0);
                    totalProducedQty += (w.outputs || []).reduce((s, it) => s + (it.qtyProduced || 0), 0);
                });

                const totalOutboundQty = monthPLs.reduce((acc, pl) => {
                    const plTotal = (pl.items || []).reduce((sum, it) => {
                        return sum + (pl.transactionType === "Outbound" ? (it.actualCountShipped || 0) : (it.qtyRequested || 0));
                    }, 0);
                    return acc + plTotal;
                }, 0);

                let currentY = 38;

                // KPI Header Table
                const kpiRows = [[
                    `INBOUND POs: ${monthPOs.length} Deliveries\nTotal Received: ${totalInboundQty.toLocaleString()} Units`,
                    `WIP CONVERSIONS: ${monthWIP.length} Batches\nConsumed: ${totalConsumedQty.toLocaleString()} | Yield: ${totalProducedQty.toLocaleString()} Units`,
                    `OUTBOUND SHIPMENTS: ${monthPLs.length} Dispatches\nTotal Shipped/Reserved: ${totalOutboundQty.toLocaleString()} Units`
                ]];

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [["1. INBOUND DELIVERIES OVERVIEW", "2. WIP PRODUCTION & CONVERSIONS", "3. OUTBOUND & LOGISTICS OVERVIEW"]],
                    body: kpiRows,
                    theme: 'plain',
                    headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, halign: 'center', cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 } },
                    bodyStyles: { fontSize: 8, fontStyle: 'bold', textColor: [40, 40, 40], fillColor: [245, 247, 250], halign: 'center', cellPadding: { top: 3.5, bottom: 3.5, left: 2.5, right: 2.5 } }
                });

                currentY = doc.lastAutoTable.finalY + 10;
                if (currentY + 45 > pageHeight - 20) {
                    doc.addPage();
                    currentY = 38;
                }

                // --- SECTION 1: INBOUND DELIVERIES ---
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(24, 23, 78);
                doc.text(`A. INBOUND DELIVERIES & PURCHASE ORDERS (${monthPOs.length} Records)`, 14, currentY);
                currentY += 4;

                const poColumns = ["Date", "PO Number", "Supplier", "Items Received Details", "Total Qty", "Received By"];
                const poRows = monthPOs.length > 0
                    ? monthPOs.map(po => {
                        const itemsStr = (po.items || []).map(it => {
                            const code = it.materialId?.Code || it.Code || 'Item';
                            const desc = it.materialId?.ItemDescription || it.ItemDescription || '';
                            const count = it.actualCountReceived ?? it.qty ?? 0;
                            const uom = it.materialId?.UOM || it.UOM || 'PCS';
                            return `• ${code}${desc ? ` - ${desc}` : ''} (${count} ${uom})`;
                        }).join('\n') || 'No items listed';

                        const totalQty = (po.items || []).reduce((sum, it) => sum + (it.actualCountReceived ?? it.qty ?? 0), 0);

                        return [
                            formatShortDate(po.deliveryDate || po.createdAt || po.date),
                            po.poNo || po.poNumber || 'N/A',
                            po.supplier || 'N/A',
                            itemsStr,
                            totalQty.toLocaleString(),
                            po.preparedBy || 'System User'
                        ];
                    })
                    : [["—", "—", "—", `No Inbound deliveries recorded for ${targetMonthLabel} ${currentYearStr}`, "0", "—"]];

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [poColumns],
                    body: poRows,
                    theme: 'grid',
                    headStyles: { fillColor: [16, 110, 60], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 } },
                    bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 } },
                    columnStyles: {
                        0: { cellWidth: 26 },
                        1: { cellWidth: 32 },
                        2: { cellWidth: 45 },
                        3: { cellWidth: 110 },
                        4: { cellWidth: 24, halign: 'right' },
                        5: { cellWidth: 32 }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 10;
                if (currentY + 45 > pageHeight - 20) {
                    doc.addPage();
                    currentY = 38;
                }

                // --- SECTION 2: WIP CONVERSIONS ---
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(24, 23, 78);
                doc.text(`B. WORK-IN-PROGRESS (WIP CONVERSIONS & PRODUCTION) (${monthWIP.length} Records)`, 14, currentY);
                currentY += 4;

                const wipColumns = ["Date", "WIP / Job No", "Production Type", "Materials Consumed (Input)", "Yield Produced (Output)", "Returned Items", "Processed By"];
                const wipRows = monthWIP.length > 0
                    ? monthWIP.map(wip => {
                        const consumedStr = (wip.inputs || []).map(it => {
                            const code = it.materialId?.Code || 'Item';
                            const desc = it.materialId?.ItemDescription || '';
                            const qty = it.qtyUsed || 0;
                            const uom = it.materialId?.UOM || 'PCS';
                            return `• ${code}${desc ? ` - ${desc}` : ''} (${qty} ${uom})`;
                        }).join('\n') || 'None';

                        const producedStr = (wip.outputs || []).map(it => {
                            const code = it.itemId?.Code || it.Code || 'Item';
                            const desc = it.itemId?.ItemDescription || it.ItemDescription || '';
                            const qty = it.qtyProduced || 0;
                            const uom = it.itemId?.UOM || it.UOM || 'PCS';
                            return `• ${code}${desc ? ` - ${desc}` : ''} (${qty} ${uom})`;
                        }).join('\n') || 'None';

                        const returnedStr = (wip.materialsReturned || []).map(it => {
                            const code = it.materialId?.Code || 'Item';
                            const qty = it.qtyReturned || 0;
                            const uom = it.materialId?.UOM || 'PCS';
                            return `• ${code} (${qty} ${uom})`;
                        }).join('\n') || 'None';

                        return [
                            formatShortDate(wip.conversionDate || wip.dateProcessed || wip.createdAt),
                            wip.conversionNo || 'N/A',
                            wip.productionType || 'Standard Cutting',
                            consumedStr,
                            producedStr,
                            returnedStr,
                            wip.preparedBy || 'System User'
                        ];
                    })
                    : [["—", "—", "—", `No WIP conversions recorded for ${targetMonthLabel} ${currentYearStr}`, "—", "—", "—"]];

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [wipColumns],
                    body: wipRows,
                    theme: 'grid',
                    headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 } },
                    bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 } },
                    columnStyles: {
                        0: { cellWidth: 26 },
                        1: { cellWidth: 32 },
                        2: { cellWidth: 35 },
                        3: { cellWidth: 62 },
                        4: { cellWidth: 62 },
                        5: { cellWidth: 26 },
                        6: { cellWidth: 26 }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 10;
                if (currentY + 45 > pageHeight - 20) {
                    doc.addPage();
                    currentY = 38;
                }

                // --- SECTION 3: OUTBOUND SHIPMENTS & RESERVES ---
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(24, 23, 78);
                doc.text(`C. OUTBOUND SHIPMENTS & RESERVATIONS (${monthPLs.length} Records)`, 14, currentY);
                currentY += 4;

                const plColumns = ["Date", "PL Number", "Type", "Customer / Destination", "Dispatched Items Details", "Total Qty", "Carrier / Ref", "Handled By"];
                const plRows = monthPLs.length > 0
                    ? monthPLs.map(pl => {
                        const itemsStr = (pl.items || []).map(it => {
                            const code = it.materialId?.Code || 'Item';
                            const desc = it.materialId?.ItemDescription || '';
                            const count = pl.transactionType === "Outbound" ? (it.actualCountShipped || 0) : (it.qtyRequested || 0);
                            const uom = it.materialId?.UOM || 'PCS';
                            return `• ${code}${desc ? ` - ${desc}` : ''} (${count} ${uom})`;
                        }).join('\n') || 'No items listed';

                        const totalQty = (pl.items || []).reduce((sum, it) => {
                            return sum + (pl.transactionType === "Outbound" ? (it.actualCountShipped || 0) : (it.qtyRequested || 0));
                        }, 0);

                        return [
                            formatShortDate(pl.shipmentDate || pl.createdAt),
                            pl.plNo || 'N/A',
                            pl.transactionType || 'Outbound',
                            `${pl.customer || 'N/A'}${pl.destinationAddress ? `\n(${pl.destinationAddress})` : ''}`,
                            itemsStr,
                            totalQty.toLocaleString(),
                            `${pl.carrier || ''}${pl.referencePlNo ? `\nRef: ${pl.referencePlNo}` : ''}` || '—',
                            pl.preparedBy || 'System User'
                        ];
                    })
                    : [["—", "—", "—", "—", `No Outbound records found for ${targetMonthLabel} ${currentYearStr}`, "0", "—", "—"]];

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [plColumns],
                    body: plRows,
                    theme: 'grid',
                    headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 } },
                    bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 } },
                    columnStyles: {
                        0: { cellWidth: 26 },
                        1: { cellWidth: 32 },
                        2: { cellWidth: 22 },
                        3: { cellWidth: 46 },
                        4: { cellWidth: 84 },
                        5: { cellWidth: 20, halign: 'right' },
                        6: { cellWidth: 20 },
                        7: { cellWidth: 19 }
                    }
                });

            } else if (activeModule === 'supplies') {
                // SUPPLIES MOVEMENTS
                const monthSlips = suppliesMovements.filter(slip => matchSelectedDate(slip.transactionDate || slip.createdAt || slip.date));

                if (monthSlips.length === 0) {
                    alert(`No supplies movement records logged for ${targetMonthLabel} ${currentYearStr}.`);
                    return;
                }

                // Supplies KPI counters
                let restockUnits = 0;
                let issuedUnits = 0;
                let returnUnits = 0;
                let damagedUnits = 0;

                monthSlips.forEach(slip => {
                    const slipQty = (slip.items || []).reduce((s, it) => s + (it.qty || 0), 0);
                    const slipDamaged = (slip.items || []).reduce((s, it) => s + (it.damagedQty || 0), 0);
                    damagedUnits += slipDamaged;

                    if (['Restock', 'Inbound'].includes(slip.transactionType)) {
                        restockUnits += slipQty;
                    } else if (['Borrow', 'Out', 'Reserved', 'Scrap', 'Return to Vendor'].includes(slip.transactionType)) {
                        issuedUnits += slipQty;
                    } else if (['Return'].includes(slip.transactionType)) {
                        returnUnits += slipQty;
                    }
                });

                let currentY = 38;

                // KPI Header Table
                const kpiRows = [[
                    `TOTAL MOVEMENTS: ${monthSlips.length} Slips`,
                    `RESTOCKED / INBOUND: ${restockUnits.toLocaleString()} Units`,
                    `ISSUED / BORROW / OUT: ${issuedUnits.toLocaleString()} Units`,
                    `RETURNS: ${returnUnits.toLocaleString()} | DAMAGED/SCRAP: ${damagedUnits.toLocaleString()}`
                ]];

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [["ACTIVITY OVERVIEW", "STOCK ADDITIONS", "STOCK DISPATCHES", "RETURNS & QUALITY CONTROL"]],
                    body: kpiRows,
                    theme: 'plain',
                    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, halign: 'center', cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 } },
                    bodyStyles: { fontSize: 8, fontStyle: 'bold', textColor: [40, 40, 40], fillColor: [245, 247, 250], halign: 'center', cellPadding: { top: 3.5, bottom: 3.5, left: 2.5, right: 2.5 } }
                });

                currentY = doc.lastAutoTable.finalY + 10;
                if (currentY + 45 > pageHeight - 20) {
                    doc.addPage();
                    currentY = 38;
                }

                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(24, 23, 78);
                doc.text(`SUPPLIES MOVEMENT & ISSUANCES REGISTRY (${monthSlips.length} Records)`, 14, currentY);
                currentY += 4;

                const slipColumns = ["Date", "Slip No", "Type", "Party / Department / Recipient", "Items & Quantity Details", "Total Qty", "Reference / Notes", "Handled By"];
                const slipRows = monthSlips.map(slip => {
                    const itemsStr = (slip.items || []).map(it => {
                        const code = it.supplyId?.Code || 'Item';
                        const desc = it.supplyId?.ItemDescription || '';
                        const qty = it.qty || 0;
                        const uom = it.supplyId?.UOM || 'PCS';
                        const dmg = it.damagedQty > 0 ? ` [Dmg: ${it.damagedQty}]` : '';
                        const rmk = it.remarks ? ` - ${it.remarks}` : '';
                        return `• ${code}${desc ? ` (${desc})` : ''}: ${qty} ${uom}${dmg}${rmk}`;
                    }).join('\n') || 'No items listed';

                    const totalQty = (slip.items || []).reduce((s, it) => s + (it.qty || 0), 0);

                    return [
                        formatShortDate(slip.transactionDate || slip.createdAt),
                        slip.slipNo || 'N/A',
                        slip.transactionType || 'Movement',
                        slip.partyName || slip.originAddress || 'N/A',
                        itemsStr,
                        totalQty.toLocaleString(),
                        `${slip.referenceSlipNo ? `Ref: ${slip.referenceSlipNo}\n` : ''}${slip.isReturned ? 'Status: Returned' : ''}` || '—',
                        slip.preparedBy || 'System User'
                    ];
                });

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [slipColumns],
                    body: slipRows,
                    theme: 'grid',
                    headStyles: { fillColor: [40, 50, 90], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 } },
                    bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 } },
                    columnStyles: {
                        0: { cellWidth: 26 },
                        1: { cellWidth: 32 },
                        2: { cellWidth: 25 },
                        3: { cellWidth: 48 },
                        4: { cellWidth: 85 },
                        5: { cellWidth: 20, halign: 'right' },
                        6: { cellWidth: 20 },
                        7: { cellWidth: 13 }
                    }
                });

            } else {
                // Discrepancy
                const logs = getDiscrepancyLogs();
                if (!logs || logs.length === 0) {
                    alert("No discrepancy logs available to export for this month.");
                    return;
                }

                let currentY = 38;
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10.5);
                doc.setTextColor(225, 29, 72);
                doc.text(`DISCREPANCY & VOIDED AUDIT REGISTRY (${logs.length} Records)`, 14, currentY);
                currentY += 4;

                const columns = ["Slip No", "Type", "Customer / Recipient", "Date Voided", "Voided By", "Discrepancy / Void Reason", "Restored Items & Quantities"];
                const rows = logs.map(l => [
                    l.slipNo, l.transactionType, l.customer, l.voidedAt, l.voidedBy, l.voidReason, l.itemsRestored
                ]);

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [columns],
                    body: rows,
                    theme: 'grid',
                    headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 } },
                    bodyStyles: { fontSize: 7.5, textColor: [60, 60, 60], cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 } }
                });
            }

            // --- DECORATE ALL PAGES (Banner, Watermark, Footer) ---
            const totalPages = doc.internal.getNumberOfPages();
            const reportTitle = activeModule === 'raw-materials'
                ? "RACKINGS MONTHLY MOVEMENT & TRANSACTION ACTIVITY REPORT"
                : activeModule === 'supplies'
                    ? "SUPPLIES MOVEMENTS & ISSUANCES MONTHLY SUMMARY REPORT"
                    : "DISCREPANCY & VOIDED TRANSACTION LOGS REPORT";

            const bannerColor = activeModule === 'raw-materials'
                ? [24, 23, 78]
                : activeModule === 'supplies'
                    ? [30, 41, 59]
                    : [225, 29, 72];

            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);

                // Watermark in background
                try {
                    doc.saveGraphicsState();
                    doc.setGState(new doc.GState({ opacity: 0.04 }));
                    const logoWidth = 80;
                    const logoHeight = 80;
                    doc.addImage('/cropped_circle_image.png', 'PNG', centerX - (logoWidth / 2), centerY - (logoHeight / 2), logoWidth, logoHeight);
                    doc.restoreGraphicsState();
                } catch (e) {}

                // Top Header Banner
                doc.setFillColor(...bannerColor);
                doc.rect(0, 0, pageWidth, 28, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(13);
                doc.text(reportTitle, centerX, 11, { align: 'center' });

                doc.setFontSize(8.5);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(220, 225, 245);
                doc.text(`Covered Period: ${targetMonthLabel} ${currentYearStr}   |   Generated: ${formattedDate}   |   System: Upright Storage Solutions`, centerX, 19, { align: 'center' });

                // Footer
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(120, 120, 120);
                doc.text("CONFIDENTIAL - SYSTEM CENTRAL AUDIT LEDGER - FOR AUTHORIZED MANAGEMENT USE ONLY", 14, pageHeight - 8);

                const pageNumber = `Page ${i} of ${totalPages}`;
                doc.text(pageNumber, pageWidth - 14, pageHeight - 8, { align: 'right' });
            }

            const prefix = activeModule === 'raw-materials' ? 'RACKINGS_MONTHLY_SUMMARY' : activeModule === 'supplies' ? 'SUPPLIES_MONTHLY_SUMMARY' : 'DISCREPANCY_MONTHLY_SUMMARY';
            doc.save(`${prefix}_${targetMonthLabel.toUpperCase()}_${currentYearStr}.pdf`);

        } catch (e) {
            console.error("Error generating monthly summary PDF:", e);
            alert("Failed to export Monthly Summary PDF report. Please try again.");
        }
    };

    return (
        <div className={`mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
            <PageHeader activeTab="reports" />

            <div className={`w-full border rounded-2xl p-6 shadow-sm flex flex-col gap-6 ${
                isDark ? 'bg-[#0e1017] border-slate-800' : 'bg-white border-slate-100'
            }`}>
                
                <div className="flex flex-col gap-1.5">
                    
                    <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                        <div className={`flex items-center gap-2 text-sm font-semibold flex-shrink-0 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                            <Filter className={`w-4 h-4 ${isDark ? 'text-[#ff6600]' : 'text-[#18174e]'}`} />
                            <span>Filter Reports Ledger</span>
                        </div>

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
                                                ? (isDark ? 'bg-[#ff6600] text-white border-[#ff6600] hover:bg-[#e05a00]' : 'bg-[#18174e] text-white border-[#18174e] hover:bg-[#18174e]/90')
                                                : (isDark ? 'bg-[#141622] text-slate-300 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                                        }`}
                                    >
                                        <IconComp className="w-3.5 h-3.5" />
                                        <span>{mod.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex overflow-x-auto gap-2 items-center mt-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-5 md:pb-0">
                        <div className="min-w-[140px] w-full md:min-w-0">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full transition-colors ${
                                    isDark
                                        ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]'
                                        : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'
                                }`}
                            >
                                {monthsList.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="min-w-[110px] w-full md:min-w-0">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full transition-colors ${
                                    isDark
                                        ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]'
                                        : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'
                                }`}
                            >
                                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(yr => (
                                    <option key={yr} value={yr}>{yr}</option>
                                ))}
                            </select>
                        </div>

                        <div className="min-w-[150px] w-full md:min-w-0">
                            <select
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value)}
                                className={`border rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full font-medium transition-colors ${
                                    isDark
                                        ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]'
                                        : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'
                                }`}
                            >
                                <option value="detailed">🔵 Detailed Inventory</option>
                                <option value="category">🟠 Group By Category</option>
                                <option value="segment">🟣 Group By Segment</option>
                            </select>
                        </div>

                        <div className="min-w-[180px] w-full md:min-w-0 md:col-span-2">
                            <div className="relative w-full">
                                <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                                <input
                                    type="text"
                                    placeholder="Search specific record details..."
                                    value={globalSearch}
                                    onChange={(e) => setGlobalSearch(e.target.value)}
                                    className={`pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none w-full transition-colors ${
                                        isDark
                                            ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]'
                                            : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'
                                    }`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className={`flex items-center justify-between border-t pt-3 mt-1 gap-2 flex-wrap ${
                        isDark ? 'border-slate-800' : 'border-slate-100'
                    }`}>
                        <label className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none border px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 ${
                            isDark
                                ? 'bg-[#141622] border-slate-700 text-slate-300 hover:bg-slate-800'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}>
                            <input
                                type="checkbox"
                                checked={hideZeroQty}
                                onChange={(e) => setHideZeroQty(e.target.checked)}
                                className={`w-3.5 h-3.5 rounded cursor-pointer ${isDark ? 'accent-[#ff6600]' : 'accent-[#18174e]'}`}
                            />
                            <span>Hide 0 Quantity Items</span>
                        </label>

                        <div className="flex items-center gap-2 ml-auto flex-wrap">
                            <button
                                onClick={handleDownloadMonthlySummaryPDF}
                                disabled={loading}
                                title={`Export Monthly Summary Activity Report for ${monthsList.find(m => m.value === selectedMonth)?.label} ${selectedYear}`}
                                className={`flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-md rounded-lg px-3.5 py-2 disabled:opacity-50 ${
                                    isDark
                                        ? 'bg-[#1e2238] border border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/40 hover:text-white'
                                        : 'bg-indigo-700 hover:bg-indigo-800 text-white'
                                }`}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Monthly Summary (PDF)</span>
                            </button>

                            <button
                                onClick={handleDownloadPDF}
                                disabled={loading}
                                className={`flex items-center gap-1.5 text-xs font-bold text-white transition-all cursor-pointer shadow-md rounded-lg px-4 py-2 disabled:opacity-50 ${
                                    isDark ? 'bg-[#ff6600] hover:bg-[#e05a00]' : 'bg-[#18174e] hover:bg-[#18174e]/90'
                                }`}
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Export Audit Ledger (PDF)</span>
                            </button>
                        </div>
                    </div>

                </div>

                <div className="w-full">
                    <div className={`rounded-xl border shadow-sm overflow-hidden ${
                        isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'
                    }`}>
                        {loading ? (
                            <div className="flex flex-col justify-center items-center min-h-[400px] text-slate-400 gap-3">
                                <Loader2 className={`w-10 h-10 animate-spin ${isDark ? 'text-[#ff6600]' : 'text-green-700'}`} />
                                <span className={`text-center font-medium italic ${isDark ? 'text-slate-400' : 'text-green-700'}`}>Compiling system transaction schemas...</span>
                            </div>
                        ) : activeModule === 'discrepancy' ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="text-white font-bold bg-rose-900/80 uppercase text-xs">
                                            <th className="py-3 px-4 whitespace-nowrap">Slip No</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Type</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Customer / Party</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Date Voided</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Voided By</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Discrepancy / Void Reason</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Restored Items & Quantities</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y text-xs ${
                                        isDark ? 'divide-slate-800/60 bg-[#090b10] text-slate-300' : 'divide-slate-100 bg-white text-slate-700'
                                    }`}>
                                        {getDiscrepancyLogs().length > 0 ? (
                                            getDiscrepancyLogs().map((log) => (
                                                <tr key={log._id} className={`transition-colors ${isDark ? 'hover:bg-rose-950/20' : 'hover:bg-rose-50/40'}`}>
                                                    <td className={`px-4 py-3.5 whitespace-nowrap font-bold font-mono ${isDark ? 'text-rose-400' : 'text-rose-900'}`}>
                                                        {log.slipNo}
                                                    </td>
                                                    <td className="px-4 py-3.5 whitespace-nowrap font-semibold">
                                                        {log.transactionType}
                                                    </td>
                                                    <td className={`px-4 py-3.5 font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                        {log.customer}
                                                    </td>
                                                    <td className={`px-4 py-3.5 whitespace-nowrap font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {log.voidedAt}
                                                    </td>
                                                    <td className="px-4 py-3.5 whitespace-nowrap font-bold">
                                                        {log.voidedBy}
                                                    </td>
                                                    <td className={`px-4 py-3.5 italic font-medium max-w-[200px] ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                                                        {log.voidReason}
                                                    </td>
                                                    <td className={`px-4 py-3.5 font-semibold max-w-[250px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                                                        {log.itemsRestored}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="text-center p-8 text-slate-500 font-medium italic">
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
                                        <tr className={`font-bold uppercase text-xs whitespace-nowrap ${
                                            isDark ? 'bg-[#0f111d] text-slate-200' : 'bg-[#18174e] text-white'
                                        }`}>
                                            <th className="py-3 px-4 whitespace-nowrap">Code</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Item Profile</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Category / Seg</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Dimension</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Qty</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Inflows (This Month)</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Outflows (This Month)</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y text-xs ${
                                        isDark ? 'divide-slate-800/60 bg-[#090b10] text-slate-300' : 'divide-slate-100 bg-white text-slate-700'
                                    }`}>
                                        {consolidatedData.map((row) => (
                                            <tr key={row._id} className={`transition-colors ${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/80'}`}>
                                                <td className={`px-4 py-3.5 whitespace-nowrap font-bold font-mono truncate ${
                                                    isDark ? 'text-[#ff6600]' : 'text-slate-900'
                                                }`}>
                                                    {row.Code}
                                                </td>

                                                <td className={`px-4 py-3.5 font-medium ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
                                                    <div className="line-clamp-2 leading-relaxed">{row.ItemDescription}</div>
                                                </td>

                                                <td className="px-4 py-3.5">
                                                    <div className={`font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{row.Category}</div>
                                                    <div className={`text-[10px] font-mono truncate ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Seg: {row.Segment}</div>
                                                </td>

                                                <td className={`px-4 py-3.5 whitespace-nowrap truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {row.Dimension}
                                                </td>

                                                <td className="px-4 py-3.5 whitespace-nowrap text-center font-bold">
                                                    <span className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{row.ActualCount}</span>
                                                    <span className={`text-[10px] font-normal ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{row.UOM}</span>
                                                </td>

                                                <td className="px-4 py-3.5">
                                                    <div className="max-h-[100px] overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                                                        {row.inflows && row.inflows.length > 0 ? (
                                                            row.inflows.map((inf, idx) => {
                                                                const isWip = inf.type === 'WIP_IN' || inf.type === 'WIP_RET';
                                                                const typeTag = inf.type === 'WIP_IN' ? 'WIP-IN' : inf.type === 'WIP_RET' ? 'WIP-RET' : 'IN';
                                                                return (
                                                                    <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium leading-tight border ${
                                                                        isDark
                                                                            ? (isWip ? 'bg-amber-950/40 border-amber-800/60 text-amber-300' : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300')
                                                                            : (isWip ? 'bg-amber-50 border-amber-200/80 text-amber-900' : 'bg-emerald-50/60 border-emerald-100/70 text-emerald-800')
                                                                    }`}>
                                                                        <span className={`font-bold font-mono ${
                                                                            isDark
                                                                                ? (isWip ? 'text-amber-400' : 'text-emerald-400')
                                                                                : (isWip ? 'text-amber-700' : 'text-emerald-700')
                                                                        }`}>
                                                                            {typeTag}: +{inf.qty}
                                                                        </span>
                                                                        <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>|</span>
                                                                        <span className={`truncate flex-1 max-w-[100px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{inf.label}</span>
                                                                        <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>|</span>
                                                                        <span className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{inf.date}</span>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <span className="text-[10px] text-slate-500 italic px-1">No inflows</span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3.5">
                                                    <div className="max-h-[100px] overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                                                        {row.outflows && row.outflows.length > 0 ? (
                                                            row.outflows.map((out, idx) => {
                                                                const isWip = out.type === 'WIP_OUT' || out.type === 'WIP';
                                                                const isReserve = out.type === 'RESERVE';
                                                                const typeTag = isWip ? 'WIP-OUT' : isReserve ? 'RESERVE' : 'OUT';
                                                                return (
                                                                    <div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium leading-tight border ${
                                                                        isDark
                                                                            ? (isWip ? 'bg-orange-950/40 border-orange-800/60 text-orange-300' : isReserve ? 'bg-purple-950/40 border-purple-800/60 text-purple-300' : 'bg-rose-950/40 border-rose-800/60 text-rose-300')
                                                                            : (isWip ? 'bg-orange-50 border-orange-200/80 text-orange-900' : isReserve ? 'bg-purple-50 border-purple-100/70 text-purple-800' : 'bg-rose-50/60 border-rose-100/70 text-rose-800')
                                                                    }`}>
                                                                        <span className={`font-bold font-mono ${
                                                                            isDark
                                                                                ? (isWip ? 'text-orange-400' : isReserve ? 'text-purple-400' : 'text-rose-400')
                                                                                : (isWip ? 'text-orange-700' : isReserve ? 'text-purple-700' : 'text-rose-700')
                                                                        }`}>
                                                                            {typeTag}: -{out.qty}
                                                                        </span>
                                                                        <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>|</span>
                                                                        <span className={`truncate flex-1 max-w-[100px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{out.label}</span>
                                                                        <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>|</span>
                                                                        <span className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{out.date}</span>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <span className="text-[10px] text-slate-500 italic px-1">No outflows</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center p-12 text-slate-500 font-medium italic">No records match the selected filters.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

export default Reports;
