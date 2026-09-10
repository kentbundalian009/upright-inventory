import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, ClipboardList, Calendar, Trash2, Search, X, Download, User, ArrowLeftRight, Eye, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from './PageHeader';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = '/api';

const SUPPLIES_URL = `${API_BASE_URL}/supplies`;
const MOVEMENT_URL = `${API_BASE_URL}/supplies-movements`;

function InventorySuppliesMovements() {
  const { isDark } = useTheme();
  const [dbSupplies, setDbSupplies] = useState([]);
  const [movementRecords, setMovementRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [transactionType, setTransactionType] = useState('Out');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [partyName, setPartyName] = useState('');
  const [originAddress, setOriginAddress] = useState('');
  const [manifestItems, setManifestItems] = useState([]);
  const [referenceSlipNo, setReferenceSlipNo] = useState('');
  const [preparedBy, setPreparedBy] = useState('System User');

  const [existingParties, setExistingParties] = useState([]);
  const [existingLocations, setExistingLocations] = useState([]);

  const [quickReturnSearch, setQuickReturnSearch] = useState('');

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
        window.dispatchEvent(new Event('suppliesMovementUpdated'));
      }
    } catch (err) {
      console.error("Error loading registry data:", err);
      showErrorToast("Failed to load data from the server.");
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

  const isDeductingType = ['Borrow', 'Reserved', 'Out', 'Scrap'].includes(transactionType);
  const isDamagedDeductingType = ['Scrap'].includes(transactionType);
  const isRepairType = transactionType === 'Repair';

  const handleSelectSupply = (item) => {
    if (manifestItems.some(i => i.supplyId === item._id)) return setSearchQuery('');

    const maxAvailable = isDamagedDeductingType
      ? (item.ConditionBreakdown?.Damaged ?? item.DamagedCount ?? 0)
      : (item.ConditionBreakdown?.Good ?? item.ActualCount ?? 0);

    if (isDeductingType && maxAvailable <= 0) {
      showErrorToast(`No available stock of ${item.Code} for ${transactionType} transaction.`);
      return setSearchQuery('');
    }

    setManifestItems([...manifestItems, {
      supplyId: item._id,
      Code: item.Code,
      Category: item.Category || 'N/A',
      Segment: item.Segment || 'N/A',
      ItemDescription: item.ItemDescription,
      Dimension: item.Dimension || 'N/A',
      SerialNo: item.SerialNo || 'N/A',
      qty: 1,
      UOM: item.UOM,
      goodConditionQty: isDamagedDeductingType ? 0 : 1,
      damagedQty: isDamagedDeductingType ? 1 : 0,
      maxLimit: maxAvailable,
      remarks: ''
    }]);
    setSearchQuery('');
  };

  const handleFastReturnCopy = (slip) => {
    if (slip.transactionType === "Reserved") {
      setTransactionType("Borrow");
    } else {
      setTransactionType("Return");
    }

    setPartyName(slip.partyName || '');
    setOriginAddress(slip.originAddress || '');
    setReferenceSlipNo(slip.slipNo);

    const fastItems = slip.items.map(it => ({
      supplyId: it.supplyId?._id || it.supplyId,
      Code: it.supplyId?.Code || 'N/A',
      ItemDescription: it.supplyId?.ItemDescription || '-',
      Segment: it.supplyId?.Segment || it.supplyId?.segment || 'N/A',
      Dimension: it.supplyId?.Dimension || it.supplyId?.dimension || 'N/A',
      qty: it.qty,
      UOM: it.supplyId?.UOM || 'pcs',
      goodConditionQty: it.qty,
      damagedQty: 0,
      maxLimit: 9999,
      remarks: slip.transactionType === "Reserved"
        ? `Deployed from Reserve Slip ${slip.slipNo}`
        : `Returned from ${slip.slipNo}`
    }));

    setManifestItems(fastItems);
    showSuccessToast(`Form loaded mula sa ${slip.transactionType} slip: ${slip.slipNo}`);
  };

  const handleUpdateField = (index, field, val) => {
    const updated = [...manifestItems];
    if (field === 'remarks') {
      updated[index][field] = val;
    } else {
      let numericVal = Math.max(0, Number(val));

      if (field === 'qty' && (isDeductingType || isRepairType)) {
        if (numericVal > updated[index].maxLimit) {
          showErrorToast(`Insufficient ${updated[index].maxLimit} stock for ${updated[index].Code}.`);
          numericVal = updated[index].maxLimit;
        }
      }

      updated[index][field] = numericVal;

      if (isRepairType) {
        if (field === 'qty') {
          updated[index]['goodConditionQty'] = numericVal;
          updated[index]['damagedQty'] = numericVal;
        }
      } else if (isDeductingType) {
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

      const currentMax = (isRepairType || isDamagedDeductingType)
        ? (originalItem?.ConditionBreakdown?.Damaged ?? originalItem?.DamagedCount ?? 0)
        : (originalItem?.ConditionBreakdown?.Good ?? originalItem?.ActualCount ?? 0);

      const targetQty = currentMax > 0 ? 1 : 0;

      return {
        ...item,
        maxLimit: currentMax,
        qty: (isRepairType || isDamagedDeductingType) ? targetQty : (isDeductingType ? targetQty : (item.qty || 1)),
        goodConditionQty: isRepairType ? targetQty : (isDeductingType ? (isDamagedDeductingType ? 0 : targetQty) : item.goodConditionQty),
        damagedQty: isRepairType ? targetQty : (isDeductingType ? (isDamagedDeductingType ? targetQty : 0) : item.damagedQty)
      };
    });
    setManifestItems(resetItems);
  }, [transactionType]);

  const handleInitiateConfirm = (e) => {
    e.preventDefault();
    if (manifestItems.length === 0) return showErrorToast("Mangyaring magdagdag ng items sa manifest list.");
    
    const hasInvalidQty = manifestItems.some(i => {
      const q = Number(i.qty);
      return isNaN(q) || q <= 0;
    });
    if (hasInvalidQty) {
      return showErrorToast("Mangyaring maglagay ng valid quantity sa lahat ng items.");
    }

    setIsConfirmModalOpen(true);
  };

  const handleSaveSlip = async () => {
    setIsSaving(true);
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
        setIsConfirmModalOpen(false);
        fetchData();
      }
    } catch (err) {
      const errMessage = err.response?.data?.message || "Failed to execute transaction registry record.";
      showErrorToast(errMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedSlip) return;
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

      doc.text("Slip Number:", 14, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.slipNo}`, 45, 42);

      doc.setFont("helvetica", "bold");
      doc.text("Date Logged:", 120, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.transactionDate ? new Date(selectedSlip.transactionDate).toLocaleDateString() : '-'}`, 155, 42);

      doc.setFont("helvetica", "bold");
      doc.text("Action Type:", 14, 49);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text(`${selectedSlip.transactionType}`, 45, 49);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Prepared By:", 120, 49);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.preparedBy || preparedBy}`, 155, 49);

      doc.setFont("helvetica", "bold");
      doc.text("Full Name:", 14, 56);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.partyName || 'N/A'}`, 45, 56);

      doc.setFont("helvetica", "bold");
      doc.text("Location/Dept:", 14, 63);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.originAddress || 'N/A'}`, 45, 63);

      const tableColumns = ["Supplies Profile", "Total QTY", "Good Cond.", "Damaged", "Item Remarks"];
      const tableRows = selectedSlip.items?.map(it => [
        `${it.supplyId?.Code || 'N/A'}\n${it.supplyId?.ItemDescription || '-'}`,
        `${it.qty} ${it.supplyId?.UOM || ''}`,
        `${it.goodConditionQty ?? 0} ${it.supplyId?.UOM || ''}`,
        `${it.damagedQty ?? 0} ${it.supplyId?.UOM || ''}`,
        it.remarks || "-"
      ]) || [];

      autoTable(doc, {
        startY: 72,
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
          doc.text(`SUPPLIES TRANSACTION SLIP (${selectedSlip.transactionType.toUpperCase()})`, centerX, 13, { align: 'center' });

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(200, 200, 220);
          doc.text(`Office & Operations Supplies Control Registry  |  Generated: ${formattedDate}`, centerX, 21, { align: 'center' });

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
    (r.transactionType === "Borrow" || r.transactionType === "Reserved") && r.isReturned === false
  );

  const filteredHistoryLogs = movementRecords.filter(rec =>
    rec.slipNo?.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
    rec.partyName?.toLowerCase().includes(historySearchQuery.toLowerCase())
  );
  const displayedHistoryLogs = filteredHistoryLogs.slice(0, 50);

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

      <div>
        <PageHeader activeTab="supplies-movements" />
      </div>

      {activeBorrows.length > 0 && (
        <div className={`${isDark ? 'bg-[#141622] border-slate-800 text-slate-200' : 'bg-indigo-50/50 border-indigo-100'} border rounded-xl p-4 flex flex-col gap-3 shadow-sm`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className={`flex items-center gap-2 text-xs font-bold uppercase ${isDark ? 'text-slate-300' : 'text-[#18174e]'}`}>
              <Eye className={`w-3.5 h-3.5 ${isDark ? 'text-[#ff6600]' : 'text-[#18174e]'}`} />
              <span>Quick-Assistant: Select a borrow/reserved record to fulfill transaction</span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className={`absolute left-2.5 top-2 w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-[#18174e]/60'}`} />
              <input
                type="text"
                placeholder="Type Slip No or Name to filter..."
                value={quickReturnSearch}
                onChange={(e) => setQuickReturnSearch(e.target.value)}
                className={`w-full rounded-lg pl-8 pr-2 py-1 text-xs focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-[#0e1017] border border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]'
                    : 'bg-white border border-indigo-200/80 text-[#18174e] focus:border-[#18174e] placeholder-indigo-300'
                }`}
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            {activeBorrows
              .filter(b =>
                b.slipNo?.toLowerCase().includes(quickReturnSearch.toLowerCase()) ||
                b.partyName?.toLowerCase().includes(quickReturnSearch.toLowerCase())
              )
              .map(b => (
                <div
                  key={b._id}
                  className="relative inline-block shrink-0 overflow-visible group"
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleFastReturnCopy(b);
                      setQuickReturnSearch('');
                    }}
                    className="bg-yellow-400 border border-slate-900 hover:border-slate-800 rounded-lg shadow-2xs font-medium cursor-pointer transition-all flex flex-col justify-center items-center text-center p-1.5 pt-3.5 w-22 h-22 shrink-0"
                  >
                    <span className="font-bold text-[#000] text-[12px] tracking-tighter block mb-0.5 whitespace-nowrap">
                      {b.slipNo}
                    </span>
                    {b.transactionType === "Reserved" && (
                      <span className="text-[9px] bg-slate-100 text-[#18174e] font-bold px-1 rounded scale-90 mb-0.5">RESERVED</span>
                    )}
                    <span className="text-[9px] text-[#000] font-bold line-clamp-2 break-words max-w-full leading-none">
                      {b.partyName}
                    </span>
                  </button>

                  <div className="absolute top-1 right-1 flex items-center gap-1 z-20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSlip(b);
                        setIsModalOpen(true);
                      }}
                      className="w-5 h-5 bg-yellow-400 border border-slate-900 hover:border-slate-800 hover:border-indigo-400 text-slate-900 hover:text-indigo-700 rounded-full shadow-md transition-all cursor-pointer flex items-center justify-center"
                      title="View Details"
                    >
                      <Eye className="w-2.5 h-2.5 shrink-0" />
                    </button>
                  </div>
                </div>
              ))}

            {activeBorrows.filter(b =>
              b.slipNo?.toLowerCase().includes(quickReturnSearch.toLowerCase()) ||
              b.partyName?.toLowerCase().includes(quickReturnSearch.toLowerCase())
            ).length === 0 && (
                <span className={`${isDark ? 'text-slate-500' : 'text-indigo-400'} italic text-xs py-1`}>No matching borrow/reserved records found.</span>
              )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className={`lg:col-span-3 p-4 sm:p-6 rounded-2xl border flex flex-col gap-6 shadow-sm ${isDark ? 'bg-[#0e1017] border-slate-800' : 'bg-white border-slate-100'}`}>
          <div className={`border-b pb-3 flex items-center justify-between gap-2 text-sm font-bold ${isDark ? 'border-slate-800 text-slate-200' : 'border-slate-100 text-slate-600'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <ArrowLeftRight className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-[#ff6600]' : 'text-[#18174e]'}`} />
              <span className="truncate">Supplies Movement & Transaction Slip</span>
            </div>
            {manifestItems.length > 0 && (
              <button
                type="button"
                onClick={() => { setManifestItems([]); setReferenceSlipNo(''); setTransactionType('Borrow'); showSuccessToast("Form grid cleared."); }}
                className="text-xs font-bold text-rose-500 hover:underline cursor-pointer flex-shrink-0"
              >
                Clear Form Grid
              </button>
            )}
          </div>

          <form onSubmit={handleInitiateConfirm} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs sm:text-sm font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Slip Number</label>
                <div className="relative">
                  <FileText className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={referenceSlipNo ? `REF: ${referenceSlipNo}` : "[ AUTO-GENERATED ]"}
                    disabled
                    className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm font-bold select-none cursor-not-allowed focus:outline-none ${
                      isDark ? 'bg-[#141622] border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs sm:text-sm font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Transaction Type</label>
                <select
                  value={transactionType}
                  onChange={e => setTransactionType(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none cursor-pointer ${
                    isDark
                      ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]'
                      : 'bg-white border-slate-200 text-[#18174e] focus:border-[#18174e]'
                  }`}
                >
                  <option value="Out">🔴 Out (Deduct Stock)</option>
                  <option value="Restock">🟢 Restock (Stock In)</option>
                  <option value="Borrow">🟡 Borrow (Issue Stock)</option>
                  <option value="Return">🔵 Return (Receive Back)</option>
                  <option value="Reserved">🟣 Reserved (Deployment only)</option>
                  <option value="Scrap">🟠 Disposal (Damaged Tools)</option>
                  <option value="Repair">🛠️ Repair In (Deduct Damaged, Stock Transfer)</option>
                </select>
              </div>

              <div>
                <label className={`block text-xs sm:text-sm font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Date Processed</label>
                <div className="relative">
                  <Calendar className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={e => setTransactionDate(e.target.value)}
                    className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none ${
                      isDark
                        ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]'
                        : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'
                    }`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs sm:text-sm font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Full Name</label>
                <input
                  type="text"
                  value={partyName}
                  onChange={e => setPartyName(e.target.value)}
                  placeholder={isDamagedDeductingType ? "Disposal Team, Repair Shop, or Junk shop" : "Enter full name of person"}
                  list="party-suggestions"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                    isDark
                      ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]'
                      : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'
                  }`}
                  required
                />
                <datalist id="party-suggestions">
                  {existingParties.map((name, idx) => (
                    <option key={idx} value={name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className={`block text-xs sm:text-sm font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Location / Address</label>
                <input
                  type="text"
                  value={originAddress}
                  onChange={e => setOriginAddress(e.target.value)}
                  placeholder="Enter origin address or department"
                  list="location-suggestions"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                    isDark
                      ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]'
                      : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'
                  }`}
                />
                <datalist id="location-suggestions">
                  {existingLocations.map((loc, idx) => (
                    <option key={idx} value={loc} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className={`block text-xs sm:text-sm font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Prepared Name</label>
                <div className="relative">
                  <User className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={preparedBy}
                    disabled
                    className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm font-semibold cursor-not-allowed select-none focus:outline-none ${
                      isDark
                        ? 'bg-[#141622] border-slate-800 text-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col gap-1.5 relative ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
              <label className={`block text-xs sm:text-sm font-bold uppercase leading-snug ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Step 1: Type / Select Supplies (Optional)</label>
              <div className="relative">
                <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search item code or details..."
                  className={`w-full rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none transition-colors ${
                    isDark
                      ? 'bg-[#0e1017] border border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]'
                      : 'bg-white border border-slate-200 text-slate-800 focus:border-[#18174e]'
                  }`}
                />
              </div>
              {searchQuery && (
                <div className={`absolute left-0 right-0 top-[102%] border rounded-xl shadow-xl max-h-64 overflow-y-auto z-50 p-1 divide-y ${
                  isDark
                    ? 'bg-[#0e1017] border-slate-700 divide-slate-800 text-slate-200'
                    : 'bg-white border-slate-200 divide-slate-100 text-slate-800'
                }`}>
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map(item => (
                      <div
                        key={item._id}
                        onClick={() => handleSelectSupply(item)}
                        className={`p-3 cursor-pointer flex flex-col gap-1 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`flex justify-between items-center font-bold text-sm gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          <div className="flex items-center gap-2 truncate">
                            <span className={`px-2 py-0.5 rounded text-xs font-mono ${isDark ? 'bg-[#1a1d2d] text-[#ff6600]' : 'bg-slate-100 text-slate-700'}`}>{item.Code}</span>
                            <span className={`text-xs font-medium lowercase italic truncate ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>{item.UOM || 'pcs'}</span>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] font-bold uppercase flex-shrink-0">
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Good: {item.ConditionBreakdown?.Good ?? item.ActualCount ?? 0}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              Damaged: {item.ConditionBreakdown?.Damaged ?? item.DamagedCount ?? 0}
                            </span>
                          </div>
                        </div>

                        <span className={`font-semibold text-sm truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{item.ItemDescription}</span>

                        <div className={`flex flex-wrap items-center gap-1.5 text-[10px] font-medium pt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <span className={`px-1.5 py-0.5 rounded border ${isDark ? 'bg-[#141622] border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>Cat: {item.Category || item.category || 'Supply'}</span>
                          {(item.Segment || item.segment) && <span className={`px-1.5 py-0.5 rounded border ${isDark ? 'bg-[#141622] border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>Seg: {item.Segment || item.segment}</span>}
                          {(item.Dimensions || item.dimensions || item.Dimension || item.dimension) && (
                            <span className={`px-1.5 py-0.5 rounded font-mono border ${isDark ? 'bg-[#18174e]/40 border-indigo-500/30 text-indigo-300' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>Dim: {item.Dimensions || item.dimensions || item.Dimension || item.dimension}</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-red-500 italic font-bold text-xs">
                      No records found matching.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded w-fit uppercase ${
                isDark ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40' : 'text-amber-700 bg-amber-50'
              }`}>
                Quantities will be automatically (deducted / added)
              </span>
              <div className={`rounded-xl border shadow-sm overflow-x-auto ${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'}`}>
                <table className="w-full text-left border-collapse text-sm min-w-[1200px]">
                  <thead>
                    <tr className={`uppercase text-xs whitespace-nowrap font-bold ${isDark ? 'bg-[#0f111d] text-slate-200' : 'bg-[#18174e] text-white'}`}>
                      <th className="py-3 px-4 text-center w-24">Total QTY</th>
                      <th className="py-3 px-4 text-center w-16">UOM</th>
                      <th className="py-3 px-4 text-center w-28 text-emerald-400">Good Cond.</th>
                      <th className="py-3 px-4 text-center w-28 text-rose-400">Damaged</th>

                      <th className="py-3 px-4 w-28 whitespace-nowrap">Supply Code</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Segment</th>
                      <th className="py-3 px-4 w-44 whitespace-nowrap">Item Description</th>
                      <th className="py-3 px-4">Dimension</th>
                      <th className="py-3 px-4">Serial No.</th>
                      <th className="py-3 px-4 min-w-[180px]">Remarks / Notes</th>
                      <th className="py-3 px-4 text-center w-14">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/60 bg-[#090b10] text-slate-300' : 'divide-slate-100 bg-white text-slate-700'}`}>
                    {manifestItems.length > 0 ? (
                      manifestItems.map((item, index) => (
                        <tr key={index} className={`transition-colors ${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/80'}`}>
                          
                          <td className="py-2 px-4 text-center w-24">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={e => handleUpdateField(index, 'qty', e.target.value)}
                              className={`w-full border text-center rounded py-1 text-sm font-semibold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                isDark
                                  ? 'bg-[#141622] border-slate-700 text-white disabled:bg-[#0e1017] disabled:text-slate-600 focus:border-[#ff6600]'
                                  : 'border-slate-200 text-slate-700 disabled:bg-slate-50 focus:border-slate-400'
                              }`}
                              min="0"
                              disabled={!isDeductingType}
                              required
                              onWheel={(e) => e.currentTarget.blur()}
                            />
                            <div className="text-[10px] text-slate-500 mt-0.5">Max: {item.maxLimit}</div>
                          </td>

                          <td className="py-2 px-4 text-center w-16">
                            <span className={`px-2 py-0.5 rounded text-xs ${isDark ? 'bg-[#141622] text-slate-300' : 'bg-slate-100 text-slate-700'}`}>{item.UOM}</span>
                          </td>

                          <td className="py-2 px-4 text-center w-28">
                            <input
                              type="number"
                              value={item.goodConditionQty}
                              onChange={e => handleUpdateField(index, 'goodConditionQty', e.target.value)}
                              className={`w-full border text-center rounded py-1 text-sm font-bold text-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none ${
                                isDark
                                  ? 'bg-[#141622] border-slate-700 disabled:bg-[#0e1017] disabled:text-slate-600 disabled:border-slate-800 disabled:font-normal focus:border-emerald-400'
                                  : 'border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:font-normal focus:border-emerald-500'
                              }`}
                              min="0"
                              required
                              disabled={isDeductingType}
                              onWheel={(e) => e.currentTarget.blur()}
                            />
                          </td>

                          <td className="py-2 px-4 text-center w-28">
                            <input
                              type="number"
                              value={item.damagedQty}
                              onChange={e => handleUpdateField(index, 'damagedQty', e.target.value)}
                              className={`w-full border text-center rounded py-1 text-sm font-bold text-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none ${
                                isDark
                                  ? 'bg-[#141622] border-slate-700 disabled:bg-[#0e1017] disabled:text-slate-600 disabled:border-slate-800 disabled:font-normal focus:border-rose-400'
                                  : 'border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:font-normal focus:border-rose-500'
                              }`}
                              min="0"
                              required
                              disabled={isDeductingType}
                              onWheel={(e) => e.currentTarget.blur()}
                            />
                          </td>

                          <td className={`py-2 px-4 font-bold whitespace-nowrap font-mono ${isDark ? 'text-[#ff6600]' : 'text-[#18174e]'}`}>{item.Code}</td>

                          <td className={`py-2 px-4 italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.Category}</td>

                          <td className={`py-2 px-4 italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.Segment}</td>

                          <td className={`py-2 px-4 truncate max-w-[170px] whitespace-nowrap ${isDark ? 'text-slate-200' : 'text-slate-700'}`} title={item.ItemDescription}>
                            {item.ItemDescription}
                          </td>

                          <td className={`py-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.Dimension}</td>

                          <td className={`py-2 px-4 font-mono ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{item.SerialNo}</td>

                          <td className="py-2 px-4 min-w-[180px]">
                            <input 
                              type="text" 
                              value={item.remarks} 
                              onChange={e => handleUpdateField(index, 'remarks', e.target.value)} 
                              placeholder={isDamagedDeductingType ? "Reason for scrapping/repairing" : "Provide context details..."} 
                              className={`w-full border rounded px-2 py-1 text-xs focus:outline-none ${
                                isDark
                                  ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]'
                                  : 'border-slate-200 text-slate-700 focus:border-[#18174e]'
                              }`} 
                            />
                          </td>

                          <td className="py-2 px-4 text-center w-14">
                            <button 
                              type="button" 
                              onClick={() => { 
                                setManifestItems(manifestItems.filter((_, i) => i !== index)); 
                                showSuccessToast("Item removed from template manifest."); 
                              }} 
                              className="text-red-500 cursor-pointer hover:text-red-400 transition-all p-1 inline-block"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>

                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="12" className="text-center py-6 text-red-500 italic font-bold text-xs">
                          No items added. Search above to add rows.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#ff6600] hover:bg-[#e05a00] text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-colors cursor-pointer uppercase shadow-sm"
            >
              Confirm Supplies Activity
            </button>
          </form>
        </div>

        <div className={`p-4 rounded-2xl border flex flex-col gap-3 shadow-sm h-auto min-h-[400px] ${
          isDark ? 'bg-[#0e1017] border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className={`flex flex-col gap-1 border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className={`flex items-center gap-2 text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
              <ClipboardList className={`w-4 h-4 ${isDark ? 'text-[#ff6600]' : 'text-[#18174e]'}`} />
              <span>History Logs</span>
            </div>
            <div className="relative mt-1">
              <Search className={`absolute left-2.5 top-2 w-3.5 h-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="text"
                value={historySearchQuery}
                onChange={e => setHistorySearchQuery(e.target.value)}
                placeholder="Search slip or name..."
                className={`w-full border rounded-lg pl-8 pr-2 py-1 text-xs focus:outline-none transition-colors ${
                  isDark
                    ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#18174e]'
                }`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[420px] pr-1 custom-scrollbar">
            {displayedHistoryLogs.length > 0 ? (
              displayedHistoryLogs.map((rec) => (
                <div
                  key={rec._id}
                  onClick={() => { setSelectedSlip(rec); setIsModalOpen(true); }}
                  className={`border rounded-xl p-2.5 flex flex-col gap-0.5 transition-all cursor-pointer hover:shadow-md group ${
                    isDark
                      ? 'bg-[#141622] border-slate-800/80 hover:border-[#ff6600]/50'
                      : 'bg-white border-slate-100 hover:border-[#18174e]/50'
                  }`}
                >
                  <div className={`flex justify-between items-center pb-0.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                    <span className={`text-xs font-black font-mono ${isDark ? 'text-[#ff6600] group-hover:text-amber-400' : 'text-[#18174e] group-hover:text-emerald-600'}`}>{rec.slipNo}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded-md ${
                      rec.transactionType === 'Borrow' ? (isDark ? 'bg-amber-950/50 text-amber-400' : 'bg-amber-50 text-amber-600') :
                      rec.transactionType === 'Return' ? (isDark ? 'bg-blue-950/50 text-blue-400' : 'bg-blue-50 text-blue-600') :
                      rec.transactionType === 'Reserved' ? (isDark ? 'bg-purple-950/50 text-purple-400' : 'bg-purple-50 text-purple-600') :
                      rec.transactionType === 'Out' ? (isDark ? 'bg-rose-950/50 text-rose-400' : 'bg-rose-50 text-rose-600') :
                      rec.transactionType === 'Scrap' ? (isDark ? 'bg-red-950/50 text-red-400' : 'bg-red-50 text-red-600') :
                      rec.transactionType === 'Repair' ? (isDark ? 'bg-teal-950/50 text-teal-400' : 'bg-teal-50 text-teal-600') : 
                      (isDark ? 'bg-emerald-950/50 text-emerald-400' : 'bg-emerald-50 text-emerald-600')
                    }`}>
                      {rec.transactionType}
                    </span>
                  </div>
                  <span className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{rec.partyName || 'N/A'}</span>
                  <span className={`text-[10px] font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{rec.transactionDate ? new Date(rec.transactionDate).toLocaleDateString() : 'No Date'}</span>
                </div>
              ))
            ) : (
              <span className="text-center pt-4 text-red-500 italic font-bold text-xs">No matching records found.</span>
            )}
          </div>

          {!historySearchQuery && movementRecords.length > 4 && (
            <div className={`text-[10px] text-center font-semibold mt-auto pt-2 border-t ${
              isDark ? 'border-slate-800 text-slate-500' : 'border-slate-50 text-slate-400'
            }`}>
              Showing latest 4 entries. Use search to view more records.
            </div>
          )}
        </div>
      </div>

      {isModalOpen && selectedSlip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`border rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative flex flex-col gap-4 ${
            isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
          }`}>

            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Transaction No: <span className="font-mono text-[#ff6600]">{selectedSlip.slipNo}</span>
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
                  className={`p-1 rounded-lg cursor-pointer transition-colors ${
                    isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-2 text-sm gap-2 p-4 rounded-xl border ${
              isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-100'
            }`}>
              <div><span className="font-semibold text-slate-500">Slip ID No:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.slipNo}</span></div>
              <div><span className="font-semibold text-slate-500">Date Logged:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.transactionDate ? new Date(selectedSlip.transactionDate).toLocaleDateString() : '-'}</span></div>
              <div><span className="font-semibold text-slate-500">Movement:</span> <span className="font-bold text-[#ff6600] uppercase">{selectedSlip.transactionType}</span></div>
              <div><span className="font-semibold text-slate-500">Prepared By:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.preparedBy || preparedBy}</span></div>
              <div><span className="font-semibold text-slate-500">Full Name:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.partyName || 'N/A'}</span></div>
              <div><span className="font-semibold text-slate-500">Dept Location:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.originAddress || 'N/A'}</span></div>
            </div>

            <div className={`max-h-64 overflow-y-auto border rounded-xl relative shadow-sm ${
              isDark ? 'border-slate-800 bg-[#0c0e14]' : 'border-slate-200/60 bg-white'
            }`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead className={`sticky top-0 z-10 text-[11px] font-bold uppercase tracking-wide ${
                  isDark ? 'bg-[#0f111d] text-slate-200' : 'bg-[#18174e] text-white'
                }`}>
                  <tr>
                    <th className="p-3 w-1/4">Supplies Profile</th>
                    <th className="p-3 text-center w-24">Total QTY</th>
                    <th className="p-3 text-center w-28 text-emerald-400">Good Cond.</th>
                    <th className="p-3 text-center w-24 text-rose-400">Damaged</th>
                    <th className="p-3 text-left pl-6">Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 bg-[#090b10] text-slate-300' : 'divide-slate-100 bg-white text-slate-700'}`}>
                  {selectedSlip.items?.map((it, idx) => (
                    <tr key={it._id || idx} className={`transition-colors ${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/50'}`}>
                      <td className="p-3 w-1/4 align-middle">
                        <div className={`font-bold font-mono ${isDark ? 'text-[#ff6600]' : 'text-[#18174e]'}`}>{it.supplyId?.Code || 'N/A'}</div>
                        <div className={`text-[11px] max-w-xs truncate font-medium ${isDark ? 'text-slate-400' : 'text-slate-400'}`} title={it.supplyId?.ItemDescription}>
                          {it.supplyId?.ItemDescription || '-'}
                        </div>
                      </td>
                      
                      <td className={`p-3 text-center w-24 align-middle font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {it.qty}
                      </td>
                      
                      <td className="p-3 text-center text-emerald-500 w-28 align-middle font-bold">
                        {it.goodConditionQty ?? 0}
                      </td>
                      
                      <td className="p-3 text-center text-rose-500 w-24 align-middle font-bold">
                        {it.damagedQty ?? 0}
                      </td>
                      
                      <td className={`p-3 italic font-medium text-[11px] max-w-[140px] truncate align-middle pl-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} title={it.remarks}>
                        {it.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                  {(!selectedSlip.items || selectedSlip.items.length === 0) && (
                    <tr>
                      <td colSpan="5" className="p-4 text-center text-slate-500 italic">No materials recorded.</td>
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
                  Confirm Supplies Movement ({transactionType})
                </h3>
                <p className="text-xs text-slate-400">
                  Paki-review ang mga detalye ng supply transaction bago i-save sa database.
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
                <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${isDark ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                  {transactionType}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Date Processed</span>
                <span className="font-semibold">{transactionDate ? new Date(transactionDate).toLocaleDateString() : '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Party / Receiver / Issuer</span>
                <span className="font-semibold">{partyName || 'N/A'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Location / Dept Address</span>
                <span className="font-semibold truncate block">{originAddress || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Prepared By</span>
                <span className="font-semibold">{preparedBy}</span>
              </div>
              {referenceSlipNo && (
                <div className="sm:col-span-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Reference Slip</span>
                  <span className={`font-mono font-bold ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`}>{referenceSlipNo}</span>
                </div>
              )}
            </div>

            {/* Manifest Items Table */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold px-1">
                <span className="uppercase text-slate-400">Supplies to Process ({manifestItems.length})</span>
                <span className="text-[#ff6600] font-bold">
                  Total Qty: {manifestItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)}
                </span>
              </div>
              <div className={`rounded-xl border overflow-hidden max-h-56 overflow-y-auto ${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-200'}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`uppercase text-[10px] font-bold ${isDark ? 'bg-[#141622] text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-600 border-b border-slate-200'}`}>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3">Segment</th>
                      <th className="py-2 px-3">Dimension</th>
                      <th className="py-2 px-3 text-center font-bold">Total Qty</th>
                      <th className="py-2 px-3 text-center text-emerald-500">Good</th>
                      <th className="py-2 px-3 text-center text-rose-500">Damaged</th>
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
                          {item.Segment || item.segment || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                          {item.Dimension || item.dimension || '—'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          {item.qty} {item.UOM}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold text-emerald-500">
                          {item.goodConditionQty}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold text-rose-500">
                          {item.damagedQty}
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
                onClick={handleSaveSlip}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#ff6600] hover:bg-[#e05a00] disabled:opacity-50 transition-all cursor-pointer shadow-md"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Activity...</span>
                  </>
                ) : (
                  <span>Save Supplies Activity</span>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default InventorySuppliesMovements;
