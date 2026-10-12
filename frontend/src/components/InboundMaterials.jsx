import React, { useState, useEffect } from 'react';
import { FileText, Truck, Calendar, ClipboardList, ListPlus, Trash2, Search, X, Download, User, Plus, CheckCircle2, AlertCircle, Loader2, Layers, FileSpreadsheet } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from './layout/PageHeader';
import TablePagination from './common/TablePagination';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = '/api';

const RAW_MAT_URL = `${API_BASE_URL}/raw-materials`;
const PO_URL = `${API_BASE_URL}/purchase-orders`;
const CLIENT_URL = `${API_BASE_URL}/clients`;

const getTodayDateString = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - (offset * 60 * 1000));
  return localToday.toISOString().split('T')[0];
};

function InventoryInboundRawMat() {
  const { isDark } = useTheme();
  const [dbMaterials, setDbMaterials] = useState([]);
  const [poRecords, setPoRecords] = useState([]);
  const [registeredSuppliers, setRegisteredSuppliers] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [selectedMaterialSegment, setSelectedMaterialSegment] = useState('All Segments');
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalSegmentFilter, setModalSegmentFilter] = useState('All Segments');

  const [selectedPo, setSelectedPo] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalRowsPerPage, setModalRowsPerPage] = useState(10);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setModalPage(1);
  }, [selectedPo, isModalOpen]);

  // PO Form States
  const [transactionType, setTransactionType] = useState('Inbound');
  const [poNo, setPoNo] = useState('');
  const [supplier, setSupplier] = useState('');
  const [dateReceived, setDateReceived] = useState(getTodayDateString());
  const [originAddress, setOriginAddress] = useState('');
  const [manifestItems, setManifestItems] = useState([]);

  const [preparedBy, setPreparedBy] = useState('System User');

  // Autocomplete / Datalist Extractors
  const [uniqueSuppliers, setUniqueSuppliers] = useState([]);
  const [uniqueAddresses, setUniqueAddresses] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [uniqueSegments, setUniqueSegments] = useState([]);

  const [uniqueDescriptions, setUniqueDescriptions] = useState([]);
  const [uniqueDimensions, setUniqueDimensions] = useState([]);
  const [uniqueUOMs, setUniqueUOMs] = useState([]);
  const [uniqueAccounts, setUniqueAccounts] = useState([]);

  const showSuccessToast = (message) => {
    toast.custom((t) => (
      <div className={`flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 ${t.visible ? 'animate-in fade-in slide-in-from-top-4' : 'animate-out fade-out slide-out-to-top-4'}`}>
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <span className="text-sm font-semibold">{message}</span>
        <button onClick={() => toast.dismiss(t.id)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
    ));
  };

  const showErrorToast = (message) => {
    toast.custom((t) => (
      <div className={`flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 ${t.visible ? 'animate-in fade-in slide-in-from-top-4' : 'animate-out fade-out slide-out-to-top-4'}`}>
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
        <span className="text-sm font-semibold">{message}</span>
        <button onClick={() => toast.dismiss(t.id)} className="text-rose-400 hover:text-rose-600 ml-2 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
    ));
  };

  const fetchData = async () => {
    try {
      const [matsRes, posRes, suppliersRes] = await axios.all([
        axios.get(RAW_MAT_URL),
        axios.get(PO_URL),
        axios.get(`${CLIENT_URL}?type=Supplier`).catch(() => ({ data: [] }))
      ]);

      const materials = matsRes.data || [];
      const pos = posRes.data || [];
      const sups = suppliersRes.data || [];

      setDbMaterials(materials);
      setPoRecords(pos);
      setRegisteredSuppliers(sups);

      const suppliers = [...new Set(pos.map(p => p.supplier).filter(Boolean))];
      const addresses = [...new Set(pos.map(p => p.originAddress).filter(Boolean))];
      setUniqueSuppliers(suppliers);
      setUniqueAddresses(addresses);

      const categories = [...new Set(materials.map(m => m.Category).filter(Boolean))];
      const segments = [...new Set(materials.map(m => m.Segment).filter(Boolean))];
      setUniqueCategories(categories);
      setUniqueSegments(segments);

      const descriptions = [...new Set(materials.map(m => m.ItemDescription).filter(Boolean))];
      const dimensions = [...new Set(materials.map(m => m.Dimension).filter(Boolean))];
      const uoms = [...new Set(materials.map(m => m.UOM).filter(Boolean))];
      const accounts = [...new Set(materials.map(m => m.AccountTo).filter(Boolean))];

      setUniqueDescriptions(descriptions);
      setUniqueDimensions(dimensions);
      setUniqueUOMs(uoms);
      setUniqueAccounts(accounts);

    } catch (err) {
      console.error("Failed to load data from the server.", err);
    }
  };

  useEffect(() => {
    fetchData();

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const fullName = parsedUser.Fullname || parsedUser.fullname || 'System User';
        setPreparedBy(fullName);
      } catch (e) {
        console.error("Error parsing user session:", e);
      }
    }
  }, []);

  const handleSupplierChange = (e) => {
    const selectedName = e.target.value;
    setSupplier(selectedName);
    const found = registeredSuppliers.find(s => s.name === selectedName);
    if (found && found.address) {
      setOriginAddress(found.address);
    } else if (!selectedName) {
      setOriginAddress('');
    }
  };

  const handleSelectMaterial = (item) => {
    if (manifestItems.some(i => i.materialId === item._id)) {
      showErrorToast("Item already added.");
      return;
    }
    setManifestItems([...manifestItems, {
      materialId: item._id,
      Code: item.Code,
      ItemDescription: item.ItemDescription,
      Category: item.Category || 'N/A',
      Segment: item.Segment || 'N/A',
      Dimension: item.Dimension || 'N/A',
      AccountTo: item.AccountTo || 'N/A',
      qty: 1,
      UOM: item.UOM,
      actualCount: 1,
      remarks: ''
    }]);
    setSearchQuery('');
  };

  const handleUpdateField = (index, field, val) => {
    const updated = [...manifestItems];
    if (field === 'qty' || field === 'actualCount') {
      updated[index][field] = val === '' ? '' : Number(val);
    } else {
      updated[index][field] = val;
    }
    setManifestItems(updated);
  };


  const handleInitiateConfirm = (e) => {
    e.preventDefault();
    if (!poNo || poNo.trim() === "") return showErrorToast("Please fill up Purchase Order No.");
    if (manifestItems.length === 0) return showErrorToast("Please add at least one item to the manifest grid.");
    if (!dateReceived || dateReceived === "") return showErrorToast("Please select a valid Date Received.");

    const hasInvalidQty = manifestItems.some(i => i.qty === '' || i.actualCount === '' || isNaN(i.qty) || isNaN(i.actualCount));
    if (hasInvalidQty) return showErrorToast("Please input valid quantities for all items before saving.");

    setIsConfirmModalOpen(true);
  };

  const handleSavePO = async () => {
    setIsSaving(true);
    const payload = {
      poNo: poNo.trim(),
      supplier: supplier.trim() || "N/A",
      originAddress: originAddress.trim() || "N/A",
      deliveryDate: dateReceived,
      preparedBy,
      items: manifestItems.map(i => ({
        materialId: i.materialId,
        qty: Number(i.qty),
        actualCountReceived: Number(i.actualCount),
        remarks: i.remarks ? i.remarks.trim() : ""
      }))
    };

    try {
      const res = await axios.post(PO_URL, payload);
      if (res.status === 200 || res.status === 201) {
        showSuccessToast("Purchase Order Saved Successfully!");
        setManifestItems([]);
        setPoNo('');
        setSupplier('');
        setDateReceived(getTodayDateString());
        setOriginAddress('');
        setIsConfirmModalOpen(false);
        fetchData();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || "Server error connection upon logging Purchase Order.";
      showErrorToast("Error: " + errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // --- AUDIT LEDGER STYLED PDF EXPORT (INDIVIDUAL SLIP) ---
  const handleDownloadPDF = (poRecord = null) => {
    const targetPo = poRecord || selectedPo;
    if (!targetPo) return;
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const pageWidth = 297;
      const pageHeight = 210;
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;

      const formattedDate = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      const deliveryDateStr = targetPo.deliveryDate ? new Date(targetPo.deliveryDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      }) : (targetPo.createdAt ? new Date(targetPo.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      }) : '—');

      // --- PAGE 1 METADATA BLOCK (Matching Audit Ledger layout) ---
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);

      doc.text("Slip / PO No.:", 14, 38);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 23, 78);
      doc.text(`${targetPo.poNo || '—'}`, 48, 38);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Date Generated:", 185, 38);
      doc.setFont("helvetica", "normal");
      doc.text(`${formattedDate}`, 220, 38);

      doc.setFont("helvetica", "bold");
      doc.text("Transaction Type:", 14, 45);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129);
      doc.text("INBOUND RECEIVING (RACKINGS)", 48, 45);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Date Received:", 185, 45);
      doc.setFont("helvetica", "normal");
      doc.text(`${deliveryDateStr}`, 220, 45);

      doc.setFont("helvetica", "bold");
      doc.text("Supplier Origin:", 14, 52);
      doc.setFont("helvetica", "normal");
      doc.text(`${targetPo.supplier || 'N/A'}`, 48, 52);

      doc.setFont("helvetica", "bold");
      doc.text("Prepared By:", 185, 52);
      doc.setFont("helvetica", "normal");
      doc.text(`${targetPo.preparedBy || preparedBy || 'Authorized Staff'}`, 220, 52);

      if (targetPo.originAddress) {
        doc.setFont("helvetica", "bold");
        doc.text("Origin Address:", 14, 59);
        doc.setFont("helvetica", "normal");
        const cleanAddr = targetPo.originAddress.length > 70 ? targetPo.originAddress.substring(0, 68) + '…' : targetPo.originAddress;
        doc.text(`${cleanAddr}`, 48, 59);
      }

      // Calculate totals and discrepancies
      const itemsList = targetPo.items || [];
      const totalItemsCount = itemsList.length;
      const totalQtyOrdered = itemsList.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);
      const totalQtyReceived = itemsList.reduce((acc, it) => acc + (Number(it.actualCountReceived ?? it.qty ?? 0)), 0);
      const hasDiscrepancy = itemsList.some(it => {
        const ord = Number(it.qty) || 0;
        const rec = Number(it.actualCountReceived ?? it.qty ?? 0);
        return ord !== rec;
      });

      // KPI Header Table (Styled Grid matching Audit Ledger)
      const kpiStartY = targetPo.originAddress ? 64 : 58;
      autoTable(doc, {
        startY: kpiStartY,
        margin: { top: 38, bottom: 20, left: 14, right: 14 },
        head: [["1. TOTAL LINE ITEMS", "2. QUANTITY ORDERED", "3. ACTUAL RECEIVED", "4. AUDIT VERIFICATION STATUS"]],
        body: [[
          `${totalItemsCount} Material Types`,
          `${totalQtyOrdered.toLocaleString()} Units Ordered`,
          `${totalQtyReceived.toLocaleString()} Units Received`,
          hasDiscrepancy ? "DISCREPANCY (UNMATCHED COUNT)" : "VERIFIED & QUANTITY BALANCED"
        ]],
        theme: 'grid',
        headStyles: {
          fillColor: [24, 23, 78],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          cellPadding: { top: 2.8, bottom: 2.8, left: 2.5, right: 2.5 }
        },
        bodyStyles: {
          fontSize: 7.5,
          fontStyle: 'bold',
          textColor: [24, 23, 78],
          fillColor: [245, 248, 255],
          halign: 'center',
          cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 }
        },
        styles: { lineColor: [215, 225, 245], lineWidth: 0.25 }
      });

      const tableColumns = ["Item Description", "Dimension", "Count", "UOM", "Remarks"];

      // Group records by Segment (matching Consolidated Registry Report)
      const groupedData = {};
      itemsList.forEach(it => {
        const targetId = it.materialId?._id || it.materialId;
        const fullMaterial = dbMaterials.find(m => m._id === targetId);
        const segment = fullMaterial?.Segment || it.materialId?.Segment || 'STANDARD SEGMENT';
        const key = segment.trim().toUpperCase() || 'STANDARD SEGMENT';
        if (!groupedData[key]) {
          groupedData[key] = [];
        }
        groupedData[key].push({ it, fullMaterial });
      });

      const tableRows = [];
      Object.keys(groupedData).sort().forEach(groupName => {
        const itemsInGroup = groupedData[groupName];

        // Section Header Banner across all 5 columns
        tableRows.push([
          {
            content: `SEGMENT: ${groupName}   (${itemsInGroup.length} ${itemsInGroup.length === 1 ? 'ITEM' : 'ITEMS'})`,
            colSpan: 5,
            styles: {
              fillColor: [234, 239, 249],
              textColor: [24, 23, 78],
              fontStyle: 'bold',
              fontSize: 8.5,
              cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 }
            }
          }
        ]);

        itemsInGroup.forEach(({ it, fullMaterial }) => {
          const descriptionOnly = fullMaterial?.ItemDescription || it.materialId?.ItemDescription || "-";
          const dimension = fullMaterial?.Dimension || fullMaterial?.dimension ||
            fullMaterial?.Dimensions || fullMaterial?.dimensions ||
            it.materialId?.Dimension || it.materialId?.dimension ||
            it.materialId?.Dimensions || it.materialId?.dimensions || "—";

          const countVal = it.actualCountReceived !== undefined && it.actualCountReceived !== null
            ? String(it.actualCountReceived)
            : (it.qty !== undefined && it.qty !== null ? String(it.qty) : '0');

          const uom = fullMaterial?.UOM || it.materialId?.UOM || '—';
          const rem = it.remarks || "—";

          tableRows.push([descriptionOnly, dimension, countVal, uom, rem]);
        });
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 6,
        margin: { top: 38, bottom: 20, left: 14, right: 14 },
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle' },
        bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], valign: 'middle' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { overflow: 'ellipsize', cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.2, rowPageBreak: 'avoid' },
        columnStyles: {
          0: { cellWidth: 105 },
          1: { cellWidth: 45, halign: 'center' },
          2: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 74 }
        },
        didDrawCell: (data) => {
          if (data.cell.colSpan > 1) return;
          // Highlight Count (col 2)
          if (data.section === 'body' && data.column.index === 2) {
            doc.setFillColor(238, 242, 255);
            doc.rect(data.cell.x + 0.3, data.cell.y + 0.3, data.cell.width - 0.6, data.cell.height - 0.6, 'F');
            doc.setTextColor(24, 23, 78);
            doc.setFont("helvetica", "bold");
            doc.text(String(data.cell.text), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1, { align: 'center' });
          }
        }
      });

      // --- DECORATE ALL PAGES (Banner, Watermark, Footer) matching Audit Ledger exactly ---
      const totalPages = doc.internal.getNumberOfPages();
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
        doc.setFillColor(24, 23, 78);
        doc.rect(0, 0, pageWidth, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("INBOUND RAW MATERIALS & RACKINGS RECEIVING SLIP", centerX, 12, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(215, 220, 245);
        doc.text(`Material Flow Logistics & Audit Trail Control Registry  |  Slip: ${targetPo.poNo}  |  Generated: ${formattedDate}`, centerX, 20, { align: 'center' });

        // Footer
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text("CONFIDENTIAL AUDIT LEDGER - FOR INTERNAL AUTHORIZED USE ONLY", 14, pageHeight - 8);

        const pageNumber = `Page ${i} of ${totalPages}`;
        doc.text(pageNumber, pageWidth - 14, pageHeight - 8, { align: 'right' });
      }

      doc.save(`INBOUND_SLIP_${targetPo.poNo}.pdf`);
      showSuccessToast("Audit Ledger PDF Slip downloaded successfully.");
    } catch (e) {
      console.error("PDF download failure:", e);
      showErrorToast("Something went wrong while downloading the PDF.");
    }
  };

  // --- CONSOLIDATED HISTORY LOGS AUDIT LEDGER PDF ---
  const handleExportHistoryLedgerPDF = () => {
    const recordsToExport = filteredPoRecords && filteredPoRecords.length > 0 ? filteredPoRecords : poRecords;
    if (!recordsToExport || recordsToExport.length === 0) {
      showErrorToast("No history logs available to export.");
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = 297;
      const pageHeight = 210;
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;

      const formattedDate = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      // --- PAGE 1 METADATA BLOCK ---
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);

      doc.text("Report Module:", 14, 38);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 23, 78);
      doc.text("Rackings Inbound Transactions & Receiving Registry", 48, 38);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Date Generated:", 185, 38);
      doc.setFont("helvetica", "normal");
      doc.text(`${formattedDate}`, 220, 38);

      doc.setFont("helvetica", "bold");
      doc.text("Security Class:", 14, 45);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129);
      doc.text("Internal Inventory Audit Ledger", 48, 45);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Total Logs:", 185, 45);
      doc.setFont("helvetica", "normal");
      doc.text(`${recordsToExport.length} Logged Inbound Deliveries`, 220, 45);

      if (sidebarSearchQuery.trim()) {
        doc.setFont("helvetica", "bold");
        doc.text("Filter Applied:", 14, 52);
        doc.setFont("helvetica", "normal");
        doc.text(`Search Keyword: "${sidebarSearchQuery}"`, 48, 52);
      }

      // Compute summary KPI metrics
      let totalUnitsInbounded = 0;
      const distinctSuppliers = new Set();

      recordsToExport.forEach(rec => {
        if (rec.supplier) distinctSuppliers.add(rec.supplier.trim().toLowerCase());
        const items = rec.items || rec.materials || [];
        items.forEach(it => {
          totalUnitsInbounded += Number(it.actualCountReceived ?? it.qty ?? 0);
        });
      });

      // KPI Header Table
      const kpiStartY = sidebarSearchQuery.trim() ? 58 : 52;
      autoTable(doc, {
        startY: kpiStartY,
        margin: { top: 38, bottom: 20, left: 14, right: 14 },
        head: [["1. TOTAL DELIVERIES LOGGED", "2. TOTAL MATERIAL UNITS RECEIVED", "3. REGISTERED SUPPLIERS INVOLVED"]],
        body: [[
          `${recordsToExport.length} Deliveries`,
          `${totalUnitsInbounded.toLocaleString()} Units Inbounded`,
          `${distinctSuppliers.size} Suppliers Logged`
        ]],
        theme: 'grid',
        headStyles: {
          fillColor: [24, 23, 78],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          cellPadding: { top: 2.8, bottom: 2.8, left: 2.5, right: 2.5 }
        },
        bodyStyles: {
          fontSize: 7.5,
          fontStyle: 'bold',
          textColor: [24, 23, 78],
          fillColor: [245, 248, 255],
          halign: 'center',
          cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 }
        },
        styles: { lineColor: [215, 225, 245], lineWidth: 0.25 }
      });

      const tableColumns = ["#", "PO Number", "Date Received", "Supplier Origin", "Line Items Summary", "Total Received", "Prepared By", "Status"];
      const tableRows = recordsToExport.map((rec, idx) => {
        const items = rec.items || rec.materials || [];
        const dateStr = rec.deliveryDate ? new Date(rec.deliveryDate).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric'
        }) : (rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric'
        }) : '—');

        const totalQty = items.reduce((sum, it) => sum + (Number(it.actualCountReceived ?? it.qty ?? 0)), 0);

        const itemsSummary = items.map(it => {
          const targetId = it.materialId?._id || it.materialId;
          const fullMat = dbMaterials.find(m => m._id === targetId);
          const desc = fullMat?.ItemDescription || it.materialId?.ItemDescription || "Material";
          const qty = Number(it.actualCountReceived ?? it.qty ?? 0);
          const uom = fullMat?.UOM || it.materialId?.UOM || '';
          return `• ${desc}: ${qty} ${uom}`.trim();
        }).slice(0, 3).join('\n') + (items.length > 3 ? `\n… (+${items.length - 3} more items)` : '');

        return [
          String(idx + 1),
          rec.poNo || '—',
          dateStr,
          rec.supplier || 'N/A',
          itemsSummary || '—',
          `${totalQty.toLocaleString()} units`,
          rec.preparedBy || 'Staff',
          "INBOUND"
        ];
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 6,
        margin: { top: 38, bottom: 20, left: 14, right: 14 },
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle' },
        bodyStyles: { fontSize: 7.5, textColor: [50, 50, 50], valign: 'middle' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { overflow: 'linebreak', cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2, rowPageBreak: 'avoid' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 32, fontStyle: 'bold', textColor: [24, 23, 78] },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 46 },
          4: { cellWidth: 80 },
          5: { cellWidth: 27, halign: 'center', fontStyle: 'bold' },
          6: { cellWidth: 28 },
          7: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            doc.setFillColor(238, 242, 255);
            doc.rect(data.cell.x + 0.3, data.cell.y + 0.3, data.cell.width - 0.6, data.cell.height - 0.6, 'F');
            doc.setTextColor(24, 23, 78);
            doc.setFont("helvetica", "bold");
            doc.text(String(data.cell.text), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1, { align: 'center' });
          }
        }
      });

      // Decorate all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Watermark
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

        // Header Banner
        doc.setFillColor(24, 23, 78);
        doc.rect(0, 0, pageWidth, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("INBOUND RAW MATERIALS & RACKINGS TRANSACTION AUDIT LEDGER", centerX, 12, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(215, 220, 245);
        doc.text(`Material Flow Logistics & Audit Trail Control Registry  |  Total: ${recordsToExport.length} Inbound Entries  |  Generated: ${formattedDate}`, centerX, 20, { align: 'center' });

        // Footer
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text("CONFIDENTIAL AUDIT LEDGER - FOR INTERNAL AUTHORIZED USE ONLY", 14, pageHeight - 8);

        const pageNumber = `Page ${i} of ${totalPages}`;
        doc.text(pageNumber, pageWidth - 14, pageHeight - 8, { align: 'right' });
      }

      doc.save(`INBOUND_HISTORY_AUDIT_LEDGER_${new Date().toISOString().split('T')[0]}.pdf`);
      showSuccessToast("Consolidated Inbound Audit Ledger (PDF) exported successfully!");
    } catch (e) {
      console.error("Critical failure exporting History Ledger PDF:", e);
      showErrorToast("Failed to export History Ledger PDF: " + e.message);
    }
  };

  const filteredSuggestions = dbMaterials.filter(item => {
    const matchesSegment = selectedMaterialSegment === 'All Segments' ||
      (item.Segment && item.Segment.toLowerCase() === selectedMaterialSegment.toLowerCase());
    if (!matchesSegment) return false;

    if (!searchQuery.trim()) return false;

    const words = searchQuery.toLowerCase().trim().split(/\s+/);
    const desc = (item.ItemDescription || '').toLowerCase();
    const dim = (item.Dimension || item.Dimensions || item.dimension || item.dimensions || '').toLowerCase();
    const seg = (item.Segment || item.segment || '').toLowerCase();
    const code = (item.Code || '').toLowerCase();

    return words.every(word =>
      desc.includes(word) || dim.includes(word) || seg.includes(word) || code.includes(word)
    );
  });

  const modalFilteredMaterials = dbMaterials.filter(item => {
    const matchesSegment = modalSegmentFilter === 'All Segments' ||
      (item.Segment && item.Segment.toLowerCase() === modalSegmentFilter.toLowerCase());
    if (!matchesSegment) return false;

    if (!modalSearchQuery.trim()) return true;

    const words = modalSearchQuery.toLowerCase().trim().split(/\s+/);
    const desc = (item.ItemDescription || '').toLowerCase();
    const dim = (item.Dimension || item.Dimensions || item.dimension || item.dimensions || '').toLowerCase();
    const seg = (item.Segment || item.segment || '').toLowerCase();
    const code = (item.Code || '').toLowerCase();

    return words.every(word =>
      desc.includes(word) || dim.includes(word) || seg.includes(word) || code.includes(word)
    );
  });

  const filteredPoRecords = poRecords.filter(rec =>
    rec.poNo?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
    rec.supplier?.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
  );



  return (
    <div className={`mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>

      <Toaster
        position="top-right"
        containerClassName="mt-5 mr-5"
        toastOptions={{
          className: '',
          style: { background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 }
        }}
      />

      <div><PageHeader activeTab="purchase-order" /></div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className={`lg:col-span-3 min-w-0 ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100'} p-6 rounded-2xl border flex flex-col gap-6 shadow-sm`}>
          <div className={`border-b ${isDark ? 'border-slate-800 text-slate-200' : 'border-slate-100 text-slate-600'} pb-3 flex items-center justify-between gap-2 text-sm font-bold`}>
            <div className="flex items-center gap-2">
              <ListPlus className="w-4 h-4 text-[#ff6600]" />
              <span>Inbound Racking Materials</span>
            </div>
          </div>

          <form onSubmit={handleInitiateConfirm} className="flex flex-col gap-5">

            {/* COMPACT TRANSACTION TYPE CONTAINER */}
            <div className={`px-3.5 py-2 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 ${isDark ? 'bg-[#141622]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Transaction Type:
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${isDark ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                  🟢 Inbound
                </span>
              </div>
              <span className={`text-[11px] font-semibold hidden sm:inline-block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Purchase Order Inbound (Stock Addition)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Purchase Order No.</label>
                <div className="relative">
                  <input type="text" value={poNo} onChange={e => setPoNo(e.target.value)} placeholder="Enter PO Number" className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`} />
                </div>
              </div>
              <div>
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
                  Supplier Origin *
                </label>
                <select
                  value={supplier}
                  onChange={handleSupplierChange}
                  required
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer font-medium`}
                >
                  <option value="" className={isDark ? 'bg-[#141622] text-slate-300' : ''}>Select Supplier</option>
                  {registeredSuppliers.map((sup) => (
                    <option key={sup._id} value={sup.name} className={isDark ? 'bg-[#141622] text-white' : ''}>
                      {sup.name}
                    </option>
                  ))}
                  {registeredSuppliers.length === 0 && (
                    <option disabled value="">No registered supplier found (Go to Client Records)</option>
                  )}
                </select>
              </div>
              <div>
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Date Received</label>
                <div className="relative"><Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="date" value={dateReceived} onChange={e => setDateReceived(e.target.value)} className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none`} required />
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
                  Supplier Address (Auto-filled)
                </label>
                <input
                  type="text"
                  value={originAddress}
                  readOnly
                  placeholder="Automatically fetched from selected Supplier..."
                  className={`w-full ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm cursor-not-allowed select-none focus:outline-none font-medium`}
                />
              </div>
            </div>

            <div className={`${isDark ? 'bg-[#141622]/60 border-slate-800' : 'bg-slate-50 border-slate-100'} p-4 rounded-xl border flex flex-col gap-2.5 relative`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'} uppercase leading-snug`}>
                    Step 1: Type / Select Materials
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Filter by segment or search by item description and dimension.
                  </p>
                </div>
              </div>

              {/* DUAL SEARCH & SEGMENT CONTROLS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. SEGMENT FILTER */}
                <div className="sm:col-span-1">
                  <select
                    value={selectedMaterialSegment}
                    onChange={e => setSelectedMaterialSegment(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold cursor-pointer`}
                  >
                    <option value="All Segments">All Segments ({uniqueSegments.length})</option>
                    {uniqueSegments.map(seg => (
                      <option key={seg} value={seg}>{seg}</option>
                    ))}
                  </select>
                </div>

                {/* 2. SMART MULTI-ATTRIBUTE SEARCH */}
                <div className="sm:col-span-2 relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search description, dimension (e.g. 2700, 50x50), or code..."
                    className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* SEARCH SUGGESTIONS DROPDOWN WITH PROMINENT DIMENSIONS */}
              {searchQuery && (
                <div className={`absolute left-0 right-0 top-[102%] ${isDark ? 'bg-[#0e1017] border-slate-700 divide-slate-800 shadow-2xl' : 'bg-white border-slate-200 divide-slate-100 shadow-xl'} border rounded-xl max-h-72 overflow-y-auto z-50 divide-y p-1`}>
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map(item => {
                      const dimension = item.Dimension || item.Dimensions || item.dimension || item.dimensions;
                      const segment = item.Segment || item.segment;
                      const count = item.ActualCount || item.actualCount || item.AvailableStock || 0;
                      const isAdded = manifestItems.some(i => i.materialId === item._id);

                      return (
                        <div
                          key={item._id}
                          onClick={() => handleSelectMaterial(item)}
                          className={`p-2.5 ${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50'} cursor-pointer flex items-center justify-between gap-3 rounded-lg transition-colors ${isAdded ? 'opacity-60 bg-emerald-50/20' : ''
                            }`}
                        >
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'} whitespace-normal break-words`}>
                                {item.ItemDescription}
                              </span>
                              {dimension && (
                                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${isDark ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                  }`}>
                                  {dimension}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                              {segment && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                                  }`}>
                                  {segment}
                                </span>
                              )}
                              <span className="font-mono text-[10px] text-slate-400">{item.Code}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold uppercase ${isDark ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                              Avail: {count} {item.UOM || 'pcs'}
                            </span>
                            {isAdded && (
                              <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Added
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center flex flex-col items-center gap-2">
                      <p className="text-rose-500 italic font-medium text-xs">
                        No materials found matching &ldquo;{searchQuery}&rdquo; {selectedMaterialSegment !== 'All Segments' ? `in ${selectedMaterialSegment}` : ''}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* HIDE TABLE AND NOTICE UNTIL ITEMS ARE SELECTED */}
            {manifestItems.length > 0 && (
              <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-md w-fit uppercase ${isDark ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40' : 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                    }`}>
                    🟢 Quantities will be automatically added
                  </span>
                  <button
                    type="button"
                    onClick={() => setManifestItems([])}
                    className={`text-xs font-semibold px-2.5 py-1 rounded border transition-all cursor-pointer ${isDark ? 'text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    Clear Source Items
                  </button>
                </div>

                <div className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'} rounded-xl border shadow-sm overflow-x-auto`}>
                  <table className="w-full text-left border-collapse text-sm min-w-[1000px]">
                    <thead>
                      <tr className={`text-white font-bold ${isDark ? 'bg-[#0f111d]' : 'bg-emerald-700'} uppercase text-xs whitespace-nowrap`}>
                        <th className="py-3 px-4 text-center w-28 min-w-[112px]">QTY</th>
                        <th className="py-3 px-4 text-center">UOM</th>
                        <th className="py-3 px-4 text-center w-28 min-w-[112px]">Actual</th>
                        <th className="py-3 px-4">Segment</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Dimension</th>
                        <th className="py-3 px-4">Remarks</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>

                    <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 bg-[#090b10]' : 'divide-slate-100'}`}>
                      {manifestItems.map((item, index) => (
                        <tr key={item.materialId || index} className={`${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'} text-xs`}>
                          <td className="py-2 px-4 w-28 min-w-[112px]">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={e => handleUpdateField(index, 'qty', e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              className={`w-full border ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'border-slate-200 text-slate-800'} text-center rounded py-1 text-sm focus:outline-none focus:border-[#ff6600] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                            />
                          </td>

                          <td className="py-2 px-4 text-center">
                            <span className={`${isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700'} px-2 py-0.5 rounded text-xs`}>{item.UOM}</span>
                          </td>

                          <td className="py-2 px-4 w-28 min-w-[112px]">
                            <input
                              type="number"
                              min="0"
                              value={item.actualCount}
                              onChange={e => handleUpdateField(index, 'actualCount', e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              className={`w-full border ${isDark ? 'bg-[#141622] border-slate-700 text-emerald-400' : 'border-slate-200 text-emerald-600'} text-center rounded py-1 text-sm font-bold focus:outline-none focus:border-emerald-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                            />
                          </td>

                          <td className={`py-2 px-4 italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.Segment}</td>

                          <td className={`py-2 px-4 min-w-[200px] whitespace-normal break-words ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={item.ItemDescription}>
                            {item.ItemDescription}
                          </td>

                          <td className={`py-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'} whitespace-nowrap`}>{item.Dimension}</td>

                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={item.remarks}
                              onChange={e => handleUpdateField(index, 'remarks', e.target.value)}
                              placeholder="Remarks"
                              className={`w-full border ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'border-slate-200 text-slate-800'} rounded px-2 py-1 text-xs focus:outline-none focus:border-[#ff6600]`}
                            />
                          </td>

                          <td className="py-2 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setManifestItems(manifestItems.filter((_, i) => i !== index));
                                showSuccessToast("Item removed.");
                              }}
                              className="text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button type="submit" className="w-full bg-[#ff6600] hover:bg-[#e05a00] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer uppercase shadow-sm">
                  Confirm PO (Purchase Order)
                </button>
              </div>
            )}
          </form>
        </div>

        <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100'} p-4 rounded-2xl border flex flex-col gap-3 shadow-sm h-auto min-h-[400px] w-full min-w-0`}>
          <div className={`flex flex-col gap-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-2`}>
            <div className={`flex items-center justify-between w-full text-xs sm:text-sm font-bold gap-1.5 whitespace-nowrap ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
              <div className="flex items-center gap-1.5 whitespace-nowrap min-w-0">
                <ClipboardList className="w-4 h-4 text-[#ff6600] shrink-0" />
                <span className="truncate">History Logs</span>
              </div>
              <button
                type="button"
                onClick={handleExportHistoryLedgerPDF}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[#ff6600] hover:bg-[#e05a00] active:scale-95 text-white rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap shrink-0"
                title="Export all filtered history logs as Audit Ledger (PDF)"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>PDF</span>
              </button>
            </div>

          </div>
          <div className="relative mt-1">
            <input
              type="text"
              value={sidebarSearchQuery}
              onChange={e => setSidebarSearchQuery(e.target.value)}
              placeholder="Search PO or supplier..."
              className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
            />
          </div>
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[440px] pr-1 custom-scrollbar">
            {filteredPoRecords.length > 0 ? (
              filteredPoRecords.slice(0, 50).map((rec) => (
                <div
                  key={rec._id}
                  onClick={() => { setSelectedPo(rec); setIsModalOpen(true); }}
                  className={`${isDark ? 'bg-[#141622] border-slate-800 hover:border-[#ff6600]/60 hover:bg-[#181b29]' : 'bg-white border-slate-100 hover:border-[#18174e]/50 hover:shadow-md'} border rounded-xl p-2.5 flex flex-col gap-0.5 transition-all cursor-pointer group`}
                >
                  {/* Top Row: PO Number and Inbound Badge */}
                  <div className={`flex justify-between items-center pb-0.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                    <span className={`text-[9px] font-black ${isDark ? 'text-[#ff8533] group-hover:text-emerald-400' : 'text-[#18174e] group-hover:text-emerald-600'} flex items-center gap-1 truncate max-w-[110px]`}>
                      {rec.poNo}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 font-bold rounded-md border shrink-0 ${isDark ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                      Inbound
                    </span>
                  </div>

                  {/* Supplier Row */}
                  <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'} truncate`} title={rec.supplier || 'No Supplier'}>
                    {rec.supplier || 'No Supplier'}
                  </span>

                  {/* Bottom Row: Date & Items count */}
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                    <span>{rec.dateReceived ? new Date(rec.dateReceived).toLocaleDateString() : 'No Date'}</span>
                    <span className="font-bold text-slate-400">
                      {(rec.items || rec.materials || []).length} items
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <span className="text-center pt-4 text-rose-500 italic font-medium text-xs">No matching records found.</span>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && selectedPo && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl w-full max-w-3xl p-6 shadow-xl relative flex flex-col gap-4`}>

            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-lg`}>
                Inbound No: {selectedPo.poNo}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedPo)}
                  className="flex items-center gap-1.5 bg-[#ff6600] hover:bg-[#e05a00] active:scale-95 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm"
                  title={`Download Audit Ledger PDF for ${selectedPo.poNo}`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download (PDF)</span>
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={`${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'} p-1 rounded-lg cursor-pointer transition-colors`}
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-3 text-sm gap-2.5 ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-100'} p-4 rounded-xl border`}>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Transaction Type</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                  🟢 Inbound
                </span>
              </div>
              <div><span className={`text-[10px] uppercase font-bold text-slate-400 block mb-0.5`}>Purchase Order No:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedPo.poNo}</span></div>
              <div><span className={`text-[10px] uppercase font-bold text-slate-400 block mb-0.5`}>Date Received:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedPo.deliveryDate ? new Date(selectedPo.deliveryDate).toLocaleDateString() : '-'}</span></div>
              <div><span className={`text-[10px] uppercase font-bold text-slate-400 block mb-0.5`}>Supplier Profile:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedPo.supplier || 'N/A'}</span></div>
              <div><span className={`text-[10px] uppercase font-bold text-slate-400 block mb-0.5`}>Prepared By:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedPo.preparedBy || preparedBy}</span></div>
              <div className="col-span-2 sm:col-span-1"><span className={`text-[10px] uppercase font-bold text-slate-400 block mb-0.5`}>Origin Address:</span> <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} truncate block`}>{selectedPo.originAddress || 'N/A'}</span></div>
            </div>

            {(() => {
              const poItems = selectedPo.items || [];
              const modalIndexOfLastRow = modalPage * modalRowsPerPage;
              const modalIndexOfFirstRow = modalIndexOfLastRow - modalRowsPerPage;
              const paginatedPoItems = poItems.slice(modalIndexOfFirstRow, modalIndexOfLastRow);

              return (
                <div className={`border ${isDark ? 'border-slate-800' : 'border-slate-200/60'} rounded-xl relative shadow-sm overflow-hidden flex flex-col`}>
                  <TablePagination
                    currentPage={modalPage}
                    setCurrentPage={setModalPage}
                    rowsPerPage={modalRowsPerPage}
                    setRowsPerPage={setModalRowsPerPage}
                    totalRows={poItems.length}
                    options={[5, 10, 20, 50, 100]}
                  />
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                      <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#1c1117] text-rose-300' : 'bg-red-700 text-white'} text-[11px] font-bold uppercase whitespace-nowrap`}>
                        <tr>
                          <th className="p-3 text-left">Segment</th>
                          <th className="p-3 text-left">Item Description</th>
                          <th className="p-3 text-left">Dimension</th>
                          <th className="p-3 text-center">QTY Ordered</th>
                          <th className="p-3 text-right">Actual Received</th>
                          <th className="p-3 text-left pl-4">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'bg-[#090b10] divide-slate-800' : 'bg-white divide-slate-100'}`}>
                        {paginatedPoItems.map((it, idx) => {
                          const targetId = it.materialId?._id || it.materialId;
                          const fullMat = dbMaterials.find(m => m._id === targetId);

                          const segment = fullMat?.Segment || fullMat?.segment || it.materialId?.Segment || it.materialId?.segment || "N/A";
                          const desc = fullMat?.ItemDescription || it.materialId?.ItemDescription || "-";
                          const dimension = fullMat?.Dimension || fullMat?.dimension || fullMat?.Dimensions || fullMat?.dimensions || it.materialId?.Dimension || it.materialId?.dimension || "N/A";
                          const uom = fullMat?.UOM || it.materialId?.UOM || '';

                          return (
                            <tr key={it._id || idx} className={`${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/50'} transition-colors`}>
                              <td className={`p-3 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} whitespace-nowrap align-middle`}>
                                {segment}
                              </td>
                              <td className={`p-3 font-bold ${isDark ? 'text-white' : 'text-[#18174e]'} text-xs min-w-[200px] whitespace-normal break-words align-middle`} title={desc}>
                                {desc}
                              </td>
                              <td className={`p-3 ${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium whitespace-nowrap align-middle`}>
                                {dimension}
                              </td>
                              <td className={`p-3 text-center ${isDark ? 'text-slate-300' : 'text-slate-600'} whitespace-nowrap align-middle`}>
                                {it.qty} {uom}
                              </td>
                              <td className="p-3 text-right font-bold text-emerald-400 align-middle whitespace-nowrap">
                                {it.actualCountReceived} {uom}
                              </td>
                              <td className={`p-3 italic ${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium text-[11px] min-w-[120px] whitespace-normal break-words align-middle pl-4`} title={it.remarks}>
                                {it.remarks || '—'}
                              </td>
                            </tr>
                          );
                        })}
                        {poItems.length === 0 && (
                          <tr>
                            <td colSpan="6" className="p-4 text-center text-slate-400 italic">
                              No materials recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}



      {/* BROWSE ALL MATERIALS MODAL */}
      {isBrowseModalOpen && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-4xl p-6 shadow-xl relative max-h-[90vh] flex flex-col gap-4 overflow-y-auto`}>
            {/* Header */}
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                  Browse Rackings Materials Masterlist
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBrowseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
                  Filter by Segment
                </label>
                <select
                  value={modalSegmentFilter}
                  onChange={e => setModalSegmentFilter(e.target.value)}
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600] cursor-pointer`}
                >
                  <option value="All Segments">All Segments ({uniqueSegments.length})</option>
                  {uniqueSegments.map(seg => (
                    <option key={seg} value={seg}>{seg}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
                  Search Description, Dimension or Code
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={modalSearchQuery}
                    onChange={e => setModalSearchQuery(e.target.value)}
                    placeholder="Search by description or dimension (e.g. 2700, 50x50)..."
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className={`rounded-xl border overflow-x-auto overflow-y-auto flex-1 max-h-96 ${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-200'}`}>
              <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                <thead>
                  <tr className={`text-white font-bold uppercase text-[11px] sticky top-0 z-10 whitespace-nowrap ${isDark ? 'bg-[#0f111d]' : 'bg-[#18174e]'}`}>
                    <th className="py-2.5 px-3 whitespace-nowrap">Item Description</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Dimension</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Segment</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Available Stock</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                  {modalFilteredMaterials.length > 0 ? (
                    modalFilteredMaterials.map(item => {
                      const isAdded = manifestItems.some(i => i.materialId === item._id);
                      const dimension = item.Dimension || item.Dimensions || item.dimension || item.dimensions || '—';
                      const segment = item.Segment || item.segment || '—';
                      const count = item.ActualCount || item.actualCount || item.AvailableStock || 0;

                      return (
                        <tr key={item._id} className={`${isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-50 text-slate-700'} transition-colors whitespace-nowrap`}>
                          <td className="py-2.5 px-3 font-semibold min-w-[200px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="whitespace-normal break-words">{item.ItemDescription}</span>
                              <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">({item.Code})</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`font-mono text-xs font-bold px-2 py-0.5 rounded border whitespace-nowrap ${isDark
                                ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
                                : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                }`}
                            >
                              {dimension}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}>
                              {segment}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold font-mono whitespace-nowrap">
                            {count} {item.UOM || 'pcs'}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {isAdded ? (
                              <span className="text-[11px] font-bold text-emerald-500 inline-flex items-center gap-1 whitespace-nowrap">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Added
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectMaterial(item)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400 hover:bg-emerald-900/60' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                  }`}
                              >
                                + Add
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-rose-500 italic whitespace-nowrap">
                        No materials found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between mt-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                Showing {modalFilteredMaterials.length} of {dbMaterials.length} materials
              </span>
              <button
                type="button"
                onClick={() => setIsBrowseModalOpen(false)}
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col gap-5 animate-in zoom-in-95 duration-200`}>

            {/* Header */}
            <div className={`flex justify-between items-start border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#18174e]'}`}>
                  Confirm Purchase Order (Inbound)
                </h3>
                <p className="text-xs text-slate-400">
                  Please review the transaction details before committing to the database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'} transition-colors cursor-pointer`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details Summary Card */}
            <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border text-xs ${isDark ? 'bg-[#141622]/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Transaction Type</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${isDark ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                  🟢 {transactionType}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">PO Number</span>
                <span className={`font-mono font-bold ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`}>{poNo}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Supplier Origin</span>
                <span className="font-semibold">{supplier || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Date Received</span>
                <span className="font-semibold">{dateReceived ? new Date(dateReceived).toLocaleDateString() : '—'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Origin Location Address</span>
                <span className="font-semibold truncate block">{originAddress || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Prepared By</span>
                <span className="font-semibold">{preparedBy}</span>
              </div>
            </div>

            {/* Manifest Items Table */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold px-1">
                <span className="uppercase text-slate-400">Items to Receive ({manifestItems.length})</span>
                <span className="text-emerald-500">
                  Total Qty: {manifestItems.reduce((sum, item) => sum + (Number(item.actualCount) || 0), 0)}
                </span>
              </div>
              <div className={`rounded-xl border overflow-hidden max-h-56 overflow-y-auto ${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-200'}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`uppercase text-[10px] font-bold ${isDark ? 'bg-[#141622] text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-600 border-b border-slate-200'}`}>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3">Segment</th>
                      <th className="py-2 px-3">Dimension</th>
                      <th className="py-2 px-3 text-center">Expected Qty</th>
                      <th className="py-2 px-3 text-center font-bold text-emerald-500">Actual Received</th>
                      <th className="py-2 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                    {manifestItems.map((item, idx) => (
                      <tr key={idx} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                        <td className="py-2 px-3 font-semibold min-w-[180px] whitespace-normal break-words" title={item.ItemDescription}>
                          {item.ItemDescription}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {item.Segment || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                          {item.Dimension || '—'}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-400">
                          {item.qty}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-500">
                          {item.actualCount} {item.UOM}
                        </td>
                        <td className="py-2 px-3 text-slate-400 italic">
                          {item.remarks || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className={`flex items-center justify-end gap-3 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsConfirmModalOpen(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
              >
                Cancel / Edit
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSavePO}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#ff6600] hover:bg-[#e05a00] disabled:opacity-50 transition-all cursor-pointer shadow-md"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving PO...</span>
                  </>
                ) : (
                  <span>Save PO</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryInboundRawMat;
