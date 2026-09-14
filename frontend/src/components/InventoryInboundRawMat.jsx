import React, { useState, useEffect } from 'react';
import { FileText, Truck, Calendar, ClipboardList, ListPlus, Trash2, Search, X, Download, User, Plus, CheckCircle2, AlertCircle, Loader2, Layers } from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from './PageHeader';
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
  const [isMatModalOpen, setIsMatModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // PO Form States
  const [transactionType, setTransactionType] = useState('Inbound');
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
  const [newMatAcquisitionCost, setNewMatAcquisitionCost] = useState('');

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

  const handleCreateMaterialProfile = async (e) => {
    e.preventDefault();
    if (!newMatDesc || !newMatUOM) {
      return showErrorToast("Please fill up all required fields (Description, UOM).");
    }

    const payload = {
      Code: newMatCode,
      Category: "",
      Segment: newMatSegment,
      ItemDescription: newMatDesc,
      Dimension: newMatDimension,
      UOM: newMatUOM,
      AccountTo: newMatAccountTo,
      AcquisitionCost: Number(newMatAcquisitionCost) || 0
    };

    try {
      const res = await axios.post(RAW_MAT_URL, payload);
      if (res.status === 200 || res.status === 201) {
        showSuccessToast("New Raw Material Profile Added Successfully!");
        setNewMatCode(''); setNewMatCategory(''); setNewMatSegment('');
        setNewMatDesc(''); setNewMatDimension(''); setNewMatUOM(''); setNewMatAccountTo('');
        setNewMatAcquisitionCost('');
        setIsMatModalOpen(false);
        fetchData();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || "Error adding raw material profile.";
      showErrorToast(errMsg);
    }
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

  const handleDownloadPDF = () => {
    if (!selectedPo) return;
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

      doc.text("Purchase Order No.:", 14, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedPo.poNo}`, 52, 42);

      doc.setFont("helvetica", "bold");
      doc.text("Date Received:", 120, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedPo.deliveryDate ? new Date(selectedPo.deliveryDate).toLocaleDateString() : '-'}`, 155, 42);

      doc.setFont("helvetica", "bold");
      doc.text("Transaction Type:", 14, 49);
      doc.setFont("helvetica", "normal");
      doc.text("Inbound", 52, 49);

      doc.setFont("helvetica", "bold");
      doc.text("Supplier:", 120, 49);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedPo.supplier || 'N/A'}`, 155, 49);

      doc.setFont("helvetica", "bold");
      doc.text("Prepared By:", 14, 56);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedPo.preparedBy || preparedBy}`, 52, 56);

      doc.setFont("helvetica", "bold");
      doc.text("Origin Address:", 120, 56);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedPo.originAddress || 'N/A'}`, 155, 56);

      const tableColumns = ["Description", "Segment", "Dimension", "QTY Ordered", "Actual Received", "Remarks"];
      const tableRows = [];

      selectedPo.items?.forEach(it => {
        const targetId = it.materialId?._id || it.materialId;
        const fullMaterial = dbMaterials.find(m => m._id === targetId);

        const descriptionOnly = fullMaterial?.ItemDescription || it.materialId?.ItemDescription || "-";

        const segment = fullMaterial?.Segment || fullMaterial?.segment || 
                        it.materialId?.Segment || it.materialId?.segment || "N/A";
        
        const dimension = fullMaterial?.Dimension || fullMaterial?.dimension || 
                          fullMaterial?.Dimensions || fullMaterial?.dimensions || 
                          it.materialId?.Dimension || it.materialId?.dimension || 
                          it.materialId?.Dimensions || it.materialId?.dimensions || "N/A";

        const uom = fullMaterial?.UOM || it.materialId?.UOM || '';
        const qtySent = `${it.qty} ${uom}`;
        const actualRec = `${it.actualCountReceived} ${uom}`;
        const rem = it.remarks || "-";

        tableRows.push([descriptionOnly, segment, dimension, qtySent, actualRec, rem]);
      });

      autoTable(doc, {
        startY: 65,
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
          doc.text("PURCHASE ORDER REPORT", centerX, 13, { align: 'center' });

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(200, 200, 220);
          doc.text(`Inventory Management System Registry  |  Generated: ${formattedDate}`, centerX, 21, { align: 'center' });

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text("CONFIDENTIAL - INTERNAL USE ONLY", 14, pageHeight - 10);

          const pageNumber = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
          doc.text(pageNumber, pageWidth - 14, pageHeight - 10, { align: 'right' });
        },

        headStyles: { fillColor: [32, 31, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, valign: 'middle' },
        bodyStyles: { fontSize: 8, textColor: [60, 60, 60], valign: 'middle' },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 23, halign: 'center' },
          4: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
          5: { cellWidth: 40 }
        },
        styles: { overflow: 'linebreak', cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.2 }
      });

      doc.save(`PO_REPORT_${selectedPo.poNo}.pdf`);
      showSuccessToast("PDF Slip downloaded successfully.");
    } catch (e) {
      showErrorToast("Something went wrong while downloading the PDF.");
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

  useEffect(() => {
    if (isMatModalOpen) {
      const rackingCodes = dbMaterials
        .map(m => m.Code)
        .filter(code => code && code.startsWith("RCK-USSP-"));

      if (rackingCodes.length === 0) {
        setNewMatCode("RCK-USSP-00001");
      } else {
        const numbers = rackingCodes.map(code => {
          const parts = code.split("-");
          const lastPart = parts[parts.length - 1];
          return parseInt(lastPart, 10) || 0;
        });

        const maxNumber = Math.max(...numbers);
        const nextNumber = maxNumber + 1;

        const formattedNumber = String(nextNumber).padStart(5, '0');
        setNewMatCode(`RCK-USSP-${formattedNumber}`);
      }
    }
  }, [isMatModalOpen, dbMaterials]);

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
        <div className={`lg:col-span-3 ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100'} p-6 rounded-2xl border flex flex-col gap-6 shadow-sm`}>
          <div className={`border-b ${isDark ? 'border-slate-800 text-slate-200' : 'border-slate-100 text-slate-600'} pb-3 flex items-center gap-2 text-sm font-bold`}>
            <ListPlus className="w-4 h-4 text-[#ff6600]" />
            <span>Inbound Racking Materials</span>
          </div>

          <form onSubmit={handleInitiateConfirm} className="flex flex-col gap-5">

            {/* COMPACT TRANSACTION TYPE CONTAINER */}
            <div className={`px-3.5 py-2 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 ${
              isDark ? 'bg-[#141622]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Transaction Type:
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                  isDark ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  🟢 Inbound
                </span>
              </div>

              {/* ACTION TOGGLE BUTTONS */}
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => setTransactionType('Inbound')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    transactionType === 'Inbound'
                      ? (isDark ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs' : 'bg-emerald-600 text-white border-emerald-700 shadow-xs')
                      : (isDark ? 'bg-[#0e1017] text-slate-400 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')
                  }`}
                >
                  🟢 Inbound
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Purchase Order No.</label>
                <div className="relative">
                  <input type="text" value={poNo} onChange={e => setPoNo(e.target.value)} placeholder="Enter PO Number" className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`} />
                </div>
              </div>
              <div>
                <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
                  Supplier Origin *
                </label>
                <div className="relative">
                  <select
                    value={supplier}
                    onChange={handleSupplierChange}
                    required
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold cursor-pointer`}
                  >
                    <option value="" className={isDark ? 'bg-[#141622] text-slate-300' : ''}>-- Select Supplier --</option>
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
              </div>
              <div>
                <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Date Received</label>
                <div className="relative"><Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="date" value={dateReceived} onChange={e => setDateReceived(e.target.value)} className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none`} required />
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
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
                  <label className={`block text-sm font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'} uppercase`}>
                    Step 1: Type / Select Materials for Stock Addition
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Filter by segment or search by item description and dimension (e.g. beam 2700).
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsBrowseModalOpen(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-sm ${
                      isDark ? 'bg-[#141622] border-slate-700 text-indigo-400 hover:bg-indigo-950/60' : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50'
                    }`}
                    title="Browse all materials in a table view"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Browse Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMatModalOpen(true)}
                    className="flex items-center justify-center gap-1.5 bg-[#ff6600] hover:bg-[#e05a00] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Item</span>
                  </button>
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
                          className={`p-2.5 ${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50'} cursor-pointer flex items-center justify-between gap-3 rounded-lg transition-colors ${
                            isAdded ? 'opacity-60 bg-emerald-50/20' : ''
                          }`}
                        >
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'} truncate`}>
                                {item.ItemDescription}
                              </span>
                              {dimension && (
                                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                                  isDark ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                }`}>
                                  {dimension}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                              {segment && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                  isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                                }`}>
                                  {segment}
                                </span>
                              )}
                              <span className="font-mono text-[10px] text-slate-400">{item.Code}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold uppercase ${
                              isDark ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
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
                      <button
                        type="button"
                        onClick={() => setIsMatModalOpen(true)}
                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        + Create &ldquo;{searchQuery}&rdquo; as a New Item
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <span className={`text-xs font-bold ${isDark ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800' : 'text-emerald-700 bg-emerald-50'} px-2 py-1 rounded w-fit uppercase`}>Quantities will be automatically added</span>
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
    {manifestItems.length > 0 ? (
      manifestItems.map((item, index) => (
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

          <td className={`py-2 px-4 truncate max-w-[150px] ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={item.ItemDescription}>
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
        <td colSpan="9" className="text-center py-6 text-red-500 italic font-bold text-xs">
          No items added. Search above to add rows.
        </td>
      </tr>
    )}
  </tbody>
</table>
              </div>
            </div>
            <button type="submit" className="w-full bg-[#ff6600] hover:bg-[#e05a00] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer uppercase shadow-sm">Confirm PO (Purchase Order)</button>
          </form>
        </div>

        <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100'} p-4 rounded-2xl border flex flex-col gap-3 shadow-sm h-auto min-h-[400px]`}>
          <div className={`flex flex-col gap-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-2`}>
            <div className={`flex items-center justify-between w-full text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#ff6600]" />
                <span>History Logs</span>
              </div>

            </div>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" value={sidebarSearchQuery} onChange={e => setSidebarSearchQuery(e.target.value)} placeholder="Search PO or supplier..." className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-lg pl-8 pr-2 py-1 text-xs focus:outline-none`} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[420px] pr-1 custom-scrollbar">
            {filteredPoRecords.length > 0 ? (
              filteredPoRecords.slice(0, 50).map((rec) => (
                <div key={rec._id} onClick={() => { setSelectedPo(rec); setIsModalOpen(true); }} className={`${isDark ? 'bg-[#141622] border-slate-800 hover:border-[#ff6600]/60 hover:bg-[#181b29]' : 'bg-white border-slate-100 hover:border-[#18174e]/50 hover:shadow-md'} border rounded-xl p-2.5 flex flex-col gap-0.5 transition-all cursor-pointer group`}>
                  <div className={`flex justify-between items-center pb-0.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                    <span className={`text-xs font-black ${isDark ? 'text-[#ff8533] group-hover:text-emerald-400' : 'text-[#18174e] group-hover:text-emerald-600'}`}>{rec.poNo}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded-md ${isDark ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-emerald-50 text-emerald-600'}`}>Inbound</span>
                  </div>
                  <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'} truncate`}>{rec.supplier || 'No Supplier'}</span>
                  <span className={`text-[10px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{rec.deliveryDate ? new Date(rec.deliveryDate).toLocaleDateString() : 'No Date'}</span>
                </div>
              ))
            ) : (
              <span className="text-center pt-4 text-red-500 italic font-bold text-xs">No matching records found.</span>
            )}
          </div>

          {!sidebarSearchQuery && poRecords.length > 4 && (
            <div className={`text-[10px] text-center font-semibold text-slate-400 mt-auto pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>Showing latest 4 entries.</div>
          )}
        </div>
      </div>

{isModalOpen && selectedPo && (
  <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
    <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl w-full max-w-2xl p-6 shadow-xl relative flex flex-col gap-4`}>
      
      <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
        <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-lg`}>
          Inbound No: {selectedPo.poNo}
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

<div className={`max-h-64 overflow-y-auto border ${isDark ? 'border-slate-800' : 'border-slate-200/60'} rounded-xl relative shadow-sm`}>
  <table className="w-full text-left text-xs border-collapse">
    <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#0f111d]' : 'bg-emerald-700'} text-white text-[11px] font-bold uppercase tracking-wide`}>
      <tr>
        <th className="p-3 w-1/4">Material Profile</th>
        
        <th className="p-3 w-24 text-center">Segment</th> 
        
        <th className="p-3 w-24 text-center">Dimension</th>
        <th className="p-3 text-center w-24">QTY Ordered</th>
        <th className="p-3 text-right w-28">Actual Received</th>
        <th className="p-3 text-left pl-6">Remarks</th>
      </tr>
    </thead>
    <tbody className={`divide-y ${isDark ? 'bg-[#090b10] divide-slate-800' : 'bg-white divide-slate-100'}`}>
      {selectedPo.items?.map((it, idx) => (
        <tr key={it._id || idx} className={`${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/50'} transition-colors`}>
          <td className="p-3 w-1/4 align-middle">
            <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'} max-w-xs truncate`} title={it.materialId?.ItemDescription}>
              {it.materialId?.ItemDescription || "-"}
            </div>
          </td>

          <td className={`p-3 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'} w-24 align-middle font-semibold text-[11px]`}>
            {it.materialId?.Segment || it.materialId?.segment || "N/A"}
          </td>

          <td className={`p-3 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'} w-24 align-middle font-mono text-[11px]`}>
            {it.materialId?.Dimension || 
             it.materialId?.dimension || 
             it.materialId?.Dimensions || 
             it.materialId?.dimensions || "N/A"}
          </td>

          <td className={`p-3 text-center ${isDark ? 'text-slate-300' : 'text-slate-600'} w-24 align-middle font-semibold`}>
            {it.qty} {it.materialId?.UOM}
          </td>

          <td className={`p-3 text-right font-bold ${isDark ? 'text-emerald-400' : 'text-[#18174e]'} w-28 align-middle`}>
            {it.actualCountReceived} {it.materialId?.UOM}
          </td>

          <td className={`p-3 italic ${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium text-[11px] max-w-[120px] truncate align-middle pl-6`} title={it.remarks}>
            {it.remarks || "-"}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

    </div>
  </div>
)}

      {isMatModalOpen && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto`}>

            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>Add Materials Information</h3>
              </div>
              <button
                onClick={() => setIsMatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-800/60' : 'bg-amber-50 border-amber-200/60'} rounded-xl border mt-3`}>
              <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                * System Inventory Protocol *
              </span>
              <p className={`text-[11px] ${isDark ? 'text-amber-300/80' : 'text-amber-700'} leading-relaxed`}>
                Manual quantity inputs are disabled to comply with audit protocols. Racking images and related media must be uploaded through the <strong>Rackings Components.</strong>
              </p>
            </div>

            <form onSubmit={handleCreateMaterialProfile} className="space-y-4 mt-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="md:col-span-2">
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Segment *</label>
                  <input
                    type="text"
                    required
                    list="modal-segments-list"
                    placeholder="Enter segment name"
                    value={newMatSegment}
                    onChange={e => setNewMatSegment(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="modal-segments-list">
                    {uniqueSegments.map((seg, i) => <option key={i} value={seg} />)}
                  </datalist>
                </div>

                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Item Description *</label>
                  <input
                    type="text"
                    required
                    list="modal-desc-list"
                    placeholder="Enter item description"
                    value={newMatDesc}
                    onChange={e => setNewMatDesc(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="modal-desc-list">
                    {uniqueDescriptions.map((desc, i) => <option key={i} value={desc} />)}
                  </datalist>
                </div>

                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Dimension *</label>
                  <input
                    type="text"
                    required
                    list="modal-dimension-list"
                    placeholder="Enter product dimension"
                    value={newMatDimension}
                    onChange={e => setNewMatDimension(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="modal-dimension-list">
                    {uniqueDimensions.map((dim, i) => <option key={i} value={dim} />)}
                  </datalist>
                </div>

                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>UOM *</label>
                  <input
                    type="text"
                    required
                    list="modal-uom-list"
                    placeholder="Enter unit of measure"
                    value={newMatUOM}
                    onChange={e => setNewMatUOM(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="modal-uom-list">
                    {uniqueUOMs.map((uom, i) => <option key={i} value={uom} />)}
                  </datalist>
                </div>

                <div>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Account To *</label>
                  <input
                    type="text"
                    required
                    list="modal-account-list"
                    placeholder="Enter account to"
                    value={newMatAccountTo}
                    onChange={e => setNewMatAccountTo(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="modal-account-list">
                    {uniqueAccounts.map((acc, i) => <option key={i} value={acc} />)}
                  </datalist>
                </div>

                <div className="md:col-span-2">
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
                    Acquisition Cost (Price)
                  </label>
                  <div className="relative">
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-base select-none pointer-events-none ${isDark ? 'text-amber-400' : 'text-[#18174e]'}`}>
                      ₱
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={newMatAcquisitionCost}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setNewMatAcquisitionCost(val);
                        }
                      }}
                      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg pl-8 pr-3 py-2 text-sm font-mono focus:outline-none focus:border-[#ff6600]`}
                    />
                  </div>
                </div>

              </div>

              <div className={`flex items-center justify-end gap-2 mt-6 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => setIsMatModalOpen(false)}
                  className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#ff6600] hover:bg-[#e05a00] text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                >
                  Save Details
                </button>
              </div>

            </form>
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
                          <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span className="whitespace-nowrap">{item.ItemDescription}</span>
                              <span className="font-mono text-[10px] text-slate-400 whitespace-nowrap">({item.Code})</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                              isDark ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            }`}>
                              {dimension}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                              isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
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
                                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                                  isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400 hover:bg-emerald-900/60' : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
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
                        <td className="py-2 px-3 font-semibold max-w-[180px] truncate" title={item.ItemDescription}>
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
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
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
