import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { FileText, ClipboardList, Calendar, Trash2, Search, X, Download, User, ArrowLeftRight, Eye, CheckCircle2, AlertCircle, Loader2, Layers, ChevronDown, Clock, Tag, Plus, Package, ListPlus, ArrowUpRight, RotateCcw, History } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from './PageHeader';
import TablePagination from './TablePagination';
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
  const [modalPage, setModalPage] = useState(1);
  const [modalRowsPerPage, setModalRowsPerPage] = useState(10);

  useEffect(() => {
    setModalPage(1);
  }, [selectedSlip, isModalOpen]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyFilterType, setHistoryFilterType] = useState('All');
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

  const [suppliesSearchInput, setSuppliesSearchInput] = useState('');
  const [isSuppliesDropdownOpen, setIsSuppliesDropdownOpen] = useState(false);
  const suppliesDropdownRef = useRef(null);
  const [selectedSupplyDropdownId, setSelectedSupplyDropdownId] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('All Segments');
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState('All Categories');

  const PURPOSE_OPTIONS = ['Production', 'Deployment', 'Personal'];

  const uniqueCategories = Array.from(
    new Set(
      dbSupplies
        .map(item => item.Segment || item.segment || item.Category || item.category)
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
      if (suppliesDropdownRef.current && !suppliesDropdownRef.current.contains(e.target)) {
        setIsSuppliesDropdownOpen(false);
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

  const filteredSuppliesForDropdown = useMemo(() => {
    return dbSupplies.filter(item => {
      const cat = (item.Category || item.category || '').toLowerCase();
      const seg = (item.Segment || item.segment || '').toLowerCase();
      const matchesCategory = selectedCategory === 'All Segments' ||
        selectedCategory === 'All Categories' ||
        cat === selectedCategory.toLowerCase() ||
        seg === selectedCategory.toLowerCase();
      if (!matchesCategory) return false;

      if (!suppliesSearchInput || !suppliesSearchInput.trim()) return true;

      const words = suppliesSearchInput.toLowerCase().trim().split(/\s+/);
      const desc = (item.ItemDescription || '').toLowerCase();
      const dim = (item.Dimension || item.Dimensions || item.dimension || item.dimensions || '').toLowerCase();
      const code = (item.Code || '').toLowerCase();

      return words.every(w => desc.includes(w) || dim.includes(w) || cat.includes(w) || code.includes(w) || seg.includes(w));
    });
  }, [dbSupplies, suppliesSearchInput, selectedCategory]);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const handleDownloadPDF = (slipRecord = null) => {
    const targetSlip = slipRecord || selectedSlip;
    if (!targetSlip) return;
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
      doc.text(`${targetSlip.slipNo}`, 45, 42);

      doc.setFont("helvetica", "bold");
      doc.text("Date Logged:", 120, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${targetSlip.transactionDate ? new Date(targetSlip.transactionDate).toLocaleDateString() : '-'}`, 155, 42);

      doc.setFont("helvetica", "bold");
      doc.text("Transaction:", 14, 49);
      doc.setFont("helvetica", "normal");
      doc.text(`${targetSlip.transactionType.toUpperCase()}`, 45, 49);

      doc.setFont("helvetica", "bold");
      doc.text("Prepared By:", 120, 49);
      doc.setFont("helvetica", "normal");
      doc.text(`${targetSlip.preparedBy || preparedBy}`, 155, 49);

      doc.setFont("helvetica", "bold");
      doc.text("Personnel:", 14, 56);
      doc.setFont("helvetica", "normal");
      doc.text(`${targetSlip.partyName || 'N/A'}`, 45, 56);

      doc.setFont("helvetica", "bold");
      doc.text("Purpose:", 120, 56);
      doc.setFont("helvetica", "normal");
      doc.text(`${targetSlip.purpose || targetSlip.originAddress || 'Production'}`, 155, 56);

      doc.setFont("helvetica", "bold");
      doc.text("Time Borrow:", 14, 63);
      doc.setFont("helvetica", "normal");
      doc.text(`${targetSlip.transactionTime || '-'}`, 45, 63);

      const slipDate = targetSlip.transactionDate ? new Date(targetSlip.transactionDate).toLocaleDateString() : '-';
      const slipTime = targetSlip.transactionTime || '-';
      const slipPersonnel = targetSlip.partyName || 'N/A';
      const slipPurpose = targetSlip.purpose || targetSlip.originAddress || 'Production';

      const tableColumns = ["Segment", "Item Description", "Dimension", "Qty", "Remarks"];
      const tableRows = targetSlip.items?.map(it => {
        const seg = it.supplyId?.Segment || it.supplyId?.segment || it.supplyId?.Category || it.supplyId?.category || 'Equipment';
        const desc = `${it.supplyId?.ItemDescription || '-'}\n(${it.supplyId?.Code || 'N/A'})`;
        const dim = it.supplyId?.Dimension || it.supplyId?.Dimensions || it.supplyId?.Model || '—';
        const qty = `${it.qty} ${it.supplyId?.UOM || 'pcs'}`;
        const rem = it.remarks || targetSlip.purpose || targetSlip.originAddress || '—';
        return [seg, desc, dim, qty, rem];
      }) || [];

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
          doc.text(`SUPPLIES TRANSACTION SLIP (${targetSlip.transactionType.toUpperCase()})`, centerX, 13, { align: 'center' });

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
          0: { cellWidth: 30, halign: 'center' },
          1: { cellWidth: 55 },
          2: { cellWidth: 35, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 35 }
        }
      });

      doc.save(`SUPPLIES_SLIP_${targetSlip.slipNo}.pdf`);
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

  const [activeBorrowsPage, setActiveBorrowsPage] = useState(1);
  const [activeBorrowsRowsPerPage, setActiveBorrowsRowsPerPage] = useState(10);
  const [activeBorrowsTypeFilter, setActiveBorrowsTypeFilter] = useState('All');

  const filteredActiveBorrows = useMemo(() => {
    return activeBorrows.filter(b => {
      if (activeBorrowsTypeFilter !== 'All') {
        if (activeBorrowsTypeFilter === 'Borrow' && b.transactionType !== 'Borrow') return false;
        if (activeBorrowsTypeFilter === 'Reserved' && b.transactionType !== 'Reserved') return false;
      }
      if (!quickReturnSearch) return true;
      const q = quickReturnSearch.toLowerCase().trim();
      return (
        b.slipNo?.toLowerCase().includes(q) ||
        b.partyName?.toLowerCase().includes(q) ||
        b.purpose?.toLowerCase().includes(q) ||
        b.originAddress?.toLowerCase().includes(q)
      );
    });
  }, [activeBorrows, quickReturnSearch, activeBorrowsTypeFilter]);

  const borrowCount = activeBorrows.filter(b => b.transactionType === 'Borrow').length;
  const reservedCount = activeBorrows.filter(b => b.transactionType === 'Reserved').length;

  useEffect(() => {
    setActiveBorrowsPage(1);
  }, [quickReturnSearch, activeBorrowsTypeFilter]);

  const paginatedActiveBorrows = useMemo(() => {
    const start = (activeBorrowsPage - 1) * activeBorrowsRowsPerPage;
    return filteredActiveBorrows.slice(start, start + activeBorrowsRowsPerPage);
  }, [filteredActiveBorrows, activeBorrowsPage, activeBorrowsRowsPerPage]);

  const filteredHistoryLogs = useMemo(() => {
    let list = movementRecords;
    if (historyFilterType && historyFilterType !== 'All') {
      list = list.filter(rec => rec.transactionType === historyFilterType);
    }
    if (!historySearchQuery.trim()) return list;
    const q = historySearchQuery.toLowerCase().trim();
    return list.filter(rec => {
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
  }, [movementRecords, historySearchQuery, historyFilterType]);

  const [historyPage, setHistoryPage] = useState(1);
  const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyFilterType, historySearchQuery]);

  const paginatedHistoryLogs = useMemo(() => {
    const start = (historyPage - 1) * historyRowsPerPage;
    return filteredHistoryLogs.slice(start, start + historyRowsPerPage);
  }, [filteredHistoryLogs, historyPage, historyRowsPerPage]);

  const filteredSidebarHistoryLogs = useMemo(() => {
    if (!historySearchQuery.trim()) return movementRecords;
    const q = historySearchQuery.toLowerCase().trim();
    return movementRecords.filter(rec => {
      const slipNo = (rec.slipNo || '').toLowerCase();
      const party = (rec.partyName || '').toLowerCase();
      const type = (rec.transactionType || '').toLowerCase();
      const purpose = (rec.purpose || '').toLowerCase();
      return slipNo.includes(q) || party.includes(q) || type.includes(q) || purpose.includes(q);
    });
  }, [movementRecords, historySearchQuery]);

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

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader activeTab="supplies-movements" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className={`lg:col-span-3 ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100'} p-4 sm:p-6 rounded-2xl border flex flex-col gap-6 shadow-sm`}>
          <div className={`border-b ${isDark ? 'border-slate-800 text-slate-200' : 'border-slate-100 text-slate-600'} pb-3 flex items-center justify-between gap-2 text-sm font-bold`}>
            <div className="flex items-center gap-2 min-w-0">
              <History className="w-4 h-4 text-[#ff6600] flex-shrink-0" />
              <span className="truncate">Equipment Movements & Transaction Slip</span>
            </div>

            {manifestItems.length > 0 && (
              <button
                type="button"
                onClick={() => { setManifestItems([]); setReferenceSlipNo(''); setTransactionType('Borrow'); showSuccessToast("Form grid cleared."); }}
                className="text-xs font-bold text-rose-400 hover:underline cursor-pointer flex-shrink-0 ml-1"
              >
                Clear Form Grid
              </button>
            )}
          </div>

          <form onSubmit={handleInitiateConfirm} className="flex flex-col gap-5">

            {/* COMPACT TRANSACTION TYPE CONTAINER */}
            <div className={`px-3.5 py-2 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 overflow-x-auto ${isDark ? 'bg-[#141622]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
                <span className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Transaction Type:
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${transactionType === 'Borrow'
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${transactionType === 'Borrow'
                    ? (isDark ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs' : 'bg-amber-500 text-white border-amber-600 shadow-xs')
                    : (isDark ? 'bg-[#0e1017] text-slate-400 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')
                    }`}
                >
                  🟡 Borrow
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('Return')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${transactionType === 'Return'
                    ? (isDark ? 'bg-blue-600 text-white border-blue-500 shadow-xs' : 'bg-blue-600 text-white border-blue-700 shadow-xs')
                    : (isDark ? 'bg-[#0e1017] text-slate-400 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')
                    }`}
                >
                  🔵 Return
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('Restock')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${transactionType === 'Restock'
                    ? (isDark ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs' : 'bg-emerald-600 text-white border-emerald-700 shadow-xs')
                    : (isDark ? 'bg-[#0e1017] text-slate-400 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')
                    }`}
                >
                  🟢 Restock
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('Out')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${transactionType === 'Out'
                    ? (isDark ? 'bg-rose-600 text-white border-rose-500 shadow-xs' : 'bg-red-600 text-white border-red-700 shadow-xs')
                    : (isDark ? 'bg-[#0e1017] text-slate-400 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')
                    }`}
                >
                  🔴 Out
                </button>
              </div>
            </div>

            {/* 1. TOP ROW: 3 GRID COLUMNS (PERSONNEL, PURPOSE, DATE BORROW) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              {/* 1. PERSONNEL (TYPE + DROPDOWN) */}
              <div ref={personnelDropdownRef} className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase`}>
                    Personnel *
                  </label>
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
                    placeholder="Personnel name..."
                    className={`w-full border rounded-lg pl-9 pr-16 py-2 text-sm focus:outline-none font-semibold transition-all ${isDark
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
                      className={`p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-transform duration-200 ${isPersonnelDropdownOpen ? 'rotate-180 text-[#ff6600]' : ''
                        }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* FLOATING TYPE + DROPDOWN MENU FOR PERSONNEL */}
                  {isPersonnelDropdownOpen && (
                    <div
                      className={`absolute left-0 right-0 sm:-right-16 top-[102%] mt-1 border rounded-xl max-h-60 overflow-y-auto z-50 divide-y p-1 shadow-2xl ${isDark
                        ? 'bg-[#0e1017] border-slate-700 divide-slate-800 text-slate-200'
                        : 'bg-white border-slate-200 divide-slate-100 text-slate-800'
                        }`}
                    >

                      {filteredEmployees.length > 0 ? (
                        filteredEmployees.map((emp) => (
                          <button
                            key={emp._id}
                            type="button"
                            onClick={() => {
                              setPartyName(emp.name);
                              setIsPersonnelDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2 rounded-lg transition-colors cursor-pointer ${partyName === emp.name
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
                          className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 rounded-lg transition-colors cursor-pointer ${isDark ? 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
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
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
                  Purpose *
                </label>
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
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer font-medium`}
                  required
                >
                  <option value="" className={isDark ? 'bg-[#141622] text-slate-300' : ''}>Select Purpose</option>
                  {PURPOSE_OPTIONS.map((cat) => (
                    <option key={cat} value={cat} className={isDark ? 'bg-[#141622] text-white' : ''}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. DATE BORROW */}
              <div>
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
                  {transactionType === 'Borrow' ? 'Date Borrow *' : `Date ${transactionType} *`}
                </label>
                <div className="relative">
                  <Calendar className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={e => setTransactionDate(e.target.value)}
                    className={`w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none font-semibold ${isDark
                      ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]'
                      : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'
                      }`}
                    required
                  />
                </div>
              </div>

            </div>

            {/* 2. STEP 1: TYPE / SELECT MATERIALS */}
            <div ref={suppliesDropdownRef} className={`${isDark ? 'bg-[#141622]/60 border-slate-800' : 'bg-slate-50 border-slate-100'} p-4 rounded-xl border flex flex-col gap-2.5 relative`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className={`block text-xs sm:text-sm font-bold ${transactionType === 'Borrow'
                    ? (isDark ? 'text-amber-400' : 'text-amber-800')
                    : transactionType === 'Return'
                      ? (isDark ? 'text-blue-400' : 'text-blue-800')
                      : transactionType === 'Restock'
                        ? (isDark ? 'text-emerald-400' : 'text-emerald-800')
                        : (isDark ? 'text-rose-400' : 'text-rose-800')
                    } uppercase leading-snug`}>
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
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold cursor-pointer`}
                  >
                    <option value="All Segments">All Segments ({uniqueCategories.length})</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* 2. SMART MULTI-ATTRIBUTE SEARCH */}
                <div className="sm:col-span-2 relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={suppliesSearchInput}
                    onChange={(e) => {
                      setSuppliesSearchInput(e.target.value);
                      setIsSuppliesDropdownOpen(true);
                    }}
                    onFocus={() => setIsSuppliesDropdownOpen(true)}
                    placeholder="Search description, dimension (e.g. 2700, 50x50), or code..."
                    className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none`}
                  />
                  {suppliesSearchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setSuppliesSearchInput('');
                        setIsSuppliesDropdownOpen(false);
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* FLOATING TYPE + DROPDOWN MENU FOR SUPPLIES */}
              {isSuppliesDropdownOpen && suppliesSearchInput && (
                <div
                  className={`absolute left-0 right-0 top-[102%] border rounded-xl max-h-72 overflow-y-auto z-50 divide-y p-1 shadow-2xl ${isDark
                    ? 'bg-[#0e1017] border-slate-700 divide-slate-800 text-slate-200'
                    : 'bg-white border-slate-200 divide-slate-100 text-slate-800'
                    }`}
                >

                  {filteredSuppliesForDropdown.length > 0 ? (
                    filteredSuppliesForDropdown.map((s) => {
                      const goodCount = s.ConditionBreakdown?.Good ?? s.ActualCount ?? 0;
                      const isAdded = manifestItems.some(i => i.supplyId === s._id);
                      const dimension = s.Dimension || s.Dimensions || s.dimension || s.dimensions;
                      const segment = s.Category || s.category || s.Segment || s.segment || 'Supply';

                      return (
                        <div
                          key={s._id}
                          onClick={() => {
                            if (isDeductingType && goodCount <= 0) return;
                            handleSelectSupply(s);
                            setSuppliesSearchInput('');
                            setIsSuppliesDropdownOpen(false);
                          }}
                          className={`p-2.5 ${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50'} cursor-pointer flex items-center justify-between gap-3 rounded-lg transition-colors ${isDeductingType && goodCount <= 0
                            ? 'opacity-40 cursor-not-allowed bg-slate-900/20'
                            : isAdded
                              ? (isDark ? 'opacity-60 bg-emerald-50/20' : 'opacity-60 bg-emerald-50/20')
                              : ''
                            }`}
                        >
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'} whitespace-normal break-words`}>
                                {s.ItemDescription}
                              </span>
                              {dimension && dimension !== 'N/A' && (
                                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${isDark ? 'bg-amber-950/60 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'
                                  }`}>
                                  {dimension}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                                }`}>
                                {segment}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">({s.Code})</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold uppercase ${goodCount > 0
                              ? isDark
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isDark
                                ? 'bg-rose-950/60 text-rose-400 border border-rose-800'
                                : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                              Avail: {goodCount} {s.UOM || 'pcs'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-rose-500 italic font-medium text-xs">
                        No items found matching &ldquo;{suppliesSearchInput}&rdquo; {selectedCategory !== 'All Segments' ? `in ${selectedCategory}` : ''}.
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
                  <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-md w-fit uppercase ${transactionType === 'Borrow'
                    ? (isDark ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40' : 'text-amber-700 bg-amber-50 border border-amber-200/60')
                    : transactionType === 'Return'
                      ? (isDark ? 'bg-blue-950/40 text-blue-300 border border-blue-800/40' : 'text-blue-700 bg-blue-50 border border-blue-200/60')
                      : transactionType === 'Restock'
                        ? (isDark ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'text-emerald-700 bg-emerald-50 border border-emerald-200/60')
                        : (isDark ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40' : 'text-rose-700 bg-rose-50 border border-rose-200/60')
                    }`}>
                    {transactionType === 'Borrow' && '🟡 Quantities will be issued / deducted for borrowing'}
                    {transactionType === 'Return' && '🔵 Quantities will be returned / added to available stock'}
                    {transactionType === 'Restock' && '🟢 Quantities will be added to available stock'}
                    {transactionType === 'Out' && '🔴 Quantities will be automatically deducted'}
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

                <div className={`rounded-xl border shadow-sm overflow-x-auto ${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'}`}>
                  <table className="w-full text-left border-collapse text-sm min-w-[1000px]">
                    <thead>
                      <tr className={`uppercase text-xs whitespace-nowrap font-bold ${transactionType === 'Borrow'
                        ? (isDark ? 'bg-[#0f111d] text-amber-300 border-b border-slate-800' : 'bg-[#18174e] text-white')
                        : transactionType === 'Return'
                          ? (isDark ? 'bg-[#0f111d] text-blue-300 border-b border-slate-800' : 'bg-[#18174e] text-white')
                          : transactionType === 'Restock'
                            ? (isDark ? 'bg-[#0f111d] text-emerald-300 border-b border-slate-800' : 'bg-[#18174e] text-white')
                            : (isDark ? 'bg-[#0f111d] text-rose-300 border-b border-slate-800' : 'bg-[#18174e] text-white')
                        }`}>
                        <th className="py-3 px-4 text-center w-28 min-w-[112px]">QTY</th>
                        <th className="py-3 px-4 text-center">UOM</th>
                        <th className="py-3 px-4 text-center w-28 min-w-[112px]">Actual</th>
                        <th className="py-3 px-4">Segment</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Dimension</th>
                        <th className="py-3 px-4">Reason / Purpose</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800/80 bg-[#090b10]' : 'divide-slate-100 bg-white'}`}>
                      {manifestItems.map((item, index) => (
                        <tr key={item.supplyId || index} className={`${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-700'} transition-colors text-xs`}>

                          {/* 1. QTY */}
                          <td className="py-2 px-4 w-28 min-w-[112px]">
                            <input
                              type="number"
                              min="1"
                              max={isDeductingType && item.maxLimit < 9999 ? item.maxLimit : undefined}
                              value={item.qty}
                              onChange={e => handleUpdateField(index, 'qty', e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              className={`w-full border text-center rounded py-1 text-sm font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isDark
                                ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]'
                                : 'border-slate-200 text-slate-800 focus:border-[#18174e]'
                                }`}
                              required
                            />
                          </td>

                          {/* 2. UOM */}
                          <td className="py-2 px-4 text-center">
                            <span className={`${isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700'} px-2 py-0.5 rounded text-xs`}>
                              {item.UOM || 'pcs'}
                            </span>
                          </td>

                          {/* 3. Actual */}
                          <td className="py-2 px-4 text-center font-bold font-mono text-xs w-28 min-w-[112px]">
                            <span className={item.maxLimit > 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-700') : 'text-rose-500'}>
                              {item.maxLimit < 9999 ? item.maxLimit : '—'}
                            </span>
                          </td>

                          {/* 4. Segment */}
                          <td className={`py-2 px-4 italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.Segment || item.Category || 'Supplies'}
                          </td>

                          {/* 5. Description */}
                          <td className={`py-2 px-4 min-w-[200px] whitespace-normal break-words ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={item.ItemDescription}>
                            <div className="font-semibold text-sm">{item.ItemDescription}</div>
                            <div className="font-mono text-[10px] text-slate-400">{item.Code}</div>
                          </td>

                          {/* 6. Dimension */}
                          <td className="py-2 px-4 whitespace-nowrap">
                            {item.Dimension && item.Dimension !== 'N/A' && item.Dimension !== '—' ? (
                              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${isDark ? 'bg-amber-950/60 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                {item.Dimension}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">—</span>
                            )}
                          </td>

                          {/* 7. Reason / Purpose */}
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={item.remarks || ''}
                              onChange={e => handleUpdateField(index, 'remarks', e.target.value)}
                              placeholder="Reason / Purpose..."
                              className={`w-full border rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none ${isDark
                                ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]'
                                : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'
                                }`}
                            />
                          </td>

                          {/* 8. Action */}
                          <td className="py-2 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setManifestItems(manifestItems.filter((_, i) => i !== index));
                                showSuccessToast("Item removed.");
                              }}
                              className="text-red-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-rose-500/15 transition-colors cursor-pointer inline-block"
                              title="Remove item from manifest"
                            >
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#ff6600] hover:bg-[#e05a00] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer uppercase shadow-sm"
                >
                  Confirm Supplies {transactionType} Slip
                </button>
              </div>
            )}
          </form>

          {/* ACTIVE BORROW & RESERVED RECORDS TABLE (INSIDE SUPPLIES MOVEMENT & TRANSACTION SLIP CONTAINER) */}
          {activeBorrows.length > 0 && (
            <div className={`pt-6 border-t flex flex-col gap-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>

              {/* Table matched to RACKINGS CONSOLIDATED REGISTRY REPORT UI */}
              <div className={`rounded-xl border shadow-sm overflow-hidden ${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`uppercase text-xs font-bold whitespace-nowrap tracking-wider ${isDark ? 'bg-[#0f111d] text-slate-200 border-b border-slate-800' : 'bg-[#18174e] text-white'
                        }`}>
                        <th className="py-3 px-4 whitespace-nowrap">Slip No</th>
                        <th className="py-3 px-4 whitespace-nowrap">Date & Time</th>
                        <th className="py-3 px-4 whitespace-nowrap">Personnel</th>
                        <th className="py-3 px-4 whitespace-nowrap">Supplies Items</th>
                        <th className="py-3 px-4 whitespace-nowrap">Reason / Purpose</th>
                        <th className="py-3 px-4 whitespace-nowrap text-center">Total Qty</th>
                        <th className="py-3 px-4 whitespace-nowrap text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/60 bg-[#090b10] text-slate-300' : 'divide-slate-100 bg-white text-slate-700'
                      }`}>
                      {paginatedActiveBorrows.map(b => {
                        const totalQty = b.items?.reduce((acc, it) => acc + (it.qty || 0), 0) || 0;
                        const dateFormatted = b.transactionDate ? new Date(b.transactionDate).toLocaleDateString() : '-';

                        return (
                          <tr key={b._id} className={`transition-colors ${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/80'}`}>
                            {/* Slip No */}
                            <td className="px-4 py-3 whitespace-nowrap font-mono font-bold">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs ${isDark ? 'text-[#ff6600]' : 'text-[#18174e]'}`}>{b.slipNo}</span>
                                {b.transactionType === "Reserved" ? (
                                  <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                                    Reserved
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-2 py-0.5 rounded-md font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                    Borrowed
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Date & Time */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-semibold text-xs">{dateFormatted}</div>
                              <div className="text-[10px] font-mono text-slate-400">{b.transactionTime || '—'}</div>
                            </td>

                            {/* Personnel */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className={`flex items-center gap-2 font-semibold text-xs ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-indigo-50 dark:bg-slate-800 text-[#18174e] dark:text-indigo-400 border border-indigo-100 dark:border-slate-700 shrink-0">
                                  {b.partyName ? b.partyName.charAt(0).toUpperCase() : '?'}
                                </span>
                                <span>{b.partyName || 'N/A'}</span>
                              </div>
                            </td>

                            {/* Supplies Items */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSlip(b);
                                  setIsModalOpen(true);
                                }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-xs ${isDark
                                  ? 'bg-[#141622] border-slate-700 text-slate-200 hover:border-[#ff6600] hover:text-[#ff6600]'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#18174e] hover:text-[#18174e] hover:bg-slate-100'
                                  }`}
                                title={`Click to inspect supplies items for ${b.slipNo}`}
                              >
                                <Package className="w-3.5 h-3.5 text-[#ff6600] shrink-0" />
                                <span>{b.items?.length || 0} {b.items?.length === 1 ? 'Item' : 'Items'}</span>
                                <span className={`text-[10px] font-mono font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>({totalQty} pcs)</span>
                              </button>
                            </td>

                            {/* Reason / Purpose */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-md border inline-block ${isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}>
                                {b.purpose || b.originAddress || 'Production'}
                              </span>
                            </td>

                            {/* Total Qty */}
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-md border ${isDark
                                ? 'bg-[#141622] border-slate-700 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                                }`}>
                                {totalQty}
                              </span>
                            </td>

                            {/* Action */}
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {b.transactionType === "Reserved" ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleFastReturnCopy(b);
                                    setQuickReturnSearch('');
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ff6600] hover:bg-[#e05a00] text-white shadow-xs transition-all cursor-pointer hover:shadow-md active:scale-95"
                                  title="Deploy this Reserved Slip into active borrow"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                  <span>Deploy</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleFastReturnCopy(b);
                                    setQuickReturnSearch('');
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer hover:shadow-md active:scale-95"
                                  title="Fulfill return for this borrow slip"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Fulfill Return</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredActiveBorrows.length === 0 && (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400 italic">
                            No matching active borrow or reserved records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  currentPage={activeBorrowsPage}
                  setCurrentPage={setActiveBorrowsPage}
                  rowsPerPage={activeBorrowsRowsPerPage}
                  setRowsPerPage={setActiveBorrowsRowsPerPage}
                  totalRows={filteredActiveBorrows.length}
                />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT CONTAINER (SIDEBAR HISTORY RECENT LOGS) */}
        <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100'} p-4 rounded-2xl border flex flex-col gap-3 shadow-sm h-auto min-h-[400px]`}>
          <div className={`flex flex-col gap-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-2`}>
            <div className={`flex items-center justify-between w-full text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#ff6600]" />
                <span>History Logs</span>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="text-[11px] font-semibold text-[#ff6600] hover:underline cursor-pointer"
                title="View full history logs table"
              >
                View All
              </button>
            </div>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={e => setHistorySearchQuery(e.target.value)}
                placeholder="Search slip or personnel..."
                className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-lg pl-8 pr-2 py-1 text-xs focus:outline-none`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[440px] pr-1 custom-scrollbar">
            {filteredSidebarHistoryLogs.length > 0 ? (
              filteredSidebarHistoryLogs.slice(0, 50).map((rec) => {
                const isBorrow = rec.transactionType === 'Borrow';
                const isReturn = rec.transactionType === 'Return';
                const isRestock = rec.transactionType === 'Restock';
                const isReserved = rec.transactionType === 'Reserved';

                const badgeColor = isBorrow
                  ? (isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-600 border-amber-200')
                  : isReturn
                    ? (isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-600 border-blue-200')
                    : isRestock
                      ? (isDark ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-600 border-emerald-200')
                      : isReserved
                        ? (isDark ? 'bg-purple-950/60 text-purple-300 border-purple-800' : 'bg-purple-50 text-purple-600 border-purple-200')
                        : (isDark ? 'bg-rose-950/60 text-rose-300 border-rose-800' : 'bg-rose-50 text-rose-600 border-rose-200');

                return (
                  <div
                    key={rec._id}
                    onClick={() => { setSelectedSlip(rec); setIsModalOpen(true); }}
                    className={`${isDark ? 'bg-[#141622] border-slate-800 hover:border-[#ff6600]/60 hover:bg-[#181b29]' : 'bg-white border-slate-100 hover:border-[#18174e]/50 hover:shadow-md'} border rounded-xl p-2.5 flex flex-col gap-0.5 transition-all cursor-pointer group`}
                  >
                    <div className={`flex justify-between items-center pb-0.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                      <span className={`text-xs font-black ${isDark ? 'text-[#ff8533] group-hover:text-emerald-400' : 'text-[#18174e] group-hover:text-emerald-600'} truncate max-w-[150px]`}>
                        {rec.slipNo}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded-md border ${badgeColor}`}>
                        {rec.transactionType}
                      </span>
                    </div>
                    <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'} truncate`}>
                      {rec.partyName || rec.purpose || 'N/A'}
                    </span>
                    <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                      <span>{rec.transactionDate ? new Date(rec.transactionDate).toLocaleDateString() : 'No Date'}</span>
                      <span className="font-bold text-slate-400">
                        {rec.items?.length || 0} {rec.items?.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <span className="text-center pt-4 text-rose-500 italic font-medium text-xs">No matching records found.</span>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && selectedSlip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className={`border rounded-2xl w-full max-w-3xl p-6 shadow-2xl relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
            }`}>

            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Transaction No: <span className="font-mono text-[#ff6600]">{selectedSlip.slipNo}</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedSlip)}
                  className="flex items-center gap-1.5 bg-[#ff6600] hover:bg-[#e05a00] text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`p-1 rounded-lg cursor-pointer transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-3 text-sm gap-2.5 p-4 rounded-xl border ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-100'
              }`}>
              <div><span className="font-semibold text-slate-500">Slip ID No:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.slipNo}</span></div>
              <div><span className="font-semibold text-slate-500">Date Logged:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.transactionDate ? new Date(selectedSlip.transactionDate).toLocaleDateString() : '-'}</span></div>
              <div><span className="font-semibold text-slate-500">Movement:</span> <span className="font-bold text-[#ff6600] uppercase">{selectedSlip.transactionType}</span></div>
              <div><span className="font-semibold text-slate-500">Personnel:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.partyName || 'N/A'}</span></div>
              <div><span className="font-semibold text-slate-500">Purpose:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.purpose || selectedSlip.originAddress || 'Production'}</span></div>
              <div><span className="font-semibold text-slate-500">Time:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.transactionTime || '-'}</span></div>
              <div><span className="font-semibold text-slate-500">Prepared By:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.preparedBy || preparedBy}</span></div>
            </div>

            {(() => {
              const slipItems = selectedSlip.items || [];
              const totalItems = slipItems.length;
              const totalPages = Math.ceil(totalItems / modalRowsPerPage) || 1;
              const currentPage = Math.min(modalPage, totalPages);
              const startIndex = (currentPage - 1) * modalRowsPerPage;
              const paginatedItems = slipItems.slice(startIndex, startIndex + modalRowsPerPage);

              return (
                <div className="flex flex-col gap-2">
                  <div className={`border rounded-xl relative shadow-sm overflow-hidden ${isDark ? 'border-slate-800 bg-[#0c0e14]' : 'border-slate-200/60 bg-white'
                    }`}>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className={`text-[11px] font-bold uppercase tracking-wide ${isDark ? 'bg-[#0f111d] text-slate-200' : 'bg-[#18174e] text-white'
                        }`}>
                        <tr>
                          <th className="p-3 whitespace-nowrap">Segment</th>
                          <th className="p-3 min-w-[200px]">Item Description</th>
                          <th className="p-3 whitespace-nowrap">Dimension</th>
                          <th className="p-3 text-center whitespace-nowrap">Qty</th>
                          <th className="p-3 min-w-[140px]">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 bg-[#090b10] text-slate-300' : 'divide-slate-100 bg-white text-slate-700'}`}>
                        {paginatedItems.map((it, idx) => {
                          const segment = it.supplyId?.Segment || it.supplyId?.segment || it.supplyId?.Category || it.supplyId?.category || 'Equipment';
                          const description = it.supplyId?.ItemDescription || '-';
                          const code = it.supplyId?.Code || '';
                          const dimension = it.supplyId?.Dimension || it.supplyId?.Dimensions || it.supplyId?.Model || '—';
                          const qty = `${it.qty} ${it.supplyId?.UOM || 'pcs'}`;
                          const remarks = it.remarks || selectedSlip.purpose || selectedSlip.originAddress || '—';

                          return (
                            <tr key={it._id || idx} className={`transition-colors ${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/50'}`}>
                              <td className="p-3 align-middle whitespace-nowrap font-medium text-slate-400">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                  {segment}
                                </span>
                              </td>
                              <td className="p-3 align-middle">
                                <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'} whitespace-normal break-words`} title={description}>
                                  {description}
                                </div>
                                {code && (
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    ({code})
                                  </div>
                                )}
                              </td>
                              <td className="p-3 align-middle whitespace-nowrap">
                                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${isDark ? 'bg-amber-950/40 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                                  {dimension}
                                </span>
                              </td>
                              <td className="p-3 text-center align-middle font-bold whitespace-nowrap">
                                {qty}
                              </td>
                              <td className="p-3 align-middle italic text-[11px] text-slate-400 whitespace-normal break-words">
                                {remarks}
                              </td>
                            </tr>
                          );
                        })}
                        {slipItems.length === 0 && (
                          <tr>
                            <td colSpan="5" className="p-4 text-center text-slate-500 italic">No materials recorded.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <TablePagination
                    currentPage={modalPage}
                    setCurrentPage={setModalPage}
                    rowsPerPage={modalRowsPerPage}
                    setRowsPerPage={setModalRowsPerPage}
                    totalRows={slipItems.length}
                    options={[5, 10, 20, 50, 100]}
                  />
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
                        <td className="py-2 px-3 font-semibold min-w-[180px] whitespace-normal break-words" title={item.ItemDescription}>
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
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
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
                            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border whitespace-nowrap ${isDark ? 'bg-amber-950/60 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'
                              }`}>
                              {dimension}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
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
                                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${isDark ? 'bg-amber-950/60 border-amber-800 text-amber-400 hover:bg-amber-900/60' : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
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

      {/* HISTORY LOGS MODAL */}
      {isHistoryModalOpen && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/75' : 'bg-slate-900/45'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} border rounded-2xl w-full max-w-5xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col gap-4 overflow-hidden`}>

            {/* Modal Header */}
            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-[#ff6600]">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base sm:text-lg`}>
                    Supplies Movement History Logs
                  </h3>
                  <p className="text-xs text-slate-400">
                    Total of {movementRecords.length} recorded transactions across all categories
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                {['All', 'Borrow', 'Return', 'Reserved', 'Out', 'Restock', 'Scrap', 'Repair'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setHistoryFilterType(t)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${historyFilterType === t
                      ? (isDark ? 'bg-[#ff6600] text-white' : 'bg-[#18174e] text-white')
                      : (isDark ? 'bg-[#141622] text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={historySearchQuery}
                  onChange={e => setHistorySearchQuery(e.target.value)}
                  placeholder="Search Slip, Personnel, Item..."
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-800'} border rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#ff6600]`}
                />
              </div>
            </div>

            {/* History Table */}
            <div className={`rounded-xl border shadow-sm flex flex-col flex-1 overflow-hidden min-h-0 ${isDark ? 'border-slate-800 bg-[#0c0e14]' : 'border-slate-100 bg-white'}`}>
              <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[460px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#0f111d] text-slate-200 border-b border-slate-800' : 'bg-[#18174e] text-white'} font-bold uppercase text-[11px] whitespace-nowrap`}>
                    <tr>
                      <th className="py-2.5 px-3">Slip No</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Personnel</th>
                      <th className="py-2.5 px-3">Purpose / Reason</th>
                      <th className="py-2.5 px-3">Items Summary</th>
                      <th className="py-2.5 px-3 text-center">Total Qty</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/80 bg-[#090b10]' : 'divide-slate-100 bg-white'}`}>
                    {isLoading ? (
                      <tr>
                        <td colSpan="8" className="py-10 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-[#ff6600]" />
                            <span>Loading history logs...</span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedHistoryLogs.length > 0 ? (
                      paginatedHistoryLogs.map((rec) => {
                        const totalQty = rec.items?.reduce((sum, it) => sum + (it.qty || 0), 0) || 0;
                        const itemsSummary = rec.items?.map(it => `${it.supplyId?.ItemDescription || 'Item'} x${it.qty}`).join(', ') || 'N/A';
                        const dateStr = rec.transactionDate ? new Date(rec.transactionDate).toLocaleDateString() : '-';

                        return (
                          <tr key={rec._id} className={`${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-700'} transition-colors`}>
                            <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap text-[#ff6600]">
                              {rec.slipNo}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`text-[10px] px-2 py-0.5 font-bold rounded-md uppercase ${rec.transactionType === 'Borrow' ? (isDark ? 'bg-amber-950/60 text-amber-400 border border-amber-800' : 'bg-amber-50 text-amber-600 border border-amber-200') :
                                rec.transactionType === 'Return' ? (isDark ? 'bg-blue-950/60 text-blue-400 border border-blue-800' : 'bg-blue-50 text-blue-600 border border-blue-200') :
                                  rec.transactionType === 'Reserved' ? (isDark ? 'bg-purple-950/60 text-purple-400 border border-purple-800' : 'bg-purple-50 text-purple-600 border border-purple-200') :
                                    rec.transactionType === 'Out' ? (isDark ? 'bg-rose-950/60 text-rose-400 border border-rose-800' : 'bg-rose-50 text-rose-600 border border-rose-200') :
                                      rec.transactionType === 'Scrap' ? (isDark ? 'bg-red-950/60 text-red-400 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200') :
                                        rec.transactionType === 'Repair' ? (isDark ? 'bg-teal-950/60 text-teal-400 border border-teal-800' : 'bg-teal-50 text-teal-600 border border-teal-200') :
                                          (isDark ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800' : 'bg-emerald-50 text-emerald-600 border border-emerald-200')
                                }`}>
                                {rec.transactionType}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <div>{dateStr}</div>
                              {rec.transactionTime && <div className="text-[10px] text-slate-400 font-mono">{rec.transactionTime}</div>}
                            </td>
                            <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                              {rec.partyName || 'N/A'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="text-[11px] font-medium">{rec.purpose || rec.originAddress || 'Production'}</span>
                            </td>
                            <td className="py-2.5 px-3 min-w-[200px] whitespace-normal break-words" title={itemsSummary}>
                              {itemsSummary}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold whitespace-nowrap">
                              {totalQty}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSlip(rec);
                                    setIsModalOpen(true);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                                    }`}
                                >
                                  View Slip
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDownloadPDF(rec);
                                  }}
                                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-2xs ${isDark
                                    ? 'bg-rose-950/40 text-rose-300 border-rose-800/80 hover:bg-rose-900/60 hover:text-white'
                                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:text-rose-800'
                                    }`}
                                  title={`Download PDF for ${rec.slipNo}`}
                                >
                                  <Download className="w-3.5 h-3.5 text-rose-500" />
                                  <span>PDF</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="8" className="py-10 text-center text-slate-400 italic">
                          No history logs found matching your search or filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <TablePagination
                currentPage={historyPage}
                setCurrentPage={setHistoryPage}
                rowsPerPage={historyRowsPerPage}
                setRowsPerPage={setHistoryRowsPerPage}
                totalRows={filteredHistoryLogs.length}
              />
            </div>

            {/* Modal Footer */}
            <div className={`flex items-center justify-between pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="text-xs text-slate-400">
                Showing {filteredHistoryLogs.length} of {movementRecords.length} records
              </span>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-xl text-sm transition-colors cursor-pointer`}
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
