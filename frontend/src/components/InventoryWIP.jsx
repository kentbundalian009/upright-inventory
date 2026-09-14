import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Trash2, ClipboardList, Search, X, Download, User, Layers, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from './PageHeader';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = import.meta.env.MODE === 'production'
  ? 'https://one-inventory.onrender.com/api'
  : 'http://localhost:5000/api';

const RAW_MAT_URL = `${API_BASE_URL}/raw-materials`;
const PRODUCTS_URL = `${API_BASE_URL}/products`;
const CONVERSION_URL = `${API_BASE_URL}/conversions`;
const CLIENT_URL = `${API_BASE_URL}/clients`;

function InventoryWIP() {
  const { isDark } = useTheme();
  const [dbMaterials, setDbMaterials] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [conversionRecords, setConversionRecords] = useState([]);

  const [rawMatSearchQuery, setRawMatSearchQuery] = useState('');
  const [outputSearchQuery, setOutputSearchQuery] = useState('');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [selectedConversion, setSelectedConversion] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      const [matsRes, prodsRes, convsRes, clientsRes] = await Promise.all([
        axios.get(RAW_MAT_URL),
        axios.get(PRODUCTS_URL),
        axios.get(CONVERSION_URL),
        axios.get(`${CLIENT_URL}?type=Customer`).catch(() => ({ data: [] }))
      ]);
      setDbMaterials(matsRes.data || []);
      setDbProducts(prodsRes.data?.filter(p => !p.isArchived) || prodsRes.data || []);
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

  // --- PDF REPORT GENERATION ---
  const handleDownloadPDF = () => {
    if (!selectedConversion) return;
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const pageHeight = 297;
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;
      const formattedDate = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);

      doc.text("Conversion No:", 14, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedConversion.conversionNo}`, 45, 42);
      doc.setFont("helvetica", "bold");
      doc.text("Date Processed:", 120, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedConversion.dateProcessed ? new Date(selectedConversion.dateProcessed).toLocaleDateString() : '-'}`, 155, 42);

      doc.setFont("helvetica", "bold");
      doc.text("Process Mode:", 14, 49);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text(`${selectedConversion.productionType || 'Fabricated'}`, 45, 49);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Prepared By:", 120, 49);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedConversion.preparedBy || preparedBy}`, 155, 49);

      doc.setFont("helvetica", "bold");
      doc.text("Customer:", 14, 56);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedConversion.customer || selectedConversion.remarks || "No customer recorded."}`, 45, 56);

      const tableColumns = ["Flow Direction", "Description", "Segment", "Dimension", "Quantity Shift", "UOM"];
      const tableRows = [];

      selectedConversion.inputs?.forEach(it => {
        const targetId = it.materialId?._id || it.materialId;
        const fullMat = dbMaterials?.find(m => m._id === targetId);

        const descOnly = fullMat?.ItemDescription || it.materialId?.ItemDescription || "-";

        const segment = fullMat?.Segment || fullMat?.segment ||
          it.materialId?.Segment || it.materialId?.segment || "N/A";

        const dimension = fullMat?.Dimension || fullMat?.dimension ||
          fullMat?.Dimensions || fullMat?.dimensions ||
          it.materialId?.Dimension || it.materialId?.dimension ||
          it.materialId?.Dimensions || it.materialId?.dimensions || "N/A";

        tableRows.push([
          "INPUT (Deducted)",
          descOnly,
          segment,
          dimension,
          `-${it.qtyUsed}`,
          `${it.materialId?.UOM || ''}`
        ]);
      });

      selectedConversion.outputs?.forEach(it => {
        const targetId = it.itemId?._id || it.itemId;
        const fullMat = dbMaterials?.find(m => m._id === targetId);

        const typeLabel = it.itemType === 'RawMaterial' ? ' [Raw Mat]' : ' [Product]';
        const descOnly = `${fullMat?.ItemDescription || it.itemId?.ItemDescription || "-"}${typeLabel}`;

        const segment = fullMat?.Segment || fullMat?.segment ||
          it.itemId?.Segment || it.itemId?.segment || "N/A";

        const dimension = fullMat?.Dimension || fullMat?.dimension ||
          fullMat?.Dimensions || fullMat?.dimensions ||
          it.itemId?.Dimension || it.itemId?.dimension ||
          it.itemId?.Dimensions || it.itemId?.dimensions || "N/A";

        tableRows.push([
          `OUTPUT (${it.itemType})`,
          descOnly,
          segment,
          dimension,
          `+${it.qtyProduced}`,
          `${it.itemId?.UOM || ''}`
        ]);
      });

      autoTable(doc, {
        startY: 64,
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',

        didDrawPage: (data) => {
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.06 }));
          const logoWidth = 80;
          const logoHeight = 80;
          const logoX = centerX - (logoWidth / 2);
          const logoY = centerY - (logoHeight / 2);
          doc.addImage('/cropped_circle_image.png', 'PNG', logoX, logoY, logoWidth, logoHeight);
          doc.restoreGraphicsState();

          doc.setFillColor(24, 23, 78);
          doc.rect(0, 0, pageWidth, 30, 'F');

          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text("PRODUCTION WORK IN PROGRESS SHEET", centerX, 13, { align: 'center' });

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(200, 200, 220);
          doc.text(`Material Conversion & Yield Control Registry  |  Generated: ${formattedDate}`, centerX, 21, { align: 'center' });

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text("CONFIDENTIAL - INTERNAL USE ONLY", 14, pageHeight - 10);

          const pageNumber = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
          doc.text(pageNumber, pageWidth - 14, pageHeight - 10, { align: 'right' });
        },

        headStyles: { fillColor: [32, 31, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, valign: 'middle' },
        bodyStyles: { fontSize: 8, textColor: [60, 60, 60], valign: 'middle' },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { overflow: 'linebreak', cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.2 },
        columnStyles: {
          0: { cellWidth: 32, fontStyle: 'bold' },
          1: { cellWidth: 50 },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 26, halign: 'center' }
        },

        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 0) {
            if (data.cell.raw.includes('INPUT')) {
              data.cell.styles.textColor = [185, 28, 28];
            } else {
              data.cell.styles.textColor = [4, 120, 87];
            }
          }
        }
      });

      doc.save(`PRODUCTION_LOG_${selectedConversion.conversionNo}.pdf`);
      setSuccessMessage("PDF Slip downloaded successfully.");
    } catch (e) {
      setErrorMessage("Failed to download PDF slip.");
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
                              <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'} truncate`}>
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
                    className={`text-xs font-semibold px-2.5 py-1 rounded border transition-all cursor-pointer ${
                      isDark ? 'text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-100'
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

                          <td className={`py-2 px-4 truncate max-w-[150px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={item.ItemDescription || item.description}>
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
                              <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'} truncate`}>
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
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${isDark ? 'bg-amber-950/60 text-amber-400 border border-amber-800' : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                              Return
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
                    className={`text-xs font-semibold px-2.5 py-1 rounded border transition-all cursor-pointer ${
                      isDark ? 'text-slate-400 hover:text-white border-slate-800 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 border-slate-200 hover:bg-slate-100'
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

                          <td className={`py-2 px-4 truncate max-w-[150px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={item.ItemDescription}>
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
            <div className={`flex items-center gap-2 text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
              <ClipboardList className="w-4 h-4 text-[#ff6600]" />
              <span>History Logs</span>
            </div>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" value={sidebarSearchQuery} onChange={e => setSidebarSearchQuery(e.target.value)} placeholder="Search Tracking No..." className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200'} border rounded-lg pl-8 pr-2 py-1 text-xs focus:outline-none`} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[420px] pr-1 custom-scrollbar">
            {filteredConversionRecords.length > 0 ? (
              filteredConversionRecords.slice(0, 50).map((rec) => (
                <div key={rec._id} onClick={() => { setSelectedConversion(rec); setIsModalOpen(true); }} className={`${isDark ? 'bg-[#141622] border-slate-800 hover:border-[#ff6600]/60 hover:bg-[#181b29]' : 'bg-white border-slate-100 hover:border-[#18174e]/50 hover:shadow-md'} border rounded-xl p-2.5 flex flex-col gap-0.5 transition-all cursor-pointer group`}>
                  <div className={`flex justify-between items-center pb-0.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                    <span className={`text-xs font-black ${isDark ? 'text-[#ff8533] group-hover:text-emerald-400' : 'text-[#18174e] group-hover:text-emerald-600'}`}>{rec.conversionNo}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded-md ${isDark ? 'bg-blue-950/60 text-blue-300 border border-blue-800' : 'bg-blue-50 text-blue-600'}`}>{rec.productionType}</span>
                  </div>
                  <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'} truncate`}>{rec.customer || rec.remarks || 'No Customer Specified'}</span>
                  <span className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{rec.dateProcessed ? new Date(rec.dateProcessed).toLocaleDateString() : 'No Date'}</span>
                </div>
              ))
            ) : (
              <span className="text-center pt-4 text-red-500 italic font-bold text-xs">No matching records found.</span>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && selectedConversion && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl w-full max-w-3xl p-6 shadow-xl relative flex flex-col gap-4`}>

            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-lg`}>
                WIP No: {selectedConversion.conversionNo}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 bg-[#ff6600] hover:bg-[#e05a00] text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={`${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'} p-1 rounded-lg cursor-pointer transition-colors`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-2 text-sm gap-2 ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-100'} p-4 rounded-xl border`}>
              <div><span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Control Tracking No:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedConversion.conversionNo}</span></div>
              <div><span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Execution Date:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedConversion.dateProcessed ? new Date(selectedConversion.dateProcessed).toLocaleDateString() : '-'}</span></div>
              <div><span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Production Type:</span> <span className={`font-bold ${isDark ? 'text-blue-400 bg-blue-950/60 border-blue-800' : 'text-blue-600 bg-blue-50 border-blue-100'} uppercase text-xs px-2 py-0.5 rounded-md border inline-block`}>{selectedConversion.productionType}</span></div>
              <div><span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Prepared By:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedConversion.preparedBy || 'N/A'}</span></div>
              <div className="col-span-2"><span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Customer:</span> <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{selectedConversion.customer || selectedConversion.remarks || 'N/A'}</span></div>
            </div>

            <div className={`max-h-80 overflow-y-auto border ${isDark ? 'border-slate-800' : 'border-slate-200/60'} rounded-xl relative shadow-sm flex flex-col overflow-x-auto`}>

              <div className={`p-2.5 ${isDark ? 'bg-[#2a131a] text-rose-300 border-slate-800' : 'bg-red-700 text-[#ffffff] border-slate-200'} text-[11px] font-bold sticky top-0 z-10 border-b uppercase tracking-wide`}>
                Allocated Raw Material Inputs
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`${isDark ? 'bg-[#141622] text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'} font-bold border-b text-[11px]`}>
                    <th className="p-2">Segment</th>
                    <th className="p-2">Item Description</th>
                    <th className="p-2">Dimension</th>
                    <th className="p-2 text-right">Qty Used</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'bg-[#090b10] divide-slate-800' : 'bg-white divide-slate-100'}`}>
                  {selectedConversion.inputs?.map((it, idx) => {
                    const targetId = it.materialId?._id || it.materialId;
                    const fullMat = dbMaterials?.find(m => m._id === targetId);

                    const segment = fullMat?.Segment || fullMat?.segment || it.materialId?.Segment || it.materialId?.segment || 'N/A';
                    const desc = fullMat?.ItemDescription || it.materialId?.ItemDescription || '-';
                    const dimension = fullMat?.Dimension || fullMat?.dimension || fullMat?.Dimensions || fullMat?.dimensions || it.materialId?.Dimension || it.materialId?.dimension || 'N/A';
                    const uom = fullMat?.UOM || it.materialId?.UOM || '';

                    return (
                      <tr key={`in-${idx}`} className={`${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/50'} transition-colors`}>
                        <td className={`p-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{segment}</td>
                        <td className={`p-2.5 ${isDark ? 'text-slate-200' : 'text-slate-700'} font-medium truncate max-w-xs`} title={desc}>{desc}</td>
                        <td className={`p-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'} font-mono text-[11px]`}>{dimension}</td>
                        <td className="p-2.5 text-right font-bold text-rose-500">-{it.qtyUsed} {uom}</td>
                      </tr>
                    );
                  })}
                  {(!selectedConversion.inputs || selectedConversion.inputs.length === 0) && (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-slate-400 italic">No inputs recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className={`p-2.5 ${isDark ? 'bg-[#122b20] text-emerald-300 border-slate-800' : 'bg-emerald-700 text-[#ffffff] border-emerald-100'} text-[11px] font-bold sticky top-[33px] z-10 border-t border-b uppercase tracking-wide`}>
                Yield Conversion Outputs
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`${isDark ? 'bg-[#141622] text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'} font-bold border-b text-[11px]`}>
                    <th className="p-2">Segment</th>
                    <th className="p-2">Item Description</th>
                    <th className="p-2">Dimension</th>
                    <th className="p-2 text-right">Qty Produced</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'bg-[#090b10] divide-slate-800' : 'bg-white divide-slate-100'}`}>
                  {selectedConversion.outputs?.map((it, idx) => {
                    const targetId = it.itemId?._id || it.itemId;
                    const fullMat = dbMaterials?.find(m => m._id === targetId);

                    const segment = fullMat?.Segment || fullMat?.segment || it.itemId?.Segment || it.itemId?.segment || 'N/A';
                    const desc = fullMat?.ItemDescription || it.itemId?.ItemDescription || '-';
                    const dimension = fullMat?.Dimension || fullMat?.dimension || fullMat?.Dimensions || fullMat?.dimensions || it.itemId?.Dimension || it.itemId?.dimension || 'N/A';
                    const uom = fullMat?.UOM || it.itemId?.UOM || '';

                    return (
                      <tr key={`out-${idx}`} className={`${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/50'} transition-colors`}>
                        <td className={`p-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{segment}</td>
                        <td className={`p-2.5 ${isDark ? 'text-slate-200' : 'text-slate-700'} font-medium truncate max-w-xs`} title={desc}>{desc}</td>
                        <td className={`p-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'} font-mono text-[11px]`}>{dimension}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">+{it.qtyProduced} {uom}</td>
                      </tr>
                    );
                  })}
                  {(!selectedConversion.outputs || selectedConversion.outputs.length === 0) && (
                    <tr>
                      <td colSpan="4" className="p-4 text-center text-slate-400 italic">No outputs recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>

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
                        <td className="py-2 px-3 font-semibold max-w-[180px] truncate" title={item.ItemDescription}>
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
                        <td className="py-2 px-3 font-semibold max-w-[180px] truncate" title={item.ItemDescription}>
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
                          <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span className="whitespace-nowrap">{item.ItemDescription}</span>
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
                          <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span className="whitespace-nowrap">{item.ItemDescription}</span>
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
