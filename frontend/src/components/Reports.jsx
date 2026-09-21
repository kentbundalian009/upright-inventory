import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    ShieldAlert,
    Search, Download, Loader2, FileText,
    TrendingUp, TrendingDown, Calendar, X, Check, ArrowUpRight,
    Archive, Sliders
} from 'lucide-react';
import PageHeader from './layout/PageHeader';
import TablePagination from './common/TablePagination';
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
    const [showZeroOnly, setShowZeroOnly] = useState(false);
    const [hideNoMovements, setHideNoMovements] = useState(false);

    const [rawMaterialsData, setRawMaterialsData] = useState([]);
    const [suppliesData, setSuppliesData] = useState([]);
    const [consumablesData, setConsumablesData] = useState([]);

    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [wipConversions, setWipConversions] = useState([]);
    const [suppliesMovements, setSuppliesMovements] = useState([]);
    const [packingLists, setPackingLists] = useState([]);
    const [consumableTransactions, setConsumableTransactions] = useState([]);

    const monthsList = [
        { value: '01', label: 'January' }, { value: '02', label: 'February' },
        { value: '03', label: 'March' }, { value: '04', label: 'April' },
        { value: '05', label: 'May' }, { value: '06', label: 'June' },
        { value: '07', label: 'July' }, { value: '08', label: 'August' },
        { value: '09', label: 'September' }, { value: '10', label: 'October' },
        { value: '11', label: 'November' }, { value: '12', label: 'December' }
    ];

    const reportModules = [
        { id: 'raw-materials', label: 'Rackings' },
        { id: 'supplies', label: 'Tools & Equipments' },
        { id: 'consumables', label: 'Consumables' },
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
            const [resRaw, resSupp, resInbound, resWIP, resSuppMove, resPL, resCons, resConsTx] = await Promise.all([
                axios.get(`${BASE_API_URL}/raw-materials`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/supplies`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/purchase-orders`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/conversions`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/supplies-movements`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/packing-lists`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/consumables?all=true`, config).catch(() => null),
                axios.get(`${BASE_API_URL}/consumables/transactions`, config).catch(() => null),
            ]);

            if (resRaw?.status === 200) setRawMaterialsData(resRaw.data);
            if (resSupp?.status === 200) setSuppliesData(resSupp.data);
            if (resInbound?.status === 200) setPurchaseOrders(resInbound.data);
            if (resWIP?.status === 200) setWipConversions(resWIP.data);
            if (resSuppMove?.status === 200) setSuppliesMovements(resSuppMove.data);
            if (resPL?.status === 200) setPackingLists(resPL.data);
            if (resCons?.status === 200) setConsumablesData(Array.isArray(resCons.data) ? resCons.data : (resCons.data?.data || []));
            if (resConsTx?.status === 200) setConsumableTransactions(Array.isArray(resConsTx.data) ? resConsTx.data : (resConsTx.data?.data || []));
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
        const baseInventory = activeModule === 'raw-materials'
            ? rawMaterialsData
            : activeModule === 'supplies'
                ? suppliesData
                : consumablesData;

        baseInventory.forEach(item => {
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
                        const wipCustomer = wip.customer?.trim() || wip.remarks?.trim() || wip.conversionNo || 'Customer';

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
                                    label: wipCustomer,
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
                                    label: wipCustomer,
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
                                    label: wipCustomer,
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

                        if (matchedPLItem && pl.transactionType === "Outbound") {
                            const qty = matchedPLItem.actualCountShipped || 0;
                            if (qty > 0) {
                                outflows.push({
                                    type: 'OUT',
                                    qty: qty,
                                    label: pl.customer || 'Outbound',
                                    date: formatDate(txDate)
                                });
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
            } else if (activeModule === 'consumables') {
                consumableTransactions.forEach(tx => {
                    const txDate = tx.date || tx.createdAt;
                    if (matchDate(txDate)) {
                        const matchedItem = tx.items?.find(it =>
                            (it.consumableId?._id && it.consumableId._id === item._id) ||
                            (it.consumableId && it.consumableId === item._id) ||
                            (it.Code && it.Code === item.Code)
                        );

                        if (matchedItem) {
                            const qty = matchedItem.qty || 0;
                            if (qty > 0) {
                                if (tx.transactionType === 'OUT') {
                                    outflows.push({
                                        type: 'OUT',
                                        qty: qty,
                                        label: tx.name || tx.transactionNo || 'Issued Out',
                                        date: formatDate(txDate)
                                    });
                                } else {
                                    inflows.push({
                                        type: 'IN',
                                        qty: qty,
                                        label: tx.name || tx.transactionNo || 'Restock',
                                        date: formatDate(txDate)
                                    });
                                }
                            }
                        }
                    }
                });
            }

            const hasMovements = inflows.length > 0 || outflows.length > 0;

            // If the item is archived:
            // "pag wala syang ganan edi di sya kasama" -> omit if no movements this month
            if (item.isArchived && !hasMovements) {
                return;
            }

            // "di sya masasama sa bilang dito sa Reports & Analytics dito Export Audit Ledger (PDF) dito only ha"
            // If archived, ActualCount is treated as 0 so it does not add to active stock count
            const displayCount = item.isArchived ? 0 : Number(item.ActualCount ?? 0);

            if (showZeroOnly && displayCount !== 0) {
                return;
            }
            if (hideZeroQty && displayCount === 0) {
                return;
            }

            masterList.push({
                _id: item._id,
                Code: item.Code || 'N/A',
                Category: item.Category || 'N/A',
                Segment: item.Segment || 'N/A',
                ItemDescription: item.ItemDescription || 'N/A',
                Dimension: item.Dimension || 'N/A',
                Brand: item.Brand || '—',
                SerialNo: item.SerialNo || '—',
                Damaged: Number(item.DamagedCount ?? item.Damaged ?? 0),
                ActualCount: displayCount,
                isArchived: !!item.isArchived,
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
                        Brand: '—',
                        SerialNo: '—',
                        Damaged: 0,
                        ActualCount: 0,
                        UOM: 'Mixed',
                        inflows: [],
                        outflows: []
                    };
                }
                grouped[key].ActualCount += item.ActualCount;
                grouped[key].Damaged += (item.Damaged || 0);
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
                        Brand: '—',
                        SerialNo: '—',
                        Damaged: 0,
                        ActualCount: 0,
                        UOM: 'Mixed',
                        inflows: [],
                        outflows: []
                    };
                }
                grouped[key].ActualCount += item.ActualCount;
                grouped[key].Damaged += (item.Damaged || 0);
                grouped[key].inflows.push(...item.inflows);
                grouped[key].outflows.push(...item.outflows);
            });
            masterList = Object.values(grouped);
        }

        if (hideNoMovements) {
            masterList = masterList.filter(item =>
                (item.inflows && item.inflows.length > 0) || (item.outflows && item.outflows.length > 0)
            );
        }

        if (globalSearch.trim()) {
            const q = globalSearch.toLowerCase();
            masterList = masterList.filter(i =>
                i.Code.toLowerCase().includes(q) ||
                i.ItemDescription.toLowerCase().includes(q) ||
                i.Category.toLowerCase().includes(q) ||
                i.Segment.toLowerCase().includes(q) ||
                (i.Brand && i.Brand.toLowerCase().includes(q)) ||
                (i.SerialNo && i.SerialNo.toLowerCase().includes(q))
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
    const currentInventory = activeModule === 'raw-materials'
        ? rawMaterialsData
        : activeModule === 'supplies'
            ? suppliesData
            : consumablesData;
    const zeroCount = currentInventory.filter(item => !item.isArchived && Number(item.ActualCount ?? 0) === 0).length;

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Reset pagination to page 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeModule, globalSearch, selectedYear, selectedMonth, viewMode, hideZeroQty, showZeroOnly, hideNoMovements]);

    const activeTableData = activeModule === 'discrepancy' ? getDiscrepancyLogs() : consolidatedData;
    const totalTableRows = activeTableData.length;
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const paginatedTableData = activeTableData.slice(indexOfFirstRow, indexOfLastRow);

    const kpiSummary = useMemo(() => {
        let totalItems = consolidatedData.length;
        let totalInflowsQty = 0;
        let totalOutflowsQty = 0;
        consolidatedData.forEach(row => {
            if (row.inflows) {
                row.inflows.forEach(inf => {
                    totalInflowsQty += Number(inf.qty || 0);
                });
            }
            if (row.outflows) {
                row.outflows.forEach(out => {
                    totalOutflowsQty += Number(out.qty || 0);
                });
            }
        });
        return { totalItems, totalInflowsQty, totalOutflowsQty };
    }, [consolidatedData]);

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
                doc.setFontSize(9.5);

                doc.text("Report Module:", 14, 40);
                doc.setFont("helvetica", "normal");
                doc.text("Discrepancy & Voided Audit Log", 48, 40);

                doc.setFont("helvetica", "bold");
                doc.text("Date Generated:", 185, 40);
                doc.setFont("helvetica", "normal");
                doc.text(`${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, 220, 40);

                doc.setFont("helvetica", "bold");
                doc.text("Security Class:", 14, 47);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(225, 29, 72);
                doc.text("Internal Audit Discrepancy Registry", 48, 47);

                doc.setTextColor(40, 40, 40);
                doc.setFont("helvetica", "bold");
                doc.text("Total Void Logs:", 185, 47);
                doc.setFont("helvetica", "normal");
                doc.text(`${logs.length} Logged Incidents`, 220, 47);

                const columns = ["Slip No", "Type", "Customer / Recipient", "Date Voided", "Voided By", "Discrepancy / Void Reason", "Restored Items & Quantities"];
                const rows = logs.map(l => [
                    l.slipNo || '—',
                    l.transactionType || '—',
                    l.customer || '—',
                    l.voidedAt || '—',
                    l.voidedBy || '—',
                    l.voidReason || '—',
                    l.itemsRestored || '—'
                ]);

                autoTable(doc, {
                    startY: 56,
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
                        } catch (e) { }

                        doc.setFillColor(225, 29, 72);
                        doc.rect(0, 0, pageWidth, 28, 'F');

                        doc.setTextColor(255, 255, 255);
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(13);
                        doc.text("DISCREPANCY & VOIDED TRANSACTION LOGS AUDIT REPORT", centerX, 12, { align: 'center' });

                        doc.setFontSize(8.5);
                        doc.setFont("helvetica", "normal");
                        doc.setTextColor(255, 235, 235);
                        doc.text("System Error Corrective Action Audit Trail Registry  |  Confidential Internal Audit", centerX, 20, { align: 'center' });

                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(8);
                        doc.setTextColor(120, 120, 120);
                        doc.text("CONFIDENTIAL AUDIT LEDGER - FOR INTERNAL AUTHORIZED USE ONLY", 14, pageHeight - 8);

                        const pageNumber = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
                        doc.text(pageNumber, pageWidth - 14, pageHeight - 8, { align: 'right' });
                    },
                    headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle' },
                    bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], valign: 'top' },
                    alternateRowStyles: { fillColor: [255, 248, 248] },
                    styles: { overflow: 'linebreak', cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2 },
                    columnStyles: {
                        0: { cellWidth: 28, fontStyle: 'bold', textColor: [225, 29, 72] },
                        1: { cellWidth: 24, fontStyle: 'bold' },
                        2: { cellWidth: 42 },
                        3: { cellWidth: 28 },
                        4: { cellWidth: 26, fontStyle: 'bold' },
                        5: { cellWidth: 58 },
                        6: { cellWidth: 63, textColor: [16, 110, 60] }
                    }
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
            doc.setFontSize(9.5);

            doc.text("Module Registry:", 14, 40);
            doc.setFont("helvetica", "normal");
            doc.text(`${titleModule} ${showZeroOnly ? '(Zero Quantity Audit)' : 'Inventory'}`, 48, 40);

            doc.setFont("helvetica", "bold");
            doc.text("Date Generated:", 185, 40);
            doc.setFont("helvetica", "normal");
            doc.text(`${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, 220, 40);

            doc.setFont("helvetica", "bold");
            doc.text("Covered Period:", 14, 47);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(24, 23, 78);
            doc.text(`${targetMonthLabel} ${currentYearStr}`, 48, 47);
            doc.setTextColor(40, 40, 40);

            const isRackings = activeModule === 'raw-materials';
            const columns = isRackings
                ? ["Item Description", "Segment", "Dimension", "Quantity", "UOM", "Inflows (This Month)", "Outflows (This Month)"]
                : ["Item Description", "Segment", "Dimension", "Serial", "Quantity", "UOM"];

            // Group records by Segment across all modules (Rackings, Supplies, Consumables)
            const groupedData = {};
            consolidatedData.forEach(item => {
                const rawVal = item.Segment;
                const key = rawVal?.trim() || 'STANDARD SEGMENT';
                if (!groupedData[key]) {
                    groupedData[key] = [];
                }
                groupedData[key].push(item);
            });

            const rows = [];
            Object.keys(groupedData).sort().forEach(groupName => {
                const itemsInGroup = groupedData[groupName];

                // Section Header Banner across all columns
                rows.push([
                    {
                        content: `SEGMENT: ${groupName.toUpperCase()}   (${itemsInGroup.length} ${itemsInGroup.length === 1 ? 'ITEM' : 'ITEMS'})`,
                        colSpan: isRackings ? 7 : 6,
                        styles: {
                            fillColor: [234, 239, 249],
                            textColor: [24, 23, 78],
                            fontStyle: 'bold',
                            fontSize: 8.5,
                            cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 }
                        }
                    }
                ]);

                itemsInGroup.forEach(item => {
                    const formatLogs = (logs, isOutflow) => {
                        if (!logs || logs.length === 0) return isOutflow ? 'No outflows recorded' : 'No inflows recorded';
                        return logs.map(l => {
                            let typeTag = isOutflow
                                ? ((l.type === 'WIP_OUT' || l.type === 'WIP') ? 'WIP-OUT' : l.type === 'RESERVE' ? 'RESERVE' : 'OUT')
                                : (l.type === 'WIP_IN' ? 'WIP-IN' : l.type === 'WIP_RET' ? 'WIP-RET' : 'IN');
                            const sign = isOutflow ? '-' : '+';
                            const cleanLabel = (l.label || '').length > 18 ? (l.label || '').substring(0, 16) + '…' : (l.label || '');
                            return `${typeTag}: ${sign}${l.qty || 0} | ${cleanLabel} | ${l.date || ''}`;
                        }).join('\n');
                    };

                    const displayQty = item.isArchived ? '0' : (item.ActualCount !== undefined && item.ActualCount !== null ? Number(item.ActualCount).toLocaleString() : '0');

                    const itemRow = isRackings ? [
                        item.isArchived ? `${item.ItemDescription || '—'} (Archived)` : (item.ItemDescription || '—'),
                        item.Segment || 'Standard',
                        item.Dimension || '—',
                        displayQty,
                        item.UOM || 'PCS',
                        formatLogs(item.inflows, false),
                        formatLogs(item.outflows, true)
                    ] : [
                        item.isArchived ? `${item.ItemDescription || '—'} (Archived)` : (item.ItemDescription || '—'),
                        item.Segment || 'Standard',
                        item.Dimension || '—',
                        item.SerialNo || '—',
                        displayQty,
                        item.UOM || 'PCS'
                    ];

                    rows.push(itemRow);
                });
            });

            autoTable(doc, {
                startY: 56,
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
                    doc.rect(0, 0, pageWidth, 28, 'F');

                    doc.setTextColor(255, 255, 255);
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(13);
                    const reportHeaderTitle = showZeroOnly
                        ? `${titleModule.toUpperCase()} ZERO QUANTITY (OUT OF STOCK) AUDIT REPORT`
                        : `${titleModule.toUpperCase()} CONSOLIDATED REGISTRY REPORT`;
                    doc.text(reportHeaderTitle, centerX, 12, { align: 'center' });

                    doc.setFontSize(8.5);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(215, 220, 245);
                    const reportSubtitle = showZeroOnly
                        ? `Zero Stock Inventory Verification & Replenishment Audit  |  Covered: ${targetMonthLabel} ${currentYearStr}  |  Generated: ${formattedDate}`
                        : `Material Flow Logistics & Audit Trail Control Registry  |  Covered: ${targetMonthLabel} ${currentYearStr}  |  Generated: ${formattedDate}`;
                    doc.text(reportSubtitle, centerX, 20, { align: 'center' });

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.setTextColor(120, 120, 120);
                    doc.text("CONFIDENTIAL - SYSTEM CENTRAL LEDGER USE ONLY - AUTHORIZED ACCESS ONLY", 14, pageHeight - 8);
                    const pageNumber = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
                    doc.text(pageNumber, pageWidth - 14, pageHeight - 8, { align: 'right' });
                },
                didDrawCell: (data) => {
                    // Skip indicator drawing on section subheader rows
                    if (data.cell.colSpan > 1) return;

                    // Left indicator bars for Inflows (col 5) and Outflows (col 6) - Rackings only
                    if (isRackings && data.section === 'body' && (data.column.index === 5 || data.column.index === 6)) {
                        const lines = data.cell.text;
                        if (!lines || lines.length === 0 || lines[0] === 'No inflows recorded' || lines[0] === 'No outflows recorded') return;

                        const scaleFactor = data.doc.internal.scaleFactor || 1;
                        const fontSize = data.cell.styles.fontSize || 7;
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
                                doc.setDrawColor(168, 185, 129);
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

                    // Background highlighting for Quantity (col 3 for Rackings, col 4 for others)
                    if (data.section === 'body' && (isRackings ? data.column.index === 3 : data.column.index === 4)) {
                        const rawText = String(data.cell.text || '');
                        const countVal = Number(rawText.replace(/,/g, ''));
                        if (isNaN(countVal) || countVal === 0) {
                            doc.setFillColor(254, 242, 242);
                            doc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'F');
                            doc.setTextColor(225, 29, 72);
                            doc.setFont("helvetica", "bold");
                            doc.text(String(data.cell.text), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1, { align: 'center' });
                        } else {
                            doc.setFillColor(238, 242, 255);
                            doc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'F');
                            doc.setTextColor(24, 23, 78);
                            doc.setFont("helvetica", "bold");
                            doc.text(String(data.cell.text), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1, { align: 'center' });
                        }
                    }
                },
                headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle' },
                bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], valign: 'middle' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { overflow: 'linebreak', cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2, rowPageBreak: 'avoid' },
                columnStyles: isRackings ? {
                    0: { cellWidth: 76 },
                    1: { cellWidth: 30 },
                    2: { cellWidth: 27 },
                    3: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
                    4: { cellWidth: 14, halign: 'center' },
                    5: { cellWidth: 52, fontSize: 7 },
                    6: { cellWidth: 52, fontSize: 7 }
                } : {
                    0: { cellWidth: 95 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 40 },
                    4: { cellWidth: 34, halign: 'center', fontStyle: 'bold' },
                    5: { cellWidth: 30, halign: 'center' }
                }
            });
            const saveFileName = showZeroOnly
                ? `${activeModuleStr}_ZERO_QTY_${viewMode.toUpperCase()}_${targetMonthLabel.toUpperCase()}_${currentYearStr}.pdf`
                : `${activeModuleStr}_${viewMode.toUpperCase()}_CONSOLIDATED_${targetMonthLabel.toUpperCase()}_${currentYearStr}.pdf`;
            doc.save(saveFileName);
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
                const monthPLs = packingLists.filter(pl => !pl.isVoided && pl.transactionType === "Outbound" && matchSelectedDate(pl.shipmentDate || pl.createdAt));

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
                        return sum + (it.actualCountShipped || 0);
                    }, 0);
                    return acc + plTotal;
                }, 0);

                // --- PAGE 1 METADATA BLOCK (Matching Export Audit Ledger) ---
                doc.setTextColor(40, 40, 40);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9.5);

                doc.text("Report Module:", 14, 38);
                doc.setFont("helvetica", "normal");
                doc.text("Rackings Monthly Activity Summary (Inbound, WIP & Outbound)", 48, 38);

                doc.setFont("helvetica", "bold");
                doc.text("Date Generated:", 185, 38);
                doc.setFont("helvetica", "normal");
                doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), 220, 38);

                doc.setFont("helvetica", "bold");
                doc.text("Covered Period:", 14, 45);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(24, 23, 78);
                doc.text(`${targetMonthLabel} ${currentYearStr}`, 48, 45);
                doc.setTextColor(40, 40, 40);

                let currentY = 51;

                // KPI Header Table (Styled Grid with Navy Headers matching Audit Ledger)
                const kpiRows = [[
                    `Total: ${monthPOs.length} Deliveries\n${totalInboundQty.toLocaleString()} Units Received`,
                    `Total: ${monthWIP.length} Batches\nConsumed: ${totalConsumedQty.toLocaleString()}  |  Yield: ${totalProducedQty.toLocaleString()} Units`,
                    `Total: ${monthPLs.length} Dispatches\n${totalOutboundQty.toLocaleString()} Units Shipped`
                ]];

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [["1. INBOUND DELIVERIES OVERVIEW", "2. WIP PRODUCTION & CONVERSIONS", "3. OUTBOUND SHIPMENTS OVERVIEW"]],
                    body: kpiRows,
                    theme: 'grid',
                    headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center', cellPadding: { top: 2.8, bottom: 2.8, left: 2.5, right: 2.5 } },
                    bodyStyles: { fontSize: 7.5, fontStyle: 'bold', textColor: [24, 23, 78], fillColor: [245, 248, 255], halign: 'center', cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 } },
                    styles: { lineColor: [215, 225, 245], lineWidth: 0.25 }
                });

                currentY = doc.lastAutoTable.finalY + 8;

                // Helper to render consistent Section Header Banner
                const renderSectionBanner = (title) => {
                    if (currentY + 45 > pageHeight - 20) {
                        doc.addPage();
                        currentY = 38;
                    }
                    doc.setFillColor(234, 239, 249);
                    doc.roundedRect(14, currentY, pageWidth - 28, 7.5, 1, 1, 'F');
                    doc.setDrawColor(200, 215, 242);
                    doc.setLineWidth(0.3);
                    doc.roundedRect(14, currentY, pageWidth - 28, 7.5, 1, 1, 'S');

                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(8.5);
                    doc.setTextColor(24, 23, 78);
                    doc.text(title, 18, currentY + 5.2);
                    currentY += 10.5;
                };

                // Helper to resolve Material Description and Dimension accurately
                const resolveMaterialInfo = (it) => {
                    let mat = null;
                    const mid = it.materialId?._id || it.materialId || it.itemId?._id || it.itemId;
                    const code = it.materialId?.Code || it.Code || it.itemId?.Code;

                    if (mid) {
                        mat = rawMaterialsData.find(m => String(m._id) === String(mid));
                    }
                    if (!mat && code) {
                        mat = rawMaterialsData.find(m => m.Code === code);
                    }

                    const itemDesc = mat?.ItemDescription || it.materialId?.ItemDescription || it.itemId?.ItemDescription || it.ItemDescription || code || '—';
                    const dimension = mat?.Dimension || it.materialId?.Dimension || it.itemId?.Dimension || it.Dimension || '—';
                    const uom = mat?.UOM || it.materialId?.UOM || it.itemId?.UOM || it.UOM || 'PCS';

                    return { itemDesc, dimension, uom, code };
                };

                // --- SECTION 1: INBOUND DELIVERIES ---
                renderSectionBanner(`A. INBOUND DELIVERIES & PURCHASE ORDERS   (${monthPOs.length} RECORDS   |   ${totalInboundQty.toLocaleString()} UNITS RECEIVED)`);

                const poColumns = ["Delivery Date", "PO Number", "Supplier", "Item Description", "Dimension", "Qty Received", "Received By"];
                const poRows = [];

                if (monthPOs.length > 0) {
                    monthPOs.forEach(po => {
                        const poDate = formatShortDate(po.deliveryDate || po.createdAt || po.date);
                        const poNum = po.poNo || po.poNumber || 'N/A';
                        const poSupplier = po.supplier || 'N/A';
                        const poUser = po.preparedBy || 'System User';

                        const poItems = po.items || [];
                        if (poItems.length === 0) {
                            poRows.push([poDate, poNum, poSupplier, "No items listed", "—", "0", poUser]);
                        } else {
                            poItems.forEach(it => {
                                const { itemDesc, dimension, uom } = resolveMaterialInfo(it);
                                const count = it.actualCountReceived ?? it.qty ?? 0;
                                poRows.push([
                                    poDate,
                                    poNum,
                                    poSupplier,
                                    itemDesc,
                                    dimension,
                                    `${count.toLocaleString()} ${uom}`,
                                    poUser
                                ]);
                            });
                        }
                    });
                } else {
                    poRows.push(["—", "—", "—", `No Inbound deliveries recorded for ${targetMonthLabel} ${currentYearStr}`, "—", "0", "—"]);
                }

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [poColumns],
                    body: poRows,
                    theme: 'grid',
                    headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle', cellPadding: 2.5 },
                    bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], cellPadding: 2.5, valign: 'middle' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    styles: { overflow: 'linebreak', cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2, rowPageBreak: 'avoid' },
                    columnStyles: {
                        0: { cellWidth: 25, fontStyle: 'bold' },
                        1: { cellWidth: 28, fontStyle: 'bold', textColor: [24, 23, 78] },
                        2: { cellWidth: 38 },
                        3: { cellWidth: 86 },
                        4: { cellWidth: 38 },
                        5: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
                        6: { cellWidth: 30 }
                    },
                    didDrawCell: (data) => {
                        if (data.section === 'body' && data.column.index === 5) {
                            const qtyVal = Number(String(data.cell.raw ?? '').replace(/[^0-9.-]/g, ''));
                            if (qtyVal > 0) {
                                doc.setFillColor(238, 242, 255);
                                doc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'F');
                                doc.setTextColor(24, 23, 78);
                                doc.setFont("helvetica", "bold");
                                doc.text(String(data.cell.text), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1, { align: 'center' });
                            }
                        }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 8;

                // --- SECTION 2: WIP CONVERSIONS ---
                renderSectionBanner(`B. WORK-IN-PROGRESS & PRODUCTION   (${monthWIP.length} BATCHES   |   ${totalConsumedQty.toLocaleString()} CONSUMED   |   ${totalProducedQty.toLocaleString()} YIELD)`);

                const wipColumns = ["Date", "WIP / Job No", "Production Type", "Materials Consumed (Input)", "Yield Produced (Output)", "Returned Items", "Processed By"];
                const wipRows = monthWIP.length > 0
                    ? monthWIP.map(wip => {
                        const consumedStr = (wip.inputs || []).map(it => {
                            const { itemDesc, dimension, uom } = resolveMaterialInfo(it);
                            const qty = it.qtyUsed || 0;
                            return `• ${itemDesc} [${dimension}] (${qty.toLocaleString()} ${uom})`;
                        }).join('\n') || 'None';

                        const producedStr = (wip.outputs || []).map(it => {
                            const { itemDesc, dimension, uom } = resolveMaterialInfo(it);
                            const qty = it.qtyProduced || 0;
                            return `• ${itemDesc} [${dimension}] (${qty.toLocaleString()} ${uom})`;
                        }).join('\n') || 'None';

                        const returnedStr = (wip.materialsReturned || []).map(it => {
                            const { itemDesc, dimension, uom } = resolveMaterialInfo(it);
                            const qty = it.qtyReturned || 0;
                            return `• ${itemDesc} (${qty.toLocaleString()} ${uom})`;
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
                    headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle', cellPadding: 2.5 },
                    bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], cellPadding: 2.5, valign: 'middle' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    styles: { overflow: 'linebreak', cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2, rowPageBreak: 'avoid' },
                    columnStyles: {
                        0: { cellWidth: 25, fontStyle: 'bold' },
                        1: { cellWidth: 32, fontStyle: 'bold', textColor: [24, 23, 78] },
                        2: { cellWidth: 32 },
                        3: { cellWidth: 68 },
                        4: { cellWidth: 68 },
                        5: { cellWidth: 22 },
                        6: { cellWidth: 22 }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 8;

                // --- SECTION 3: OUTBOUND SHIPMENTS ---
                renderSectionBanner(`C. OUTBOUND SHIPMENTS & DISPATCHES   (${monthPLs.length} SHIPMENTS   |   ${totalOutboundQty.toLocaleString()} UNITS DISPATCHED)`);

                const plColumns = ["Shipment Date", "PL Number", "Customer / Destination", "Item Description", "Dimension", "Qty Shipped", "Carrier / Ref", "Handled By"];
                const plRows = [];

                if (monthPLs.length > 0) {
                    monthPLs.forEach(pl => {
                        const plDate = formatShortDate(pl.shipmentDate || pl.createdAt);
                        const plNum = pl.plNo || 'N/A';
                        const plCustomer = `${pl.customer || 'N/A'}${pl.destinationAddress ? `\n(${pl.destinationAddress})` : ''}`;
                        const plRef = `${pl.carrier || ''}${pl.referencePlNo ? `\nRef: ${pl.referencePlNo}` : ''}` || '—';
                        const plUser = pl.preparedBy || 'System User';

                        const plItems = pl.items || [];
                        if (plItems.length === 0) {
                            plRows.push([plDate, plNum, plCustomer, "No items listed", "—", "0", plRef, plUser]);
                        } else {
                            plItems.forEach(it => {
                                const { itemDesc, dimension, uom } = resolveMaterialInfo(it);
                                const count = it.actualCountShipped || 0;
                                plRows.push([
                                    plDate,
                                    plNum,
                                    plCustomer,
                                    itemDesc,
                                    dimension,
                                    `${count.toLocaleString()} ${uom}`,
                                    plRef,
                                    plUser
                                ]);
                            });
                        }
                    });
                } else {
                    plRows.push(["—", "—", "—", `No Outbound records found for ${targetMonthLabel} ${currentYearStr}`, "—", "0", "—", "—"]);
                }

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [plColumns],
                    body: plRows,
                    theme: 'grid',
                    headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle', cellPadding: 2.5 },
                    bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], cellPadding: 2.5, valign: 'middle' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    styles: { overflow: 'linebreak', cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2, rowPageBreak: 'avoid' },
                    columnStyles: {
                        0: { cellWidth: 24, fontStyle: 'bold' },
                        1: { cellWidth: 26, fontStyle: 'bold', textColor: [24, 23, 78] },
                        2: { cellWidth: 42 },
                        3: { cellWidth: 74 },
                        4: { cellWidth: 35 },
                        5: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
                        6: { cellWidth: 22 },
                        7: { cellWidth: 22 }
                    },
                    didDrawCell: (data) => {
                        if (data.section === 'body' && data.column.index === 5) {
                            const qtyVal = Number(String(data.cell.raw ?? '').replace(/[^0-9.-]/g, ''));
                            if (qtyVal > 0) {
                                doc.setFillColor(238, 242, 255);
                                doc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'F');
                                doc.setTextColor(24, 23, 78);
                                doc.setFont("helvetica", "bold");
                                doc.text(String(data.cell.text), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1, { align: 'center' });
                            }
                        }
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

                // --- PAGE 1 METADATA BLOCK ---
                doc.setTextColor(40, 40, 40);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9.5);

                doc.text("Report Module:", 14, 38);
                doc.setFont("helvetica", "normal");
                doc.text("Supplies & Consumables Movement & Issuances Summary", 48, 38);

                doc.setFont("helvetica", "bold");
                doc.text("Date Generated:", 185, 38);
                doc.setFont("helvetica", "normal");
                doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), 220, 38);

                doc.setFont("helvetica", "bold");
                doc.text("Covered Period:", 14, 45);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(24, 23, 78);
                doc.text(`${targetMonthLabel} ${currentYearStr}`, 48, 45);
                doc.setTextColor(40, 40, 40);

                let currentY = 51;

                // KPI Header Table (Styled Grid with Navy Headers)
                const kpiRows = [[
                    `Total Movements: ${monthSlips.length} Slips`,
                    `+${restockUnits.toLocaleString()} Units Inbound / Restocked`,
                    `-${issuedUnits.toLocaleString()} Units Issued / Dispatched`,
                    `Returns: ${returnUnits.toLocaleString()}  |  Damaged/Scrap: ${damagedUnits.toLocaleString()}`
                ]];

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [["1. ACTIVITY OVERVIEW", "2. STOCK ADDITIONS", "3. STOCK DISPATCHES", "4. RETURNS & QUALITY"]],
                    body: kpiRows,
                    theme: 'grid',
                    headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center', cellPadding: { top: 2.8, bottom: 2.8, left: 2.5, right: 2.5 } },
                    bodyStyles: { fontSize: 7.5, fontStyle: 'bold', textColor: [24, 23, 78], fillColor: [245, 248, 255], halign: 'center', cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 } },
                    styles: { lineColor: [215, 225, 245], lineWidth: 0.25 }
                });

                currentY = doc.lastAutoTable.finalY + 8;

                if (currentY + 45 > pageHeight - 20) {
                    doc.addPage();
                    currentY = 38;
                }

                // Section Banner
                doc.setFillColor(234, 239, 249);
                doc.roundedRect(14, currentY, pageWidth - 28, 7.5, 1, 1, 'F');
                doc.setDrawColor(200, 215, 242);
                doc.setLineWidth(0.3);
                doc.roundedRect(14, currentY, pageWidth - 28, 7.5, 1, 1, 'S');

                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(24, 23, 78);
                doc.text(`SUPPLIES MOVEMENT & ISSUANCES REGISTRY   (${monthSlips.length} SLIPS)`, 18, currentY + 5.2);
                currentY += 10.5;

                const slipColumns = ["Date", "Slip No", "Type", "Party / Department / Recipient", "Items & Quantity Details", "Total Qty", "Reference / Notes", "Handled By"];
                const slipRows = monthSlips.map(slip => {
                    const itemsStr = (slip.items || []).map(it => {
                        const code = it.supplyId?.Code || 'Item';
                        const desc = it.supplyId?.ItemDescription || '';
                        const qty = it.qty || 0;
                        const uom = it.supplyId?.UOM || 'PCS';
                        const dmg = it.damagedQty > 0 ? ` [Dmg: ${it.damagedQty}]` : '';
                        const rmk = it.remarks ? ` - ${it.remarks}` : '';
                        return `• ${code}${desc ? ` (${desc})` : ''}: ${qty.toLocaleString()} ${uom}${dmg}${rmk}`;
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
                    headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle', cellPadding: 2.5 },
                    bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], cellPadding: 2.5, valign: 'middle' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    styles: { overflow: 'linebreak', cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2, rowPageBreak: 'avoid' },
                    columnStyles: {
                        0: { cellWidth: 25, fontStyle: 'bold' },
                        1: { cellWidth: 30, fontStyle: 'bold', textColor: [24, 23, 78] },
                        2: { cellWidth: 24 },
                        3: { cellWidth: 46 },
                        4: { cellWidth: 84 },
                        5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
                        6: { cellWidth: 20 },
                        7: { cellWidth: 20 }
                    },
                    didDrawCell: (data) => {
                        if (data.section === 'body' && data.column.index === 5) {
                            const qtyVal = Number(String(data.cell.raw ?? '').replace(/,/g, ''));
                            if (qtyVal > 0) {
                                doc.setFillColor(238, 242, 255);
                                doc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'F');
                                doc.setTextColor(24, 23, 78);
                                doc.setFont("helvetica", "bold");
                                doc.text(String(data.cell.text), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1, { align: 'center' });
                            }
                        }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 8;
                if (currentY + 45 > pageHeight - 20) {
                    doc.addPage();
                    currentY = 38;
                }

                doc.setFillColor(234, 239, 249);
                doc.roundedRect(14, currentY, pageWidth - 28, 7.5, 1, 1, 'F');
                doc.setDrawColor(200, 215, 242);
                doc.setLineWidth(0.3);
                doc.roundedRect(14, currentY, pageWidth - 28, 7.5, 1, 1, 'S');

                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(24, 23, 78);
                doc.text(`CURRENT SUPPLIES INVENTORY & CONDITION REGISTRY   (${consolidatedData.length} ITEMS)`, 18, currentY + 5.2);
                currentY += 10.5;

                const suppInventoryCols = ["Item Description", "Dimension", "Category", "Brand", "Serial No.", "Actual Count", "Damaged", "UOM"];
                const suppInventoryRows = consolidatedData.map(item => [
                    item.isArchived ? `${item.ItemDescription || '—'} (Archived)` : (item.ItemDescription || '—'),
                    item.Dimension || '—',
                    item.Category || '—',
                    item.Brand || '—',
                    item.SerialNo || '—',
                    item.isArchived ? '0' : String(item.ActualCount ?? 0),
                    String(item.Damaged ?? 0),
                    item.UOM || '—'
                ]);

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [suppInventoryCols],
                    body: suppInventoryRows,
                    theme: 'grid',
                    headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle', cellPadding: 2.5 },
                    bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], cellPadding: 2.5, valign: 'middle' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    styles: { overflow: 'linebreak', cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2, rowPageBreak: 'avoid' },
                    columnStyles: {
                        0: { cellWidth: 70 },
                        1: { cellWidth: 32 },
                        2: { cellWidth: 32 },
                        3: { cellWidth: 30 },
                        4: { cellWidth: 32 },
                        5: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
                        6: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
                        7: { cellWidth: 22, halign: 'center' }
                    },
                    didDrawCell: (data) => {
                        if (data.section === 'body' && data.column.index === 5) {
                            const countVal = Number(data.cell.raw ?? 0);
                            if (countVal === 0) {
                                doc.setFillColor(254, 242, 242);
                                doc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'F');
                                doc.setTextColor(225, 29, 72);
                                doc.setFont("helvetica", "bold");
                                doc.text(String(data.cell.text), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1, { align: 'center' });
                            } else {
                                doc.setFillColor(238, 242, 255);
                                doc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'F');
                                doc.setTextColor(24, 23, 78);
                                doc.setFont("helvetica", "bold");
                                doc.text(String(data.cell.text), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1, { align: 'center' });
                            }
                        }
                        if (data.section === 'body' && data.column.index === 6) {
                            const dmgVal = Number(data.cell.raw ?? 0);
                            if (dmgVal > 0) {
                                doc.setFillColor(254, 242, 242);
                                doc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'F');
                                doc.setTextColor(225, 29, 72);
                                doc.setFont("helvetica", "bold");
                                doc.text(String(data.cell.text), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1, { align: 'center' });
                            }
                        }
                    }
                });

            } else if (activeModule === 'consumables') {
                // CONSUMABLES TRANSACTIONS & MOVEMENTS
                const monthTx = consumableTransactions.filter(tx => matchSelectedDate(tx.date || tx.createdAt));

                if (monthTx.length === 0) {
                    alert(`No consumables transaction records logged for ${targetMonthLabel} ${currentYearStr}.`);
                    return;
                }

                let restockUnits = 0;
                let issuedUnits = 0;

                monthTx.forEach(tx => {
                    const txQty = (tx.items || []).reduce((s, it) => s + (it.qty || 0), 0);
                    if (tx.transactionType === 'IN') {
                        restockUnits += txQty;
                    } else {
                        issuedUnits += txQty;
                    }
                });

                // Page 1 Metadata
                doc.setTextColor(40, 40, 40);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9.5);

                doc.text("Report Module:", 14, 38);
                doc.setFont("helvetica", "normal");
                doc.text("Consumables Inventory & Transaction Activity Summary", 48, 38);

                doc.setFont("helvetica", "bold");
                doc.text("Date Generated:", 185, 38);
                doc.setFont("helvetica", "normal");
                doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), 220, 38);

                doc.setFont("helvetica", "bold");
                doc.text("Covered Period:", 14, 45);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(24, 23, 78);
                doc.text(`${targetMonthLabel} ${currentYearStr}`, 48, 45);
                doc.setTextColor(40, 40, 40);

                let currentY = 51;

                // KPI Header Table
                const kpiRows = [[
                    `Total Transactions: ${monthTx.length} Entries`,
                    `+${restockUnits.toLocaleString()} Units Inbound / Restocked`,
                    `-${issuedUnits.toLocaleString()} Units Issued / Outbound`,
                    `Active Consumables: ${consolidatedData.length} Items`
                ]];

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [["1. ACTIVITY OVERVIEW", "2. STOCK ADDITIONS", "3. STOCK DISPATCHES", "4. INVENTORY SCOPE"]],
                    body: kpiRows,
                    theme: 'grid',
                    headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center', cellPadding: { top: 2.8, bottom: 2.8, left: 2.5, right: 2.5 } },
                    bodyStyles: { fontSize: 7.5, fontStyle: 'bold', textColor: [24, 23, 78], fillColor: [245, 248, 255], halign: 'center', cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 } },
                    styles: { lineColor: [215, 225, 245], lineWidth: 0.25 }
                });

                currentY = doc.lastAutoTable.finalY + 8;

                if (currentY + 45 > pageHeight - 20) {
                    doc.addPage();
                    currentY = 38;
                }

                // Section Banner
                doc.setFillColor(234, 239, 249);
                doc.roundedRect(14, currentY, pageWidth - 28, 7.5, 1, 1, 'F');
                doc.setDrawColor(200, 215, 242);
                doc.setLineWidth(0.3);
                doc.roundedRect(14, currentY, pageWidth - 28, 7.5, 1, 1, 'S');

                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(24, 23, 78);
                doc.text(`CONSUMABLES TRANSACTIONS REGISTRY   (${monthTx.length} TRANSACTIONS)`, 18, currentY + 5.2);
                currentY += 10.5;

                const txColumns = ["Date", "Transaction No", "Type", "Transactor / Personnel", "Items & Quantity Details", "Total Qty", "Time"];
                const txRows = monthTx.map(tx => {
                    const itemsStr = (tx.items || []).map(it => {
                        const desc = it.ItemDescription || it.Code || 'Item';
                        const qty = it.qty || 0;
                        const uom = it.UOM || 'PCS';
                        const rmk = it.remarks ? ` - ${it.remarks}` : '';
                        return `• ${desc}: ${qty.toLocaleString()} ${uom}${rmk}`;
                    }).join('\n') || 'No items listed';

                    const totalQty = (tx.items || []).reduce((s, it) => s + (it.qty || 0), 0);

                    return [
                        formatShortDate(tx.date || tx.createdAt),
                        tx.transactionNo || 'N/A',
                        tx.transactionType === 'IN' ? 'Restock (IN)' : 'Issuance (OUT)',
                        tx.name || 'N/A',
                        itemsStr,
                        totalQty.toLocaleString(),
                        tx.time || '—'
                    ];
                });

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [txColumns],
                    body: txRows,
                    theme: 'grid',
                    headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle', cellPadding: 2.5 },
                    bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], cellPadding: 2.5, valign: 'middle' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    styles: { overflow: 'linebreak', cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2, rowPageBreak: 'avoid' },
                    columnStyles: {
                        0: { cellWidth: 25, fontStyle: 'bold' },
                        1: { cellWidth: 32, fontStyle: 'bold', textColor: [24, 23, 78] },
                        2: { cellWidth: 28 },
                        3: { cellWidth: 46 },
                        4: { cellWidth: 96 },
                        5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
                        6: { cellWidth: 22 }
                    }
                });

                currentY = doc.lastAutoTable.finalY + 8;
                if (currentY + 45 > pageHeight - 20) {
                    doc.addPage();
                    currentY = 38;
                }

                doc.setFillColor(234, 239, 249);
                doc.roundedRect(14, currentY, pageWidth - 28, 7.5, 1, 1, 'F');
                doc.setDrawColor(200, 215, 242);
                doc.setLineWidth(0.3);
                doc.roundedRect(14, currentY, pageWidth - 28, 7.5, 1, 1, 'S');

                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(24, 23, 78);
                doc.text(`CURRENT CONSUMABLES INVENTORY REGISTRY   (${consolidatedData.length} ITEMS)`, 18, currentY + 5.2);
                currentY += 10.5;

                const consInventoryCols = ["Item Description", "Segment", "Dimension", "Serial", "Actual Count", "UOM"];
                const consInventoryRows = consolidatedData.map(item => [
                    item.isArchived ? `${item.ItemDescription || '—'} (Archived)` : (item.ItemDescription || '—'),
                    item.Segment || 'Standard',
                    item.Dimension || '—',
                    item.SerialNo || '—',
                    item.isArchived ? '0' : String(item.ActualCount ?? 0),
                    item.UOM || 'PCS'
                ]);

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [consInventoryCols],
                    body: consInventoryRows,
                    theme: 'grid',
                    headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle', cellPadding: 2.5 },
                    bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], cellPadding: 2.5, valign: 'middle' },
                    alternateRowStyles: { fillColor: [248, 250, 252] },
                    styles: { overflow: 'linebreak', cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2, rowPageBreak: 'avoid' },
                    columnStyles: {
                        0: { cellWidth: 95 },
                        1: { cellWidth: 35 },
                        2: { cellWidth: 35 },
                        3: { cellWidth: 40 },
                        4: { cellWidth: 34, halign: 'center', fontStyle: 'bold' },
                        5: { cellWidth: 30, halign: 'center' }
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

            // --- DECORATE ALL PAGES (Banner, Watermark, Footer) matching Export Audit Ledger exactly ---
            const totalPages = doc.internal.getNumberOfPages();
            const reportHeaderTitle = activeModule === 'raw-materials'
                ? "RACKINGS MONTHLY MOVEMENT & TRANSACTION ACTIVITY REPORT"
                : activeModule === 'supplies'
                    ? "SUPPLIES MOVEMENTS & ISSUANCES MONTHLY SUMMARY REPORT"
                    : activeModule === 'consumables'
                        ? "CONSUMABLES INVENTORY & TRANSACTIONS MONTHLY SUMMARY REPORT"
                        : "DISCREPANCY & VOIDED TRANSACTION LOGS AUDIT REPORT";

            const bannerColor = activeModule === 'discrepancy' ? [225, 29, 72] : [24, 23, 78];
            const reportSubtitle = `Material Flow Logistics & Activity Trail Control Registry  |  Covered: ${targetMonthLabel} ${currentYearStr}  |  Generated: ${formattedDate}`;

            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);

                // Watermark in background
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

                // Top Header Banner
                doc.setFillColor(...bannerColor);
                doc.rect(0, 0, pageWidth, 28, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(13);
                doc.text(reportHeaderTitle, centerX, 12, { align: 'center' });

                doc.setFontSize(8.5);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(215, 220, 245);
                doc.text(reportSubtitle, centerX, 20, { align: 'center' });

                // Footer
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(120, 120, 120);
                doc.text("CONFIDENTIAL - SYSTEM CENTRAL LEDGER USE ONLY - AUTHORIZED ACCESS ONLY", 14, pageHeight - 8);

                const pageNumber = `Page ${i} of ${totalPages}`;
                doc.text(pageNumber, pageWidth - 14, pageHeight - 8, { align: 'right' });
            }

            const prefix = activeModule === 'raw-materials'
                ? 'RACKINGS_MONTHLY_SUMMARY'
                : activeModule === 'supplies'
                    ? 'SUPPLIES_MONTHLY_SUMMARY'
                    : activeModule === 'consumables'
                        ? 'CONSUMABLES_MONTHLY_SUMMARY'
                        : 'DISCREPANCY_MONTHLY_SUMMARY';
            doc.save(`${prefix}_${targetMonthLabel.toUpperCase()}_${currentYearStr}.pdf`);

        } catch (e) {
            console.error("Error generating monthly summary PDF:", e);
            alert("Failed to export Monthly Summary PDF report. Please try again.");
        }
    };

    return (
        <div className={`mx-4 sm:mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
            <PageHeader activeTab="reports" />

            {/* Main Container Card (consistent with InventoryRawMaterials) */}
            <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100 text-slate-600'} border rounded-2xl p-6 shadow-sm flex flex-col gap-6 transition-colors duration-200`}>

                <div className="flex flex-col gap-1.5">

                    {/* TOP BAR */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <div className={`flex items-center text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'} flex-shrink-0`}>
                                <span>Filter</span>
                            </div>

                            {/* Module Switcher Tabs: Rackings | Supplies */}
                            <div className={`flex items-center p-1 rounded-xl border ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-100/90 border-slate-200'}`}>
                                {reportModules.map(mod => {
                                    const isActive = activeModule === mod.id;
                                    return (
                                        <button
                                            key={mod.id}
                                            onClick={() => setActiveModule(mod.id)}
                                            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${isActive
                                                ? (isDark ? 'bg-[#ff6600] text-white shadow-md' : 'bg-[#18174e] text-white shadow-md')
                                                : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60')
                                                }`}
                                        >
                                            <span>{mod.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Action buttons & quick filter toggles */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <label
                                className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none border px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 ${hideZeroQty
                                    ? (isDark ? 'bg-red-950/40 border-red-900/60 text-red-400' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100')
                                    : (isDark ? 'bg-[#141622] border-slate-700 text-slate-300 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100')
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={hideZeroQty}
                                    onChange={(e) => {
                                        setHideZeroQty(e.target.checked);
                                        if (e.target.checked) setShowZeroOnly(false);
                                    }}
                                    className={`w-3.5 h-3.5 rounded cursor-pointer transition-colors ${hideZeroQty ? 'accent-red-600' : (isDark ? 'accent-[#ff6600]' : 'accent-[#18174e]')
                                        }`}
                                />
                                <span className="hidden sm:inline">Hide 0 Qty</span>
                                <span className="sm:hidden text-[10px] font-bold">0 Qty</span>
                            </label>

                            {/* 0 Stock Only Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowZeroOnly(prev => {
                                        const next = !prev;
                                        if (next) setHideZeroQty(false);
                                        return next;
                                    });
                                }}
                                title={showZeroOnly ? "Show All Items" : "View Out of Stock Items"}
                                className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${showZeroOnly
                                    ? (isDark ? 'bg-rose-950/40 text-rose-300 border-rose-900/60' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100')
                                    : (isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                                    }`}
                            >
                                <Archive className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                <span className="hidden md:inline">0 Stock Only</span>
                                <span className="text-[11px] font-bold font-mono">({zeroCount})</span>
                            </button>

                            {/* With Movements Only Button (Rackings only) */}
                            {activeModule === 'raw-materials' && (
                                <button
                                    type="button"
                                    onClick={() => setHideNoMovements(prev => !prev)}
                                    title="Show only items that have Inflows or Outflows recorded in this period"
                                    className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${hideNoMovements
                                        ? (isDark ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/80' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100')
                                        : (isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                                        }`}
                                >
                                    <Sliders className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
                                    <span className="hidden md:inline">With Movements Only</span>
                                </button>
                            )}

                            {/* Monthly Summary (PDF) Button */}
                            <button
                                onClick={handleDownloadMonthlySummaryPDF}
                                disabled={loading}
                                title={`Export Monthly Summary Activity Report for ${monthsList.find(m => m.value === selectedMonth)?.label} ${selectedYear}`}
                                className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 shadow-sm disabled:opacity-50 ${isDark
                                    ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/60'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                    }`}
                            >
                                <FileText className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-indigo-500" />
                                <span className="hidden sm:inline">Monthly Summary (PDF)</span>
                            </button>

                            {/* Export Audit Ledger (PDF) Button */}
                            <button
                                onClick={handleDownloadPDF}
                                disabled={loading}
                                title={showZeroOnly ? "Download PDF of all 0 quantity items" : "Export Consolidated Ledger PDF"}
                                className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm flex-shrink-0 disabled:opacity-50 ${showZeroOnly
                                    ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                                    : (isDark ? 'border-slate-700 bg-[#ff6600] text-white hover:bg-[#ff6600]/90' : 'border-slate-200 bg-[#18174e] text-white hover:bg-[#18174e]/90')
                                    }`}
                            >
                                <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                                <span className="hidden sm:inline">{showZeroOnly ? 'Export 0 Qty Ledger (PDF)' : 'Download (PDF)'}</span>
                            </button>
                        </div>
                    </div>

                    {/* 4-COLUMN RESPONSIVE GRID (exact match to InventoryRawMaterials) */}
                    <div className="flex overflow-x-auto gap-2 items-center mt-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-4 md:pb-0">
                        {/* Column 1: Search */}
                        <div className="min-w-[180px] w-full md:min-w-0">
                            <div className="relative w-full">
                                <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                                <input
                                    type="text"
                                    placeholder="Search description, code, category..."
                                    value={globalSearch}
                                    onChange={(e) => setGlobalSearch(e.target.value)}
                                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none`}
                                />
                                {globalSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setGlobalSearch('')}
                                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Column 2: Month */}
                        <div className="min-w-[150px] w-full md:min-w-0">
                            <div className="relative w-full">
                                <Calendar className={`w-4 h-4 absolute left-3 top-2.5 pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border font-semibold rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none cursor-pointer w-full`}
                                >
                                    {monthsList.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Column 3: Year */}
                        <div className="min-w-[150px] w-full md:min-w-0">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border font-semibold rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full`}
                            >
                                {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(yr => (
                                    <option key={yr} value={yr}>{yr}</option>
                                ))}
                            </select>
                        </div>

                        {/* Column 4: View Mode */}
                        <div className="min-w-[170px] w-full md:min-w-0">
                            <select
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value)}
                                className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full font-medium`}
                            >
                                <option value="detailed">📋 Detailed Registry</option>
                                <option value="category">📂 Group by Category</option>
                                <option value="segment">🏷️ Group by Segment</option>
                            </select>
                        </div>
                    </div>

                    <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-full mt-3`}></div>
                </div>

                {/* Table Container (inside main container card) */}
                <div className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'} rounded-xl border shadow-sm overflow-hidden`}>

                    {/* TABLE PAGINATION */}
                    {!loading && activeTableData.length > 0 && (
                        <TablePagination
                            currentPage={currentPage}
                            setCurrentPage={setCurrentPage}
                            rowsPerPage={rowsPerPage}
                            setRowsPerPage={setRowsPerPage}
                            totalRows={totalTableRows}
                            options={[5, 10, 20, 50, 100]}
                        />
                    )}

                    {loading ? (
                        <div className="flex flex-col justify-center items-center min-h-[400px] text-slate-400 gap-3">
                            <Loader2 className={`w-10 h-10 animate-spin ${isDark ? 'text-[#ff6600]' : 'text-[#18174e]'}`} />
                            <span className="text-center font-medium text-xs">Compiling transaction ledger and consolidating SKU movements...</span>
                        </div>
                    ) : activeModule === 'discrepancy' ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="text-white font-bold bg-red-600 uppercase text-[11px] tracking-wider whitespace-nowrap">
                                        <th className="py-3 px-4">Slip No</th>
                                        <th className="py-3 px-4">Type</th>
                                        <th className="py-3 px-4">Customer / Party</th>
                                        <th className="py-3 px-4">Date Voided</th>
                                        <th className="py-3 px-4">Voided By</th>
                                        <th className="py-3 px-4">Discrepancy / Void Reason</th>
                                        <th className="py-3 px-4">Restored Items & Quantities</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/70 bg-[#090b10] text-slate-300' : 'divide-slate-100 bg-white text-slate-700'
                                    }`}>
                                    {activeTableData.length > 0 ? (
                                        paginatedTableData.map((log) => (
                                            <tr key={log._id} className={`transition-colors whitespace-nowrap ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-500/5'}`}>
                                                <td className="px-4 py-3 font-bold font-mono text-red-500">
                                                    {log.slipNo}
                                                </td>
                                                <td className="px-4 py-3 font-semibold">
                                                    {log.transactionType}
                                                </td>
                                                <td className={`px-4 py-3 font-medium truncate max-w-[180px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`} title={log.customer}>
                                                    {log.customer}
                                                </td>
                                                <td className={`px-4 py-3 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {log.voidedAt}
                                                </td>
                                                <td className="px-4 py-3 font-bold">
                                                    {log.voidedBy}
                                                </td>
                                                <td className="px-4 py-3 italic font-medium truncate max-w-[220px] text-red-500" title={log.voidReason}>
                                                    {log.voidReason}
                                                </td>
                                                <td className="px-4 py-3 font-semibold truncate max-w-[240px] text-emerald-600 dark:text-emerald-400" title={log.itemsRestored}>
                                                    {log.itemsRestored}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="text-center p-12 text-slate-500 font-medium italic">
                                                No voided or discrepancy transaction logs recorded.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : consolidatedData.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className={`font-bold uppercase text-[11px] tracking-wider whitespace-nowrap ${isDark ? 'bg-[#10121d] text-slate-300 border-b border-slate-800' : 'bg-[#18174e] text-white'}`}>
                                        <th className="py-3.5 px-4 w-[280px]">Item Profile</th>
                                        <th className="py-3.5 px-4">Segment</th>
                                        <th className="py-3.5 px-4">Dimension</th>
                                        {(activeModule === 'supplies' || activeModule === 'consumables') && (
                                            <th className="py-3.5 px-4 whitespace-nowrap">Serial</th>
                                        )}
                                        <th className="py-3.5 px-4 text-center">Quantity</th>
                                        <th className="py-3.5 px-4 text-center">UOM</th>
                                        {activeModule === 'raw-materials' && (
                                            <>
                                                <th className="py-3.5 px-4 min-w-[220px]">Inflows (This Month)</th>
                                                <th className="py-3.5 px-4 min-w-[220px]">Outflows (This Month)</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/70 bg-[#090b10] text-slate-300' : 'divide-slate-100 bg-white text-slate-700'}`}>
                                    {paginatedTableData.map((row) => {
                                        const isDepleted = Number(row.ActualCount ?? 0) === 0;

                                        return (
                                            <tr key={row._id} className={`transition-colors whitespace-nowrap ${isDepleted && showZeroOnly
                                                ? (isDark ? 'bg-red-500/5 hover:bg-red-500/10' : 'bg-red-50/50 hover:bg-red-50')
                                                : (isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/80')
                                                }`}>
                                                {/* 1. Item Profile (ItemDescription + Archived badge only, code removed) */}
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex flex-col min-w-0 max-w-[280px]">
                                                        <span
                                                            className={`font-semibold text-xs truncate ${isDark ? 'text-slate-100' : 'text-slate-800'}`}
                                                            title={row.ItemDescription}
                                                        >
                                                            {row.ItemDescription}
                                                        </span>
                                                        {row.isArchived && (
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 uppercase tracking-wide flex-shrink-0">
                                                                    Archived
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* 2. Segment */}
                                                <td className="px-4 py-3 whitespace-nowrap font-medium text-xs">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                        {row.Segment || 'Standard'}
                                                    </span>
                                                </td>

                                                {/* 3. Dimension */}
                                                <td className={`px-4 py-3 whitespace-nowrap font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`} title={row.Dimension}>
                                                    {row.Dimension || '—'}
                                                </td>

                                                {/* Serial (Tools & Equipments / Consumables) */}
                                                {(activeModule === 'supplies' || activeModule === 'consumables') && (
                                                    <td className={`px-4 py-3 whitespace-nowrap font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`} title={row.SerialNo}>
                                                        {row.SerialNo || '—'}
                                                    </td>
                                                )}

                                                {/* 4. Quantity (Styled same size and badge look as Inflows/Outflows) */}
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    {isDepleted ? (
                                                        <span className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap font-mono ${isDark ? 'bg-rose-950/30 border-rose-800/40 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700'
                                                            }`}>
                                                            <span>0</span>
                                                        </span>
                                                    ) : (
                                                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-semibold border whitespace-nowrap font-mono ${isDark ? 'bg-indigo-950/30 border-indigo-800/40 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                                            }`}>
                                                            <span className="font-bold">{Number(row.ActualCount ?? 0).toLocaleString()}</span>
                                                        </span>
                                                    )}
                                                </td>

                                                {/* 5. UOM */}
                                                <td className={`px-4 py-3 whitespace-nowrap text-center font-medium text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {row.UOM || 'PCS'}
                                                </td>

                                                {/* 6 & 7. Inflows & Outflows (This Month) - Rackings only */}
                                                {activeModule === 'raw-materials' && (
                                                    <>
                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="max-h-[85px] overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                                                                {row.inflows && row.inflows.length > 0 ? (
                                                                    row.inflows.map((inf, idx) => {
                                                                        const isWip = inf.type === 'WIP_IN' || inf.type === 'WIP_RET';
                                                                        const typeTag = inf.type === 'WIP_IN' ? 'WIP-IN' : inf.type === 'WIP_RET' ? 'WIP-RET' : 'IN';
                                                                        return (
                                                                            <div key={idx} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${isDark
                                                                                ? (isWip ? 'bg-amber-950/40 border-amber-800/60 text-amber-300' : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400')
                                                                                : (isWip ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                                                                                }`}>
                                                                                <span className="font-bold font-mono">
                                                                                    {typeTag}: +{inf.qty}
                                                                                </span>
                                                                                <span className="opacity-40">|</span>
                                                                                <span className="truncate max-w-[110px]" title={inf.label}>{inf.label}</span>
                                                                                <span className="opacity-40">|</span>
                                                                                <span className="font-mono opacity-80">{inf.date}</span>
                                                                            </div>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-400 italic px-1">No inflows</span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                                            <div className="max-h-[85px] overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                                                                {row.outflows && row.outflows.length > 0 ? (
                                                                    row.outflows.map((out, idx) => {
                                                                        const isWip = out.type === 'WIP_OUT' || out.type === 'WIP';
                                                                        const isReserve = out.type === 'RESERVE';
                                                                        const typeTag = isWip ? 'WIP-OUT' : isReserve ? 'RESERVE' : 'OUT';
                                                                        return (
                                                                            <div key={idx} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border whitespace-nowrap ${isDark
                                                                                ? (isWip ? 'bg-orange-950/40 border-orange-800/60 text-orange-300' : isReserve ? 'bg-purple-950/40 border-purple-800/60 text-purple-300' : 'bg-rose-950/30 border-rose-800/40 text-rose-400')
                                                                                : (isWip ? 'bg-orange-50 border-orange-200 text-orange-900' : isReserve ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-rose-50 border-rose-200 text-rose-700')
                                                                                }`}>
                                                                                <span className="font-bold font-mono">
                                                                                    {typeTag}: -{out.qty}
                                                                                </span>
                                                                                <span className="opacity-40">|</span>
                                                                                <span className="truncate max-w-[110px]" title={out.label}>{out.label}</span>
                                                                                <span className="opacity-40">|</span>
                                                                                <span className="font-mono opacity-80">{out.date}</span>
                                                                            </div>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-400 italic px-1">No outflows</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center p-14 text-slate-500 font-medium italic text-xs">
                            No records match the selected filters.
                        </div>
                    )}

                </div>
            </div>

        </div>
    );
}

export default Reports;
