import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Trash2, ClipboardList, Search, X, Download, User, Layers, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from './layout/PageHeader';
import TablePagination from './common/TablePagination';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = import.meta.env.MODE === 'production'
  ? 'https://one-inventory.onrender.com/api'
  : 'http://localhost:5000/api';

const RAW_MAT_URL = `${API_BASE_URL}/raw-materials`;
const CONVERSION_URL = `${API_BASE_URL}/conversions`;
const CLIENT_URL = `${API_BASE_URL}/clients`;

function InventoryWIP() {
  const { isDark } = useTheme();
  const [dbMaterials, setDbMaterials] = useState([]);
  const [conversionRecords, setConversionRecords] = useState([]);

  const [rawMatSearchQuery, setRawMatSearchQuery] = useState('');
  const [outputSearchQuery, setOutputSearchQuery] = useState('');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [selectedConversion, setSelectedConversion] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalRowsPerPage, setModalRowsPerPage] = useState(10);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setModalPage(1);
  }, [selectedConversion, isModalOpen]);

  // WIP / Conversion Form States
  const [productionType, setProductionType] = useState('Fabricated');
  const [dateProcessed, setDateProcessed] = useState(new Date().toISOString().split('T')[0]);
  const [customer, setCustomer] = useState('');
  const [registeredCustomers, setRegisteredCustomers] = useState([]);
  const [remarks, setRemarks] = useState('');
  const [preparedBy, setPreparedBy] = useState('System User');

  // Manifest Grids (State Containers)
  const [inputMaterials, setInputMaterials] = useState([]);
  const [outputItems, setOutputItems] = useState([]);

  // Custom Inline Toast Message States
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Segment and Browse Modals State
  const [selectedInputSegment, setSelectedInputSegment] = useState('All Segments');
  const [isInputBrowseModalOpen, setIsInputBrowseModalOpen] = useState(false);
  const [inputModalSearchQuery, setInputModalSearchQuery] = useState('');
  const [inputModalSegmentFilter, setInputModalSegmentFilter] = useState('All Segments');

  const [selectedOutputSegment, setSelectedOutputSegment] = useState('All Segments');
  const [isOutputBrowseModalOpen, setIsOutputBrowseModalOpen] = useState(false);
  const [outputModalSearchQuery, setOutputModalSearchQuery] = useState('');
  const [outputModalSegmentFilter, setOutputModalSegmentFilter] = useState('All Segments');

  const uniqueSegments = Array.from(
    new Set(
      dbMaterials
        .map(item => item.Segment || item.segment)
        .filter(Boolean)
    )
  ).sort();

  // Auto-dismiss utility para sa mga custom toast alerts
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const fetchData = async () => {
    try {
      const [matsRes, convsRes, clientsRes] = await Promise.all([
        axios.get(RAW_MAT_URL),
        axios.get(CONVERSION_URL),
        axios.get(`${CLIENT_URL}?type=Customer`).catch(() => ({ data: [] }))
      ]);
      setDbMaterials(matsRes.data || []);
      setConversionRecords(convsRes.data || []);
      if (clientsRes?.data) {
        setRegisteredCustomers(clientsRes.data);
      }
    } catch (err) {
      console.error("Error loading registry data:", err);
      setErrorMessage("Failed to load data from the server.");
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
        console.error("Error configuring session context:", e);
      }
    }
  }, []);

  // --- INPUT RAW MATERIAL HANDLERS ---
  const handleSelectRawMaterial = (item) => {
    if (inputMaterials.some(i => i.materialId === item._id)) {
      setRawMatSearchQuery('');
      return;
    }
    setInputMaterials([...inputMaterials, {
      materialId: item._id,
      Code: item.Code,
      ItemDescription: item.ItemDescription,

      Category: item.Category || 'N/A',
      Segment: item.Segment || 'N/A',
      Dimension: item.Dimension || 'N/A',

      qtyUsed: 1,
      Available: item.ActualCount || 0,
      UOM: item.UOM || 'pcs'
    }]);
    setRawMatSearchQuery('');
  };

  const handleUpdateInputQty = (index, val) => {
    const updated = [...inputMaterials];
    updated[index].qtyUsed = val === '' ? '' : Number(val);
    setInputMaterials(updated);
  };

  // --- DYNAMIC OUTPUT HANDLERS (RAW MATERIALS ONLY) ---
  const handleSelectOutputItem = (item, type) => {
    if (outputItems.some(o => o.itemId === item._id && o.itemType === type)) {
      setOutputSearchQuery('');
      return;
    }
    setOutputItems([...outputItems, {
      itemId: item._id,
      itemType: type,
      Code: item.Code,
      ItemDescription: item.ItemDescription,

      Category: item.Category || 'N/A',
      Segment: item.Segment || 'N/A',
      Dimension: item.Dimension || 'N/A',

      qtyProduced: 1,
      UOM: item.UOM || 'pcs'
    }]);
    setOutputSearchQuery('');
  };

  const handleUpdateOutputQty = (index, val) => {
    const updated = [...outputItems];
    updated[index].qtyProduced = val === '' ? '' : Number(val);
    setOutputItems(updated);
  };

  // --- SUBMIT TRANSACTION TO BACKEND ---
  const handleInitiateConfirm = (e) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!customer) {
      setErrorMessage("Please select a registered customer.");
      return;
    }

    if (inputMaterials.length === 0) {
      setErrorMessage("Please add at least one Raw Material input.");
      return;
    }
    if (outputItems.length === 0) {
      setErrorMessage("Please add at least one Output Return or Scrap line.");
      return;
    }

    const hasInvalidInputQty = inputMaterials.some(i => i.qtyUsed === '' || i.qtyUsed <= 0);
    const hasInvalidOutputQty = outputItems.some(o => o.qtyProduced === '' || o.qtyProduced <= 0);
    if (hasInvalidInputQty || hasInvalidOutputQty) {
      setErrorMessage("Please enter a valid quantity for all items.");
      return;
    }

    for (const item of inputMaterials) {
      if (item.qtyUsed > item.Available) {
        setErrorMessage(`Insufficient stock for ${item.Code} (${item.ItemDescription || 'No Description'}). Available: ${item.Available}, Attempted Deduction: ${item.qtyUsed}.`);
        return;
      }
    }

    setIsConfirmModalOpen(true);
  };

  const handleSaveConversion = async () => {
    setIsSaving(true);
    const payload = {
      productionType,
      dateProcessed,
      preparedBy,
      customer,
      remarks: customer,
      inputs: inputMaterials.map(i => ({
        materialId: i.materialId,
        qtyUsed: Number(i.qtyUsed)
      })),
      outputs: outputItems.map(o => ({
        itemId: o.itemId,
        itemType: o.itemType,
        qtyProduced: Number(o.qtyProduced)
      }))
    };

    try {
      const res = await axios.post(CONVERSION_URL, payload);
      if (res.status === 200 || res.status === 201) {
        setSuccessMessage("WIP/Conversion executed successfully! Inventories realigned.");
        setInputMaterials([]);
        setOutputItems([]);
        setCustomer('');
        setRemarks('');
        setProductionType('Fabricated');
        setIsConfirmModalOpen(false);
        fetchData();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || "Server error upon logging conversion sheet.";
      setErrorMessage(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  // --- AUDIT LEDGER STYLED PDF EXPORT (INDIVIDUAL SLIP) ---
  const handleDownloadPDF = (conversionRecord = null) => {
    const targetRec = conversionRecord || selectedConversion;
    if (!targetRec) return;
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
      const processedDateStr = targetRec.dateProcessed ? new Date(targetRec.dateProcessed).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      }) : (targetRec.createdAt ? new Date(targetRec.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      }) : '—');

      // --- PAGE 1 METADATA BLOCK ---
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);

      doc.text("Conversion / WIP No.:", 14, 38);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 23, 78);
      doc.text(`${targetRec.conversionNo || '—'}`, 54, 38);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Date Generated:", 185, 38);
      doc.setFont("helvetica", "normal");
      doc.text(`${formattedDate}`, 220, 38);

      doc.setFont("helvetica", "bold");
      doc.text("Process Mode:", 14, 45);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text(`${(targetRec.productionType || 'Fabricated').toUpperCase()}`, 54, 45);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Date Processed:", 185, 45);
      doc.setFont("helvetica", "normal");
      doc.text(`${processedDateStr}`, 220, 45);

      doc.setFont("helvetica", "bold");
      doc.text("Customer Target:", 14, 52);
      doc.setFont("helvetica", "normal");
      doc.text(`${targetRec.customer || targetRec.remarks || 'Standard Production'}`, 54, 52);

      doc.setFont("helvetica", "bold");
      doc.text("Prepared By:", 185, 52);
      doc.setFont("helvetica", "normal");
      doc.text(`${targetRec.preparedBy || preparedBy || 'Authorized Staff'}`, 220, 52);

      // Calculate totals
      let totalConsumedQty = 0;
      let totalProducedQty = 0;
      (targetRec.inputs || []).forEach(it => { totalConsumedQty += Number(it.qtyUsed || 0); });
      (targetRec.outputs || []).forEach(it => { totalProducedQty += Number(it.qtyProduced || 0); });

      // KPI Header Table
      autoTable(doc, {
        startY: 59,
        margin: { top: 38, bottom: 20, left: 14, right: 14 },
        head: [["1. RAW MATERIALS CONSUMED (INPUTS)", "2. FINISHED PRODUCTS YIELD (OUTPUTS)", "3. NET CONVERSION YIELD STATUS"]],
        body: [[
          `${totalConsumedQty.toLocaleString()} Units (${targetRec.inputs?.length || 0} Material Lines)`,
          `${totalProducedQty.toLocaleString()} Units (${targetRec.outputs?.length || 0} Output Lines)`,
          totalConsumedQty >= totalProducedQty ? "CONVERSION NORMAL (BALANCED)" : "HIGH-YIELD FABRICATION"
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
      const tableRows = [];

      const inputsList = targetRec.inputs || [];
      const outputsList = targetRec.outputs || [];

      if (inputsList.length > 0) {
        // Section Header Banner for Input Raw Materials
        tableRows.push([
          {
            content: `SEGMENT: RAW MATERIAL INPUTS (CONSUMED)   (${inputsList.length} ${inputsList.length === 1 ? 'ITEM' : 'ITEMS'})`,
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

        inputsList.forEach(it => {
          const targetId = it.materialId?._id || it.materialId;
          const fullMat = dbMaterials?.find(m => m._id === targetId);

          const descOnly = fullMat?.ItemDescription || it.materialId?.ItemDescription || "-";
          const dimension = fullMat?.Dimension || fullMat?.dimension || fullMat?.Dimensions || fullMat?.dimensions || it.materialId?.Dimension || it.materialId?.dimension || "—";
          const uom = fullMat?.UOM || it.materialId?.UOM || '—';

          tableRows.push([
            `${descOnly} (Input / Consumed)`,
            dimension,
            `-${it.qtyUsed}`,
            uom,
            it.remarks || "Raw Material Input (Deducted)"
          ]);
        });
      }

      if (outputsList.length > 0) {
        // Section Header Banner for Output Finished Products
        tableRows.push([
          {
            content: `SEGMENT: FINISHED GOODS OUTPUTS (YIELD)   (${outputsList.length} ${outputsList.length === 1 ? 'ITEM' : 'ITEMS'})`,
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

        outputsList.forEach(it => {
          const targetId = it.itemId?._id || it.itemId;
          const fullMat = dbMaterials?.find(m => m._id === targetId);

          const descOnly = fullMat?.ItemDescription || it.itemId?.ItemDescription || "-";
          const dimension = fullMat?.Dimension || fullMat?.dimension || fullMat?.Dimensions || fullMat?.dimensions || it.itemId?.Dimension || it.itemId?.dimension || "—";
          const uom = fullMat?.UOM || it.itemId?.UOM || '—';

          tableRows.push([
            `${descOnly} (Output / Yield)`,
            dimension,
            `+${it.qtyProduced}`,
            uom,
            it.remarks || "Yield Conversion Output"
          ]);
        });
      }

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
          if (data.section === 'body' && data.column.index === 2) {
            const rawVal = String(data.cell.text || '');
            const isDeduction = rawVal.startsWith('-');
            if (isDeduction) {
              doc.setFillColor(254, 242, 242);
              doc.rect(data.cell.x + 0.3, data.cell.y + 0.3, data.cell.width - 0.6, data.cell.height - 0.6, 'F');
              doc.setTextColor(225, 29, 72);
              doc.setFont("helvetica", "bold");
              doc.text(rawVal, data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1, { align: 'center' });
            } else {
              doc.setFillColor(240, 253, 244);
              doc.rect(data.cell.x + 0.3, data.cell.y + 0.3, data.cell.width - 0.6, data.cell.height - 0.6, 'F');
              doc.setTextColor(16, 185, 129);
              doc.setFont("helvetica", "bold");
              doc.text(rawVal, data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1, { align: 'center' });
            }
          }
        }
      });

      // Decorate all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        try {
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.05 }));
          const logoWidth = 75;
          const logoHeight = 75;
          doc.addImage('/cropped_circle_image.png', 'PNG', centerX - (logoWidth / 2), centerY - (logoHeight / 2), logoWidth, logoHeight);
          doc.restoreGraphicsState();
        } catch (e) { }

        doc.setFillColor(24, 23, 78);
        doc.rect(0, 0, pageWidth, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("PRODUCTION WORK IN PROGRESS (WIP) SHEET", centerX, 12, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(215, 220, 245);
        doc.text(`Material Conversion & Yield Control Registry  |  Slip: ${targetRec.conversionNo}  |  Generated: ${formattedDate}`, centerX, 20, { align: 'center' });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text("CONFIDENTIAL AUDIT LEDGER - FOR INTERNAL AUTHORIZED USE ONLY", 14, pageHeight - 8);

        const pageNumber = `Page ${i} of ${totalPages}`;
        doc.text(pageNumber, pageWidth - 14, pageHeight - 8, { align: 'right' });
      }

      doc.save(`PRODUCTION_LOG_${targetRec.conversionNo}.pdf`);
      setSuccessMessage("WIP Audit Ledger PDF Slip downloaded successfully.");
    } catch (e) {
      console.error(e);
      setErrorMessage("Failed to download PDF slip.");
    }
  };

  // --- CONSOLIDATED HISTORY LOGS AUDIT LEDGER PDF ---
  const handleExportHistoryLedgerPDF = () => {
    const recordsToExport = filteredConversionRecords && filteredConversionRecords.length > 0 ? filteredConversionRecords : conversionRecords;
    if (!recordsToExport || recordsToExport.length === 0) {
      setErrorMessage("No WIP conversion history logs available to export.");
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

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);

      doc.text("Report Module:", 14, 38);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 23, 78);
      doc.text("Work in Progress (WIP) Conversion & Assembly Registry", 48, 38);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Date Generated:", 185, 38);
      doc.setFont("helvetica", "normal");
      doc.text(`${formattedDate}`, 220, 38);

      doc.setFont("helvetica", "bold");
      doc.text("Security Class:", 14, 45);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text("Internal Manufacturing Audit Ledger", 48, 45);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Total Logs:", 185, 45);
      doc.setFont("helvetica", "normal");
      doc.text(`${recordsToExport.length} Logged Conversions`, 220, 45);

      if (sidebarSearchQuery.trim()) {
        doc.setFont("helvetica", "bold");
        doc.text("Filter Applied:", 14, 52);
        doc.setFont("helvetica", "normal");
        doc.text(`Search Keyword: "${sidebarSearchQuery}"`, 48, 52);
      }

      let grandTotalConsumed = 0;
      let grandTotalYield = 0;
      recordsToExport.forEach(w => {
        (w.inputs || []).forEach(it => { grandTotalConsumed += Number(it.qtyUsed || 0); });
        (w.outputs || []).forEach(it => { grandTotalYield += Number(it.qtyProduced || 0); });
      });

      const kpiStartY = sidebarSearchQuery.trim() ? 58 : 52;
      autoTable(doc, {
        startY: kpiStartY,
        margin: { top: 38, bottom: 20, left: 14, right: 14 },
        head: [["1. TOTAL BATCHES EXECUTED", "2. TOTAL INPUT MATERIAL CONSUMED", "3. TOTAL FINISHED OUTPUT YIELD"]],
        body: [[
          `${recordsToExport.length} Production Batches`,
          `${grandTotalConsumed.toLocaleString()} Units Consumed`,
          `${grandTotalYield.toLocaleString()} Units Produced`
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

      const tableColumns = ["#", "Conversion No", "Date Processed", "Mode", "Target / Customer", "Consumed / Yield", "Prepared By", "Status"];
      const tableRows = recordsToExport.map((rec, idx) => {
        const dateStr = rec.dateProcessed ? new Date(rec.dateProcessed).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric'
        }) : (rec.createdAt ? new Date(rec.createdAt).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric'
        }) : '—');

        let inQty = 0;
        let outQty = 0;
        (rec.inputs || []).forEach(i => { inQty += Number(i.qtyUsed || 0); });
        (rec.outputs || []).forEach(o => { outQty += Number(o.qtyProduced || 0); });

        return [
          String(idx + 1),
          rec.conversionNo || '—',
          dateStr,
          (rec.productionType || 'Fabricated').toUpperCase(),
          rec.customer || rec.remarks || 'Standard Production',
          `In: -${inQty} | Out: +${outQty}`,
          rec.preparedBy || 'Staff',
          "COMPLETED"
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
        styles: { overflow: 'ellipsize', cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2, rowPageBreak: 'avoid' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 35, fontStyle: 'bold', textColor: [24, 23, 78] },
          2: { cellWidth: 26, halign: 'center' },
          3: { cellWidth: 28, halign: 'center' },
          4: { cellWidth: 70 },
          5: { cellWidth: 46, halign: 'center', fontStyle: 'bold' },
          6: { cellWidth: 28 },
          7: { cellWidth: 26, halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] }
        }
      });

      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        try {
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.05 }));
          const logoWidth = 75;
          const logoHeight = 75;
          doc.addImage('/cropped_circle_image.png', 'PNG', centerX - (logoWidth / 2), centerY - (logoHeight / 2), logoWidth, logoHeight);
          doc.restoreGraphicsState();
        } catch (e) { }

        doc.setFillColor(24, 23, 78);
        doc.rect(0, 0, pageWidth, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("WORK IN PROGRESS (WIP) TRANSACTION AUDIT LEDGER", centerX, 12, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(215, 220, 245);
        doc.text(`Material Flow Logistics & Conversion Trail Control Registry  |  Total: ${recordsToExport.length} Entries  |  Generated: ${formattedDate}`, centerX, 20, { align: 'center' });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text("CONFIDENTIAL AUDIT LEDGER - FOR INTERNAL AUTHORIZED USE ONLY", 14, pageHeight - 8);

        const pageNumber = `Page ${i} of ${totalPages}`;
        doc.text(pageNumber, pageWidth - 14, pageHeight - 8, { align: 'right' });
      }

      doc.save(`WIP_HISTORY_AUDIT_LEDGER_${new Date().toISOString().split('T')[0]}.pdf`);
      setSuccessMessage("Consolidated WIP Audit Ledger (PDF) exported successfully!");
    } catch (e) {
      console.error(e);
      setErrorMessage("Failed to export WIP History Ledger PDF: " + e.message);
    }
  };

  const filteredRawMatSuggestions = dbMaterials.filter(item => {
    const matchesSegment = selectedInputSegment === 'All Segments' ||
      (item.Segment && item.Segment.toLowerCase() === selectedInputSegment.toLowerCase());
    if (!matchesSegment) return false;

    if (!rawMatSearchQuery.trim()) return false;

    const words = rawMatSearchQuery.toLowerCase().trim().split(/\s+/);
    const desc = (item.ItemDescription || '').toLowerCase();
    const dim = (item.Dimension || item.Dimensions || item.dimension || item.dimensions || '').toLowerCase();
    const seg = (item.Segment || item.segment || '').toLowerCase();
    const code = (item.Code || '').toLowerCase();

    return words.every(word =>
      desc.includes(word) || dim.includes(word) || seg.includes(word) || code.includes(word)
    );
  });

  const inputModalFilteredMaterials = dbMaterials.filter(item => {
    const matchesSegment = inputModalSegmentFilter === 'All Segments' ||
      (item.Segment && item.Segment.toLowerCase() === inputModalSegmentFilter.toLowerCase());
    if (!matchesSegment) return false;

    if (!inputModalSearchQuery.trim()) return true;

    const words = inputModalSearchQuery.toLowerCase().trim().split(/\s+/);
    const desc = (item.ItemDescription || '').toLowerCase();
    const dim = (item.Dimension || item.Dimensions || item.dimension || item.dimensions || '').toLowerCase();
    const seg = (item.Segment || item.segment || '').toLowerCase();
    const code = (item.Code || '').toLowerCase();

    return words.every(word =>
      desc.includes(word) || dim.includes(word) || seg.includes(word) || code.includes(word)
    );
  });

  const filteredOutputSuggestions = dbMaterials.map(m => ({ ...m, type: 'RawMaterial' }))
    .filter(item => {
      const matchesSegment = selectedOutputSegment === 'All Segments' ||
        (item.Segment && item.Segment.toLowerCase() === selectedOutputSegment.toLowerCase());
      if (!matchesSegment) return false;

      if (!outputSearchQuery.trim()) return false;

      const words = outputSearchQuery.toLowerCase().trim().split(/\s+/);
      const desc = (item.ItemDescription || '').toLowerCase();
      const dim = (item.Dimension || item.Dimensions || item.dimension || item.dimensions || '').toLowerCase();
      const seg = (item.Segment || item.segment || '').toLowerCase();
      const code = (item.Code || '').toLowerCase();

      return words.every(word =>
        desc.includes(word) || dim.includes(word) || seg.includes(word) || code.includes(word)
      );
    });

  const outputModalFilteredMaterials = dbMaterials.map(m => ({ ...m, type: 'RawMaterial' }))
    .filter(item => {
      const matchesSegment = outputModalSegmentFilter === 'All Segments' ||
        (item.Segment && item.Segment.toLowerCase() === outputModalSegmentFilter.toLowerCase());
      if (!matchesSegment) return false;

      if (!outputModalSearchQuery.trim()) return true;

      const words = outputModalSearchQuery.toLowerCase().trim().split(/\s+/);
      const desc = (item.ItemDescription || '').toLowerCase();
      const dim = (item.Dimension || item.Dimensions || item.dimension || item.dimensions || '').toLowerCase();
      const seg = (item.Segment || item.segment || '').toLowerCase();
      const code = (item.Code || '').toLowerCase();

      return words.every(word =>
        desc.includes(word) || dim.includes(word) || seg.includes(word) || code.includes(word)
      );
    });

  const filteredConversionRecords = conversionRecords.filter(rec =>
    rec.conversionNo?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
    rec.productionType?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
    rec.customer?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
    rec.remarks?.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
  );

  return (
    <div className={`mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>

      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm font-semibold">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div><PageHeader activeTab="work-in-progress" /></div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className={`lg:col-span-3 ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100'} p-4 sm:p-6 rounded-2xl border flex flex-col gap-6 shadow-sm`}>
          <div className={`border-b ${isDark ? 'border-slate-800 text-slate-200' : 'border-slate-100 text-slate-600'} pb-3 flex items-center justify-between gap-2 text-sm font-bold`}>
            <div className="flex items-center gap-2 min-w-0">
              <Layers className="w-4 h-4 text-[#ff6600] flex-shrink-0" />
              <span className="truncate">Conversion Racking Materials</span>
            </div>
            {(inputMaterials.length > 0 || outputItems.length > 0) && (
              <button
                type="button"
                onClick={() => { setInputMaterials([]); setOutputItems([]); setRemarks(''); setSuccessMessage("Form grid cleared."); }}
                className="text-xs font-bold text-rose-400 hover:underline cursor-pointer flex-shrink-0"
              >
                Clear Form Grid
              </button>
            )}
          </div>

          <form onSubmit={handleInitiateConfirm} className="flex flex-col gap-5">

            {/* COMPACT PRODUCTION TYPE CONTAINER */}
            <div className={`px-3.5 py-2 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 ${isDark ? 'bg-[#141622]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Production Type:
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${isDark ? 'bg-blue-950/60 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                  🔵 Fabricated
                </span>
              </div>

              {/* ACTION TOGGLE BUTTONS */}
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => setProductionType('Fabricated')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${productionType === 'Fabricated'
                    ? (isDark ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-blue-600 text-white border-blue-700 shadow-xs')
                    : (isDark ? 'bg-[#0e1017] text-slate-400 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')
                    }`}
                >
                  🔵 Fabricated
                </button>
              </div>
            </div>

            {/* FORM FIELDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Control Number</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="text" value="[ AUTO-GENERATED ]" disabled className={`w-full ${isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'} border rounded-lg pl-9 pr-3 py-2 text-sm font-bold select-none cursor-not-allowed focus:outline-none`} />
                </div>
              </div>

              <div>
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Customer Name *</label>
                <select
                  value={customer}
                  onChange={e => setCustomer(e.target.value)}
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer font-medium`}
                  required
                >
                  <option value="" className={isDark ? 'bg-[#141622] text-slate-300' : ''}>Select Customer</option>
                  {registeredCustomers.map((cust) => (
                    <option key={cust._id} value={cust.name} className={isDark ? 'bg-[#141622] text-white' : ''}>
                      {cust.name}
                    </option>
                  ))}
                  {registeredCustomers.length === 0 && (
                    <option disabled value="">No registered customer found (Go to Client Records)</option>
                  )}
                </select>
              </div>

              <div>
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Date Processed</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="date" value={dateProcessed} onChange={e => setDateProcessed(e.target.value)} className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none`} required />
                </div>
              </div>
            </div>

            {/* --- STEP 1: ALLOCATE RAW MATERIAL (INPUT) --- */}
            <div className={`${isDark ? 'bg-[#141622]/60 border-slate-800' : 'bg-slate-50 border-slate-100'} p-4 rounded-xl border flex flex-col gap-2.5 relative`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-rose-400' : 'text-red-800'} uppercase leading-snug`}>
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
                    value={selectedInputSegment}
                    onChange={e => setSelectedInputSegment(e.target.value)}
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
                    value={rawMatSearchQuery}
                    onChange={e => setRawMatSearchQuery(e.target.value)}
                    placeholder="Search description, dimension (e.g. 2700, 50x50), or code..."
                    className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none`}
                  />
                  {rawMatSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setRawMatSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* SEARCH SUGGESTIONS DROPDOWN WITH PROMINENT DIMENSIONS */}
              {rawMatSearchQuery && (
                <div className={`absolute left-0 right-0 top-[102%] ${isDark ? 'bg-[#0e1017] border-slate-700 divide-slate-800 shadow-2xl' : 'bg-white border-slate-200 divide-slate-100 shadow-xl'} border rounded-xl max-h-72 overflow-y-auto z-50 divide-y p-1`}>
                  {filteredRawMatSuggestions.length > 0 ? (
                    filteredRawMatSuggestions.map(item => {
                      const dimension = item.Dimension || item.Dimensions || item.dimension || item.dimensions;
                      const segment = item.Segment || item.segment;
                      const count = item.ActualCount || item.actualCount || item.AvailableStock || 0;
                      const isAdded = inputMaterials.some(i => i.materialId === item._id);

                      return (
                        <div
                          key={item._id}
                          onClick={() => handleSelectRawMaterial(item)}
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
                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold uppercase ${isDark ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
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
                    <div className="p-4 text-center">
                      <p className="text-rose-500 italic font-medium text-xs">
                        No materials found matching &ldquo;{rawMatSearchQuery}&rdquo; {selectedInputSegment !== 'All Segments' ? `in ${selectedInputSegment}` : ''}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* INPUT / SOURCE MATERIALS TABLE (SHOW ONLY WHEN ITEMS ARE SELECTED) */}
            {inputMaterials.length > 0 && (
              <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] sm:text-xs font-bold ${isDark ? 'text-rose-400 bg-rose-950/40 border border-rose-800' : 'text-red-700 bg-red-50 border border-rose-200'} px-2.5 py-1 rounded-md w-fit uppercase`}>
                    🔴 Quantities will be automatically deducted
                  </span>
                  <button
                    type="button"
                    onClick={() => setInputMaterials([])}
                    className={`text-xs font-semibold px-2.5 py-1 rounded border transition-all cursor-pointer ${isDark ? 'text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    Clear Source Items
                  </button>
                </div>
                <div className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'} rounded-xl border shadow-sm overflow-x-auto`}>
                  <table className="w-full text-left border-collapse text-sm min-w-[1200px]">
                    <thead>
                      <tr className={`text-white font-bold ${isDark ? 'bg-[#1c1117] text-rose-300' : 'bg-red-700'} uppercase text-xs whitespace-nowrap`}>
                        <th className="py-3 px-4 text-center w-28 min-w-[112px]">Qty Used</th>
                        <th className="py-3 px-4 text-center">UOM</th>
                        <th className="py-3 px-4 text-center w-28 min-w-[112px]">Stock Balance</th>

                        <th className="py-3 px-4">Segment</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Dimension</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 bg-[#090b10]' : 'divide-slate-100'}`}>
                      {inputMaterials.map((item, index) => (
                        <tr key={item.materialId || index} className={`${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'} text-xs`}>

                          <td className="py-2 px-4 w-28 min-w-[112px]">
                            <input
                              type="number"
                              min="1"
                              value={item.qtyUsed}
                              onChange={e => handleUpdateInputQty(index, e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              className={`w-full border ${isDark ? 'bg-[#141622] border-slate-700 text-rose-400' : 'border-slate-200 text-red-600'} text-center rounded py-1 text-sm font-bold focus:outline-none focus:border-red-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                              required
                            />
                          </td>

                          <td className="py-2 px-4 text-center">
                            <span className={`${isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700'} px-2 py-0.5 rounded text-xs`}>
                              {item.UOM}
                            </span>
                          </td>

                          <td className={`py-2 px-4 w-28 min-w-[112px] text-center font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                            {item.Available}
                          </td>

                          <td className={`py-2 px-4 italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.Segment || item.segment || item.segmentName || '-'}
                          </td>

                          <td className={`py-2 px-4 min-w-[200px] whitespace-normal break-words ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={item.ItemDescription || item.description}>
                            {item.ItemDescription || item.description}
                          </td>

                          <td className={`py-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.Dimension || item.dimension || item.dimensions || '-'}
                          </td>

                          <td className="py-2 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setInputMaterials(inputMaterials.filter((_, i) => i !== index));
                                setSuccessMessage("Material removed from allocation matrix.");
                              }}
                              className="text-red-500 hover:text-red-700 cursor-pointer p-1 inline-block"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- STEP 2: CONVERSION TARGET (RAW MATERIALS ONLY) --- */}
            <div className={`${isDark ? 'bg-[#141622]/60 border-slate-800' : 'bg-slate-50 border-slate-100'} p-4 rounded-xl border flex flex-col gap-2.5 relative`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'} uppercase leading-snug`}>
                    Step 2: Type / Select Materials for Stock Addition
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Filter by segment or search by item description and dimension (e.g. beam 2700).
                  </p>
                </div>
              </div>

              {/* DUAL SEARCH & SEGMENT CONTROLS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1. SEGMENT FILTER */}
                <div className="sm:col-span-1">
                  <select
                    value={selectedOutputSegment}
                    onChange={e => setSelectedOutputSegment(e.target.value)}
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
                    value={outputSearchQuery}
                    onChange={e => setOutputSearchQuery(e.target.value)}
                    placeholder="Search description, dimension (e.g. 2700, 50x50), or code..."
                    className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none`}
                  />
                  {outputSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setOutputSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* SEARCH SUGGESTIONS DROPDOWN WITH PROMINENT DIMENSIONS */}
              {outputSearchQuery && (
                <div className={`absolute left-0 right-0 top-[102%] ${isDark ? 'bg-[#0e1017] border-slate-700 divide-slate-800 shadow-2xl' : 'bg-white border-slate-200 divide-slate-100 shadow-xl'} border rounded-xl max-h-72 overflow-y-auto z-50 divide-y p-1`}>
                  {filteredOutputSuggestions.length > 0 ? (
                    filteredOutputSuggestions.map(item => {
                      const dimension = item.Dimension || item.Dimensions || item.dimension || item.dimensions;
                      const segment = item.Segment || item.segment;
                      const count = item.ActualCount || item.actualCount || item.AvailableStock || 0;
                      const isAdded = outputItems.some(o => o.itemId === item._id);

                      return (
                        <div
                          key={`${item.type}-${item._id}`}
                          onClick={() => handleSelectOutputItem(item, item.type)}
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
                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold uppercase ${count > 0 ? (isDark ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800 border border-emerald-200') : (isDark ? 'bg-rose-950/60 text-rose-400 border border-rose-800' : 'bg-rose-100 text-rose-800 border border-rose-200')
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
                    <div className="p-4 text-center">
                      <p className="text-rose-500 italic font-medium text-xs">
                        No materials found matching &ldquo;{outputSearchQuery}&rdquo; {selectedOutputSegment !== 'All Segments' ? `in ${selectedOutputSegment}` : ''}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* OUTPUT TABLE (SHOW ONLY WHEN ITEMS ARE SELECTED) */}
            {outputItems.length > 0 && (
              <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] sm:text-xs font-bold ${isDark ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'} px-2.5 py-1 rounded-md w-fit uppercase`}>
                    🟢 Quantities will be automatically added
                  </span>
                  <button
                    type="button"
                    onClick={() => setOutputItems([])}
                    className={`text-xs font-semibold px-2.5 py-1 rounded border transition-all cursor-pointer ${isDark ? 'text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    Clear Output Items
                  </button>
                </div>
                <div className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'} rounded-xl border shadow-sm overflow-x-auto`}>
                  <table className="w-full text-left border-collapse text-sm min-w-[1200px]">
                    <thead>
                      <tr className={`text-white font-bold ${isDark ? 'bg-[#0f1d18] text-emerald-300' : 'bg-emerald-700'} uppercase text-xs whitespace-nowrap`}>
                        <th className="py-3 px-4 text-center w-28 min-w-[112px]">Qty Produced</th>
                        <th className="py-3 px-4 text-center">UOM</th>

                        <th className="py-3 px-4">Segment</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Dimension</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 bg-[#090b10]' : 'divide-slate-100'}`}>
                      {outputItems.map((item, index) => (
                        <tr key={`${item.itemType}-${item.itemId}` || index} className={`${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'} text-xs`}>

                          <td className="py-2 px-4 w-28 min-w-[112px]">
                            <input
                              type="number"
                              min="1"
                              value={item.qtyProduced}
                              onChange={e => handleUpdateOutputQty(index, e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              className={`w-full border ${isDark ? 'bg-[#141622] border-slate-700 text-emerald-400' : 'border-slate-200 text-emerald-600'} text-center rounded py-1 text-sm font-bold focus:outline-none focus:border-emerald-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                              required
                            />
                          </td>

                          <td className="py-2 px-4 text-center">
                            <span className={`${isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700'} px-2 py-0.5 rounded text-xs`}>
                              {item.UOM}
                            </span>
                          </td>

                          <td className={`py-2 px-4 italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.Segment || item.segment || '-'}
                          </td>

                          <td className={`py-2 px-4 min-w-[200px] whitespace-normal break-words ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={item.ItemDescription}>
                            {item.ItemDescription}
                          </td>

                          <td className={`py-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.Dimension || item.dimensions || '-'}
                          </td>

                          <td className="py-2 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setOutputItems(outputItems.filter((_, i) => i !== index));
                                setSuccessMessage("Output item removed.");
                              }}
                              className="text-red-500 hover:text-red-700 cursor-pointer p-1 inline-block"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUBMIT BUTTON (SHOW ONLY WHEN BOTH INPUT AND OUTPUT ARE POPULATED) */}
            {inputMaterials.length > 0 && outputItems.length > 0 && (
              <button type="submit" className="w-full bg-[#ff6600] hover:bg-[#e05a00] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer uppercase shadow-sm animate-in fade-in duration-200">
                Confirm WIP Conversion
              </button>
            )}
          </form>
        </div>

        {/* RIGHT CONTAINER (SIDEBAR HISTORY RECENT LOGS) */}
        <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100'} p-4 rounded-2xl border flex flex-col gap-3 shadow-sm h-auto min-h-[400px]`}>
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
              placeholder="Search tracking no or customer..."
              className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
            />
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[440px] pr-1 custom-scrollbar">
            {filteredConversionRecords.length > 0 ? (
              filteredConversionRecords.slice(0, 50).map((rec) => (
                <div
                  key={rec._id}
                  onClick={() => { setSelectedConversion(rec); setIsModalOpen(true); }}
                  className={`${isDark ? 'bg-[#141622] border-slate-800 hover:border-[#ff6600]/60 hover:bg-[#181b29]' : 'bg-white border-slate-100 hover:border-[#18174e]/50 hover:shadow-md'} border rounded-xl p-2.5 flex flex-col gap-0.5 transition-all cursor-pointer group`}
                >
                  <div className={`flex justify-between items-center pb-0.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                    <span className={`text-[9px] font-black ${isDark ? 'text-[#ff8533] group-hover:text-emerald-400' : 'text-[#18174e] group-hover:text-emerald-600'} flex items-center gap-1 truncate max-w-[110px]`}>
                      {rec.conversionNo}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 font-bold rounded-md border ${isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                      {rec.productionType}
                    </span>
                  </div>
                  <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'} truncate`}>
                    {rec.customer || rec.remarks || 'No Customer Specified'}
                  </span>
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                    <span>{rec.dateProcessed ? new Date(rec.dateProcessed).toLocaleDateString() : 'No Date'}</span>
                    <span className="font-bold text-slate-400">
                      {(rec.inputs?.length || 0) + (rec.outputs?.length || 0)} items
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

      {isModalOpen && selectedConversion && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl w-full max-w-3xl p-6 shadow-xl relative flex flex-col gap-4`}>

            {/* Header */}
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-lg`}>
                WIP No: {selectedConversion.conversionNo}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedConversion)}
                  className="flex items-center gap-1.5 bg-[#ff6600] hover:bg-[#e05a00] active:scale-95 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm"
                  title={`Download Audit Ledger PDF for ${selectedConversion.conversionNo}`}
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

            {/* Details Grid (Patterned Exactly After Inbound Modal) */}
            <div className={`grid grid-cols-2 sm:grid-cols-3 text-sm gap-2.5 ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-100'} p-4 rounded-xl border`}>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Transaction Type</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${isDark ? 'bg-blue-950/60 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                  🔵 Fabricated
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Control Tracking No:</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedConversion.conversionNo}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Execution Date:</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedConversion.dateProcessed ? new Date(selectedConversion.dateProcessed).toLocaleDateString() : '-'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Production Type:</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedConversion.productionType || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Prepared By:</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedConversion.preparedBy || preparedBy}</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Customer:</span>
                <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} truncate block`}>{selectedConversion.customer || selectedConversion.remarks || 'N/A'}</span>
              </div>
            </div>

            {/* Table Section */}
            {(() => {
              const allWipItems = [
                ...(selectedConversion.inputs || []).map(it => ({ ...it, isInput: true })),
                ...(selectedConversion.outputs || []).map(it => ({ ...it, isInput: false }))
              ];
              const modalIndexOfLastRow = modalPage * modalRowsPerPage;
              const modalIndexOfFirstRow = modalIndexOfLastRow - modalRowsPerPage;
              const paginatedWipItems = allWipItems.slice(modalIndexOfFirstRow, modalIndexOfLastRow);

              return (
                <div className={`border ${isDark ? 'border-slate-800' : 'border-slate-200/60'} rounded-xl relative shadow-sm overflow-hidden flex flex-col`}>
                  <TablePagination
                    currentPage={modalPage}
                    setCurrentPage={setModalPage}
                    rowsPerPage={modalRowsPerPage}
                    setRowsPerPage={setModalRowsPerPage}
                    totalRows={allWipItems.length}
                    options={[5, 10, 20, 50, 100]}
                  />
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                      <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#1c1117] text-rose-300' : 'bg-red-700 text-white'} text-[11px] font-bold uppercase whitespace-nowrap`}>
                        <tr>
                          <th className="p-3 text-left">Segment</th>
                          <th className="p-3 text-left">Item Description</th>
                          <th className="p-3 text-left">Dimension</th>
                          <th className="p-3 text-center">Qty</th>
                          <th className="p-3 text-left pl-4">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'bg-[#090b10] divide-slate-800' : 'bg-white divide-slate-100'}`}>
                        {paginatedWipItems.map((it, idx) => {
                          const targetId = it.isInput ? (it.materialId?._id || it.materialId) : (it.itemId?._id || it.itemId);
                          const fullMat = dbMaterials?.find(m => m._id === targetId);

                          const segment = fullMat?.Segment || fullMat?.segment ||
                            (it.isInput ? it.materialId?.Segment || it.materialId?.segment : it.itemId?.Segment || it.itemId?.segment) || "N/A";

                          const desc = fullMat?.ItemDescription ||
                            (it.isInput ? it.materialId?.ItemDescription : it.itemId?.ItemDescription) || "-";

                          const dimension = fullMat?.Dimension || fullMat?.dimension ||
                            fullMat?.Dimensions || fullMat?.dimensions ||
                            (it.isInput ? (it.materialId?.Dimension || it.materialId?.dimension) : (it.itemId?.Dimension || it.itemId?.dimension)) || "N/A";

                          const uom = fullMat?.UOM || (it.isInput ? it.materialId?.UOM : it.itemId?.UOM) || '';

                          return (
                            <tr key={idx} className={`${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/50'} transition-colors`}>
                              <td className={`p-3 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} whitespace-nowrap align-middle`}>
                                {segment}
                              </td>
                              <td className={`p-3 font-bold ${isDark ? 'text-white' : 'text-[#18174e]'} text-xs min-w-[200px] whitespace-normal break-words align-middle`} title={desc}>
                                {desc}
                              </td>
                              <td className={`p-3 ${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium whitespace-nowrap align-middle`}>
                                {dimension}
                              </td>
                              <td className={`p-3 text-center font-bold align-middle whitespace-nowrap ${it.isInput
                                ? (isDark ? 'text-rose-400' : 'text-rose-600')
                                : (isDark ? 'text-emerald-400' : 'text-emerald-600')
                                }`}>
                                {it.isInput ? `-${it.qtyUsed}` : `+${it.qtyProduced}`} {uom}
                              </td>
                              <td className={`p-3 italic ${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium text-[11px] min-w-[120px] whitespace-normal break-words align-middle pl-4`}>
                                {it.isInput ? 'Raw Material Input (Deducted)' : 'Yield Conversion Output'}
                              </td>
                            </tr>
                          );
                        })}
                        {allWipItems.length === 0 && (
                          <tr>
                            <td colSpan="5" className="p-4 text-center text-slate-400 italic">
                              No items recorded for this conversion.
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

      {/* CONFIRMATION MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col gap-5 animate-in zoom-in-95 duration-200`}>

            {/* Header */}
            <div className={`flex justify-between items-start border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <div>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#18174e]'}`}>
                  Confirm WIP Conversion Activity
                </h3>
                <p className="text-xs text-slate-400">
                  Paki-review ang mga bawas at dagdag sa inventory bago i-save.
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
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Production Mode</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${isDark ? 'bg-blue-950/60 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                  🔵 {productionType}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Date Processed</span>
                <span className="font-semibold">{dateProcessed ? new Date(dateProcessed).toLocaleDateString() : '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Prepared By</span>
                <span className="font-semibold">{preparedBy}</span>
              </div>
              <div className="sm:col-span-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Customer Name</span>
                <span className="font-semibold">{customer || '—'}</span>
              </div>
            </div>

            {/* Deducted Inputs */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold px-1">
                <span className="uppercase text-rose-500 font-bold">1. Materials Deducted (Inputs - {inputMaterials.length})</span>
                <span className="text-rose-400 font-bold">
                  Total Deducted: {inputMaterials.reduce((sum, item) => sum + (Number(item.qtyUsed) || 0), 0)}
                </span>
              </div>
              <div className={`rounded-xl border overflow-hidden max-h-36 overflow-y-auto ${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-200'}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`uppercase text-[10px] font-bold ${isDark ? 'bg-[#1c1117] text-rose-300 border-b border-slate-800' : 'bg-rose-50 text-rose-700 border-b border-rose-100'}`}>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">Segment</th>
                      <th className="py-2 px-3">Dimension</th>
                      <th className="py-2 px-3 text-center">Qty Deducted</th>
                      <th className="py-2 px-3 text-center">UOM</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                    {inputMaterials.map((item, idx) => (
                      <tr key={idx} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                        <td className="py-2 px-3 font-semibold min-w-[180px] whitespace-normal break-words" title={item.ItemDescription}>
                          {item.ItemDescription}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {item.Segment || item.segment || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{item.Dimension || item.dimensions || '—'}</td>
                        <td className="py-2 px-3 text-center font-bold text-rose-500">
                          -{item.qtyUsed}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-400">{item.UOM}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Generated Outputs */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold px-1">
                <span className="uppercase text-emerald-500 font-bold">2. Items Produced / Returned (Outputs - {outputItems.length})</span>
                <span className="text-emerald-400 font-bold">
                  Total Produced: {outputItems.reduce((sum, item) => sum + (Number(item.qtyProduced) || 0), 0)}
                </span>
              </div>
              <div className={`rounded-xl border overflow-hidden max-h-36 overflow-y-auto ${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-200'}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`uppercase text-[10px] font-bold ${isDark ? 'bg-[#0f1d17] text-emerald-300 border-b border-slate-800' : 'bg-emerald-50 text-emerald-700 border-b border-emerald-100'}`}>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">Segment</th>
                      <th className="py-2 px-3">Dimension</th>
                      <th className="py-2 px-3 text-center">Qty Produced</th>
                      <th className="py-2 px-3 text-center">UOM</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                    {outputItems.map((item, idx) => (
                      <tr key={idx} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                        <td className="py-2 px-3 font-semibold min-w-[180px] whitespace-normal break-words" title={item.ItemDescription}>
                          {item.ItemDescription}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {item.Segment || item.segment || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{item.Dimension || item.dimensions || '—'}</td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-500">
                          +{item.qtyProduced}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-400">{item.UOM}</td>
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
                onClick={handleSaveConversion}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#ff6600] hover:bg-[#e05a00] disabled:opacity-50 transition-all cursor-pointer shadow-md"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Conversion...</span>
                  </>
                ) : (
                  <span>Save Conversion</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* STEP 1 BROWSE MODAL (INPUT DEDUCTION) */}
      {isInputBrowseModalOpen && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-4xl p-6 shadow-xl relative max-h-[90vh] flex flex-col gap-4 overflow-y-auto`}>
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                  Browse Raw Materials (Step 1: Stock Deduction)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInputBrowseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
                  Filter by Segment
                </label>
                <select
                  value={inputModalSegmentFilter}
                  onChange={e => setInputModalSegmentFilter(e.target.value)}
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
                    value={inputModalSearchQuery}
                    onChange={e => setInputModalSearchQuery(e.target.value)}
                    placeholder="Search description, dimension, segment, or code..."
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                </div>
              </div>
            </div>

            <div className={`rounded-xl border overflow-x-auto overflow-y-auto flex-1 max-h-96 ${isDark ? 'border-slate-800 bg-[#090b10]' : 'border-slate-100 bg-white'}`}>
              <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#141622] text-slate-200' : 'bg-[#18174e] text-white'} font-bold uppercase text-[11px] whitespace-nowrap`}>
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">Item Description & Code</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Dimension</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Segment</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Available Stock</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                  {inputModalFilteredMaterials.length > 0 ? (
                    inputModalFilteredMaterials.map(item => {
                      const isAdded = inputMaterials.some(i => i.materialId === item._id);
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
                            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border whitespace-nowrap ${isDark ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              }`}>
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
                                onClick={() => handleSelectRawMaterial(item)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${isDark ? 'bg-rose-950/60 border-rose-800 text-rose-400 hover:bg-rose-900/60' : 'bg-rose-50 border-rose-200 text-red-700 hover:bg-rose-100'
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

            <div className={`flex items-center justify-between mt-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                Showing {inputModalFilteredMaterials.length} of {dbMaterials.length} materials
              </span>
              <button
                type="button"
                onClick={() => setIsInputBrowseModalOpen(false)}
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 BROWSE MODAL (OUTPUT RETURN / ADDITION) */}
      {isOutputBrowseModalOpen && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-4xl p-6 shadow-xl relative max-h-[90vh] flex flex-col gap-4 overflow-y-auto`}>
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                  Browse Raw Materials (Step 2: Stock Addition)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOutputBrowseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
                  Filter by Segment
                </label>
                <select
                  value={outputModalSegmentFilter}
                  onChange={e => setOutputModalSegmentFilter(e.target.value)}
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
                    value={outputModalSearchQuery}
                    onChange={e => setOutputModalSearchQuery(e.target.value)}
                    placeholder="Search description, dimension, segment, or code..."
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                </div>
              </div>
            </div>

            <div className={`rounded-xl border overflow-x-auto overflow-y-auto flex-1 max-h-96 ${isDark ? 'border-slate-800 bg-[#090b10]' : 'border-slate-100 bg-white'}`}>
              <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#141622] text-slate-200' : 'bg-[#18174e] text-white'} font-bold uppercase text-[11px] whitespace-nowrap`}>
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">Item Description & Code</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Dimension</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Segment</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                  {outputModalFilteredMaterials.length > 0 ? (
                    outputModalFilteredMaterials.map(item => {
                      const isAdded = outputItems.some(o => o.itemId === item._id);
                      const dimension = item.Dimension || item.Dimensions || item.dimension || item.dimensions || '—';
                      const segment = item.Segment || item.segment || '—';

                      return (
                        <tr key={item._id} className={`${isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-50 text-slate-700'} transition-colors whitespace-nowrap`}>
                          <td className="py-2.5 px-3 font-semibold min-w-[200px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="whitespace-normal break-words">{item.ItemDescription}</span>
                              <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">({item.Code})</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border whitespace-nowrap ${isDark ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              }`}>
                              {dimension}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}>
                              {segment}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {isAdded ? (
                              <span className="text-[11px] font-bold text-emerald-500 inline-flex items-center gap-1 whitespace-nowrap">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Added
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectOutputItem(item, item.type)}
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
                      <td colSpan="4" className="py-8 text-center text-rose-500 italic whitespace-nowrap">
                        No materials found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={`flex items-center justify-between mt-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                Showing {outputModalFilteredMaterials.length} of {dbMaterials.length} materials
              </span>
              <button
                type="button"
                onClick={() => setIsOutputBrowseModalOpen(false)}
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryWIP;
