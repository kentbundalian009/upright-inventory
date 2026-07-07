import React, { useState, useEffect } from 'react';
import { FileText, Truck, Calendar, ClipboardList, ListPlus, Trash2, Search, X, Download, User, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from '../Common/PageHeader';
// Import react-hot-toast
import toast, { Toaster } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.MODE === 'production'
  ? 'https://one-inventory.onrender.com/api'
  : 'http://localhost:5000/api';

const RAW_MAT_URL = `${API_BASE_URL}/raw-materials`;
const PO_URL = `${API_BASE_URL}/purchase-orders`;

// Helper function upang makuha ang kasalukuyang petsa sa format na YYYY-MM-DD base sa lokal na oras ng computer
const getTodayDateString = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - (offset * 60 * 1000));
  return localToday.toISOString().split('T')[0];
};

function InboundRawMat() {
  const [dbMaterials, setDbMaterials] = useState([]);
  const [poRecords, setPoRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [selectedPo, setSelectedPo] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMatModalOpen, setIsMatModalOpen] = useState(false);

  // PO Form States
  const [poNo, setPoNo] = useState('');
  const [supplier, setSupplier] = useState('');
  const [dateReceived, setDateReceived] = useState(getTodayDateString());
  const [originAddress, setOriginAddress] = useState('');
  const [manifestItems, setManifestItems] = useState([]);

  // New Raw Material Form States
  const [newMatCode, setNewMatCode] = useState('');
  const [newMatCategory, setNewMatCategory] = useState('');
  const [newMatSegment, setNewMatSegment] = useState('');
  const [newMatDesc, setNewMatDesc] = useState('');
  const [newMatDimension, setNewMatDimension] = useState('');
  const [newMatUOM, setNewMatUOM] = useState('');
  const [newMatAccountTo, setNewMatAccountTo] = useState('');

  const [preparedBy, setPreparedBy] = useState('System User');

  // Autocomplete / Datalist Extractors
  const [uniqueSuppliers, setUniqueSuppliers] = useState([]);
  const [uniqueAddresses, setUniqueAddresses] = useState([]);
  const [uniqueCategories, setUniqueCategories] = useState([]);
  const [uniqueSegments, setUniqueSegments] = useState([]);

  // MGA BAGONG EXTRACTORS PARA SA DROPDOWN NG MGA EXISTING FIELDS
  const [uniqueDescriptions, setUniqueDescriptions] = useState([]);
  const [uniqueDimensions, setUniqueDimensions] = useState([]);
  const [uniqueUOMs, setUniqueUOMs] = useState([]);
  const [uniqueAccounts, setUniqueAccounts] = useState([]);

  // CUSTOM TOAST LAYOUTS INTEGRATED FROM SUPPLIESMOVEMENTS
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
      const [matsRes, posRes] = await axios.all([
        axios.get(RAW_MAT_URL),
        axios.get(PO_URL)
      ]);

      const materials = matsRes.data || [];
      const pos = posRes.data || [];

      setDbMaterials(materials);
      setPoRecords(pos);

      // Kunin ang mga unique values para sa main PO logs form autocomplete
      const suppliers = [...new Set(pos.map(p => p.supplier).filter(Boolean))];
      const addresses = [...new Set(pos.map(p => p.originAddress).filter(Boolean))];
      setUniqueSuppliers(suppliers);
      setUniqueAddresses(addresses);

      // Kunin ang mga unique values para sa Raw Material Profile creation modal autocomplete
      const categories = [...new Set(materials.map(m => m.Category).filter(Boolean))];
      const segments = [...new Set(materials.map(m => m.Segment).filter(Boolean))];
      setUniqueCategories(categories);
      setUniqueSegments(segments);

      // Eto ang kumukuha ng mga existing values para sa bagong dropdowns mo sa modal
      const descriptions = [...new Set(materials.map(m => m.ItemDescription).filter(Boolean))];
      const dimensions = [...new Set(materials.map(m => m.Dimension).filter(Boolean))];
      const uoms = [...new Set(materials.map(m => m.UOM).filter(Boolean))];
      const accounts = [...new Set(materials.map(m => m.AccountTo).filter(Boolean))];

      setUniqueDescriptions(descriptions);
      setUniqueDimensions(dimensions);
      setUniqueUOMs(uoms);
      setUniqueAccounts(accounts);

    } catch (err) {
      console.error("Error loading database logs:", err);
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

  const handleSelectMaterial = (item) => {
    if (manifestItems.some(i => i.materialId === item._id)) {
      showErrorToast("Item already added.");
      return;
    }
    setManifestItems([...manifestItems, {
      materialId: item._id,
      Code: item.Code,
      ItemDescription: item.ItemDescription,
      Category: item.Category || 'N/A',   // Bagong dagdag
      Segment: item.Segment || 'N/A',     // Bagong dagdag
      Dimension: item.Dimension || 'N/A', // Bagong dagdag
      AccountTo: item.AccountTo || 'N/A', // Bagong dagdag
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

  const handleCreateMaterialProfile = async (e) => {
    e.preventDefault();
    if (!newMatCode || !newMatCategory || !newMatDesc || !newMatUOM) {
      return showErrorToast("Please fill up all required fields.");
    }

    const payload = {
      Code: newMatCode,
      Category: newMatCategory,
      Segment: newMatSegment,
      ItemDescription: newMatDesc,
      Dimension: newMatDimension,
      UOM: newMatUOM,
      AccountTo: newMatAccountTo
    };

    try {
      const res = await axios.post(RAW_MAT_URL, payload);
      if (res.status === 200 || res.status === 201) {
        showSuccessToast("New Raw Material Profile Added Successfully!");
        setNewMatCode(''); setNewMatCategory(''); setNewMatSegment('');
        setNewMatDesc(''); setNewMatDimension(''); setNewMatUOM(''); setNewMatAccountTo('');
        setIsMatModalOpen(false);
        fetchData();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || "Error adding raw material profile.";
      showErrorToast(errMsg);
    }
  };

  const handleSubmitPO = async (e) => {
    e.preventDefault();
    if (!poNo || poNo.trim() === "") return showErrorToast("Please fill up Purchase Order No.");
    if (manifestItems.length === 0) return showErrorToast("Please add at least one item to the manifest grid.");
    if (!dateReceived || dateReceived === "") return showErrorToast("Please select a valid Date Received.");

    const hasInvalidQty = manifestItems.some(i => i.qty === '' || i.actualCount === '' || isNaN(i.qty) || isNaN(i.actualCount));
    if (hasInvalidQty) return showErrorToast("Please input valid quantities for all items before saving.");

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
        fetchData();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.error || "Server error connection upon logging Purchase Order.";
      showErrorToast("Error: " + errMsg);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedPo) return;
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
      // Inilipat natin ito dito dahil ang static text ay magpapatong-patong kapag multi-page kung ilalagay sa didDrawPage.
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);

      doc.text("Purchase Order No.:", 14, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedPo.poNo}`, 50, 42);

      doc.setFont("helvetica", "bold");
      doc.text("Date Received:", 120, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedPo.deliveryDate ? new Date(selectedPo.deliveryDate).toLocaleDateString() : '-'}`, 155, 42);

      doc.setFont("helvetica", "bold");
      doc.text("Supplier:", 14, 49);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedPo.supplier || 'N/A'}`, 50, 49);

      doc.setFont("helvetica", "bold");
      doc.text("Prepared By:", 120, 49);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedPo.preparedBy || preparedBy}`, 155, 49);

      doc.setFont("helvetica", "bold");
      doc.text("Origin Address:", 14, 56);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedPo.originAddress || 'N/A'}`, 50, 56);

      // --- PAGHAHANDA NG DATA NG TALAHANAYAN ---
      const tableColumns = ["Material Profile", "QTY Ordered", "Actual Received", "Remarks"];
      const tableRows = [];

      selectedPo.items?.forEach(it => {
        const profileInfo = `${it.materialId?.Code || 'N/A'}\n${it.materialId?.ItemDescription || '-'}`;
        const qtySent = `${it.qty} ${it.materialId?.UOM || ''}`;
        const actualRec = `${it.actualCountReceived} ${it.materialId?.UOM || ''}`;
        const rem = it.remarks || "-";
        tableRows.push([profileInfo, qtySent, actualRec, rem]);
      });

      // --- AUTOTABLE GENERATION ---
      autoTable(doc, {
        startY: 65,
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',

        // Dito inilalagay ang Thumbnail/Layout Styles para sa bawat pahina
        didDrawPage: (data) => {
          // 1. Watermark (Logo sa Likod)
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.06 }));
          const logoWidth = 80;
          const logoHeight = 80;
          const logoX = centerX - (logoWidth / 2);
          const logoY = centerY - (logoHeight / 2);
          doc.addImage('/one.logo.png', 'PNG', logoX, logoY, logoWidth, logoHeight);
          doc.restoreGraphicsState();

          // 2. Header Banner (Same color scheme: 24, 23, 78)
          doc.setFillColor(24, 23, 78);
          doc.rect(0, 0, pageWidth, 30, 'F');

          // 3. Header Titles (Naka-center para sa mas malinis na UI)
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text("PURCHASE ORDER REPORT", centerX, 13, { align: 'center' });

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(200, 200, 220);
          doc.text(`Inventory Management System Registry  |  Generated: ${formattedDate}`, centerX, 21, { align: 'center' });

          // 4. Footer (Confidentiality & Page Numbers)
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
        columnStyles: {
          0: { cellWidth: 85 },
          1: { cellWidth: 28, halign: 'center' },
          2: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 41 }
        },
        styles: { overflow: 'linebreak', cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.2 }
      });

      // --- SIGNATORY SECTION ---
      const finalY = doc.lastAutoTable.finalY + 20;
      // Tinitiyak na hindi lalampas sa footer ang pirma, kundi ay lilipat sa susunod na pahina

      doc.save(`PO_REPORT_${selectedPo.poNo}.pdf`);
      showSuccessToast("PDF Slip downloaded successfully.");
    } catch (e) {
      showErrorToast("Something went wrong while downloading the PDF.");
    }
  };

  const filteredSuggestions = dbMaterials.filter(item =>
    item.Code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.ItemDescription?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPoRecords = poRecords.filter(rec =>
    rec.poNo?.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
    rec.supplier?.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
  );

  const handleDownloadHistoryPDF = () => {
    if (filteredPoRecords.length === 0) {
      return showErrorToast("No records available to generate the History Report PDF.");
    }

    try {
      const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' }); // Naka-Landscape 'l' para magkasya ang maraming column
      const pageWidth = 297;
      const pageHeight = 210;
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;

      const formattedDate = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      // --- PAGHAHANDA NG DATA PARA SA HISTORY ---
      const tableColumns = ["PO No.", "Supplier Origin", "Date Received", "Prepared By", "Origin Address", "Total Items"];
      const tableRows = [];

      filteredPoRecords.forEach(rec => {
        tableRows.push([
          rec.poNo || 'N/A',
          rec.supplier || 'No Supplier',
          rec.deliveryDate ? new Date(rec.deliveryDate).toLocaleDateString() : 'No Date',
          rec.preparedBy || 'System User',
          rec.originAddress || 'N/A',
          rec.items?.length || 0
        ]);
      });

      // --- AUTOTABLE GENERATION ---
      autoTable(doc, {
        startY: 40,
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',
        didDrawPage: (data) => {
          // Watermark Logo
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.04 }));
          doc.addImage('/one.logo.png', 'PNG', centerX - 40, centerY - 40, 80, 80);
          doc.restoreGraphicsState();

          // Header Banner
          doc.setFillColor(24, 23, 78);
          doc.rect(0, 0, pageWidth, 28, 'F');

          // Header Titles
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text("INBOUND HISTORY LOGS REPORT", centerX, 12, { align: 'center' });

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(200, 200, 220);
          doc.text(`Inventory Management System Registry  |  Generated: ${formattedDate}`, centerX, 20, { align: 'center' });

          // Footer
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text("CONFIDENTIAL - INTERNAL USE ONLY", 14, pageHeight - 10);

          const pageNumber = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
          doc.text(pageNumber, pageWidth - 14, pageHeight - 10, { align: 'right' });
        },
        headStyles: { fillColor: [32, 31, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, valign: 'middle' },
        bodyStyles: { fontSize: 8.5, textColor: [60, 60, 60], valign: 'middle' },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { overflow: 'linebreak', cellPadding: 3.5, lineColor: [230, 230, 230], lineWidth: 0.2 }
      });

      doc.save(`INBOUND_HISTORY_REPORT_${new Date().toISOString().split('T')[0]}.pdf`);
      showSuccessToast("History Report PDF downloaded successfully.");
    } catch (e) {
      showErrorToast("Something went wrong while downloading the History PDF.");
    }
  };

  return (
    <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased text-slate-600">

      {/* Container wrapper rendering for the toast components */}
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
        {/* LEFT CONTAINER (FORM SHEETS) */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 flex flex-col gap-6 shadow-sm">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2 text-sm font-bold text-slate-600">
            <ListPlus className="w-4 h-4 text-[#18174e]" />
            <span>Purchase Order Logging Sheet</span>
          </div>

          <form onSubmit={handleSubmitPO} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Purchase Order No.</label>
                <div className="relative">
                  <input type="text" value={poNo} onChange={e => setPoNo(e.target.value)} placeholder="Enter PO Number" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Supplier Origin *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    list="po-suppliers-list"
                    placeholder="Enter supplier name"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                    required
                  />
                  <datalist id="po-suppliers-list">
                    {uniqueSuppliers.map((sup, idx) => <option key={idx} value={sup} />)}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Date Received</label>
                <div className="relative"><Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="date" value={dateReceived} onChange={e => setDateReceived(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" required />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Origin Location Address</label>
                <input
                  type="text"
                  value={originAddress}
                  onChange={e => setOriginAddress(e.target.value)}
                  list="po-addresses-list"
                  placeholder="Enter origin address"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                />
                <datalist id="po-addresses-list">
                  {uniqueAddresses.map((addr, idx) => <option key={idx} value={addr} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Prepared Name</label>
                <div className="relative"><User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="text" value={preparedBy} disabled className="w-full bg-slate-50 border border-slate-200 text-slate-400 rounded-lg pl-9 pr-3 py-2 text-sm font-semibold cursor-not-allowed select-none focus:outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1.5 relative">
              <div className="flex justify-between items-center mb-0.5">
                <label className="block text-sm font-bold text-emerald-800 uppercase">Step 1: Type / Select Materials for Stock Addition</label>
                <button type="button" onClick={() => setIsMatModalOpen(true)} className="flex items-center justify-center gap-2 bg-[#18174e] hover:bg-[#18174e]/90 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm w-md cursor-pointer transition-all">Add New Rackings Item</button>
              </div>
              <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search item code or description..." className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none" />
              </div>
              {searchQuery && (
                <div className="absolute left-0 right-0 top-[102%] bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50 divide-y divide-slate-100 p-1">
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map(item => (
                      <div
                        key={item._id}
                        onClick={() => handleSelectMaterial(item)}
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
                          {/* Idinagdag na Avail Badge para sa natitirang stock */}
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Avail: {item.ActualCount || item.actualCount || item.AvailableStock || 0}
                          </span>
                        </div>

                        {/* Pangalawang Linya: Item Description */}
                        <span className="text-slate-800 font-semibold text-sm truncate">
                          {item.ItemDescription}
                        </span>

                        {/* Pangatlong Linya: Swabeng Dynamic Badges para sa Cat, Seg, at Dim */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-medium pt-0.5">
                          <span className="bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                            Cat: {item.Category || item.category || 'Material'}
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
                      No materials found matching.
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded w-fit uppercase tracking-wider">Quantities will be automatically added</span>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
  <table className="w-full text-left border-collapse text-sm min-w-[1000px]">
    <thead>
      <tr className="text-white font-bold bg-[#18174e] uppercase text-xs whitespace-nowrap">
        <th className="py-3 px-4">Item Code</th>
        <th className="py-3 px-4">Category</th>
        <th className="py-3 px-4">Segment</th>
        <th className="py-3 px-4">Description</th>
        <th className="py-3 px-4">Dimension</th>
        
        {/* Tinakda sa w-28 at min-w para hindi gumuho ang lapad */}
        <th className="py-3 px-4 text-center w-28 min-w-[112px]">QTY</th>
        
        <th className="py-3 px-4 text-center">UOM</th>
        
        {/* Kaparehong w-28 at min-w para terno sila ng QTY */}
        <th className="py-3 px-4 text-center w-28 min-w-[112px]">Actual</th>
        
        <th className="py-3 px-4">Account To</th>
        <th className="py-3 px-4">Remarks</th>
        <th className="py-3 px-4 text-center">Action</th>
      </tr>
    </thead>

    <tbody className="divide-y divide-slate-100">
      {manifestItems.length > 0 ? (
        manifestItems.map((item, index) => (
          <tr key={item.materialId || index} className="hover:bg-slate-50/80 text-xs">
            <td className="py-2 px-4 font-bold text-sm text-[#18174e]">{item.Code}</td>
            <td className="py-2 px-4 italic text-slate-500">{item.Category}</td>
            <td className="py-2 px-4 italic text-slate-500">{item.Segment}</td>
            <td className="py-2 px-4 truncate max-w-[150px]" title={item.ItemDescription}>
              {item.ItemDescription}
            </td>
            <td className="py-2 px-4 text-slate-500">{item.Dimension}</td>

            {/* QTY TD Cell na may nakatali ring width restriction */}
            <td className="py-2 px-4 w-28 min-w-[112px]">
              <input 
                type="number" 
                min="1" 
                value={item.qty} 
                onChange={e => handleUpdateField(index, 'qty', e.target.value)} 
                className="w-full border text-center rounded py-1 text-sm focus:outline-none focus:border-[#18174e]" 
              />
            </td>

            <td className="py-2 px-4 text-center">
              <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{item.UOM}</span>
            </td>

            {/* Actual TD Cell na kaparehong sukat para kuwadrado at pantay */}
            <td className="py-2 px-4 w-28 min-w-[112px]">
              <input 
                type="number" 
                min="0" 
                value={item.actualCount} 
                onChange={e => handleUpdateField(index, 'actualCount', e.target.value)} 
                className="w-full border text-center rounded py-1 text-sm font-bold text-emerald-600 focus:outline-none focus:border-emerald-600" 
              />
            </td>

            <td className="py-2 px-4 text-slate-500">{item.AccountTo}</td>
            
            <td className="py-2 px-4">
              <input 
                type="text" 
                value={item.remarks} 
                onChange={e => handleUpdateField(index, 'remarks', e.target.value)} 
                placeholder="Remarks" 
                className="w-full border rounded px-2 py-1 text-xs focus:outline-none" 
              />
            </td>

            <td className="py-2 px-4 text-center">
              <button 
                type="button" 
                onClick={() => setManifestItems(manifestItems.filter((_, i) => i !== index))} 
                className="text-red-500 hover:text-red-700 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 inline" />
              </button>
            </td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan="11" className="text-center py-6 text-slate-400 italic text-xs">
            No items added. Search above to add rows.
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>
            </div>
            <button type="submit" className="w-full bg-[#18174e] hover:bg-[#252375] text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors cursor-pointer">Save Purchase Order</button>
          </form>
        </div>

        {/* RIGHT CONTAINER (SIDEBAR) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 shadow-sm h-auto min-h-[400px]">
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
            <div className="flex items-center justify-between w-full text-sm font-bold text-slate-600">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#18174e]" />
                <span>History Logs</span>
              </div>
              {filteredPoRecords.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadHistoryPDF}
                  className="flex items-center gap-1 text-[11px] bg-green-600 hover:bg-green-700 text-white font-bold px-2 py-1 rounded-md transition-colors cursor-pointer"
                  title="I-download ang lahat ng lumalabas sa history log bilang PDF"
                >
                  <Download className="w-3 h-3" /> Report
                </button>
              )}
            </div>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" value={sidebarSearchQuery} onChange={e => setSidebarSearchQuery(e.target.value)} placeholder="Search PO or supplier..." className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1 text-xs focus:outline-none focus:border-[#18174e]/50" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 overflow-hidden">
            {filteredPoRecords.length > 0 ? (
              filteredPoRecords.slice(0, 4).map((rec) => (
                <div key={rec._id} onClick={() => { setSelectedPo(rec); setIsModalOpen(true); }} className="bg-white border border-slate-100 rounded-xl p-2.5 flex flex-col gap-0.5 hover:border-[#18174e]/50 transition-all cursor-pointer hover:shadow-md group">
                  <div className="flex justify-between items-center pb-0.5 border-b border-slate-50">
                    <span className="text-xs font-black text-[#18174e] group-hover:text-emerald-600">{rec.poNo}</span>
                    <span className="text-[9px] px-1.5 py-0.5 font-bold rounded-md bg-emerald-50 text-emerald-600">Inbound</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate">{rec.supplier || 'No Supplier'}</span>
                  <span className="text-[10px] font-semibold text-slate-400">{rec.deliveryDate ? new Date(rec.deliveryDate).toLocaleDateString() : 'No Date'}</span>
                </div>
              ))
            ) : (
              <span className="text-center text-xs italic text-slate-400 pt-4">No matching records found.</span>
            )}
          </div>

          {!sidebarSearchQuery && poRecords.length > 4 && (
            <div className="text-[10px] text-center font-semibold text-slate-400 mt-auto pt-2 border-t border-slate-50">Showing latest 4 entries.</div>
          )}
        </div>
      </div>

     {/* MODAL 1: PO DETAILS */}
{isModalOpen && selectedPo && (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 shadow-xl relative text-slate-700 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-800 text-lg">PO Details: {selectedPo.poNo}</h3>
        <div className="flex items-center gap-2">
          <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"><Download className="w-3.5 h-3.5" /> Download PDF</button>
          <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50"><X className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 text-sm gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div><span className="font-semibold text-slate-400">Purchase Order No.:</span> <span className="font-bold text-slate-800">{selectedPo.poNo}</span></div>
        <div><span className="font-semibold text-slate-400">Date Received:</span> <span className="font-bold text-slate-800">{selectedPo.deliveryDate ? new Date(selectedPo.deliveryDate).toLocaleDateString() : '-'}</span></div>
        <div><span className="font-semibold text-slate-400">Supplier:</span> <span className="font-bold text-slate-800">{selectedPo.supplier || 'N/A'}</span></div>
        <div><span className="font-semibold text-slate-400">Prepared By:</span> <span className="font-bold text-slate-800">{selectedPo.preparedBy || preparedBy}</span></div>
        <div className="col-span-2"><span className="font-semibold text-slate-400">Origin Address:</span> <span className="font-bold text-slate-800">{selectedPo.originAddress || 'N/A'}</span></div>
      </div>

      {/* BINAGO DITO: Idinagdag ang max-h-60 at overflow-y-auto para sa scrollbar */}
      <div className="overflow-x-auto overflow-y-auto max-h-60 border border-slate-100 rounded-xl relative">
        <table className="w-full text-left text-xs border-collapse">
          {/* BINAGO DITO: Ginawang 'sticky' ang header para hindi sumasama sa scroll-up */}
          <thead className="bg-[#18174e] text-white font-bold uppercase sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-3">Material Profile</th>
              <th className="p-3 text-center">QTY Ordered</th>
              <th className="p-3 text-center">Actual Count Received</th>
              <th className="p-3">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {selectedPo.items?.map((it, idx) => (
              <tr key={it._id || idx} className="hover:bg-slate-50/50">
                <td className="p-3">
                  <div className="font-bold text-[#18174e]">{it.materialId?.Code || "N/A"}</div>
                  <div className="text-slate-400 text-[11px] max-w-xs truncate" title={it.materialId?.ItemDescription}>{it.materialId?.ItemDescription || "-"}</div>
                </td>
                <td className="p-3 text-center font-semibold text-slate-700">{it.qty} {it.materialId?.UOM}</td>
                <td className="p-3 text-center font-bold text-emerald-600">{it.actualCountReceived} {it.materialId?.UOM}</td>
                <td className="p-3 italic text-slate-500">{it.remarks || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)}

      {/* MODAL 2: NEW MATERIAL PROFILE WITH DROPDOWNS */}
      {isMatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">Add Raw Material Information</h3>
              </div>
              <button
                onClick={() => setIsMatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateMaterialProfile} className="space-y-3 mt-3">

              {/* Material Code */}
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Material Code *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter material code"
                  value={newMatCode}
                  onChange={e => setNewMatCode(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                />
              </div>

              {/* Category & Segment Dropdown Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Category *</label>
                  <input
                    type="text"
                    required
                    list="modal-categories-list"
                    placeholder="Enter category name"
                    value={newMatCategory}
                    onChange={e => setNewMatCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                  <datalist id="modal-categories-list">
                    {uniqueCategories.map((cat, i) => <option key={i} value={cat} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Segment *</label>
                  <input
                    type="text"
                    required
                    list="modal-segments-list"
                    placeholder="Enter segment name"
                    value={newMatSegment}
                    onChange={e => setNewMatSegment(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                  <datalist id="modal-segments-list">
                    {uniqueSegments.map((seg, i) => <option key={i} value={seg} />)}
                  </datalist>
                </div>
              </div>

              {/* Item Description (Dropdown / Type) */}
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Item Description *</label>
                <input
                  type="text"
                  required
                  list="modal-desc-list"
                  placeholder="Enter item description"
                  value={newMatDesc}
                  onChange={e => setNewMatDesc(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                />
                <datalist id="modal-desc-list">
                  {uniqueDescriptions.map((desc, i) => <option key={i} value={desc} />)}
                </datalist>
              </div>

              {/* Dimension (Dropdown / Type) */}
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Dimension *</label>
                <input
                  type="text"
                  required
                  list="modal-dimension-list"
                  placeholder="Enter product dimension"
                  value={newMatDimension}
                  onChange={e => setNewMatDimension(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                />
                <datalist id="modal-dimension-list">
                  {uniqueDimensions.map((dim, i) => <option key={i} value={dim} />)}
                </datalist>
              </div>

              {/* UOM (Dropdown / Type) */}
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">UOM *</label>
                <input
                  type="text"
                  required
                  list="modal-uom-list"
                  placeholder="Enter unit of measure"
                  value={newMatUOM}
                  onChange={e => setNewMatUOM(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                />
                <datalist id="modal-uom-list">
                  {uniqueUOMs.map((uom, i) => <option key={i} value={uom} />)}
                </datalist>
              </div>

              {/* Account To (Dropdown / Type) */}
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Account To *</label>
                <input
                  type="text"
                  required
                  list="modal-account-list"
                  placeholder="Enter account to"
                  value={newMatAccountTo}
                  onChange={e => setNewMatAccountTo(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                />
                <datalist id="modal-account-list">
                  {uniqueAccounts.map((acc, i) => <option key={i} value={acc} />)}
                </datalist>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2 mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMatModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                >
                  Save Profile
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InboundRawMat;