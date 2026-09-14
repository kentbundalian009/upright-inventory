import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { FileText, ClipboardList, Calendar, Trash2, Search, X, Download, User, ArrowLeftRight, Eye, CheckCircle2, AlertCircle, Loader2, Layers, ChevronDown, Clock, Tag, Plus } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);

  const getCurrentTimeString = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const [transactionType, setTransactionType] = useState('Borrow');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionTime, setTransactionTime] = useState(getCurrentTimeString());
  const [partyName, setPartyName] = useState('');
  const [purpose, setPurpose] = useState('Production');
  const [originAddress, setOriginAddress] = useState('');
  const [manifestItems, setManifestItems] = useState([]);
  const [referenceSlipNo, setReferenceSlipNo] = useState('');
  const [preparedBy, setPreparedBy] = useState('System User');

  const [registeredEmployees, setRegisteredEmployees] = useState([]);
  const [isPersonnelDropdownOpen, setIsPersonnelDropdownOpen] = useState(false);
  const personnelDropdownRef = useRef(null);
  const [selectedSupplyDropdownId, setSelectedSupplyDropdownId] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState('All Categories');

  const PURPOSE_OPTIONS = ['Production', 'Deployment', 'Personal'];

  const uniqueCategories = Array.from(
    new Set(
      dbSupplies
        .map(item => item.Category || item.category)
        .filter(Boolean)
    )
  ).sort();

  const [existingParties, setExistingParties] = useState([]);
  const [existingLocations, setExistingLocations] = useState([]);

  const [quickReturnSearch, setQuickReturnSearch] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (personnelDropdownRef.current && !personnelDropdownRef.current.contains(e.target)) {
        setIsPersonnelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const combinedEmployees = useMemo(() => {
    const list = [...registeredEmployees];
    existingParties.forEach(p => {
      if (p && !list.some(e => e.name?.toLowerCase() === p.toLowerCase())) {
        list.push({ _id: `party-${p}`, name: p, contactPerson: 'Past Record' });
      }
    });
    return list;
  }, [registeredEmployees, existingParties]);

  const filteredEmployees = useMemo(() => {
    if (!partyName || !partyName.trim()) return combinedEmployees;
    const q = partyName.toLowerCase().trim();
    return combinedEmployees.filter(emp =>
      emp.name?.toLowerCase().includes(q) ||
      emp.contactPerson?.toLowerCase().includes(q) ||
      emp.address?.toLowerCase().includes(q)
    );
  }, [combinedEmployees, partyName]);

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
    setIsLoading(true);
    try {
      const config = getAuthConfig();
      const [suppliesRes, movementsRes, employeesRes] = await Promise.all([
        axios.get(SUPPLIES_URL, config),
        axios.get(MOVEMENT_URL, config),
        axios.get(`${API_BASE_URL}/clients?type=Employee`, config).catch(() => ({ data: [] }))
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
      if (employeesRes?.data) {
        setRegisteredEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
      }
    } catch (err) {
      console.error("Error loading registry data:", err);
      showErrorToast("Failed to load data from the server.");
    } finally {
      setIsLoading(false);
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
    if (manifestItems.some(i => i.supplyId === item._id)) {
      showErrorToast(`${item.ItemDescription} is already in the list.`);
      setSearchQuery('');
      return;
    }

    const maxAvailable = isDamagedDeductingType
      ? (item.ConditionBreakdown?.Damaged ?? item.DamagedCount ?? 0)
      : (item.ConditionBreakdown?.Good ?? item.ActualCount ?? 0);

    if (isDeductingType && maxAvailable <= 0) {
      showErrorToast(`No available stock of ${item.Code} for ${transactionType} transaction.`);
      setSearchQuery('');
      return;
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
      UOM: item.UOM || 'pcs',
      goodConditionQty: isDamagedDeductingType ? 0 : 1,
      damagedQty: isDamagedDeductingType ? 1 : 0,
      maxLimit: maxAvailable,
      remarks: purpose || 'Production'
    }]);
    setSearchQuery('');
    showSuccessToast(`Added "${item.ItemDescription}" to manifest.`);
  };

  const handleFastReturnCopy = (slip) => {
    if (slip.transactionType === "Reserved") {
      setTransactionType("Borrow");
    } else {
      setTransactionType("Return");
    }

    setPartyName(slip.partyName || '');
    const p = slip.purpose || slip.originAddress || 'Production';
    setPurpose(p);
    setOriginAddress(slip.originAddress || p);
    if (slip.transactionTime) setTransactionTime(slip.transactionTime);
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
    if (!partyName.trim()) {
      return showErrorToast("Please select or enter Personnel Name.");
    }
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
    if (!partyName.trim()) {
      return showErrorToast("Please select or enter Personnel Name.");
    }
    setIsSaving(true);
    const payload = {
      transactionType, 
      transactionDate, 
      transactionTime: transactionTime || getCurrentTimeString(),
      partyName, 
      purpose,
      originAddress: purpose, 
      preparedBy, 
      referenceSlipNo,
      items: manifestItems.map(i => ({
        supplyId: i.supplyId,
        qty: Number(i.qty),
        goodConditionQty: Number(i.goodConditionQty),
        damagedQty: Number(i.damagedQty),
        remarks: i.remarks || purpose
      }))
    };
    try {
      const config = getAuthConfig();
      const res = await axios.post(MOVEMENT_URL, payload, config);
      if (res.status === 200 || res.status === 201) {
        showSuccessToast(`Supply ${transactionType} finalized successfully!`);
        setManifestItems([]); 
        setPartyName(''); 
        setPurpose('Production');
        setOriginAddress(''); 
        setReferenceSlipNo('');
        setTransactionType('Borrow');
        setTransactionTime(getCurrentTimeString());
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
      doc.text("Personnel:", 14, 56);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.partyName || 'N/A'}`, 45, 56);

      doc.setFont("helvetica", "bold");
      doc.text("Purpose:", 120, 56);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.purpose || selectedSlip.originAddress || 'Production'}`, 155, 56);

      doc.setFont("helvetica", "bold");
      doc.text("Time Borrow:", 14, 63);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.transactionTime || '-'}`, 45, 63);

      const slipDate = selectedSlip.transactionDate ? new Date(selectedSlip.transactionDate).toLocaleDateString() : '-';
      const slipTime = selectedSlip.transactionTime || '-';
      const slipPersonnel = selectedSlip.partyName || 'N/A';
      const slipPurpose = selectedSlip.purpose || selectedSlip.originAddress || 'Production';

      const tableColumns = ["Date Borrow", "Time", "Personnel", "Supplies", "Reason", "Quantity"];
      const tableRows = selectedSlip.items?.map(it => [
        slipDate,
        slipTime,
        slipPersonnel,
        `${it.supplyId?.ItemDescription || '-'}\n(${it.supplyId?.Code || 'N/A'})`,
        it.remarks || slipPurpose,
        `${it.qty} ${it.supplyId?.UOM || 'pcs'}`
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
          0: { cellWidth: 26, halign: 'center' },
          1: { cellWidth: 24, halign: 'center' },
          2: { cellWidth: 35 },
          3: { cellWidth: 50 },
          4: { cellWidth: 35 },
          5: { cellWidth: 20, halign: 'center' }
        }
      });

      doc.save(`SUPPLIES_SLIP_${selectedSlip.slipNo}.pdf`);
      showSuccessToast("PDF Slip downloaded successfully.");
    } catch (e) {
      showErrorToast("Failed to download PDF slip.");
    }
  };

  const filteredSuggestions = dbSupplies.filter(item => {
    const itemCat = item.Category || item.category || '';
    const matchesCat = selectedCategory === 'All Categories' ||
      itemCat.toLowerCase() === selectedCategory.toLowerCase();
    if (!matchesCat) return false;

    if (!searchQuery.trim()) return false;

    const words = searchQuery.toLowerCase().trim().split(/\s+/);
    const desc = (item.ItemDescription || '').toLowerCase();
    const dim = (item.Dimension || item.Dimensions || item.dimension || item.dimensions || '').toLowerCase();
    const seg = (item.Segment || item.segment || '').toLowerCase();
    const cat = itemCat.toLowerCase();
    const code = (item.Code || '').toLowerCase();

    return words.every(word =>
      desc.includes(word) || dim.includes(word) || seg.includes(word) || cat.includes(word) || code.includes(word)
    );
  });

  const modalFilteredSupplies = dbSupplies.filter(item => {
    const itemCat = item.Category || item.category || '';
    const matchesCat = modalCategoryFilter === 'All Categories' ||
      itemCat.toLowerCase() === modalCategoryFilter.toLowerCase();
    if (!matchesCat) return false;

    if (!modalSearchQuery.trim()) return true;

    const words = modalSearchQuery.toLowerCase().trim().split(/\s+/);
    const desc = (item.ItemDescription || '').toLowerCase();
    const dim = (item.Dimension || item.Dimensions || item.dimension || item.dimensions || '').toLowerCase();
    const seg = (item.Segment || item.segment || '').toLowerCase();
    const cat = itemCat.toLowerCase();
    const code = (item.Code || '').toLowerCase();

    return words.every(word =>
      desc.includes(word) || dim.includes(word) || seg.includes(word) || cat.includes(word) || code.includes(word)
    );
  });

  const activeBorrows = movementRecords.filter(r =>
    (r.transactionType === "Borrow" || r.transactionType === "Reserved") && r.isReturned === false
  );

  const filteredHistoryLogs = useMemo(() => {
    if (!historySearchQuery.trim()) return movementRecords;
    const q = historySearchQuery.toLowerCase().trim();
    return movementRecords.filter(rec => {
      const slipNo = (rec.slipNo || '').toLowerCase();
      const party = (rec.partyName || '').toLowerCase();
      const type = (rec.transactionType || '').toLowerCase();
      const address = (rec.originAddress || '').toLowerCase();
      const preparedBy = (rec.preparedBy || '').toLowerCase();
      const refSlip = (rec.referenceSlipNo || '').toLowerCase();
      const itemsMatch = rec.items?.some(i => 
        (i.supplyId?.ItemDescription || '').toLowerCase().includes(q) ||
        (i.supplyId?.Code || '').toLowerCase().includes(q) ||
        (i.remarks || '').toLowerCase().includes(q)
      );

      return slipNo.includes(q) || party.includes(q) || type.includes(q) || 
             address.includes(q) || preparedBy.includes(q) || refSlip.includes(q) || itemsMatch;
    });
  }, [movementRecords, historySearchQuery]);
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

            {/* COMPACT TRANSACTION TYPE CONTAINER */}
            <div className={`px-3.5 py-2 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 overflow-x-auto ${
              isDark ? 'bg-[#141622]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
                <span className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Transaction Type:
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                  transactionType === 'Borrow'
                    ? (isDark ? 'bg-amber-950/60 text-amber-400 border-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200')
                    : transactionType === 'Return'
                    ? (isDark ? 'bg-blue-950/60 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200')
                    : transactionType === 'Restock'
                    ? (isDark ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                    : (isDark ? 'bg-rose-950/60 text-rose-400 border-rose-800' : 'bg-rose-50 text-rose-700 border-rose-200')
                }`}>
                  {transactionType === 'Borrow' && '🟡 Borrow (Issue Stock)'}
                  {transactionType === 'Return' && '🔵 Return (Receive Back)'}
                  {transactionType === 'Restock' && '🟢 Restock (Stock In)'}
                  {transactionType === 'Out' && '🔴 Out (Deduct Stock)'}
                </span>
              </div>

              {/* ACTION TOGGLE BUTTONS */}
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0 flex-nowrap shrink-0">
                <button
                  type="button"
                  onClick={() => setTransactionType('Borrow')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    transactionType === 'Borrow'
                      ? (isDark ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs' : 'bg-amber-500 text-white border-amber-600 shadow-xs')
                      : (isDark ? 'bg-[#0e1017] text-slate-400 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')
                  }`}
                >
                  🟡 Borrow
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('Return')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    transactionType === 'Return'
                      ? (isDark ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-blue-600 text-white border-blue-700 shadow-xs')
                      : (isDark ? 'bg-[#0e1017] text-slate-400 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')
                  }`}
                >
                  🔵 Return
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('Restock')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    transactionType === 'Restock'
                      ? (isDark ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs' : 'bg-emerald-600 text-white border-emerald-700 shadow-xs')
                      : (isDark ? 'bg-[#0e1017] text-slate-400 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')
                  }`}
                >
                  🟢 Restock
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('Out')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    transactionType === 'Out'
                      ? (isDark ? 'bg-rose-600 text-white border-rose-500 shadow-xs' : 'bg-red-600 text-white border-red-700 shadow-xs')
                      : (isDark ? 'bg-[#0e1017] text-slate-400 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')
                  }`}
                >
                  🔴 Out
                </button>
              </div>
            </div>

            {/* FORM FIELDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              
              {/* 1. PERSONNEL (TYPE + DROPDOWN) */}
              <div ref={personnelDropdownRef} className="relative sm:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`block text-xs font-bold uppercase ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Personnel *
                  </label>
                  <span className="text-[10px] text-amber-500 font-semibold">
                    Type or pick from dropdown
                  </span>
                </div>

                <div className="relative">
                  <User className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'} z-10`} />
                  <input
                    type="text"
                    required
                    value={partyName}
                    onChange={(e) => {
                      setPartyName(e.target.value);
                      setIsPersonnelDropdownOpen(true);
                    }}
                    onFocus={() => setIsPersonnelDropdownOpen(true)}
                    placeholder="Enter or search personnel name..."
                    className={`w-full border rounded-lg pl-9 pr-16 py-2 text-sm focus:outline-none font-semibold transition-all ${
                      isDark
                        ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]'
                        : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'
                    }`}
                  />

                  <div className="absolute right-2 top-2 flex items-center gap-1 z-10">
                    {partyName && (
                      <button
                        type="button"
                        onClick={() => {
                          setPartyName('');
                          setIsPersonnelDropdownOpen(true);
                        }}
                        title="Clear personnel"
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsPersonnelDropdownOpen(!isPersonnelDropdownOpen)}
                      title="Toggle personnel dropdown list"
                      className={`p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-transform duration-200 ${
                        isPersonnelDropdownOpen ? 'rotate-180 text-[#ff6600]' : ''
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* FLOATING TYPE + DROPDOWN MENU */}
                  {isPersonnelDropdownOpen && (
                    <div
                      className={`absolute left-0 right-0 top-[102%] mt-1 border rounded-xl max-h-60 overflow-y-auto z-50 divide-y p-1 shadow-2xl ${
                        isDark
                          ? 'bg-[#0e1017] border-slate-700 divide-slate-800 text-slate-200'
                          : 'bg-white border-slate-200 divide-slate-100 text-slate-800'
                      }`}
                    >
                      <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-t-lg flex items-center justify-between ${
                        isDark ? 'text-slate-400 bg-slate-900/60' : 'text-slate-500 bg-slate-50'
                      }`}>
                        <span>Personnel List ({filteredEmployees.length})</span>
                        <span className="text-[9px] font-normal lowercase">click to select</span>
                      </div>

                      {filteredEmployees.length > 0 ? (
                        filteredEmployees.map((emp) => (
                          <button
                            key={emp._id}
                            type="button"
                            onClick={() => {
                              setPartyName(emp.name);
                              setIsPersonnelDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2 rounded-lg transition-colors cursor-pointer ${
                              partyName === emp.name
                                ? (isDark ? 'bg-[#ff6600]/20 text-[#ff6600]' : 'bg-indigo-50 text-[#18174e]')
                                : (isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50')
                            }`}
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-sm">{emp.name}</span>
                              {(emp.contactPerson || emp.address) && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {[emp.contactPerson, emp.address].filter(Boolean).join(' • ')}
                                </span>
                              )}
                            </div>
                            {partyName === emp.name && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-400">
                          No registered personnel matches "{partyName}".
                        </div>
                      )}

                      {partyName && !combinedEmployees.some((e) => e.name?.toLowerCase() === partyName.toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => setIsPersonnelDropdownOpen(false)}
                          className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 rounded-lg transition-colors cursor-pointer ${
                            isDark ? 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>Use typed personnel: <strong>"{partyName}"</strong></span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. PURPOSE DROPDOWN (Production, Deployment, Personal) */}
              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Purpose *
                </label>
                <div className="relative">
                  <select
                    value={purpose}
                    onChange={(e) => {
                      const newPurpose = e.target.value;
                      setPurpose(newPurpose);
                      setOriginAddress(newPurpose);
                      // Auto update remarks in manifest if empty or matches previous purpose
                      setManifestItems(manifestItems.map(item => ({
                        ...item,
                        remarks: (!item.remarks || PURPOSE_OPTIONS.includes(item.remarks)) ? newPurpose : item.remarks
                      })));
                    }}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none font-bold cursor-pointer transition-all ${
                      isDark
                        ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]'
                        : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'
                    }`}
                  >
                    {PURPOSE_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'Production' && '🏭 Production'}
                        {cat === 'Deployment' && '🚀 Deployment'}
                        {cat === 'Personal' && '👤 Personal'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. DATE BORROW */}
              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {transactionType === 'Borrow' ? 'Date Borrow *' : `Date ${transactionType} *`}
                </label>
                <div className="relative">
                  <Calendar className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={e => setTransactionDate(e.target.value)}
                    className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none font-semibold ${
                      isDark
                        ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]'
                        : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* 4. TIME */}
              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Time *
                </label>
                <div className="relative">
                  <Clock className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={transactionTime}
                    onChange={e => setTransactionTime(e.target.value)}
                    placeholder="e.g. 02:30 PM"
                    className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none font-semibold ${
                      isDark
                        ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]'
                        : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* 5. SLIP NUMBER */}
              <div>
                <label className={`block text-xs font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Slip Number</label>
                <div className="relative">
                  <FileText className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={referenceSlipNo ? `REF: ${referenceSlipNo}` : "[ AUTO-GENERATED ]"}
                    disabled
                    className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm font-bold select-none cursor-not-allowed focus:outline-none ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* 6. PREPARED BY */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className={`block text-xs font-bold uppercase mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Prepared By</label>
                <div className="relative">
                  <User className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={preparedBy}
                    disabled
                    className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm font-semibold cursor-not-allowed select-none focus:outline-none ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-xl border flex flex-col gap-2.5 relative ${isDark ? 'bg-[#141622]/60 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className={`block text-xs sm:text-sm font-bold uppercase leading-snug ${
                    transactionType === 'Borrow'
                      ? (isDark ? 'text-amber-400' : 'text-amber-700')
                      : transactionType === 'Return'
                      ? (isDark ? 'text-blue-400' : 'text-blue-700')
                      : transactionType === 'Restock'
                      ? (isDark ? 'text-emerald-400' : 'text-emerald-700')
                      : (isDark ? 'text-rose-400' : 'text-red-800')
                  }`}>
                    Step 1: Type / Select Supplies for {
                      transactionType === 'Borrow'
                        ? 'Borrowing (Issuance)'
                        : transactionType === 'Return'
                        ? 'Return (Receive Back)'
                        : transactionType === 'Restock'
                        ? 'Stock Restock (Addition)'
                        : 'Stock Deduction (Out)'
                    }
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Filter by category or search by item description and dimension (e.g. gloves, tape).
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsBrowseModalOpen(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-sm ${
                      isDark ? 'bg-[#141622] border-slate-700 text-indigo-400 hover:bg-indigo-950/60' : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50'
                    }`}
                    title="Browse all supplies in a table view"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Browse Table</span>
                  </button>
                </div>
              </div>

              {/* SUPPLIES DROPDOWN & SEARCH CONTROLS */}
              <div className="flex flex-col gap-2.5">
                {/* 1. SUPPLIES DROPDOWN (QUICK SELECT) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={`block text-xs font-bold uppercase ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                      Supplies Dropdown (Quick Select Item to Borrow / Add) *
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Select item to add directly to table
                    </span>
                  </div>
                  <select
                    value={selectedSupplyDropdownId}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) return;
                      const item = dbSupplies.find(s => s._id === id);
                      if (item) handleSelectSupply(item);
                      setSelectedSupplyDropdownId('');
                    }}
                    className={`w-full border rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold cursor-pointer focus:outline-none transition-all ${
                      isDark
                        ? 'bg-[#0e1017] border-amber-500/50 text-white focus:border-[#ff6600]'
                        : 'bg-white border-amber-300 text-slate-800 focus:border-amber-600 shadow-xs'
                    }`}
                  >
                    <option value="">-- Choose Supply from Dropdown ({dbSupplies.length} items available) --</option>
                    {dbSupplies
                      .filter(s => selectedCategory === 'All Categories' || (s.Category || s.category) === selectedCategory)
                      .map(s => {
                        const goodCount = s.ConditionBreakdown?.Good ?? s.ActualCount ?? 0;
                        const isAdded = manifestItems.some(i => i.supplyId === s._id);
                        return (
                          <option key={s._id} value={s._id} disabled={isDeductingType && goodCount <= 0}>
                            {s.ItemDescription} {s.Dimension && s.Dimension !== 'N/A' ? `[${s.Dimension}]` : ''} - ({s.Code}) • Stock: {goodCount} {s.UOM || 'pcs'} {isAdded ? '✓ Added' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* 2. DUAL SEARCH & CATEGORY CONTROLS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* CATEGORY FILTER */}
                  <div className="sm:col-span-1">
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold cursor-pointer`}
                    >
                      <option value="All Categories">All Categories ({uniqueCategories.length})</option>
                      {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* SMART MULTI-ATTRIBUTE SEARCH */}
                  <div className="sm:col-span-2 relative">
                    <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Or search description, dimension, category, or code..."
                      className={`w-full rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none transition-colors ${
                        isDark
                          ? 'bg-[#0e1017] border border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]'
                          : 'bg-white border border-slate-200 text-slate-800 focus:border-[#18174e]'
                      }`}
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
              </div>

              {/* SEARCH SUGGESTIONS DROPDOWN WITH PROMINENT DIMENSIONS */}
              {searchQuery && (
                <div className={`absolute left-0 right-0 top-[102%] border rounded-xl shadow-xl max-h-72 overflow-y-auto z-50 p-1 divide-y ${
                  isDark
                    ? 'bg-[#0e1017] border-slate-700 divide-slate-800 text-slate-200'
                    : 'bg-white border-slate-200 divide-slate-100 text-slate-800'
                }`}>
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map(item => {
                      const dimension = item.Dimension || item.Dimensions || item.dimension || item.dimensions;
                      const segment = item.Segment || item.segment;
                      const isAdded = manifestItems.some(i => i.supplyId === item._id);

                      return (
                        <div
                          key={item._id}
                          onClick={() => handleSelectSupply(item)}
                          className={`p-2.5 cursor-pointer flex items-center justify-between gap-3 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50'
                          } ${isAdded ? 'opacity-60 bg-emerald-50/20' : ''}`}
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
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                              }`}>
                                {item.Category || item.category || 'Supply'}
                              </span>
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
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase">
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                Good: {item.ConditionBreakdown?.Good ?? item.ActualCount ?? 0}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                Damaged: {item.ConditionBreakdown?.Damaged ?? item.DamagedCount ?? 0}
                              </span>
                            </div>
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
                        No supplies found matching &ldquo;{searchQuery}&rdquo; {selectedCategory !== 'All Categories' ? `in ${selectedCategory}` : ''}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded w-fit uppercase ${
                transactionType === 'Borrow'
                  ? (isDark ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40' : 'text-amber-700 bg-amber-50')
                  : transactionType === 'Return'
                  ? (isDark ? 'bg-blue-950/40 text-blue-300 border border-blue-800/40' : 'text-blue-700 bg-blue-50')
                  : transactionType === 'Restock'
                  ? (isDark ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'text-emerald-700 bg-emerald-50')
                  : (isDark ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40' : 'text-rose-700 bg-rose-50')
              }`}>
                {transactionType === 'Borrow' && '🟡 Quantities will be issued / deducted for borrowing'}
                {transactionType === 'Return' && '🔵 Quantities will be returned / added to available stock'}
                {transactionType === 'Restock' && '🟢 Quantities will be added to available stock'}
                {transactionType === 'Out' && '🔴 Quantities will be automatically deducted'}
              </span>
              <div className={`rounded-xl border shadow-sm overflow-x-auto ${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'}`}>
                <table className="w-full text-left border-collapse text-sm min-w-[1000px]">
                  <thead>
                    <tr className={`uppercase text-xs whitespace-nowrap font-bold ${
                      transactionType === 'Borrow'
                        ? (isDark ? 'bg-[#1c1811] text-amber-300' : 'bg-amber-700 text-white')
                        : transactionType === 'Return'
                        ? (isDark ? 'bg-[#0f172a] text-blue-300' : 'bg-blue-700 text-white')
                        : transactionType === 'Restock'
                        ? (isDark ? 'bg-[#0c1a16] text-emerald-300' : 'bg-emerald-700 text-white')
                        : (isDark ? 'bg-[#1c1117] text-rose-300' : 'bg-red-700 text-white')
                    }`}>
                      <th className="py-3 px-3 text-center whitespace-nowrap w-28">
                        {transactionType === 'Borrow' ? 'Date Borrow' : `Date ${transactionType}`}
                      </th>
                      <th className="py-3 px-3 text-center whitespace-nowrap w-24">Time</th>
                      <th className="py-3 px-3 whitespace-nowrap min-w-[140px]">Personnel</th>
                      <th className="py-3 px-4 min-w-[240px]">Supplies</th>
                      <th className="py-3 px-4 min-w-[180px]">Reason</th>
                      <th className="py-3 px-3 text-center whitespace-nowrap w-28">Quantity</th>
                      {transactionType === 'Return' && (
                        <>
                          <th className="py-3 px-3 text-center w-24 text-emerald-300">Good</th>
                          <th className="py-3 px-3 text-center w-24 text-rose-300">Damaged</th>
                        </>
                      )}
                      <th className="py-3 px-3 text-center w-14">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/60 bg-[#090b10] text-slate-300' : 'divide-slate-100 bg-white text-slate-700'}`}>
                    {manifestItems.length > 0 ? (
                      manifestItems.map((item, index) => (
                        <tr key={index} className={`transition-colors ${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/80'}`}>
                          
                          {/* 1. DATE BORROW */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-xs">
                            <span className={`px-2 py-0.5 rounded font-semibold ${isDark ? 'bg-slate-900 text-slate-300 border border-slate-800' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                              {transactionDate}
                            </span>
                          </td>

                          {/* 2. TIME */}
                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-xs">
                            <span className={`px-2 py-0.5 rounded font-semibold ${isDark ? 'bg-slate-900 text-slate-300 border border-slate-800' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                              {transactionTime || '02:30 PM'}
                            </span>
                          </td>

                          {/* 3. PERSONNEL */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className={`font-bold text-xs truncate max-w-[140px] ${partyName ? (isDark ? 'text-white' : 'text-slate-800') : 'text-amber-500 italic'}`}>
                                {partyName || 'Select Personnel'}
                              </span>
                            </div>
                          </td>

                          {/* 4. SUPPLIES */}
                          <td className="py-2.5 px-4 min-w-[240px]">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-800'} truncate max-w-[220px]`} title={item.ItemDescription}>
                                  {item.ItemDescription}
                                </span>
                                {item.Dimension && item.Dimension !== 'N/A' && (
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-indigo-500/30 text-indigo-400">
                                    {item.Dimension}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                <span className="font-mono text-slate-400">{item.Code}</span>
                                <span>•</span>
                                <span>{item.Category}</span>
                                {item.Segment && item.Segment !== 'N/A' && (
                                  <>
                                    <span>•</span>
                                    <span className="uppercase">{item.Segment}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 5. REASON */}
                          <td className="py-2.5 px-4 min-w-[180px]">
                            <input 
                              type="text" 
                              value={item.remarks} 
                              onChange={e => handleUpdateField(index, 'remarks', e.target.value)} 
                              placeholder={purpose ? `Reason: ${purpose}...` : "Reason / Purpose..."} 
                              className={`w-full border rounded-lg px-2.5 py-1 text-xs focus:outline-none ${
                                isDark
                                  ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]'
                                  : 'border-slate-200 text-slate-700 focus:border-[#18174e]'
                              }`} 
                            />
                          </td>

                          {/* 6. QUANTITY */}
                          <td className="py-2.5 px-3 text-center w-28 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                value={item.qty}
                                onChange={e => handleUpdateField(index, 'qty', e.target.value)}
                                className={`w-16 border text-center rounded-lg py-1 text-xs font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                  isDark
                                    ? 'bg-[#141622] border-slate-700 text-white disabled:bg-[#0e1017] disabled:text-slate-600 focus:border-[#ff6600]'
                                    : 'border-slate-200 text-slate-700 disabled:bg-slate-50 focus:border-slate-400'
                                }`}
                                min="1"
                                max={item.maxLimit}
                                disabled={!isDeductingType && transactionType !== 'Borrow'}
                                required
                                onWheel={(e) => e.currentTarget.blur()}
                              />
                              <span className="text-[11px] font-medium text-slate-400">{item.UOM}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Avail: {item.maxLimit}</div>
                          </td>

                          {/* OPTIONAL RETURN BREAKDOWN */}
                          {transactionType === 'Return' && (
                            <>
                              <td className="py-2.5 px-3 text-center w-24">
                                <input
                                  type="number"
                                  value={item.goodConditionQty}
                                  onChange={e => handleUpdateField(index, 'goodConditionQty', e.target.value)}
                                  className="w-16 border text-center rounded-lg py-1 text-xs font-bold text-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none"
                                  min="0"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center w-24">
                                <input
                                  type="number"
                                  value={item.damagedQty}
                                  onChange={e => handleUpdateField(index, 'damagedQty', e.target.value)}
                                  className="w-16 border text-center rounded-lg py-1 text-xs font-bold text-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none"
                                  min="0"
                                />
                              </td>
                            </>
                          )}

                          {/* 7. ACTION */}
                          <td className="py-2.5 px-3 text-center w-14">
                            <button 
                              type="button" 
                              onClick={() => { 
                                setManifestItems(manifestItems.filter((_, i) => i !== index)); 
                                showSuccessToast("Item removed."); 
                              }} 
                              className="text-red-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer inline-block"
                              title="Remove item from manifest"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>

                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={transactionType === 'Return' ? 9 : 7} className="text-center py-8 text-amber-500 italic font-medium text-xs">
                          No items added yet. Select a supply above to add borrowing rows.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#ff6600] hover:bg-[#e05a00] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer uppercase shadow-sm"
            >
              Confirm Supplies {transactionType} Slip
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
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-[#ff6600]" />
                <span className="text-xs font-medium">Loading history logs...</span>
              </div>
            ) : displayedHistoryLogs.length > 0 ? (
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
            ) : movementRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 gap-1">
                <ClipboardList className="w-6 h-6 opacity-40" />
                <span className="italic text-xs font-medium">No supplies movements recorded yet.</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center gap-1">
                <span className="text-red-500 italic font-bold text-xs">No matching records found.</span>
                <span className="text-[10px] text-slate-400">Try searching by slip number, name, or transaction type.</span>
              </div>
            )}
          </div>

          {!isLoading && movementRecords.length > 0 && (
            <div className={`text-[10px] text-center font-semibold mt-auto pt-2 border-t ${
              isDark ? 'border-slate-800 text-slate-500' : 'border-slate-50 text-slate-400'
            }`}>
              Showing latest {displayedHistoryLogs.length} of {movementRecords.length} entries.
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

            <div className={`grid grid-cols-2 sm:grid-cols-3 text-sm gap-2.5 p-4 rounded-xl border ${
              isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-100'
            }`}>
              <div><span className="font-semibold text-slate-500">Slip ID No:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.slipNo}</span></div>
              <div><span className="font-semibold text-slate-500">Date Logged:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.transactionDate ? new Date(selectedSlip.transactionDate).toLocaleDateString() : '-'}</span></div>
              <div><span className="font-semibold text-slate-500">Movement:</span> <span className="font-bold text-[#ff6600] uppercase">{selectedSlip.transactionType}</span></div>
              <div><span className="font-semibold text-slate-500">Personnel:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.partyName || 'N/A'}</span></div>
              <div><span className="font-semibold text-slate-500">Purpose:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.purpose || selectedSlip.originAddress || 'Production'}</span></div>
              <div><span className="font-semibold text-slate-500">Time:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.transactionTime || '-'}</span></div>
              <div><span className="font-semibold text-slate-500">Prepared By:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.preparedBy || preparedBy}</span></div>
            </div>

            <div className={`max-h-64 overflow-y-auto border rounded-xl relative shadow-sm ${
              isDark ? 'border-slate-800 bg-[#0c0e14]' : 'border-slate-200/60 bg-white'
            }`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead className={`sticky top-0 z-10 text-[11px] font-bold uppercase tracking-wide ${
                  isDark ? 'bg-[#0f111d] text-slate-200' : 'bg-[#18174e] text-white'
                }`}>
                  <tr>
                    <th className="p-3 text-center whitespace-nowrap w-24">Date Borrow</th>
                    <th className="p-3 text-center whitespace-nowrap w-20">Time</th>
                    <th className="p-3 whitespace-nowrap">Personnel</th>
                    <th className="p-3 min-w-[160px]">Supplies</th>
                    <th className="p-3 min-w-[130px]">Reason</th>
                    <th className="p-3 text-center whitespace-nowrap w-24">Quantity</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 bg-[#090b10] text-slate-300' : 'divide-slate-100 bg-white text-slate-700'}`}>
                  {selectedSlip.items?.map((it, idx) => (
                    <tr key={it._id || idx} className={`transition-colors ${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/50'}`}>
                      <td className="p-3 text-center font-mono whitespace-nowrap">
                        {selectedSlip.transactionDate ? new Date(selectedSlip.transactionDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-3 text-center font-mono whitespace-nowrap">
                        {selectedSlip.transactionTime || '-'}
                      </td>
                      <td className="p-3 font-semibold whitespace-nowrap">
                        {selectedSlip.partyName || 'N/A'}
                      </td>
                      <td className="p-3 align-middle">
                        <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'} max-w-xs truncate`} title={it.supplyId?.ItemDescription}>
                          {it.supplyId?.ItemDescription || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {it.supplyId?.Code || ''}
                        </div>
                      </td>
                      <td className="p-3 italic font-medium text-[11px] max-w-[140px] truncate align-middle" title={it.remarks}>
                        {it.remarks || selectedSlip.purpose || selectedSlip.originAddress || 'Production'}
                      </td>
                      <td className={`p-3 text-center align-middle font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {it.qty} {it.supplyId?.UOM || 'pcs'}
                      </td>
                    </tr>
                  ))}
                  {(!selectedSlip.items || selectedSlip.items.length === 0) && (
                    <tr>
                      <td colSpan="6" className="p-4 text-center text-slate-500 italic">No materials recorded.</td>
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
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Date Borrow</span>
                <span className="font-semibold">{transactionDate ? new Date(transactionDate).toLocaleDateString() : '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Time</span>
                <span className="font-semibold">{transactionTime || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Personnel</span>
                <span className="font-bold text-amber-500">{partyName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Purpose</span>
                <span className="font-bold">{purpose || 'Production'}</span>
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
                      <th className="py-2 px-3 text-center">Date Borrow</th>
                      <th className="py-2 px-3 text-center">Time</th>
                      <th className="py-2 px-3">Personnel</th>
                      <th className="py-2 px-3">Supplies</th>
                      <th className="py-2 px-3">Reason</th>
                      <th className="py-2 px-3 text-center font-bold">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                    {manifestItems.map((item, idx) => (
                      <tr key={idx} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                        <td className="py-2 px-3 text-center font-mono">
                          {transactionDate}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">
                          {transactionTime || '02:30 PM'}
                        </td>
                        <td className="py-2 px-3 font-semibold">
                          {partyName || 'N/A'}
                        </td>
                        <td className="py-2 px-3 font-semibold max-w-[180px] truncate" title={item.ItemDescription}>
                          <div>{item.ItemDescription}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.Code}</div>
                        </td>
                        <td className="py-2 px-3 text-slate-400 italic">
                          {item.remarks || purpose || '—'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          {item.qty} {item.UOM}
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
      {/* BROWSE ALL SUPPLIES MODAL */}
      {isBrowseModalOpen && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-4xl p-6 shadow-xl relative max-h-[90vh] flex flex-col gap-4 overflow-y-auto`}>
            {/* Header */}
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                  Browse Supplies
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

            {/* Filter and Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
                  Filter by Category
                </label>
                <select
                  value={modalCategoryFilter}
                  onChange={e => setModalCategoryFilter(e.target.value)}
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600] cursor-pointer`}
                >
                  <option value="All Categories">All Categories ({uniqueCategories.length})</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
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
                    placeholder="Search description, dimension, category, or code..."
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className={`rounded-xl border overflow-x-auto overflow-y-auto flex-1 max-h-96 ${isDark ? 'border-slate-800 bg-[#090b10]' : 'border-slate-100 bg-white'}`}>
              <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#141622] text-slate-200' : 'bg-[#18174e] text-white'} font-bold uppercase text-[11px] whitespace-nowrap`}>
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">Item Description & Code</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Dimension</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Category / Segment</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Available Stock</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                  {modalFilteredSupplies.length > 0 ? (
                    modalFilteredSupplies.map(item => {
                      const isAdded = manifestItems.some(i => i.supplyId === item._id);
                      const dimension = item.Dimension || item.Dimensions || item.dimension || item.dimensions || '—';
                      const category = item.Category || item.category || '—';
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
                              isDark ? 'bg-amber-950/60 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'
                            }`}>
                              {dimension}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                              isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}>
                              {category}
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
                                onClick={() => handleSelectSupply(item)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${
                                  isDark ? 'bg-amber-950/60 border-amber-800 text-amber-400 hover:bg-amber-900/60' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
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
                        No supplies found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between mt-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                Showing {modalFilteredSupplies.length} of {dbSupplies.length} supplies
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
    </div>
  );
}

export default InventorySuppliesMovements;
