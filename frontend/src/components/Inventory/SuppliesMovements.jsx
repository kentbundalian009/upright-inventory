import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, ClipboardList, Calendar, Trash2, Search, X, Download, User, ArrowLeftRight, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from '../Common/PageHeader';
// I-import ang react-hot-toast
import toast, { Toaster } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.MODE === 'production'
  ? 'https://one-inventory.onrender.com/api'
  : 'http://localhost:5000/api';

const SUPPLIES_URL = `${API_BASE_URL}/supplies`;
const MOVEMENT_URL = `${API_BASE_URL}/supplies-movements`;

function SuppliesMovements() {
  const [dbSupplies, setDbSupplies] = useState([]);
  const [movementRecords, setMovementRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Slip Form States
  const [transactionType, setTransactionType] = useState('Borrow');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [manifestItems, setManifestItems] = useState([]);
  const [referenceSlipNo, setReferenceSlipNo] = useState('');
  const [preparedBy, setPreparedBy] = useState('System User');

  // Dynamic Suggestion Hooks
  const [existingParties, setExistingParties] = useState([]);
  const [existingLocations, setExistingLocations] = useState([]);

  // 🔥 HELPER FUNCTIONS PARA SA CUSTOM TOAST LAYOUT MO
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

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchData = async () => {
    try {
      const config = getAuthConfig();
      const [suppliesRes, movementsRes] = await Promise.all([
        axios.get(SUPPLIES_URL, config),
        axios.get(MOVEMENT_URL, config)
      ]);

      if (suppliesRes.data) {
        setDbSupplies(suppliesRes.data.filter(s => !s.isArchived));
      }
      if (movementsRes.data) {
        setMovementRecords(movementsRes.data);

        const parties = [...new Set(movementsRes.data.map(m => m.partyName).filter(Boolean))];
        const locations = [...new Set(movementsRes.data.map(m => m.originAddress).filter(Boolean))];
        setExistingParties(parties);
        setExistingLocations(locations);
      }
    } catch (err) {
      console.error("Error loading registry data:", err);
      showErrorToast("Hindi ma-load ang data mula sa server.");
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
      } catch (e) { console.error("Error configuring session integration:", e); }
    }
  }, []);

  const isDeductingType = ['Borrow', 'Reserved', 'Out', 'Scrap', 'Return to Vendor'].includes(transactionType);
  const isDamagedDeductingType = ['Scrap', 'Return to Vendor'].includes(transactionType);

  const handleSelectSupply = (item) => {
    if (manifestItems.some(i => i.supplyId === item._id)) return setSearchQuery('');

    const maxAvailable = isDamagedDeductingType
      ? (item.ConditionBreakdown?.Damaged ?? item.DamagedCount ?? 0)
      : (item.ConditionBreakdown?.Good ?? item.ActualCount ?? 0);

    if (isDeductingType && maxAvailable <= 0) {
      showErrorToast(`Walang available na stock para sa item: ${item.Code}`);
      return setSearchQuery('');
    }

    setManifestItems([...manifestItems, {
      supplyId: item._id,
      Code: item.Code,
      ItemDescription: item.ItemDescription,
      qty: 1,
      UOM: item.UOM,
      goodConditionQty: isDamagedDeductingType ? 0 : 1,
      damagedQty: isDamagedDeductingType ? 1 : 0,
      maxLimit: maxAvailable,
      remarks: ''
    }]);
    setSearchQuery('');
  };

  const handleFastReturnCopy = (borrowSlip) => {
    setTransactionType("Return");
    setPartyName(borrowSlip.partyName || '');
    setOriginAddress(borrowSlip.originAddress || '');
    setReferenceSlipNo(borrowSlip.slipNo);

    const fastItems = borrowSlip.items.map(it => ({
      supplyId: it.supplyId?._id || it.supplyId,
      Code: it.supplyId?.Code || 'N/A',
      ItemDescription: it.supplyId?.ItemDescription || '-',
      qty: it.qty,
      UOM: it.supplyId?.UOM || 'pcs',
      goodConditionQty: it.qty,
      damagedQty: 0,
      maxLimit: 9999,
      remarks: `Returned from ${borrowSlip.slipNo}`
    }));

    setManifestItems(fastItems);
    showSuccessToast(`Form loaded mula sa slip ${borrowSlip.slipNo}`);
  };

  const handleUpdateField = (index, field, val) => {
    const updated = [...manifestItems];

    if (field === 'remarks') {
      updated[index][field] = val;
    } else {
      let numericVal = Math.max(0, Number(val));

      if (field === 'qty' && isDeductingType) {
        if (numericVal > updated[index].maxLimit) {
          showErrorToast(`Hanggang ${updated[index].maxLimit} lang ang pwedeng i-out sa transaksyong ito.`);
          numericVal = updated[index].maxLimit;
        }
      }

      updated[index][field] = numericVal;

      if (isDeductingType) {
        if (field === 'qty') {
          if (isDamagedDeductingType) {
            updated[index]['goodConditionQty'] = 0;
            updated[index]['damagedQty'] = numericVal;
          } else {
            updated[index]['goodConditionQty'] = numericVal;
            updated[index]['damagedQty'] = 0;
          }
        }
      } else {
        if (field === 'goodConditionQty' || field === 'damagedQty') {
          updated[index]['qty'] = Number(updated[index]['goodConditionQty']) + Number(updated[index]['damagedQty']);
        }
      }
    }
    setManifestItems(updated);
  };

  useEffect(() => {
    const resetItems = manifestItems.map(item => {
      const originalItem = dbSupplies.find(s => s._id === item.supplyId);
      const currentMax = isDamagedDeductingType
        ? (originalItem?.ConditionBreakdown?.Damaged ?? originalItem?.DamagedCount ?? 0)
        : (originalItem?.ConditionBreakdown?.Good ?? originalItem?.ActualCount ?? 0);

      const targetQty = currentMax > 0 ? 1 : 0;

      return {
        ...item,
        maxLimit: currentMax,
        qty: isDeductingType ? targetQty : (item.qty || 1),
        goodConditionQty: isDeductingType ? (isDamagedDeductingType ? 0 : targetQty) : item.goodConditionQty,
        damagedQty: isDeductingType ? (isDamagedDeductingType ? targetQty : 0) : item.damagedQty
      };
    });
    setManifestItems(resetItems);
  }, [transactionType]);

  const handleSubmitSlip = async (e) => {
    e.preventDefault();
    if (manifestItems.length === 0) return showErrorToast("Mangyaring magdagdag ng items sa manifest list.");

    const payload = {
      transactionType, transactionDate, partyName, originAddress, preparedBy, referenceSlipNo,
      items: manifestItems.map(i => ({
        supplyId: i.supplyId,
        qty: Number(i.qty),
        goodConditionQty: Number(i.goodConditionQty),
        damagedQty: Number(i.damagedQty),
        remarks: i.remarks
      }))
    };

    try {
      const config = getAuthConfig();
      const res = await axios.post(MOVEMENT_URL, payload, config);

      if (res.status === 200 || res.status === 201) {
        showSuccessToast(`Supply Transaction finalized successfully!`);
        setManifestItems([]); setPartyName(''); setOriginAddress(''); setReferenceSlipNo('');
        setTransactionType('Borrow');
        fetchData();
      }
    } catch (err) {
      const errMessage = err.response?.data?.message || "Failed to execute transaction registry record.";
      showErrorToast(errMessage);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedSlip) return;
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
      // Bukod sa didDrawPage para iwas-double text artifact sa multi-page document
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);

      // Row 1 Meta
      doc.text("Slip Number:", 14, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.slipNo}`, 45, 42);

      doc.setFont("helvetica", "bold");
      doc.text("Date Logged:", 120, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.transactionDate ? new Date(selectedSlip.transactionDate).toLocaleDateString() : '-'}`, 155, 42);

      // Row 2 Meta
      doc.setFont("helvetica", "bold");
      doc.text("Action Type:", 14, 49);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229); // Accent indigo text
      doc.text(`${selectedSlip.transactionType}`, 45, 49);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Prepared By:", 120, 49);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.preparedBy || preparedBy}`, 155, 49);

      // Row 3 Meta
      doc.setFont("helvetica", "bold");
      doc.text("Full Name:", 14, 56);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.partyName || 'N/A'}`, 45, 56);

      // Row 4 Meta
      doc.setFont("helvetica", "bold");
      doc.text("Location/Dept:", 14, 63);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.originAddress || 'N/A'}`, 45, 63);

      // --- PAGHAHANDA NG DATA NG TALAHANAYAN ---
      const tableColumns = ["Supplies Profile", "Total QTY", "Good Cond.", "Damaged", "Item Remarks"];
      const tableRows = selectedSlip.items?.map(it => [
        `${it.supplyId?.Code || 'N/A'}\n${it.supplyId?.ItemDescription || '-'}`,
        `${it.qty} ${it.supplyId?.UOM || ''}`,
        `${it.goodConditionQty ?? 0} ${it.supplyId?.UOM || ''}`,
        `${it.damagedQty ?? 0} ${it.supplyId?.UOM || ''}`,
        it.remarks || "-"
      ]) || [];

      // --- AUTOTABLE GENERATION WITH THUMBNAIL LAYOUT ---
      autoTable(doc, {
        startY: 72, // May sapat na puwang para sa 4 rows ng metadata
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',

        // I-inject ang automated structural consistency rules para sa bawat pahina
        didDrawPage: (data) => {
          // 1. Unified Background Watermark Layer
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.06 }));
          const logoWidth = 80;
          const logoHeight = 80;
          const logoX = centerX - (logoWidth / 2);
          const logoY = centerY - (logoHeight / 2);
          doc.addImage('/one.logo.png', 'PNG', logoX, logoY, logoWidth, logoHeight);
          doc.restoreGraphicsState();

          // 2. Branding Header Top Bar Block
          doc.setFillColor(24, 23, 78);
          doc.rect(0, 0, pageWidth, 30, 'F');

          // 3. Header Texts (Naka-center para sa pormal at balanseng UI)
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text(`SUPPLIES TRANSACTION SLIP (${selectedSlip.transactionType.toUpperCase()})`, centerX, 13, { align: 'center' });

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(200, 200, 220);
          doc.text(`Office & Operations Supplies Control Registry  |  Generated: ${formattedDate}`, centerX, 21, { align: 'center' });

          // 4. System Standard Absolute Footer
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
          0: { cellWidth: 60 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 50 }
        }
      });

      // --- SIGNATORIES SECTION ---
      const finalY = doc.lastAutoTable.finalY + 20;


      doc.save(`SUPPLIES_SLIP_${selectedSlip.slipNo}.pdf`);
      showSuccessToast("PDF Slip downloaded successfully.");
    } catch (e) {
      showErrorToast("Nagka-problema sa pag-download ng PDF.");
    }
  };

  const filteredSuggestions = dbSupplies.filter(item =>
    item.Code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.ItemDescription?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeBorrows = movementRecords.filter(r =>
    r.transactionType === "Borrow" && r.isReturned === false
  );

  const filteredHistoryLogs = movementRecords.filter(rec =>
    rec.slipNo?.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
    rec.partyName?.toLowerCase().includes(historySearchQuery.toLowerCase())
  );

  const displayedHistoryLogs = historySearchQuery ? filteredHistoryLogs : filteredHistoryLogs.slice(0, 4);

  return (
    <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased text-slate-600">

      {/* 🟢 I-set up ang Toaster Container sa Top-Right at i-override ang default wrapper nito */}
      <Toaster
        position="top-right"
        containerClassName="mt-5 mr-5"
        toastOptions={{
          className: '',
          style: { background: 'transparent', boxShadow: 'none', border: 'none', padding: 0 }
        }}
      />

      <div>
        <PageHeader activeTab="supplies-movements" />
      </div>

      {/* QUICK-RETURN ASSISTANT */}
      {activeBorrows.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5 text-amber-600" />
            <span>Quick-Return Assistant: Select a pending borrow record below to auto-populate form fields</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            {activeBorrows.map(b => (
              <button
                key={b._id}
                type="button"
                onClick={() => handleFastReturnCopy(b)}
                className="bg-white border border-amber-200 hover:border-amber-500 text-amber-900 px-3 py-1.5 rounded-lg shadow-2xs font-medium cursor-pointer transition-all flex items-center gap-1 shrink-0"
              >
                Return <span className="font-bold text-[#18174e]">{b.slipNo}</span> ({b.partyName})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* LEFT CONTAINER (FORM SHEET) */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 flex flex-col gap-6 shadow-sm">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between text-sm font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-[#18174e]" />
              <span>Supplies Movement & Transaction Slip</span>
            </div>
            {manifestItems.length > 0 && (
              <button type="button" onClick={() => { setManifestItems([]); setReferenceSlipNo(''); setTransactionType('Borrow'); showSuccessToast("Form grid cleared."); }} className="text-xs font-bold text-rose-500 hover:underline">Clear Form Grid</button>
            )}
          </div>

          <form onSubmit={handleSubmitSlip} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Slip Number</label>
                <div className="relative"><FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="text" value={referenceSlipNo ? `REF: ${referenceSlipNo}` : "[ AUTO-GENERATED ]"} disabled className="w-full bg-slate-50 border border-slate-200 text-slate-400 rounded-lg pl-9 pr-3 py-2 text-sm font-bold select-none cursor-not-allowed focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Transaction Type</label>
                <select
                  value={transactionType}
                  onChange={e => setTransactionType(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none text-[#18174e]"
                >
                  <option value="Borrow">🟡 Borrow (Issue Stock)</option>
                  <option value="Return">🟢 Return (Receive Back)</option>
                  <option value="Restock">🔵 Restock (Add Existing Stock)</option>
                  <option value="Reserved">🟣 Reserved (Deployment only)</option>
                  <option value="Out">🔴 Out (Personal Use)</option>
                  <option value="Scrap">🟠 Scrap / Disposal (Deduct Repair)</option>
                  <option value="Return to Vendor">🟤 Return to Vendor (Deduct Repair)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Date Processed</label>
                <div className="relative"><Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">FULL NAME</label>
                <input
                  type="text"
                  value={partyName}
                  onChange={e => setPartyName(e.target.value)}
                  placeholder={isDamagedDeductingType ? "Disposal Team, Supplier, or Junk shop" : "Enter full name of person"}
                  list="party-suggestions"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  required
                />
                <datalist id="party-suggestions">
                  {existingParties.map((name, idx) => (
                    <option key={idx} value={name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Location / Address</label>
                <input
                  type="text"
                  value={originAddress}
                  onChange={e => setOriginAddress(e.target.value)}
                  placeholder="Enter origin address or department"
                  list="location-suggestions"
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                />
                <datalist id="location-suggestions">
                  {existingLocations.map((loc, idx) => (
                    <option key={idx} value={loc} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Prepared Name</label>
                <div className="relative"><User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="text" value={preparedBy} disabled className="w-full bg-slate-50 border border-slate-200 text-slate-400 rounded-lg pl-9 pr-3 py-2 text-sm font-semibold cursor-not-allowed select-none focus:outline-none" />
                </div>
              </div>
            </div>

            {/* SEARCH BOX */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1.5 relative">
              <label className="block text-sm font-bold text-yellow-600 uppercase">Step 1: Type / Select Supplies (Optional)</label>
              <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search item code or details..." className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none" />
              </div>
              {searchQuery && (
                <div className="absolute left-0 right-0 top-[102%] bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50 divide-y divide-slate-100 p-1">
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map(item => (
                      <div
                        key={item._id}
                        onClick={() => handleSelectSupply(item)}
                        className="p-3 hover:bg-slate-50 cursor-pointer flex flex-col gap-1 rounded-lg transition-colors"
                      >
                        {/* Unang Linya: Code, UOM, at Condition Breakdown Badges */}
                        <div className="flex justify-between items-center font-bold text-slate-800 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono">
                              {item.Code}
                            </span>
                            <span className="text-xs font-medium text-slate-400 lowercase italic">
                              {item.UOM || 'pcs'}
                            </span>
                          </div>

                          {/* Split Stock Status Badges para sa Good at Repair */}
                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Good: {item.ConditionBreakdown?.Good ?? item.ActualCount ?? 0}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                              Repair: {item.ConditionBreakdown?.Damaged ?? item.DamagedCount ?? 0}
                            </span>
                          </div>
                        </div>

                        {/* Pangalawang Linya: Description */}
                        <span className="text-slate-800 font-semibold text-sm truncate">
                          {item.ItemDescription}
                        </span>

                        {/* Pangatlong Linya: Dynamic Badges para sa Cat, Seg, at Dim */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-medium pt-0.5">
                          <span className="bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                            Cat: {item.Category || item.category || 'Supply'}
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
                      No supplies found matching.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MANIFEST GRID TABLE */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-2 py-1 rounded w-fit uppercase tracking-wider">Quantities will be automatically (deducted / added)</span>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto w-full">
                <table className="min-w-[850px] w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="text-white font-bold bg-[#18174e] uppercase text-xs whitespace-nowrap">
                      <th className="py-3 px-4 w-28">Supply Code</th>
                      <th className="py-3 px-4 w-44">Item Description</th>
                      <th className="py-3 px-4 text-center w-16">Total QTY</th>
                      <th className="py-3 px-4 text-center w-14">UOM</th>
                      <th className="py-3 px-4 text-center w-20 text-emerald-400">Good Cond.</th>
                      <th className="py-3 px-4 text-center w-20 text-rose-400">Damaged</th>
                      <th className="py-3 px-4 min-w-[180px]">Remarks / Notes</th>
                      <th className="py-3 px-4 text-center w-14">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {manifestItems.length > 0 ? (
                      manifestItems.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/80">
                          <td className="py-2 px-4 font-bold">{item.Code}</td>
                          <td className="py-2 px-4 text-xs truncate max-w-[170px]" title={item.ItemDescription}>
                            {item.ItemDescription}
                          </td>
                          <td className="py-2 px-4 text-center">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={e => handleUpdateField(index, 'qty', e.target.value)}
                              className="w-14 border text-center rounded text-sm disabled:bg-slate-50 font-semibold"
                              min="0"
                              disabled={!isDeductingType}
                              required
                            />
                            <div className="text-[10px] text-slate-400">Max: {item.maxLimit}</div>
                          </td>
                          <td className="py-2 px-4 text-center">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{item.UOM}</span>
                          </td>
                          <td className="py-2 px-4 text-center">
                            <input
                              type="number"
                              value={item.goodConditionQty}
                              onChange={e => handleUpdateField(index, 'goodConditionQty', e.target.value)}
                              className="w-14 border text-center rounded text-sm font-bold text-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:font-normal"
                              min="0"
                              required
                              disabled={isDeductingType}
                            />
                          </td>
                          <td className="py-2 px-4 text-center">
                            <input
                              type="number"
                              value={item.damagedQty}
                              onChange={e => handleUpdateField(index, 'damagedQty', e.target.value)}
                              className="w-14 border text-center rounded text-sm font-bold text-rose-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:font-normal"
                              min="0"
                              required
                              disabled={isDeductingType}
                            />
                          </td>
                          <td className="py-2 px-4">
                            <input type="text" value={item.remarks} onChange={e => handleUpdateField(index, 'remarks', e.target.value)} placeholder={isDamagedDeductingType ? "Reason for scrapping/returning" : "Provide context details"} className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-[#18174e]" />
                          </td>
                          <td className="py-2 px-4 text-center">
                            <button type="button" onClick={() => { setManifestItems(manifestItems.filter((_, i) => i !== index)); showSuccessToast("Item removed from template manifest."); }} className="text-red-500 cursor-pointer hover:text-red-700 transition-all"><Trash2 className="w-4 h-4 mx-auto" /></button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="8" className="text-center py-6 text-slate-400 italic text-xs">No entries added. Use search input or select from Quick-Return Assistant.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <button type="submit" className="w-full bg-[#18174e] text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-sm cursor-pointer hover:bg-[#18174e]/90 transition-all">Save & Update Registry History</button>
          </form>
        </div>

        {/* SIDEBAR CONTAINER */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 shadow-sm h-auto min-h-[400px]">
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <ClipboardList className="w-4 h-4 text-[#18174e]" />
              <span>History Logs</span>
            </div>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={e => setHistorySearchQuery(e.target.value)}
                placeholder="Search slip or name..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* LOGS LIST */}
          <div className="flex flex-col gap-1.5 overflow-hidden">
            {displayedHistoryLogs.length > 0 ? (
              displayedHistoryLogs.map((rec) => (
                <div
                  key={rec._id}
                  onClick={() => { setSelectedSlip(rec); setIsModalOpen(true); }}
                  className="bg-white border border-slate-100 rounded-xl p-2.5 flex flex-col gap-0.5 hover:border-[#18174e]/50 transition-all cursor-pointer hover:shadow-md group"
                >
                  <div className="flex justify-between items-center pb-0.5 border-b border-slate-50">
                    <span className="text-xs font-black text-[#18174e] group-hover:text-emerald-600">{rec.slipNo}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded-md ${rec.transactionType === 'Borrow' ? 'bg-amber-50 text-amber-600' :
                        rec.transactionType === 'Return' ? 'bg-blue-50 text-blue-600' :
                          rec.transactionType === 'Reserved' ? 'bg-purple-50 text-purple-600' :
                            rec.transactionType === 'Out' ? 'bg-rose-50 text-rose-600' :
                              ['Scrap', 'Return to Vendor'].includes(rec.transactionType) ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                      {rec.transactionType}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate">{rec.partyName || 'N/A'}</span>
                  <span className="text-[10px] font-semibold text-slate-400">{rec.transactionDate ? new Date(rec.transactionDate).toLocaleDateString() : 'No Date'}</span>
                </div>
              ))
            ) : (
              <span className="text-center text-xs italic text-slate-400 pt-4">No matching slips found.</span>
            )}
          </div>

          {!historySearchQuery && movementRecords.length > 4 && (
            <div className="text-[10px] text-center font-semibold text-slate-400 mt-auto pt-2 border-t border-slate-50">
              Showing latest 4 entries. Use search to view more records.
            </div>
          )}
        </div>
      </div>

      {/* DETAIL MODAL */}
      {isModalOpen && selectedSlip && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 shadow-xl relative text-slate-700 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-lg">Slip View: {selectedSlip.slipNo}</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 text-sm gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div><span className="font-semibold text-slate-400">Slip ID No:</span> <span className="font-bold text-slate-800">{selectedSlip.slipNo}</span></div>
              <div><span className="font-semibold text-slate-400">Date Logged:</span> <span className="font-bold text-slate-800">{selectedSlip.transactionDate ? new Date(selectedSlip.transactionDate).toLocaleDateString() : '-'}</span></div>
              <div><span className="font-semibold text-slate-400">Movement:</span> <span className="font-bold text-indigo-700 uppercase">{selectedSlip.transactionType}</span></div>
              <div><span className="font-semibold text-slate-400">Prepared By:</span> <span className="font-bold text-slate-800">{selectedSlip.preparedBy || preparedBy}</span></div>
              <div><span className="font-semibold text-slate-400">Full Name:</span> <span className="font-bold text-slate-800">{selectedSlip.partyName || 'N/A'}</span></div>
              <div><span className="font-semibold text-slate-400">Dept Location:</span> <span className="font-bold text-slate-800">{selectedSlip.originAddress || 'N/A'}</span></div>
            </div>

            {/* BINAGO: Nilagyan ng max-h-64, overflow-y-auto, at relative para gumana ang scrollbar at sticky design */}
            <div className="overflow-x-auto overflow-y-auto max-h-64 border border-slate-100 rounded-xl relative">
              <table className="w-full text-left text-xs min-w-[500px] border-collapse">
                {/* BINAGO: Ginawang sticky top-0 ang thead para manatili sa itaas habang nag-scroscroll */}
                <thead className="bg-[#18174e] text-white font-bold uppercase sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="p-3">Supplies Profile</th>
                    <th className="p-3 text-center">Total QTY</th>
                    <th className="p-3 text-center text-emerald-400">Good Cond.</th>
                    <th className="p-3 text-center text-rose-400">Damaged</th>
                    <th className="p-3">Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {selectedSlip.items?.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold">
                        <div className="font-bold text-[#18174e]">{it.supplyId?.Code || 'N/A'}</div>
                        <div className="text-slate-400 text-[10px] font-normal max-w-xs truncate" title={it.supplyId?.ItemDescription}>{it.supplyId?.ItemDescription || '-'}</div>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">{it.qty}</td>
                      <td className="p-3 text-center font-bold text-emerald-600">{it.goodConditionQty ?? 0}</td>
                      <td className="p-3 text-center font-bold text-rose-600">{it.damagedQty ?? 0}</td>
                      <td className="p-3 text-slate-500 italic">{it.remarks || '-'}</td>
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

export default SuppliesMovements;