import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Trash2, ClipboardList, Search, X, Download, User, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from '../Common/PageHeader';

const RAW_MAT_URL = "http://localhost:5000/api/raw-materials";
const PRODUCTS_URL = "http://localhost:5000/api/products";
const CONVERSION_URL = "http://localhost:5000/api/conversions";

function WorkInProgress() {
  const [dbMaterials, setDbMaterials] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [conversionRecords, setConversionRecords] = useState([]);

  const [rawMatSearchQuery, setRawMatSearchQuery] = useState('');
  const [outputSearchQuery, setOutputSearchQuery] = useState('');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');

  const [selectedConversion, setSelectedConversion] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // WIP / Conversion Form States
  const [productionType, setProductionType] = useState('Cutting');
  const [dateProcessed, setDateProcessed] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [preparedBy, setPreparedBy] = useState('System User');

  // Manifest Grids (State Containers)
  const [inputMaterials, setInputMaterials] = useState([]);
  const [outputItems, setOutputItems] = useState([]);

  // Custom Inline Toast Message States
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

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
      const [matsRes, prodsRes, convsRes] = await Promise.all([
        axios.get(RAW_MAT_URL),
        axios.get(PRODUCTS_URL),
        axios.get(CONVERSION_URL)
      ]);
      setDbMaterials(matsRes.data || []);
      setDbProducts(prodsRes.data?.filter(p => !p.isArchived) || prodsRes.data || []);
      setConversionRecords(convsRes.data || []);
    } catch (err) {
      console.error("Error loading Conversion/WIP registry data:", err);
      setErrorMessage("Hindi ma-load ang registry data mula sa server.");
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

  // --- DYNAMIC OUTPUT HANDLERS (PRODUCTS & RAW MATERIALS) ---
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
  const handleSubmitConversion = async (e) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (inputMaterials.length === 0) {
      setErrorMessage("Mangyaring magdagdag ng kahit isang Raw Material input.");
      return;
    }
    if (outputItems.length === 0) {
      setErrorMessage("Mangyaring magdagdag ng kahit isang Output Product, Return, o Scrap line.");
      return;
    }

    const hasInvalidInputQty = inputMaterials.some(i => i.qtyUsed === '' || i.qtyUsed <= 0);
    const hasInvalidOutputQty = outputItems.some(o => o.qtyProduced === '' || o.qtyProduced <= 0);
    if (hasInvalidInputQty || hasInvalidOutputQty) {
      setErrorMessage("Maglagay ng tamang bilangan ng quantity para sa lahat ng aytem.");
      return;
    }

    const stockViolation = inputMaterials.find(i => i.qtyUsed > i.Available);
    if (stockViolation) {
      setErrorMessage(`Kulang ang stock para sa ${stockViolation.Code}. Mayroon na lamang na: ${stockViolation.Available}`);
      return;
    }

    const payload = {
      productionType,
      dateProcessed,
      preparedBy,
      remarks,
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
        setRemarks('');
        setProductionType('Cutting');
        fetchData();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || "Server error upon logging conversion sheet.";
      setErrorMessage(errMsg);
    }
  };

  // --- PDF REPORT GENERATION ---
const handleDownloadPDF = () => {
  if (!selectedConversion) return;
  try {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    // Kunin ang mga sukat ng A4 (Portrait)
    const pageWidth = 210;
    const pageHeight = 297;
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;

    const formattedDate = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    // --- MGA DETALYE SA ITAAS NG TALAHANAYAN (Metadata Section) ---
    // Static items are kept here to prevent duplication artifacts on multi-page overflows
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    // Row 1 Meta
    doc.text("Conversion No:", 14, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedConversion.conversionNo}`, 45, 42);

    doc.setFont("helvetica", "bold");
    doc.text("Date Processed:", 120, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedConversion.dateProcessed ? new Date(selectedConversion.dateProcessed).toLocaleDateString() : '-'}`, 155, 42);

    // Row 2 Meta
    doc.setFont("helvetica", "bold");
    doc.text("Process Mode:", 14, 49);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229); // Modern Indigo Accent
    doc.text(`${selectedConversion.productionType}`, 45, 49);

    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.text("Prepared By:", 120, 49);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedConversion.preparedBy || preparedBy}`, 155, 49);

    // Row 3 Meta
    doc.setFont("helvetica", "bold");
    doc.text("Remarks/Notes:", 14, 56);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedConversion.remarks || "No supplementary remarks recorded."}`, 45, 56);

    // --- PAGHAHANDA NG DATA NG TALAHANAYAN ---
    const tableColumns = ["Flow Direction", "Item Catalog Details", "Quantity Shift", "UOM"];
    const tableRows = [];

    // Map Inputs
    selectedConversion.inputs?.forEach(it => {
      tableRows.push([
        "INPUT (Deducted)",
        `${it.materialId?.Code || 'N/A'}\n${it.materialId?.ItemDescription || '-'}`,
        `-${it.qtyUsed}`,
        `${it.materialId?.UOM || ''}`
      ]);
    });

    // Map Outputs
    selectedConversion.outputs?.forEach(it => {
      const typeLabel = it.itemType === 'RawMaterial' ? ' [Raw Mat]' : ' [Product]';
      tableRows.push([
        `OUTPUT (${it.itemType})`,
        `${it.itemId?.Code || 'N/A'}${typeLabel}\n${it.itemId?.ItemDescription || '-'}`,
        `+${it.qtyProduced}`,
        `${it.itemId?.UOM || ''}`
      ]);
    });

    // --- AUTOTABLE GENERATION WITH THUMBNAIL LAYOUT ---
    autoTable(doc, {
      startY: 64,
      head: [tableColumns],
      body: tableRows,
      theme: 'grid',
      
      // Hook para sa pag-render ng background UI element layers sa bawat page
      didDrawPage: (data) => {
        // 1. Watermark Logo Layer
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.06 })); 
        const logoWidth = 80;  
        const logoHeight = 80; 
        const logoX = centerX - (logoWidth / 2);
        const logoY = centerY - (logoHeight / 2);
        doc.addImage('/one.logo.png', 'PNG', logoX, logoY, logoWidth, logoHeight);
        doc.restoreGraphicsState();

        // 2. Branding Header Banner Block
        doc.setFillColor(24, 23, 78);
        doc.rect(0, 0, pageWidth, 30, 'F');

        // 3. Header Typography Layout (Centered for Design Symmetry)
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("PRODUCTION WORK IN PROGRESS SHEET", centerX, 13, { align: 'center' });
        
        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(200, 200, 220); 
        doc.text(`Material Conversion & Yield Control Registry  |  Generated: ${formattedDate}`, centerX, 21, { align: 'center' });

        // 4. System Standard Footer Layout
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
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 85 },
        2: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 25, halign: 'center' }
      },
      
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 0) {
          if (data.cell.raw.includes('INPUT')) {
            data.cell.styles.textColor = [185, 28, 28]; // Matingkad na Pula para sa Inputs
          } else {
            data.cell.styles.textColor = [4, 120, 87];  // Matingkad na Berde para sa Outputs
          }
        }
      }
    });

    // --- SIGNATORIES SECTION ---
    const finalY = doc.lastAutoTable.finalY + 20;
    

    // Save PDF Document Object Instance
    doc.save(`PRODUCTION_LOG_${selectedConversion.conversionNo}.pdf`);
    setSuccessMessage("🎉 PDF Slip downloaded successfully.");
  } catch (e) {
    setErrorMessage("🚨 Nagka-problema sa pag-download ng PDF.");
  }
};

  // --- FILTER SUGGESTIONS ---
  const filteredRawMatSuggestions = dbMaterials.filter(item =>
    item.Code?.toLowerCase().includes(rawMatSearchQuery.toLowerCase()) ||
    item.ItemDescription?.toLowerCase().includes(rawMatSearchQuery.toLowerCase())
  );

  const combinedOutputSuggestions = [
    ...dbProducts.map(p => ({ ...p, type: 'Product' })),
    ...dbMaterials.map(m => ({ ...m, type: 'RawMaterial' }))
  ].filter(item =>
    item.Code?.toLowerCase().includes(outputSearchQuery.toLowerCase()) ||
    item.ItemDescription?.toLowerCase().includes(outputSearchQuery.toLowerCase())
  );

  const filteredConversionRecords = conversionRecords.filter(rec =>
    rec.conversionNo?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
    rec.productionType?.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
  );

  return (
    <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased text-slate-600">

      {/* 🎉 SUCCESS NOTIFICATION TOAST */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 🚨 ERROR NOTIFICATION TOAST */}
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
        {/* LEFT CONTAINER (WIP/CONVERSION DATA SHEET FORM) */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 flex flex-col gap-6 shadow-sm">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between text-sm font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#18174e]" />
              <span>Work In Progress (WIP) Conversion Matrix</span>
            </div>
            {(inputMaterials.length > 0 || outputItems.length > 0) && (
              <button
                type="button"
                onClick={() => { setInputMaterials([]); setOutputItems([]); setRemarks(''); setSuccessMessage("Form grid cleared."); }}
                className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
              >
                Clear Form Grid
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitConversion} className="flex flex-col gap-5">
            {/* META DETAILS SUMMARY GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Control Number</label>
                <div className="relative"><FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="text" value="[ AUTO-GENERATED ]" disabled className="w-full bg-slate-50 border border-slate-200 text-slate-400 rounded-lg pl-9 pr-3 py-2 text-sm font-bold select-none cursor-not-allowed focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Production Type</label>
                <select value={productionType} onChange={e => setProductionType(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none text-[#18174e]">


                  <option value="Cutting">🟡 Cutting</option>
                  <option value="Assembly">🟢 Assembly</option>
                  <option value="Fabrication">🔵 Fabrication</option>
                  <option value="Customization">🟣 Customization</option>
                  <option value="Repair">🔴 Repair / Rework</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Date Processed</label>
                <div className="relative"><Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="date" value={dateProcessed} onChange={e => setDateProcessed(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none" required />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Process Remarks</label>
                <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Enter any supplementary remarks or notes..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Prepared Name</label>
                <div className="relative"><User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="text" value={preparedBy} disabled className="w-full bg-slate-50 border border-slate-200 text-slate-400 rounded-lg pl-9 pr-3 py-2 text-sm font-semibold cursor-not-allowed select-none focus:outline-none" />
                </div>
              </div>
            </div>

            {/* --- STEP 1: ALLOCATE RAW MATERIAL (INPUT) --- */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1.5 relative">
              <label className="block text-sm font-bold text-[#18174e] uppercase">Step 1: Type / Select Supplies to Add (Raw Material Input)</label>
              <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input type="text" value={rawMatSearchQuery} onChange={e => setRawMatSearchQuery(e.target.value)} placeholder="Search raw material code or description..." className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none" />
              </div>
              {rawMatSearchQuery && (
  <div className="absolute left-0 right-0 top-[102%] bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50 divide-y divide-slate-100 p-1">
    {filteredRawMatSuggestions.length > 0 ? (
      filteredRawMatSuggestions.map(item => (
        <div 
          key={item._id} 
          onClick={() => handleSelectRawMaterial(item)} 
          className="p-3 hover:bg-slate-50 cursor-pointer flex flex-col gap-1 rounded-lg transition-colors"
        >
          {/* Unang Linya: Code, UOM, at Available Stock Status Badge */}
          <div className="flex justify-between items-center font-bold text-slate-800 text-sm">
            <div className="flex items-center gap-2">
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono">
                {item.Code}
              </span>
              <span className="text-xs font-medium text-slate-400 lowercase italic">
                {item.UOM || 'pcs'}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              Avail: {item.ActualCount || 0}
            </span>
          </div>

          {/* Pangalawang Linya: Description */}
          <span className="text-slate-800 font-semibold text-sm truncate">
            {item.ItemDescription}
          </span>

          {/* Pangatlong Linya: Consistent Dynamic Badges para sa Cat, Seg, at Dim */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-medium pt-0.5">
            <span className="bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
              Cat: {item.Category || item.category || 'Raw Material'}
            </span>
            
            {(item.Segment || item.segment) && (
              <span className="bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                Seg: {item.Segment || item.segment}
              </span>
            )}
            
            {(item.Dimensions || item.dimensions || item.Dimension || item.dimension) && (
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-mono">
                Dim: {item.Dimensions || item.dimensions || item.Dimension || item.dimension}
              </span>
            )}
          </div>
        </div>
      ))
    ) : (
      <div className="p-3 text-xs italic text-slate-400 text-center">
        No raw material stock found matching.
      </div>
    )}
  </div>
)}
            </div>

            {/* INPUT TABLE */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-1 rounded w-fit uppercase tracking-wider">Raw Material Input (Stock Deduction Grid)</span>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="text-white font-bold bg-[#18174e] uppercase text-xs whitespace-nowrap">
                      <th className="py-3 px-4">Material Code</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-center w-28">Qty Used</th>
                      <th className="py-3 px-4 text-center">UOM</th>
                      <th className="py-3 px-4 text-center">Stock Balance</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inputMaterials.length > 0 ? (
                      inputMaterials.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/80">
                          <td className="py-2 px-4 font-bold">{item.Code}</td>
                          <td className="py-2 px-4 text-xs truncate max-w-[200px]" title={item.ItemDescription}>{item.ItemDescription}</td>
                          <td className="py-2 px-4">
                            <input type="number" min="1" value={item.qtyUsed} onChange={e => handleUpdateInputQty(index, e.target.value)} className="w-full border text-center rounded py-1 text-sm font-bold text-red-600 focus:outline-none" required />
                          </td>
                          <td className="py-2 px-4 text-center"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{item.UOM}</span></td>
                          <td className="py-2 px-4 text-center font-medium text-slate-500">{item.Available}</td>
                          <td className="py-2 px-4 text-center">
                            <button type="button" onClick={() => { setInputMaterials(inputMaterials.filter((_, i) => i !== index)); setSuccessMessage("Material removed from allocation matrix."); }} className="text-red-500 hover:text-red-700 cursor-pointer"><Trash2 className="w-4 h-4 inline" /></button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="6" className="text-center py-5 text-slate-400 italic text-xs">No raw material inputs added yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- STEP 2: CONVERSION TARGET (DYNAMIC OUTPUT) --- */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1.5 relative">
              <label className="block text-sm font-bold text-emerald-800 uppercase">Step 2: Map Conversion Output Target (Products or Raw Materials)</label>
              <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input type="text" value={outputSearchQuery} onChange={e => setOutputSearchQuery(e.target.value)} placeholder="Search profile code (returns both finished goods & raw materials)..." className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none" />
              </div>
              {outputSearchQuery && (
                <div className="absolute left-0 right-0 top-[102%] bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50 divide-y divide-slate-100 p-1">
                  {combinedOutputSuggestions.length > 0 ? (
                    combinedOutputSuggestions.map(item => (
                      <div key={`${item.type}-${item._id}`} onClick={() => handleSelectOutputItem(item, item.type)} className="p-3 hover:bg-slate-50 cursor-pointer flex flex-col gap-1 rounded-lg transition-colors">
                        {/* Unang Linya: Code, UOM, at Type Badge */}
                        <div className="flex justify-between items-center font-bold text-slate-800 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono">{item.Code}</span>
                            <span className="text-xs font-medium text-slate-400 lowercase italic">{item.UOM || 'pcs'}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${item.type === 'RawMaterial'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                            {item.type === 'RawMaterial' ? 'Raw Mat Return' : 'Finished Goods'}
                          </span>
                        </div>

                        {/* Pangalawang Linya: Description */}
                        <span className="text-slate-800 font-semibold text-sm truncate">{item.ItemDescription}</span>

                        {/* Pangatlong Linya: Dynamic Badges para sa Category, Segment, at Dimensions */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-medium pt-0.5">
                          <span className="bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Cat: {item.Category || item.category || item.type}</span>
                          {(item.Segment || item.segment) && <span className="bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Seg: {item.Segment || item.segment}</span>}
                          {(item.Dimensions || item.dimensions || item.Dimension || item.dimension) && (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-mono">
                              Dim: {item.Dimensions || item.dimensions || item.Dimension || item.dimension}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-xs italic text-slate-400 text-center">No catalog profiles matched.</div>
                  )}
                </div>
              )}
            </div>

            {/* OUTPUT TABLE */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded w-fit uppercase tracking-wider">Yield Output Target (Stock Addition Matrix)</span>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="text-white font-bold bg-[#18174e] uppercase text-xs whitespace-nowrap">
                      <th className="py-3 px-4">Output Code</th>
                      <th className="py-3 px-4">Yield Description Target</th>
                      <th className="py-3 px-4 text-center">Target Type</th>
                      <th className="py-3 px-4 text-center w-28">Qty Produced</th>
                      <th className="py-3 px-4 text-center">UOM</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {outputItems.length > 0 ? (
                      outputItems.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/80">
                          <td className="py-2 px-4 font-bold text-emerald-700">{item.Code}</td>
                          <td className="py-2 px-4 text-xs truncate max-w-[220px]" title={item.ItemDescription}>{item.ItemDescription}</td>
                          <td className="py-2 px-4 text-center">
                            <span className={`text-[10px] px-2 py-0.5 font-bold rounded uppercase ${item.itemType === 'RawMaterial' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700'}`}>
                              {item.itemType === 'RawMaterial' ? 'Raw Mat' : 'Product'}
                            </span>
                          </td>
                          <td className="py-2 px-4">
                            <input type="number" min="1" value={item.qtyProduced} onChange={e => handleUpdateOutputQty(index, e.target.value)} className="w-full border text-center rounded py-1 text-sm font-bold text-emerald-600 focus:outline-none" required />
                          </td>
                          <td className="py-2 px-4 text-center"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{item.UOM}</span></td>
                          <td className="py-2 px-4 text-center">
                            <button type="button" onClick={() => { setOutputItems(outputItems.filter((_, i) => i !== index)); setSuccessMessage("Yield output target line removed."); }} className="text-red-500 hover:text-red-700 cursor-pointer"><Trash2 className="w-4 h-4 inline" /></button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="6" className="text-center py-5 text-slate-400 italic text-xs">No output lines mapped yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button type="submit" className="w-full bg-[#18174e] hover:bg-[#252375] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer shadow-sm">
              Commit Production Log & Shift Stock Balances
            </button>
          </form>
        </div>

        {/* RIGHT CONTAINER (SIDEBAR HISTORY RECENT LOGS) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 shadow-sm h-auto min-h-[400px]">
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <ClipboardList className="w-4 h-4 text-[#18174e]" />
              <span>History Logs</span>
            </div>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" value={sidebarSearchQuery} onChange={e => setSidebarSearchQuery(e.target.value)} placeholder="Search Tracking No..." className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1 text-xs focus:outline-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 overflow-hidden">
            {filteredConversionRecords.length > 0 ? (
              filteredConversionRecords.slice(0, 5).map((rec) => (
                <div key={rec._id} onClick={() => { setSelectedConversion(rec); setIsModalOpen(true); }} className="bg-white border border-slate-100 rounded-xl p-2.5 flex flex-col gap-0.5 hover:border-[#18174e]/50 transition-all cursor-pointer hover:shadow-md group">
                  <div className="flex justify-between items-center pb-0.5 border-b border-slate-50">
                    <span className="text-xs font-black text-[#18174e] group-hover:text-emerald-600">{rec.conversionNo}</span>
                    <span className="text-[9px] px-1.5 py-0.5 font-bold rounded-md bg-indigo-50 text-indigo-600">{rec.productionType}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate">{rec.remarks || 'No Tracking Notes'}</span>
                  <span className="text-[10px] font-semibold text-slate-400">{rec.dateProcessed ? new Date(rec.dateProcessed).toLocaleDateString() : 'No Date'}</span>
                </div>
              ))
            ) : (
              <span className="text-center text-xs italic text-slate-400 pt-4">No records matched.</span>
            )}
          </div>
        </div>
      </div>

      {/* DRILL-DOWN REVIEW MODAL POPUP */}
      {isModalOpen && selectedConversion && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 shadow-xl relative text-slate-700 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-lg">Production Record Sheet: {selectedConversion.conversionNo}</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-emerald-700 transition-colors"><Download className="w-3.5 h-3.5" /> Download PDF</button>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 text-sm gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div><span className="font-semibold text-slate-400">Control tracking No:</span> <span className="font-bold text-slate-800">{selectedConversion.conversionNo}</span></div>
              <div><span className="font-semibold text-slate-400">Execution Date:</span> <span className="font-bold text-slate-800">{selectedConversion.dateProcessed ? new Date(selectedConversion.dateProcessed).toLocaleDateString() : '-'}</span></div>
              <div><span className="font-semibold text-slate-400">Production Type:</span> <span className="font-bold text-indigo-600 uppercase">{selectedConversion.productionType}</span></div>
              <div><span className="font-semibold text-slate-400">Prepared By:</span> <span className="font-bold text-slate-800">{selectedConversion.preparedBy}</span></div>
              <div className="col-span-2"><span className="font-semibold text-slate-400">Remarks:</span> <span className="font-bold text-slate-600 text-xs">{selectedConversion.remarks || 'N/A'}</span></div>
            </div>

            {/* RELATIONAL MATRIX DISPLAY DESK */}
            <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
              <div className="p-2.5 bg-slate-50/50 text-xs font-bold text-[#18174e]">ALLOCATED RAW MATERIAL INPUTS</div>
              <table className="w-full text-left text-xs">
                <tbody>
                  {selectedConversion.inputs?.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-700 w-1/3">{it.materialId?.Code || 'N/A'}</td>
                      <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate">{it.materialId?.ItemDescription || '-'}</td>
                      <td className="p-3 text-right font-bold text-red-600">-{it.qtyUsed} {it.materialId?.UOM}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-2.5 bg-slate-50/50 text-xs font-bold text-emerald-800">YIELD CONVERSION OUTPUTS</div>
              <table className="w-full text-left text-xs">
                <tbody>
                  {selectedConversion.outputs?.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-emerald-800 w-1/3">
                        {it.itemId?.Code || 'N/A'}
                        <span className="text-[9px] text-slate-400 block font-normal">({it.itemType === 'RawMaterial' ? 'Raw Mat' : 'Product'})</span>
                      </td>
                      <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate">{it.itemId?.ItemDescription || '-'}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">+{it.qtyProduced} {it.itemId?.UOM}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default WorkInProgress;