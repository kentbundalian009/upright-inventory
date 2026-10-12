import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
    ShieldAlert,
    Search, Download, Loader2, FileText,
    TrendingUp, TrendingDown, Calendar, X, Check, ArrowUpRight,
    Archive, Sliders, Coins, Image as ImageIcon
} from 'lucide-react';
import PageHeader from './layout/PageHeader';
import TablePagination from './common/TablePagination';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from '../context/ThemeContext';
import RackDimensionCell, { parseRackDimension } from './common/RackDimensionCell';
import ReserveCountBadge from './common/ReserveCountBadge';

const BASE_API_URL = import.meta.env.MODE === 'production'
    ? 'https://one-inventory.onrender.com/api'
    : 'http://localhost:5000/api';

const formatDimensionForPdf = (dimStr) => {
    if (!dimStr || typeof dimStr !== 'string') return '—';
    const parsed = parseRackDimension(dimStr);
    if (parsed.badges && parsed.badges.length > 0) {
        const badgeText = parsed.badges.map(b => `${b.label}: ${b.value}`).join(' | ');
        return parsed.extra ? `${badgeText}\n(${parsed.extra})` : badgeText;
    }
    return dimStr || '—';
};

const getCleanItemDescription = (desc, segment) => {
    if (!desc) return '';
    let cleaned = desc
        .replace(/\s*\((new|old)\s*stocks?\)/gi, '')
        .replace(/\s*-(new|old)\s*stocks?/gi, '')
        .replace(/\s*\(fabricated\)/gi, '')
        .replace(/\s*-fabricated/gi, '')
        .trim();
    if (segment && segment !== 'N/A') {
        const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const stripped = cleaned
            .replace(new RegExp(`\\s*\\(${escaped}\\)`, 'gi'), '')
            .replace(new RegExp(`\\s*-\\s*${escaped}`, 'gi'), '')
            .trim();
        if (stripped) {
            cleaned = stripped;
        }
    }
    return cleaned || desc;
};

const getItemConditions = (item) => {
    const tags = [];
    const condStr = (item?.Condition || '').toLowerCase().trim();
    const descStr = (item?.ItemDescription || '').toLowerCase();

    if (condStr && condStr !== 'good' && condStr !== 'n/a') {
        if (condStr.includes('old stocks') || condStr.includes('old stock')) tags.push('Old Stocks');
        if (condStr.includes('new stocks') || condStr.includes('new stock')) tags.push('New Stocks');
        if (condStr.includes('fabricated')) tags.push('Fabricated');

        if (tags.length === 0 && item.Condition) {
            tags.push(item.Condition);
        }
    } else {
        if (descStr.includes('(old stocks)') || descStr.includes('(old stock)') || descStr.includes('-old stocks') || descStr.includes('-old stock')) {
            tags.push('Old Stocks');
        }
        if (descStr.includes('(new stocks)') || descStr.includes('(new stock)') || descStr.includes('-new stocks') || descStr.includes('-new stock')) {
            tags.push('New Stocks');
        }
        if (descStr.includes('(fabricated)') || descStr.includes('-fabricated')) {
            tags.push('Fabricated');
        }
    }
    return tags;
};

const getBackendBaseUrl = () => {
    if (import.meta.env.MODE === 'production') {
        return 'https://one-inventory.onrender.com';
    }
    if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.hostname || 'localhost'}:5000`;
    }
    return 'http://localhost:5000';
};

const getImageSrc = (imageUrl) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) return imageUrl;
    const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${getBackendBaseUrl()}${cleanPath}`;
};

const loadImageBase64 = async (url) => {
    if (!url) return null;
    const resolvedUrl = getImageSrc(url);
    if (!resolvedUrl) return null;

    // Fast path: already a data URL
    if (resolvedUrl.startsWith('data:')) {
        return { dataUrl: resolvedUrl, width: 60, height: 60 };
    }

    // Method 1: Fetch as Blob -> FileReader data URL (CORS safe, no canvas tainting)
    try {
        const response = await fetch(resolvedUrl, { mode: 'cors' });
        if (response.ok) {
            const blob = await response.blob();
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
                return { dataUrl };
            }
        }
    } catch (fetchErr) {
        // Fallback to Image + Canvas
    }

    // Method 2: HTML Image + Canvas with cache-busting to prevent stale uncredentialed browser cache
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const cacheBuster = resolvedUrl.includes('?') 
                ? `${resolvedUrl}&cb=${Date.now()}` 
                : `${resolvedUrl}?cb=${Date.now()}`;
            const timer = setTimeout(() => resolve(null), 3500);

            img.onload = () => {
                clearTimeout(timer);
                try {
                    const canvas = document.createElement('canvas');
                    const maxDim = 120;
                    const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
                    canvas.width = Math.max(1, Math.round(img.width * scale));
                    canvas.height = Math.max(1, Math.round(img.height * scale));
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve({
                        dataUrl: canvas.toDataURL('image/jpeg', 0.85),
                        width: canvas.width,
                        height: canvas.height
                    });
                } catch (canvasErr) {
                    resolve(null);
                }
            };
            img.onerror = () => {
                clearTimeout(timer);
                resolve(null);
            };
            img.src = cacheBuster;
        } catch (e) {
            resolve(null);
        }
    });
};

function Reports() {
    const { isDark } = useTheme();
    const [activeModule, setActiveModule] = useState('raw-materials');
    const [globalSearch, setGlobalSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear.toString());
    const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));

    const viewMode = 'detailed';
    const [hideZeroQty, setHideZeroQty] = useState(false);
    const [showZeroOnly, setShowZeroOnly] = useState(false);
    const [hideNoMovements, setHideNoMovements] = useState(false);
    const [showAcquisitionCost, setShowAcquisitionCost] = useState(false);
    const [showInventoryOnly, setShowInventoryOnly] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    const [rawMaterialsData, setRawMaterialsData] = useState([]);
    const [selectedItemIds, setSelectedItemIds] = useState(() => new Set());
    const selectAllFilterRef = useRef(null);
    const selectAllHeaderRef = useRef(null);
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

            if (resRaw?.status === 200) {
                setRawMaterialsData(resRaw.data);
                setSelectedItemIds(prev => {
                    if (!prev || prev.size === 0) {
                        return new Set((resRaw.data || []).map(item => item._id));
                    }
                    return prev;
                });
            }
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

    useEffect(() => {
        if (rawMaterialsData && rawMaterialsData.length > 0) {
            setSelectedItemIds(prev => {
                if (!prev || prev.size === 0) {
                    return new Set(rawMaterialsData.map(item => item._id));
                }
                return prev;
            });
        }
    }, [rawMaterialsData]);

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

                        if (matchedPLItem) {
                            const qty = Number(matchedPLItem.actualCountShipped || matchedPLItem.qtyRequested || 0);
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
                                        label: `${pl.plNo || 'Reserve'}: ${pl.customer || 'Hold'}`,
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
            const physicalCount = item.isArchived ? 0 : Number(item.ActualCount ?? 0);
            const reserveCount = activeModule === 'raw-materials' ? (Number(item.ReserveCount) || 0) : 0;
            const availableCount = Math.max(0, physicalCount - reserveCount);

            const isZero = activeModule === 'raw-materials' ? (availableCount === 0) : (physicalCount === 0);

            if (showZeroOnly && !isZero) {
                return;
            }
            if (hideZeroQty && isZero) {
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
                ActualCount: physicalCount,
                ReserveCount: reserveCount,
                ReserveDetails: item.ReserveDetails || [],
                AvailableCount: availableCount,
                CriticalAlert: item.CriticalAlert !== undefined ? Number(item.CriticalAlert) : 0,
                RestockWarning: item.RestockWarning !== undefined ? Number(item.RestockWarning) : 10,
                MaxStorage: item.MaxStorage !== undefined ? Number(item.MaxStorage) : 1000,
                isArchived: !!item.isArchived,
                UOM: item.UOM || 'PCS',
                AcquisitionCost: Number(item.AcquisitionCost) || 0,
                ImageUrl: item.ImageUrl || '',
                Condition: item.Condition || '',
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
                        AcquisitionCost: 0,
                        TotalAcquisitionCost: 0,
                        UOM: 'Mixed',
                        inflows: [],
                        outflows: []
                    };
                }
                grouped[key].ActualCount += item.ActualCount;
                grouped[key].Damaged += (item.Damaged || 0);
                grouped[key].TotalAcquisitionCost += ((Number(item.ActualCount) || 0) * (Number(item.AcquisitionCost) || 0));
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
                        AcquisitionCost: 0,
                        TotalAcquisitionCost: 0,
                        UOM: 'Mixed',
                        inflows: [],
                        outflows: []
                    };
                }
                grouped[key].ActualCount += item.ActualCount;
                grouped[key].Damaged += (item.Damaged || 0);
                grouped[key].TotalAcquisitionCost += ((Number(item.ActualCount) || 0) * (Number(item.AcquisitionCost) || 0));
                grouped[key].inflows.push(...item.inflows);
                grouped[key].outflows.push(...item.outflows);
            });
            masterList = Object.values(grouped);
        }

        if (hideNoMovements && !showAcquisitionCost && !showInventoryOnly) {
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

        masterList.sort((a, b) => {
            const descA = (a.ItemDescription || a.Category || a.Segment || '').trim();
            const descB = (b.ItemDescription || b.Category || b.Segment || '').trim();
            const cmp = descA.localeCompare(descB, undefined, { sensitivity: 'base', numeric: true });
            if (cmp !== 0) return cmp;
            const dimA = (a.Dimension || '').trim();
            const dimB = (b.Dimension || '').trim();
            const dimCmp = dimA.localeCompare(dimB, undefined, { sensitivity: 'base', numeric: true });
            if (dimCmp !== 0) return dimCmp;
            return (a.Code || '').localeCompare(b.Code || '', undefined, { sensitivity: 'base', numeric: true });
        });

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
    const zeroCount = currentInventory.filter(item => {
        if (item.isArchived) return false;
        if (activeModule === 'raw-materials') {
            return Math.max(0, (Number(item.ActualCount) || 0) - (Number(item.ReserveCount) || 0)) === 0;
        }
        return Number(item.ActualCount ?? 0) === 0;
    }).length;

    // Selection metrics & handlers for Rackings only
    const visibleRawMaterialItems = useMemo(() => {
        if (activeModule !== 'raw-materials') return [];
        return consolidatedData;
    }, [activeModule, consolidatedData]);

    const totalVisibleCount = visibleRawMaterialItems.length;

    const selectedCount = useMemo(() => {
        if (activeModule !== 'raw-materials') return 0;
        return visibleRawMaterialItems.filter(item => selectedItemIds.has(item._id)).length;
    }, [activeModule, visibleRawMaterialItems, selectedItemIds]);

    const isAllSelected = totalVisibleCount > 0 && selectedCount === totalVisibleCount;
    const isSomeSelected = selectedCount > 0 && selectedCount < totalVisibleCount;

    useEffect(() => {
        const isIndeterminate = isSomeSelected && !isAllSelected;
        if (selectAllFilterRef.current) {
            selectAllFilterRef.current.indeterminate = isIndeterminate;
        }
        if (selectAllHeaderRef.current) {
            selectAllHeaderRef.current.indeterminate = isIndeterminate;
        }
    }, [isSomeSelected, isAllSelected]);

    const handleToggleSelectAll = () => {
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (isAllSelected) {
                // If all visible items are selected, uncheck all visible items
                visibleRawMaterialItems.forEach(item => next.delete(item._id));
            } else {
                // Check all visible items
                visibleRawMaterialItems.forEach(item => next.add(item._id));
            }
            return next;
        });
    };

    const handleToggleItem = (id) => {
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Pagination States
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Reset pagination to page 1 on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeModule, globalSearch, selectedYear, selectedMonth, viewMode, hideZeroQty, showZeroOnly, hideNoMovements, showAcquisitionCost, showInventoryOnly]);

    const totalRackingsAcquisitionCost = useMemo(() => {
        return rawMaterialsData
            .filter(item => !item.isArchived)
            .reduce((sum, item) => sum + ((Number(item.ActualCount) || 0) * (Number(item.AcquisitionCost) || 0)), 0);
    }, [rawMaterialsData]);

    const totalFilteredAcquisitionCost = useMemo(() => {
        return consolidatedData.reduce((sum, item) => {
            if (viewMode === 'category' || viewMode === 'segment') {
                return sum + (Number(item.TotalAcquisitionCost) || 0);
            }
            return sum + ((Number(item.ActualCount) || 0) * (Number(item.AcquisitionCost) || 0));
        }, 0);
    }, [consolidatedData, viewMode]);

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

    const handleDownloadPDF = async () => {
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

        setLoading(true);
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
            const isAcquisitionReport = isRackings && showAcquisitionCost;
            const isInventoryOnly = isRackings && showInventoryOnly;

            const exportData = isRackings
                ? consolidatedData.filter(item => selectedItemIds.has(item._id))
                : consolidatedData;

            if (isRackings && exportData.length === 0) {
                alert("No items selected to export. Please check at least one item.");
                setLoading(false);
                return;
            }

            let imageMap = {};
            if (isInventoryOnly) {
                try {
                    const imagePromises = exportData.map(async (item) => {
                        if (item.ImageUrl) {
                            const loaded = await loadImageBase64(item.ImageUrl);
                            if (loaded) imageMap[item._id] = loaded;
                        }
                    });
                    await Promise.all(imagePromises);
                } catch (err) {
                    console.warn("Failed to load images for PDF:", err);
                }
            }

            const columns = isRackings
                ? (isInventoryOnly
                    ? ["Image", "Item Description", "Dimension", "Actual Count", "Reserve Count", "UOM"]
                    : isAcquisitionReport
                        ? ["Item Description", "Segment", "Dimension", "Actual Count", "Reserve", "UOM", "Acquisition Cost", "Total Acquisition Cost"]
                        : ["Item Description", "Segment", "Dimension", "Actual Count", "Reserve", "UOM", "Inflows (This Month)", "Outflows (This Month)"])
                : ["Item Description", "Segment", "Dimension", "Serial", "Quantity", "UOM"];

            const rows = [];
            if (isInventoryOnly) {
                // Group records by Segment
                const groupedData = {};
                exportData.forEach(item => {
                    const rawVal = item.Segment;
                    const key = rawVal?.trim() || 'STANDARD SEGMENT';
                    if (!groupedData[key]) {
                        groupedData[key] = [];
                    }
                    groupedData[key].push(item);
                });

                Object.keys(groupedData).sort().forEach(groupName => {
                    const itemsInGroup = groupedData[groupName];

                    // Section Header Banner across all 6 columns
                    rows.push([
                        {
                            content: `SEGMENT: ${groupName.toUpperCase()}   (${itemsInGroup.length} ${itemsInGroup.length === 1 ? 'ITEM' : 'ITEMS'})`,
                            colSpan: 6,
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
                        const physicalCount = Number(item.ActualCount ?? 0);
                        const reserveCount = Number(item.ReserveCount ?? 0);
                        const netCount = Math.max(0, physicalCount - reserveCount);
                        const displayActualQty = item.isArchived ? '0' : netCount.toLocaleString();
                        const displayReserveQty = reserveCount > 0 ? reserveCount.toLocaleString() : '—';
                        const formattedDimension = formatDimensionForPdf(item.Dimension);

                        const crit = item.CriticalAlert !== undefined ? Number(item.CriticalAlert) : 0;
                        const reord = item.RestockWarning !== undefined ? Number(item.RestockWarning) : 10;
                        const overstk = item.MaxStorage !== undefined ? Number(item.MaxStorage) : 1000;

                        let conditionType = 'healthy';
                        if (netCount <= crit) conditionType = 'critical';
                        else if (netCount <= reord) conditionType = 'reorder';
                        else if (netCount > overstk) conditionType = 'overstock';

                        const cleanDesc = getCleanItemDescription(item.ItemDescription, item.Segment);
                        const conditions = getItemConditions(item);
                        const descText = conditions.length > 0
                            ? `${cleanDesc}\n(${conditions.join(', ')})`
                            : cleanDesc;

                        rows.push([
                            { content: '', rawItemId: item._id },
                            item.isArchived ? `${descText} (Archived)` : descText,
                            formattedDimension,
                            {
                                content: reserveCount > 0 ? `${displayActualQty}\n(Tot: ${physicalCount.toLocaleString()})` : displayActualQty,
                                condition: conditionType,
                                isReserve: false
                            },
                            {
                                content: displayReserveQty,
                                isReserve: true,
                                hasReserve: reserveCount > 0
                            },
                            item.UOM || 'PCS'
                        ]);
                    });
                });
            } else {
                // Group records by Segment across all modules (Rackings, Supplies, Consumables)
                const groupedData = {};
                exportData.forEach(item => {
                    const rawVal = item.Segment;
                    const key = rawVal?.trim() || 'STANDARD SEGMENT';
                    if (!groupedData[key]) {
                        groupedData[key] = [];
                    }
                    groupedData[key].push(item);
                });

                Object.keys(groupedData).sort().forEach(groupName => {
                    const itemsInGroup = groupedData[groupName];

                    // Section Header Banner across all columns
                    rows.push([
                        {
                            content: `SEGMENT: ${groupName.toUpperCase()}   (${itemsInGroup.length} ${itemsInGroup.length === 1 ? 'ITEM' : 'ITEMS'})`,
                            colSpan: isRackings ? 8 : 6,
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

                    const physicalCount = Number(item.ActualCount ?? 0);
                    const reserveCount = Number(item.ReserveCount ?? 0);
                    const netCount = Math.max(0, physicalCount - reserveCount);
                    const displayActualQty = item.isArchived ? '0' : netCount.toLocaleString();
                    const displayReserveQty = reserveCount > 0 ? reserveCount.toLocaleString() : '—';
                    const formattedDimension = isRackings ? formatDimensionForPdf(item.Dimension) : (item.Dimension || '—');

                    const countVal = netCount;
                    const crit = item.CriticalAlert !== undefined ? Number(item.CriticalAlert) : 0;
                    const reord = item.RestockWarning !== undefined ? Number(item.RestockWarning) : 10;
                    const overstk = item.MaxStorage !== undefined ? Number(item.MaxStorage) : 1000;

                    let conditionType = 'healthy';
                    if (countVal <= crit) conditionType = 'critical';
                    else if (countVal <= reord) conditionType = 'reorder';
                    else if (countVal > overstk) conditionType = 'overstock';

                    let itemRow;
                    if (isRackings) {
                        if (isAcquisitionReport) {
                            const costVal = Number(item.AcquisitionCost) || 0;
                            const totVal = viewMode === 'detailed'
                                ? (physicalCount * costVal)
                                : (Number(item.TotalAcquisitionCost) || 0);
                            itemRow = [
                                item.isArchived ? `${item.ItemDescription || '—'} (Archived)` : (item.ItemDescription || '—'),
                                item.Segment || 'Standard',
                                formattedDimension,
                                {
                                    content: reserveCount > 0 ? `${displayActualQty}\n(Tot: ${physicalCount.toLocaleString()})` : displayActualQty,
                                    condition: conditionType,
                                    isReserve: false
                                },
                                {
                                    content: displayReserveQty,
                                    isReserve: true,
                                    hasReserve: reserveCount > 0
                                },
                                item.UOM || 'PCS',
                                viewMode === 'detailed' ? `PHP ${costVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
                                `PHP ${totVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            ];
                        } else {
                            itemRow = [
                                item.isArchived ? `${item.ItemDescription || '—'} (Archived)` : (item.ItemDescription || '—'),
                                item.Segment || 'Standard',
                                formattedDimension,
                                {
                                    content: reserveCount > 0 ? `${displayActualQty}\n(Tot: ${physicalCount.toLocaleString()})` : displayActualQty,
                                    condition: conditionType,
                                    isReserve: false
                                },
                                {
                                    content: displayReserveQty,
                                    isReserve: true,
                                    hasReserve: reserveCount > 0
                                },
                                item.UOM || 'PCS',
                                formatLogs(item.inflows, false),
                                formatLogs(item.outflows, true)
                            ];
                        }
                    } else {
                        itemRow = [
                            item.isArchived ? `${item.ItemDescription || '—'} (Archived)` : (item.ItemDescription || '—'),
                            item.Segment || 'Standard',
                            item.Dimension || '—',
                            item.SerialNo || '—',
                            displayActualQty,
                            item.UOM || 'PCS'
                        ];
                    }

                    rows.push(itemRow);
                });
            });
            }

            if (isAcquisitionReport) {
                const selectedTotal = exportData.reduce((sum, item) => sum + ((Number(item.ActualCount) || 0) * (Number(item.AcquisitionCost) || 0)), 0);
                const isAllSelectedInExport = exportData.length === rawMaterialsData.filter(i => !i.isArchived).length;
                rows.push([
                    {
                        content: isAllSelectedInExport ? 'TOTAL ACQUISITION COST (ALL RACKINGS)' : 'TOTAL ACQUISITION COST (SELECTED ITEMS)',
                        colSpan: 6,
                        styles: {
                            fontStyle: 'bold',
                            halign: 'right',
                            fillColor: [234, 239, 249],
                            textColor: [24, 23, 78],
                            fontSize: 8.5
                        }
                    },
                    {
                        content: `PHP ${selectedTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        colSpan: 2,
                        styles: {
                            fontStyle: 'bold',
                            halign: 'right',
                            fillColor: [234, 239, 249],
                            textColor: [225, 29, 72],
                            fontSize: 8.5
                        }
                    }
                ]);
            }

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
                        : isInventoryOnly
                            ? `${titleModule.toUpperCase()} INVENTORY MASTERLIST REPORT`
                            : isAcquisitionReport
                                ? `${titleModule.toUpperCase()} ACQUISITION COST & INVENTORY VALUATION AUDIT REPORT`
                                : `${titleModule.toUpperCase()} CONSOLIDATED REGISTRY REPORT`;
                    doc.text(reportHeaderTitle, centerX, 12, { align: 'center' });

                    doc.setFontSize(8.5);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(215, 220, 245);
                    const reportSubtitle = showZeroOnly
                        ? `Zero Stock Inventory Verification & Replenishment Audit  |  Covered: ${targetMonthLabel} ${currentYearStr}  |  Generated: ${formattedDate}`
                        : isInventoryOnly
                            ? `Alphabetical Inventory Balance & Physical Stock Ledger  |  Covered: ${targetMonthLabel} ${currentYearStr}  |  Generated: ${formattedDate}`
                            : isAcquisitionReport
                                ? `Comprehensive Capital Asset & Acquisition Cost Valuation Ledger  |  Covered: ${targetMonthLabel} ${currentYearStr}  |  Generated: ${formattedDate}`
                                : `Material Flow Logistics & Audit Trail Control Registry  |  Covered: ${targetMonthLabel} ${currentYearStr}  |  Generated: ${formattedDate}`;
                    doc.text(reportSubtitle, centerX, 20, { align: 'center' });

                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(8);
                    doc.setTextColor(120, 120, 120);
                    doc.text("CONFIDENTIAL - SYSTEM CENTRAL LEDGER USE ONLY - AUTHORIZED ACCESS ONLY", 14, pageHeight - 8);
                    const pageNumber = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
                    doc.text(pageNumber, pageWidth - 14, pageHeight - 8, { align: 'right' });
                },
                willDrawCell: (data) => {
                    if (data.cell.colSpan > 1) return;
                    if (data.section === 'body') {
                        if (isRackings) {
                            if (data.column.index === 3) {
                                const cond = data.cell.raw?.condition;
                                if (cond === 'critical') {
                                    data.cell.styles.fillColor = [254, 205, 211];      // Rich visible Rose-200
                                    data.cell.styles.textColor = [159, 18, 57];        // Rose-900 bold
                                } else if (cond === 'reorder') {
                                    data.cell.styles.fillColor = [254, 215, 120];      // Rich visible Amber-200
                                    data.cell.styles.textColor = [120, 53, 15];        // Amber-950 bold
                                } else if (cond === 'overstock') {
                                    data.cell.styles.fillColor = [191, 219, 254];      // Rich visible Blue-200
                                    data.cell.styles.textColor = [30, 58, 138];        // Blue-900 bold
                                } else {
                                    data.cell.styles.fillColor = [167, 243, 208];      // Rich visible Emerald-200
                                    data.cell.styles.textColor = [6, 95, 70];          // Emerald-900 bold
                                }
                                data.cell.styles.fontStyle = 'bold';
                            } else if (data.column.index === 4) {
                                if (data.cell.raw?.hasReserve) {
                                    data.cell.styles.fillColor = [254, 243, 199];      // Amber-100
                                    data.cell.styles.textColor = [180, 83, 9];         // Amber-700
                                    data.cell.styles.fontStyle = 'bold';
                                } else {
                                    data.cell.styles.textColor = [156, 163, 175];      // Gray-400
                                }
                            }
                        } else {
                            if (data.column.index === 4) {
                                const rawText = String(data.cell.text || '');
                                const countVal = Number(rawText.replace(/,/g, ''));
                                if (isNaN(countVal) || countVal === 0) {
                                    data.cell.styles.fillColor = [254, 205, 211];
                                    data.cell.styles.textColor = [159, 18, 57];
                                } else {
                                    data.cell.styles.fillColor = [238, 242, 255];
                                    data.cell.styles.textColor = [24, 23, 78];
                                }
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    }
                },
                didDrawCell: (data) => {
                    // Skip drawing on section subheader rows
                    if (data.cell.colSpan > 1) return;

                    // Image rendering for isInventoryOnly (column 0)
                    if (isInventoryOnly && data.section === 'body' && data.column.index === 0) {
                        const itemId = data.cell.raw?.rawItemId;
                        const imgObj = imageMap[itemId];
                        if (imgObj && imgObj.dataUrl) {
                            const cellX = data.cell.x;
                            const cellY = data.cell.y;
                            const cellW = data.cell.width;
                            const cellH = data.cell.height;
                            const targetSize = Math.min(cellW - 2, cellH - 2, 11);
                            const imgX = cellX + (cellW - targetSize) / 2;
                            const imgY = cellY + (cellH - targetSize) / 2;
                            try {
                                doc.addImage(imgObj.dataUrl, 'JPEG', imgX, imgY, targetSize, targetSize);
                            } catch (err) {}
                        } else {
                            doc.setTextColor(180, 180, 180);
                            doc.setFontSize(7);
                            doc.setFont("helvetica", "normal");
                            doc.text("—", data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2), { align: 'center', baseline: 'middle' });
                        }
                    }

                    // Left indicator bars for Inflows (col 6) and Outflows (col 7) - Rackings movements only
                    if (isRackings && !isAcquisitionReport && !isInventoryOnly && data.section === 'body' && (data.column.index === 6 || data.column.index === 7)) {
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

                    // Full-box solid highlighting for Actual Count cell (column 3 in Rackings, column 4 in other modules)
                    if (data.section === 'body' && (isRackings ? data.column.index === 3 : data.column.index === 4)) {
                        let bg = [238, 242, 255];
                        let text = [24, 23, 78];

                        if (isRackings) {
                            const cond = data.cell.raw?.condition;
                            if (cond === 'critical') {
                                bg = [254, 205, 211];       // Rich visible Rose-200
                                text = [159, 18, 57];        // Rose-900 bold
                            } else if (cond === 'reorder') {
                                bg = [254, 215, 120];       // Rich visible Amber-200
                                text = [120, 53, 15];        // Amber-950 bold
                            } else if (cond === 'overstock') {
                                bg = [191, 219, 254];       // Rich visible Blue-200
                                text = [30, 58, 138];        // Blue-900 bold
                            } else {
                                bg = [167, 243, 208];       // Rich visible Emerald-200
                                text = [6, 95, 70];          // Emerald-900 bold
                            }
                        } else {
                            const countVal = Number(String(data.cell.text || '').replace(/,/g, ''));
                            if (isNaN(countVal) || countVal === 0) {
                                bg = [254, 205, 211];
                                text = [159, 18, 57];
                            }
                        }

                        // 1. Fill the entire cell box with solid background (no colored outline)
                        doc.setFillColor(...bg);
                        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');

                        // 2. Standard subtle table grid border (seamless with table theme)
                        doc.setDrawColor(230, 230, 230);
                        doc.setLineWidth(0.2);
                        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'S');

                        // 3. High contrast text
                        doc.setTextColor(...text);
                        doc.setFont("helvetica", "bold");
                        
                        const textLines = Array.isArray(data.cell.text) ? data.cell.text : String(data.cell.text || '').split('\n');
                        if (textLines.length > 1) {
                            doc.setFontSize(7.5);
                            doc.text(String(textLines[0]), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) - 1.8, { align: 'center', baseline: 'middle' });
                            doc.setFontSize(5.5);
                            doc.setFont("helvetica", "normal");
                            doc.setTextColor(100, 116, 139);
                            doc.text(String(textLines[1]), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 2.4, { align: 'center', baseline: 'middle' });
                        } else {
                            doc.setFontSize(data.cell.styles.fontSize || 8);
                            doc.text(String(textLines[0] || ''), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2), { align: 'center', baseline: 'middle' });
                        }
                    }

                    // Reserve cell solid highlighting for Rackings (column 4)
                    if (isRackings && data.section === 'body' && data.column.index === 4 && data.cell.raw?.hasReserve) {
                        doc.setFillColor(254, 243, 199);
                        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');

                        doc.setDrawColor(230, 230, 230);
                        doc.setLineWidth(0.2);
                        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'S');

                        doc.setTextColor(180, 83, 9);
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(data.cell.styles.fontSize || 8);
                        const cellText = Array.isArray(data.cell.text) ? data.cell.text.join('') : String(data.cell.text || '');
                        doc.text(cellText, data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2), { align: 'center', baseline: 'middle' });
                    }
                },
                headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle' },
                bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], valign: 'middle' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { 
                    overflow: 'linebreak', 
                    cellPadding: 2.5, 
                    lineColor: [230, 230, 230], 
                    lineWidth: 0.2, 
                    rowPageBreak: 'avoid',
                    ...(isInventoryOnly ? { minCellHeight: 13 } : {})
                },
                columnStyles: isRackings ? (
                    isInventoryOnly ? {
                        0: { cellWidth: 18, halign: 'center' },
                        1: { cellWidth: 105 },
                        2: { cellWidth: 55 },
                        3: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
                        4: { cellWidth: 32, halign: 'center' },
                        5: { cellWidth: 27, halign: 'center' }
                    } : isAcquisitionReport ? {
                        0: { cellWidth: 68 },
                        1: { cellWidth: 26 },
                        2: { cellWidth: 32 },
                        3: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
                        4: { cellWidth: 16, halign: 'center' },
                        5: { cellWidth: 14, halign: 'center' },
                        6: { cellWidth: 46, halign: 'right' },
                        7: { cellWidth: 49, halign: 'right', fontStyle: 'bold' }
                    } : {
                        0: { cellWidth: 68 },
                        1: { cellWidth: 26 },
                        2: { cellWidth: 32 },
                        3: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
                        4: { cellWidth: 16, halign: 'center' },
                        5: { cellWidth: 13, halign: 'center' },
                        6: { cellWidth: 48, fontSize: 7 },
                        7: { cellWidth: 48, fontSize: 7 }
                    }
                ) : {
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
                : isInventoryOnly
                    ? `${activeModuleStr}_INVENTORY_ONLY_ALPHABETICAL_${targetMonthLabel.toUpperCase()}_${currentYearStr}.pdf`
                    : isAcquisitionReport
                        ? `${activeModuleStr}_ACQUISITION_COST_${viewMode.toUpperCase()}_${targetMonthLabel.toUpperCase()}_${currentYearStr}.pdf`
                        : `${activeModuleStr}_${viewMode.toUpperCase()}_CONSOLIDATED_${targetMonthLabel.toUpperCase()}_${currentYearStr}.pdf`;
            doc.save(saveFileName);
        } catch (e) {
            console.error("🔴 PDF CRITICAL FAILURE REASON:", e);
            alert(`Failed to download Consolidated Registry: ${e.message}`);
        } finally {
            setLoading(false);
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
                // Filter Outbound Dispatches (Packing Lists)
                const monthPLs = packingLists.filter(pl => !pl.isVoided && pl.transactionType === "Outbound" && matchSelectedDate(pl.shipmentDate || pl.createdAt));
                // Filter Outbound Reservations (Reserved Slips)
                const monthReserves = packingLists.filter(pl => !pl.isVoided && pl.transactionType === "Reserve" && matchSelectedDate(pl.shipmentDate || pl.createdAt));

                if (monthPOs.length === 0 && monthWIP.length === 0 && monthPLs.length === 0 && monthReserves.length === 0) {
                    alert(`No Rackings activities (Inbound, WIP, Outbound, or Reservations) logged for ${targetMonthLabel} ${currentYearStr}.`);
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

                const totalReservedMonthQty = monthReserves.reduce((acc, pl) => {
                    const plTotal = (pl.items || []).reduce((sum, it) => {
                        return sum + Number(it.qtyRequested || it.actualCountShipped || 0);
                    }, 0);
                    return acc + plTotal;
                }, 0);

                // --- PAGE 1 METADATA BLOCK (Matching Export Audit Ledger) ---
                doc.setTextColor(40, 40, 40);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9.5);

                doc.text("Report Module:", 14, 38);
                doc.setFont("helvetica", "normal");
                doc.text("Rackings Monthly Activity Summary (Inbound, WIP, Outbound & Reserves)", 48, 38);

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
                    `Outbound: ${monthPLs.length} Dispatches (${totalOutboundQty.toLocaleString()} Units)\nReserves: ${monthReserves.length} Slips (${totalReservedMonthQty.toLocaleString()} Units Held)`
                ]];

                autoTable(doc, {
                    startY: currentY,
                    margin: { top: 38, bottom: 20, left: 14, right: 14 },
                    head: [["1. INBOUND DELIVERIES OVERVIEW", "2. WIP PRODUCTION & CONVERSIONS", "3. OUTBOUND & RESERVATIONS OVERVIEW"]],
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
                                    formatDimensionForPdf(dimension),
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
                            return `• ${itemDesc} [${formatDimensionForPdf(dimension)}] (${qty.toLocaleString()} ${uom})`;
                        }).join('\n') || 'None';

                        const producedStr = (wip.outputs || []).map(it => {
                            const { itemDesc, dimension, uom } = resolveMaterialInfo(it);
                            const qty = it.qtyProduced || 0;
                            return `• ${itemDesc} [${formatDimensionForPdf(dimension)}] (${qty.toLocaleString()} ${uom})`;
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
                                    formatDimensionForPdf(dimension),
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

                currentY = doc.lastAutoTable.finalY + 8;

                // --- SECTION 4: OUTBOUND ACTIVE RESERVATIONS ---
                if (monthReserves.length > 0) {
                    renderSectionBanner(`D. OUTBOUND ACTIVE RESERVATIONS & HELD ORDERS   (${monthReserves.length} SLIPS   |   ${totalReservedMonthQty.toLocaleString()} UNITS HELD)`);

                    const resColumns = ["Reservation Date", "Slip / Tracking No", "Customer / Destination", "Item Description", "Dimension", "Reserved Qty", "Logistics / Carrier", "Prepared By"];
                    const resRows = [];

                    monthReserves.forEach(pl => {
                        const plDate = formatShortDate(pl.shipmentDate || pl.createdAt);
                        const plNum = pl.plNo || 'N/A';
                        const plCustomer = `${pl.customer || 'N/A'}${pl.destinationAddress ? `\n(${pl.destinationAddress})` : ''}`;
                        const plRef = `${pl.carrier || pl.logisticsProvider || ''}${pl.referencePlNo ? `\nRef: ${pl.referencePlNo}` : ''}` || '—';
                        const plUser = pl.preparedBy || 'System User';

                        const plItems = pl.items || [];
                        if (plItems.length === 0) {
                            resRows.push([plDate, plNum, plCustomer, "No items listed", "—", "0", plRef, plUser]);
                        } else {
                            plItems.forEach(it => {
                                const { itemDesc, dimension, uom } = resolveMaterialInfo(it);
                                const count = Number(it.qtyRequested || it.actualCountShipped || 0);
                                resRows.push([
                                    plDate,
                                    plNum,
                                    plCustomer,
                                    itemDesc,
                                    formatDimensionForPdf(dimension),
                                    `${count.toLocaleString()} ${uom}`,
                                    plRef,
                                    plUser
                                ]);
                            });
                        }
                    });

                    autoTable(doc, {
                        startY: currentY,
                        margin: { top: 38, bottom: 20, left: 14, right: 14 },
                        head: [resColumns],
                        body: resRows,
                        theme: 'grid',
                        headStyles: { fillColor: [180, 83, 9], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle', cellPadding: 2.5 },
                        bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], cellPadding: 2.5, valign: 'middle' },
                        alternateRowStyles: { fillColor: [254, 252, 246] },
                        styles: { overflow: 'linebreak', cellPadding: 2.5, lineColor: [240, 220, 180], lineWidth: 0.2, rowPageBreak: 'avoid' },
                        columnStyles: {
                            0: { cellWidth: 24, fontStyle: 'bold' },
                            1: { cellWidth: 26, fontStyle: 'bold', textColor: [180, 83, 9] },
                            2: { cellWidth: 42 },
                            3: { cellWidth: 74 },
                            4: { cellWidth: 35 },
                            5: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
                            6: { cellWidth: 22 },
                            7: { cellWidth: 22 }
                        },
                        didDrawCell: (data) => {
                            if (data.section === 'body' && data.column.index === 5) {
                                doc.setFillColor(254, 243, 199);
                                doc.rect(data.cell.x + 0.5, data.cell.y + 0.5, data.cell.width - 1, data.cell.height - 1, 'F');
                                doc.setTextColor(180, 83, 9);
                                doc.setFont("helvetica", "bold");
                                doc.text(String(data.cell.text), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1, { align: 'center' });
                            }
                        }
                    });

                    currentY = doc.lastAutoTable.finalY + 8;
                }

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
                                            onClick={() => {
                                                setActiveModule(mod.id);
                                                if (mod.id !== 'raw-materials') {
                                                    setShowAcquisitionCost(false);
                                                    setShowInventoryOnly(false);
                                                }
                                            }}
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

                            {/* TOTAL ACQUISITION COST BADGE FOR RACKINGS */}
                            {activeModule === 'raw-materials' && (
                                <div className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border select-none transition-all flex-shrink-0 ${showAcquisitionCost
                                    ? (isDark ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/70 shadow-sm' : 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm')
                                    : (isDark ? 'bg-[#141622] text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200')
                                    }`}>
                                    <Coins className={`w-3.5 h-3.5 ${showAcquisitionCost ? 'text-emerald-500' : (isDark ? 'text-slate-400' : 'text-slate-500')}`} />
                                    <span>Total Acquisition Cost:</span>
                                    <span className="font-mono font-black text-red-600 dark:text-red-400">
                                        ₱{totalRackingsAcquisitionCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* LAYER 2: Quick Filter Checkboxes */}
                    <div className="flex items-center gap-2 flex-wrap pt-1.5">
                        {/* 0. Select All - Rackings only (placed before Hide 0 Qty) */}
                        {activeModule === 'raw-materials' && (
                            <label
                                className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none border px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 ${isAllSelected
                                    ? (isDark ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/80 shadow-sm' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 shadow-sm')
                                    : isSomeSelected
                                        ? (isDark ? 'bg-indigo-950/20 text-indigo-300 border-indigo-800/50' : 'bg-indigo-50/50 text-indigo-700 border-indigo-200/80 hover:bg-indigo-50')
                                        : (isDark ? 'bg-[#141622] text-slate-300 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100')
                                    }`}
                                title={isAllSelected ? "Click to deselect all items" : "Click to select all visible items"}
                            >
                                <input
                                    type="checkbox"
                                    ref={selectAllFilterRef}
                                    checked={isAllSelected}
                                    onChange={handleToggleSelectAll}
                                    className={`w-3.5 h-3.5 rounded cursor-pointer transition-colors ${isAllSelected || isSomeSelected
                                        ? (isDark ? 'accent-[#ff6600]' : 'accent-[#18174e]')
                                        : ''
                                        }`}
                                />
                                <span>Select All</span>
                                <span className="text-[11px] font-bold font-mono">
                                    ({selectedCount}/{totalVisibleCount})
                                </span>
                            </label>
                        )}

                        {/* 1. Hide 0 Qty - hidden when 0 Qty Only is checked */}
                        {!showZeroOnly && (
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
                                    className={`w-3.5 h-3.5 rounded cursor-pointer transition-colors ${hideZeroQty ? 'accent-red-600' : (isDark ? 'accent-[#ff6600]' : 'accent-[#18174e]')}`}
                                />
                                <span>Hide 0 Qty</span>
                            </label>
                        )}

                        {/* 2. 0 Qty Only - hidden when Hide 0 Qty is checked */}
                        {!hideZeroQty && (
                            <label
                                className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none border px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 ${showZeroOnly
                                    ? (isDark ? 'bg-rose-950/40 text-rose-300 border-rose-900/60' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100')
                                    : (isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={showZeroOnly}
                                    onChange={(e) => {
                                        setShowZeroOnly(e.target.checked);
                                        if (e.target.checked) setHideZeroQty(false);
                                    }}
                                    className={`w-3.5 h-3.5 rounded cursor-pointer transition-colors ${showZeroOnly ? 'accent-rose-600' : (isDark ? 'accent-[#ff6600]' : 'accent-[#18174e]')}`}
                                />
                                <span>0 Qty Only</span>
                                <span className="text-[11px] font-bold font-mono">({zeroCount})</span>
                            </label>
                        )}

                        {/* 3. Movements Only (Rackings only) - hidden when Acquisition Cost or Inventory Only is checked */}
                        {activeModule === 'raw-materials' && !showAcquisitionCost && !showInventoryOnly && (
                            <label
                                className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none border px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 ${hideNoMovements
                                    ? (isDark ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/80' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100')
                                    : (isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={hideNoMovements}
                                    onChange={(e) => {
                                        setHideNoMovements(e.target.checked);
                                        if (e.target.checked) {
                                            setShowAcquisitionCost(false);
                                            setShowInventoryOnly(false);
                                        }
                                    }}
                                    className={`w-3.5 h-3.5 rounded cursor-pointer transition-colors ${hideNoMovements ? 'accent-indigo-600' : (isDark ? 'accent-[#ff6600]' : 'accent-[#18174e]')}`}
                                />
                                <span>Movements Only</span>
                            </label>
                        )}

                        {/* 4. Acquisition Cost (Rackings only) - hidden when Movements Only is checked */}
                        {activeModule === 'raw-materials' && !hideNoMovements && (
                            <label
                                className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none border px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 ${showAcquisitionCost
                                    ? (isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600 shadow-sm ring-1 ring-emerald-500/50' : 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm ring-1 ring-emerald-400')
                                    : (isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={showAcquisitionCost}
                                    onChange={(e) => {
                                        setShowAcquisitionCost(e.target.checked);
                                        if (e.target.checked) {
                                            setHideNoMovements(false);
                                            setShowInventoryOnly(false);
                                        }
                                    }}
                                    className={`w-3.5 h-3.5 rounded cursor-pointer transition-colors ${showAcquisitionCost ? 'accent-emerald-600' : (isDark ? 'accent-[#ff6600]' : 'accent-[#18174e]')}`}
                                />
                                <span>Acquisition Cost</span>
                            </label>
                        )}

                        {/* 5. Inventory Only (Rackings only) - beside Acquisition Cost */}
                        {activeModule === 'raw-materials' && !hideNoMovements && (
                            <label
                                className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none border px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 ${showInventoryOnly
                                    ? (isDark ? 'bg-blue-950/60 text-blue-300 border-blue-600 shadow-sm ring-1 ring-blue-500/50' : 'bg-blue-50 text-blue-700 border-blue-300 shadow-sm ring-1 ring-blue-400')
                                    : (isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={showInventoryOnly}
                                    onChange={(e) => {
                                        setShowInventoryOnly(e.target.checked);
                                        if (e.target.checked) {
                                            setHideNoMovements(false);
                                            setShowAcquisitionCost(false);
                                        }
                                    }}
                                    className={`w-3.5 h-3.5 rounded cursor-pointer transition-colors ${showInventoryOnly ? 'accent-blue-600' : (isDark ? 'accent-[#ff6600]' : 'accent-[#18174e]')}`}
                                />
                                <span>Inventory Only</span>
                            </label>
                        )}
                    </div>

                    {/* LAYER 3: PDF Export Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap pt-1.5">
                        {/* Movements Summary (PDF) Button */}
                        <button
                            onClick={handleDownloadMonthlySummaryPDF}
                            disabled={loading}
                            title={`Export Monthly Summary Activity Report for ${monthsList.find(m => m.value === selectedMonth)?.label} ${selectedYear}`}
                            className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 shadow-sm disabled:opacity-50 ${isDark
                                ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/60'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                }`}
                        >
                            <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            <span>Movements Summary (PDF)</span>
                        </button>

                        {/* Export Audit Ledger (PDF) Button */}
                        <button
                            onClick={handleDownloadPDF}
                            disabled={loading}
                            title={activeModule === 'raw-materials' && selectedCount < totalVisibleCount
                                ? `Export ${selectedCount} selected items to PDF`
                                : (showZeroOnly ? "Download PDF of all 0 quantity items" : showInventoryOnly ? "Export Alphabetical Inventory Only Ledger PDF" : showAcquisitionCost ? "Export Acquisition Cost & Valuation Ledger PDF" : "Export Consolidated Ledger PDF")}
                            className={`flex items-center gap-1.5 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm flex-shrink-0 disabled:opacity-50 ${showZeroOnly
                                ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                                : (isDark ? 'border-slate-700 bg-[#ff6600] text-white hover:bg-[#ff6600]/90' : 'border-slate-200 bg-[#18174e] text-white hover:bg-[#18174e]/90')
                                }`}
                        >
                            <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            <span>
                                {showZeroOnly ? 'Export 0 Qty Ledger (PDF)' : showInventoryOnly ? 'Export Inventory Ledger (PDF)' : showAcquisitionCost ? 'Export Cost Ledger (PDF)' : 'Download (PDF)'}
                                {activeModule === 'raw-materials' && selectedCount < totalVisibleCount ? ` (${selectedCount})` : ''}
                            </span>
                        </button>
                    </div>

                    {/* 3-COLUMN RESPONSIVE GRID */}
                    <div className="flex overflow-x-auto gap-2 items-center mt-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:pb-0">
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
                                        {activeModule === 'raw-materials' && (
                                            <th className="py-3.5 px-3 text-center whitespace-nowrap w-[44px]">
                                                <input
                                                    type="checkbox"
                                                    ref={selectAllHeaderRef}
                                                    checked={isAllSelected}
                                                    onChange={handleToggleSelectAll}
                                                    className={`w-3.5 h-3.5 rounded cursor-pointer transition-colors ${isAllSelected || isSomeSelected
                                                        ? (isDark ? 'accent-[#ff6600]' : 'accent-[#18174e]')
                                                        : ''
                                                        }`}
                                                    title={isAllSelected ? "Deselect all rows" : "Select all rows"}
                                                />
                                            </th>
                                        )}
                                        {activeModule === 'raw-materials' && showInventoryOnly ? (
                                            <>
                                                <th className="py-3.5 px-3 text-center whitespace-nowrap w-[60px]">Image</th>
                                                <th className="py-3.5 px-4 whitespace-nowrap min-w-[220px]">Item Description</th>
                                                <th className="py-3.5 px-4 whitespace-nowrap min-w-[120px]">Dimension</th>
                                                <th className="py-3.5 px-4 text-center whitespace-nowrap">Actual Count</th>
                                                <th className="py-3.5 px-4 text-center whitespace-nowrap">Reserve Count</th>
                                                <th className="py-3.5 px-4 text-center whitespace-nowrap">UOM</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="py-3.5 px-4 w-[280px]">Item Profile</th>
                                                <th className="py-3.5 px-4">Segment</th>
                                                <th className="py-3.5 px-4">Dimension</th>
                                                {(activeModule === 'supplies' || activeModule === 'consumables') && (
                                                    <th className="py-3.5 px-4 whitespace-nowrap">Serial</th>
                                                )}
                                                {activeModule === 'raw-materials' ? (
                                                    <>
                                                        <th className="py-3.5 px-4 text-center whitespace-nowrap">Actual Count</th>
                                                        <th className="py-3.5 px-4 text-center whitespace-nowrap">Reserve Count</th>
                                                    </>
                                                ) : (
                                                    <th className="py-3.5 px-4 text-center">Quantity</th>
                                                )}
                                                <th className="py-3.5 px-4 text-center">UOM</th>
                                                {activeModule === 'raw-materials' && (
                                                    showAcquisitionCost ? (
                                                        <>
                                                            <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[140px]">Acquisition Cost</th>
                                                            <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[170px]">Total Acquisition Cost</th>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <th className="py-3.5 px-4 min-w-[220px]">Inflows (This Month)</th>
                                                            <th className="py-3.5 px-4 min-w-[220px]">Outflows (This Month)</th>
                                                        </>
                                                    )
                                                )}
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/70 bg-[#090b10] text-slate-300' : 'divide-slate-100 bg-white text-slate-700'}`}>
                                    {paginatedTableData.map((row) => {
                                        const isDepleted = Number(row.ActualCount ?? 0) === 0;
                                        const isSelected = selectedItemIds.has(row._id);

                                        return (
                                            <tr key={row._id} className={`transition-colors whitespace-nowrap ${isDepleted && showZeroOnly
                                                ? (isDark ? 'bg-red-500/5 hover:bg-red-500/10' : 'bg-red-50/50 hover:bg-red-50')
                                                : (isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/80')
                                                } ${activeModule === 'raw-materials' && !isSelected ? 'opacity-60' : ''}`}>
                                                {activeModule === 'raw-materials' && (
                                                    <td className="py-2.5 px-3 text-center whitespace-nowrap w-[44px]" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleItem(row._id)}
                                                            className={`w-3.5 h-3.5 rounded cursor-pointer transition-colors ${isSelected
                                                                ? (isDark ? 'accent-[#ff6600]' : 'accent-[#18174e]')
                                                                : ''
                                                                }`}
                                                            title={isSelected ? "Uncheck to exclude from PDF export" : "Check to include in PDF export"}
                                                        />
                                                    </td>
                                                )}
                                                {activeModule === 'raw-materials' && showInventoryOnly ? (
                                                    <>
                                                        {/* 1. Image */}
                                                        <td className="py-2 px-3 text-center whitespace-nowrap">
                                                            {row.ImageUrl ? (
                                                                <div className="relative inline-block">
                                                                    <img
                                                                        src={getImageSrc(row.ImageUrl)}
                                                                        alt={row.ItemDescription || "Material"}
                                                                        crossOrigin="anonymous"
                                                                        loading="lazy"
                                                                        onError={(e) => {
                                                                            e.target.style.display = 'none';
                                                                            if (e.target.nextElementSibling) {
                                                                                e.target.nextElementSibling.style.display = 'flex';
                                                                            }
                                                                        }}
                                                                        onClick={() => setPreviewImage(getImageSrc(row.ImageUrl))}
                                                                        className={`w-10 h-10 object-cover rounded-lg cursor-pointer hover:scale-110 ${isDark ? 'hover:border-[#ff6600]' : 'hover:border-[#18174e]'} transition-all mx-auto shadow-sm`}
                                                                    />
                                                                    <div style={{ display: 'none' }} className={`w-10 h-10 rounded-lg ${isDark ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-slate-100 text-slate-400 border-slate-200'} items-center justify-center border border-dashed mx-auto`}>
                                                                        <ImageIcon className="w-4 h-4" />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className={`w-10 h-10 rounded-lg ${isDark ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-slate-100 text-slate-400 border-slate-200'} flex items-center justify-center border border-dashed mx-auto`}>
                                                                    <ImageIcon className="w-4 h-4" />
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* 2. Item Description */}
                                                        <td className="py-3 px-4 min-w-[200px]">
                                                            <div className={`font-semibold whitespace-normal break-words transition-colors ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                                                                {getCleanItemDescription(row.ItemDescription, row.Segment)}
                                                            </div>

                                                            {/* Condition Badges */}
                                                            {(() => {
                                                                const conditions = getItemConditions(row);
                                                                if (!conditions || conditions.length === 0) return null;
                                                                return (
                                                                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                                        {conditions.map((cond, idx) => {
                                                                            let badgeStyle = isDark
                                                                                ? 'bg-slate-800 text-slate-300 border-slate-700'
                                                                                : 'bg-slate-100 text-slate-700 border-slate-200';

                                                                            if (cond === 'New Stocks') {
                                                                                badgeStyle = isDark
                                                                                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80'
                                                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                                                            } else if (cond === 'Old Stocks') {
                                                                                badgeStyle = isDark
                                                                                    ? 'bg-amber-950/60 text-amber-300 border-amber-800/80'
                                                                                    : 'bg-amber-50 text-amber-700 border-amber-200';
                                                                            } else if (cond === 'Fabricated') {
                                                                                badgeStyle = isDark
                                                                                    ? 'bg-purple-950/60 text-purple-300 border-purple-800/80'
                                                                                    : 'bg-purple-50 text-purple-700 border-purple-200';
                                                                            }

                                                                            return (
                                                                                <span
                                                                                    key={idx}
                                                                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border leading-none inline-flex items-center gap-1 ${badgeStyle}`}
                                                                                >
                                                                                    <span>{cond === 'New Stocks' ? '🟢' : cond === 'Old Stocks' ? '🟡' : cond === 'Fabricated' ? '🟣' : '🏷️'}</span>
                                                                                    <span>{cond}</span>
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                );
                                                            })()}

                                                            {row.isArchived && (
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 uppercase tracking-wide flex-shrink-0">
                                                                        Archived
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* 3. Dimension */}
                                                        <td
                                                            className={`py-3 px-4 min-w-[120px] whitespace-normal break-words transition-colors ${
                                                                isDark ? 'text-slate-300' : 'text-slate-600'
                                                            }`}
                                                            title={row.Dimension}
                                                        >
                                                            <RackDimensionCell dimension={row.Dimension} isDark={isDark} />
                                                        </td>

                                                        {/* 4. Actual Count */}
                                                        <td className="py-3 px-4 text-center">
                                                            <div className="flex flex-col items-center justify-center">
                                                                <span className={`font-bold font-mono text-sm ${Math.max(0, (Number(row.ActualCount) || 0) - (Number(row.ReserveCount) || 0)) === 0 ? 'text-rose-500 font-extrabold' : (isDark ? 'text-white' : 'text-slate-900')}`}>
                                                                    {Math.max(0, (Number(row.ActualCount) || 0) - (Number(row.ReserveCount) || 0)).toLocaleString()}
                                                                </span>
                                                                {Number(row.ReserveCount) > 0 && (
                                                                    <span className="text-[10px] text-slate-400 font-mono leading-tight mt-0.5 select-none" title={`Total Physical Stock: ${(Number(row.ActualCount) || 0).toLocaleString()} | Reserved: ${Number(row.ReserveCount).toLocaleString()}`}>
                                                                        (Total: {(Number(row.ActualCount) || 0).toLocaleString()})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* 5. Reserve Count */}
                                                        <td className="py-3 px-4 text-center">
                                                            <ReserveCountBadge rawMat={row} isDark={isDark} />
                                                        </td>

                                                        {/* 6. UOM */}
                                                        <td className={`py-3 px-4 text-center font-medium text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                            {row.UOM || 'PCS'}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
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
                                                        <td className={`px-4 py-3 whitespace-normal break-words ${isDark ? 'text-slate-300' : 'text-slate-600'}`} title={row.Dimension}>
                                                            {activeModule === 'raw-materials' ? (
                                                                <RackDimensionCell dimension={row.Dimension} isDark={isDark} />
                                                            ) : (
                                                                <span className="font-mono text-xs">{row.Dimension || '—'}</span>
                                                            )}
                                                        </td>

                                                        {/* Serial (Tools & Equipments / Consumables) */}
                                                        {(activeModule === 'supplies' || activeModule === 'consumables') && (
                                                            <td className={`px-4 py-3 whitespace-nowrap font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`} title={row.SerialNo}>
                                                                {row.SerialNo || '—'}
                                                            </td>
                                                        )}

                                                        {/* 4. Actual Count & Reserve Count for Rackings, Quantity for others */}
                                                        {activeModule === 'raw-materials' ? (() => {
                                                            const physicalCount = Number(row.ActualCount ?? 0);
                                                            const reserveCount = Number(row.ReserveCount ?? 0);
                                                            const netCount = Math.max(0, physicalCount - reserveCount);
                                                            const crit = row.CriticalAlert !== undefined ? Number(row.CriticalAlert) : 0;
                                                            const reord = row.RestockWarning !== undefined ? Number(row.RestockWarning) : 10;
                                                            const overstk = row.MaxStorage !== undefined ? Number(row.MaxStorage) : 1000;

                                                            let fullBoxClasses = isDark
                                                                ? 'bg-emerald-950/70 text-emerald-300 font-bold'
                                                                : 'bg-emerald-100 text-emerald-950 font-bold';

                                                            if (netCount <= crit) {
                                                                fullBoxClasses = isDark
                                                                    ? 'bg-rose-950/80 text-rose-300 font-bold'
                                                                    : 'bg-rose-100 text-rose-950 font-bold';
                                                            } else if (netCount <= reord) {
                                                                fullBoxClasses = isDark
                                                                    ? 'bg-amber-950/80 text-amber-300 font-bold'
                                                                    : 'bg-amber-100 text-amber-950 font-bold';
                                                            } else if (netCount > overstk) {
                                                                fullBoxClasses = isDark
                                                                    ? 'bg-blue-950/80 text-blue-300 font-bold'
                                                                    : 'bg-blue-100 text-blue-950 font-bold';
                                                            }

                                                            return (
                                                                <>
                                                                    <td className={`px-4 py-3 whitespace-nowrap text-center font-mono text-xs transition-colors ${fullBoxClasses}`}>
                                                                        <div className="flex flex-col items-center justify-center">
                                                                            <span>{netCount.toLocaleString()}</span>
                                                                            {reserveCount > 0 && (
                                                                                <span 
                                                                                    className="text-[9.5px] opacity-75 font-mono leading-tight mt-0.5 select-none" 
                                                                                    title={`Total Physical Stock: ${physicalCount.toLocaleString()} | Reserved: ${reserveCount.toLocaleString()}`}
                                                                                >
                                                                                    (Total: {physicalCount.toLocaleString()})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                                                        <ReserveCountBadge rawMat={row} isDark={isDark} />
                                                                    </td>
                                                                </>
                                                            );
                                                        })() : (
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
                                                        )}

                                                        {/* 5. UOM */}
                                                        <td className={`px-4 py-3 whitespace-nowrap text-center font-medium text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                                            {row.UOM || 'PCS'}
                                                        </td>

                                                        {/* 6 & 7. Acquisition Cost & Total Acquisition Cost OR Inflows & Outflows (This Month) - Rackings only */}
                                                        {activeModule === 'raw-materials' && (
                                                            showAcquisitionCost ? (
                                                                <>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-xs">
                                                                        {viewMode === 'detailed' ? (
                                                                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                                                                                ₱{(Number(row.AcquisitionCost) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-slate-400 italic">—</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-xs font-bold text-red-600 dark:text-red-400">
                                                                        ₱{(viewMode === 'detailed'
                                                                            ? ((Number(row.ActualCount) || 0) * (Number(row.AcquisitionCost) || 0))
                                                                            : (Number(row.TotalAcquisitionCost) || 0)
                                                                        ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </td>
                                                                </>
                                                            ) : (
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
                                                            )
                                                        )}
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {activeModule === 'raw-materials' && showAcquisitionCost && consolidatedData.length > 0 && (
                                    <tfoot>
                                        <tr className={`font-bold text-xs uppercase tracking-wider border-t-2 ${isDark ? 'bg-[#10121d] text-slate-200 border-slate-700' : 'bg-slate-50 text-slate-800 border-slate-200'
                                            }`}>
                                            <td colSpan={4} className="px-4 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Total (All Rackings):</span>
                                                    <span className="font-mono font-black text-red-600 dark:text-red-400 text-sm">
                                                        ₱{totalRackingsAcquisitionCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                    {totalFilteredAcquisitionCost !== totalRackingsAcquisitionCost && (
                                                        <span className="text-[10px] font-normal lowercase text-slate-400">
                                                            (current filtered: ₱{totalFilteredAcquisitionCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-mono font-bold whitespace-nowrap">
                                                {consolidatedData.reduce((sum, i) => sum + Math.max(0, Number(i.ActualCount || 0) - Number(i.ReserveCount || 0)), 0).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-mono font-bold text-amber-500 whitespace-nowrap">
                                                {consolidatedData.reduce((sum, i) => sum + Number(i.ReserveCount || 0), 0).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3.5 text-center text-slate-400 whitespace-nowrap">
                                                TOTAL
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono text-slate-400 whitespace-nowrap">
                                                —
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono font-black text-red-600 dark:text-red-400 text-sm whitespace-nowrap">
                                                ₱{totalFilteredAcquisitionCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    ) : (
                        <div className="text-center p-14 text-slate-500 font-medium italic text-xs">
                            No records match the selected filters.
                        </div>
                    )}

                </div>
            </div>

            {/* LIGHTBOX CONTAINER FOR FULL IMAGE PREVIEW */}
            {previewImage && (
                <div 
                    className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-[60] p-4" 
                    onClick={() => setPreviewImage(null)}
                >
                    <div 
                        className="relative bg-white dark:bg-[#141622] p-2 rounded-2xl max-w-2xl w-full shadow-2xl border dark:border-slate-700" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setPreviewImage(null)} 
                            className="absolute top-4 right-4 bg-slate-900/80 text-white hover:bg-slate-800 p-2 rounded-full transition-all cursor-pointer z-10 shadow"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <img 
                            src={previewImage} 
                            alt="Large Display" 
                            className="w-full h-auto max-h-[80vh] object-contain rounded-xl" 
                        />
                    </div>
                </div>
            )}

        </div>
    );
}

export default Reports;
