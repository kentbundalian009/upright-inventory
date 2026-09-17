import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ListPlus,
  Search,
  X,
  Download,
  User,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  Calendar,
  Clock,
  Trash2,
  FileText,
  ClipboardList,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  FileSpreadsheet
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from './PageHeader';
import TablePagination from './TablePagination';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = '/api';
const CONSUMABLES_URL = `${API_BASE_URL}/consumables`;
const TRANSACTIONS_URL = `${API_BASE_URL}/consumables/transactions`;

const getTodayDateString = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - offset * 60 * 1000);
  return localToday.toISOString().split('T')[0];
};

const getCurrentTimeString = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = hours.toString().padStart(2, '0');
  return `${strHours}:${minutes} ${ampm}`;
};

function Consumable() {
  const { isDark } = useTheme();

  // Data states
  const [consumables, setConsumables] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('All Segments');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Modals
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);
  const [browseSearchQuery, setBrowseSearchQuery] = useState('');
  const [browseSegmentFilter, setBrowseSegmentFilter] = useState('All Segments');

  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalRowsPerPage, setModalRowsPerPage] = useState(10);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setModalPage(1);
  }, [selectedTransaction, isDetailModalOpen]);

  // Transaction Form States
  const [transactionType, setTransactionType] = useState('OUT'); // 'OUT' is default
  const [transactorName, setTransactorName] = useState('');
  const [preparedBy, setPreparedBy] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.Fullname || parsed.fullname || parsed.name || parsed.username || 'System User';
      }
      return localStorage.getItem('Fullname') || 'System User';
    } catch {
      return localStorage.getItem('Fullname') || 'System User';
    }
  });
  const [isCustomName, setIsCustomName] = useState(false);
  const [registeredEmployees, setRegisteredEmployees] = useState([]);
  const [isPersonnelDropdownOpen, setIsPersonnelDropdownOpen] = useState(false);
  const personnelDropdownRef = useRef(null);

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

  // Filtered employees based on what user types
  const filteredEmployees = useMemo(() => {
    if (!transactorName || !transactorName.trim()) {
      return registeredEmployees;
    }
    const query = transactorName.toLowerCase().trim();
    return registeredEmployees.filter(
      (emp) =>
        emp.name?.toLowerCase().includes(query) ||
        emp.contactPerson?.toLowerCase().includes(query) ||
        emp.address?.toLowerCase().includes(query)
    );
  }, [registeredEmployees, transactorName]);
  const [transactionDate, setTransactionDate] = useState(getTodayDateString());
  const [transactionTime, setTransactionTime] = useState(getCurrentTimeString());
  const [manifestItems, setManifestItems] = useState([]);

  // New Item Form States
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemSegment, setNewItemSegment] = useState('');
  const [newItemDimension, setNewItemDimension] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemBrand, setNewItemBrand] = useState('');
  const [newItemSerialNo, setNewItemSerialNo] = useState('');
  const [newItemActualCount, setNewItemActualCount] = useState(0);
  const [newItemDamaged, setNewItemDamaged] = useState(0);
  const [newItemUOM, setNewItemUOM] = useState('pcs');

  // Custom Toast Helpers
  const showSuccessToast = (message) => {
    toast.custom((t) => (
      <div
        className={`flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 ${t.visible ? 'animate-in fade-in slide-in-from-top-4' : 'animate-out fade-out slide-out-to-top-4'
          }`}
      >
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
      <div
        className={`flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 ${t.visible ? 'animate-in fade-in slide-in-from-top-4' : 'animate-out fade-out slide-out-to-top-4'
          }`}
      >
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
        <span className="text-sm font-semibold">{message}</span>
        <button onClick={() => toast.dismiss(t.id)} className="text-rose-400 hover:text-rose-600 ml-2 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
    ));
  };

  // Auth Header
  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const config = getAuthConfig();
      const [itemsRes, txRes, employeesRes] = await Promise.all([
        axios.get(CONSUMABLES_URL, config).catch(() => ({ data: [] })),
        axios.get(TRANSACTIONS_URL, config).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/clients?type=Employee`, config).catch(() => ({ data: [] }))
      ]);

      setConsumables(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
      setRegisteredEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
    } catch (err) {
      console.error('Error fetching consumable data:', err);
      showErrorToast('Failed to load consumables data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const fullName = parsedUser.Fullname || parsedUser.fullname || parsedUser.name || parsedUser.username || 'System User';
        setPreparedBy(fullName);
      } catch (e) {
        console.error('Error parsing user session:', e);
      }
    } else if (localStorage.getItem('Fullname')) {
      setPreparedBy(localStorage.getItem('Fullname'));
    }
  }, []);

  // Unique segments for filter
  const uniqueSegments = useMemo(() => {
    return Array.from(
      new Set(
        consumables
          .map((item) => item.Segment)
          .filter(Boolean)
          .map((s) => s.trim())
      )
    ).sort();
  }, [consumables]);

  // Unique lists for autocomplete datalists
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(consumables.map((item) => item.Category).filter(Boolean))).sort();
  }, [consumables]);

  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(consumables.map((item) => item.Brand).filter(Boolean))).sort();
  }, [consumables]);

  const uniqueUOMs = useMemo(() => {
    return Array.from(new Set(consumables.map((item) => item.UOM).filter(Boolean))).sort();
  }, [consumables]);

  // Filtered suggestions for autocomplete dropdown
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();

    return consumables.filter((item) => {
      const matchSegment =
        selectedSegment === 'All Segments' ||
        (item.Segment && item.Segment.toLowerCase() === selectedSegment.toLowerCase());

      const desc = (item.ItemDescription || '').toLowerCase();
      const dim = (item.Dimension || '').toLowerCase();
      const code = (item.Code || '').toLowerCase();
      const brand = (item.Brand || '').toLowerCase();
      const cat = (item.Category || '').toLowerCase();

      const matchQuery =
        desc.includes(q) || dim.includes(q) || code.includes(q) || brand.includes(q) || cat.includes(q);

      return matchSegment && matchQuery;
    });
  }, [consumables, searchQuery, selectedSegment]);

  // Filtered items for Browse Table modal
  const browseFilteredMaterials = useMemo(() => {
    return consumables.filter((item) => {
      const matchSegment =
        browseSegmentFilter === 'All Segments' ||
        (item.Segment && item.Segment.toLowerCase() === browseSegmentFilter.toLowerCase());

      if (!browseSearchQuery.trim()) return matchSegment;

      const q = browseSearchQuery.toLowerCase().trim();
      const desc = (item.ItemDescription || '').toLowerCase();
      const dim = (item.Dimension || '').toLowerCase();
      const code = (item.Code || '').toLowerCase();
      const cat = (item.Category || '').toLowerCase();
      const brand = (item.Brand || '').toLowerCase();
      const serial = (item.SerialNo || '').toLowerCase();

      const matchQuery =
        desc.includes(q) ||
        dim.includes(q) ||
        code.includes(q) ||
        cat.includes(q) ||
        brand.includes(q) ||
        serial.includes(q);

      return matchSegment && matchQuery;
    });
  }, [consumables, browseSearchQuery, browseSegmentFilter]);

  // Filtered transactions for History sidebar
  const filteredTransactions = useMemo(() => {
    if (!historySearchQuery.trim()) return transactions;
    const q = historySearchQuery.toLowerCase().trim();
    return transactions.filter((tx) => {
      const no = (tx.transactionNo || '').toLowerCase();
      const name = (tx.name || '').toLowerCase();
      const type = (tx.transactionType || '').toLowerCase();
      return no.includes(q) || name.includes(q) || type.includes(q);
    });
  }, [transactions, historySearchQuery]);

  // Add item to manifest
  const handleSelectConsumable = (item) => {
    if (manifestItems.some((i) => i.consumableId === item._id)) {
      showErrorToast(`${item.ItemDescription} is already in the list.`);
      setSearchQuery('');
      return;
    }

    if (transactionType === 'OUT' && (item.ActualCount || 0) <= 0) {
      showErrorToast(`Cannot deduct: "${item.ItemDescription}" has 0 available stock.`);
      setSearchQuery('');
      return;
    }

    const newItem = {
      consumableId: item._id,
      Code: item.Code,
      ItemDescription: item.ItemDescription,
      Segment: item.Segment || '—',
      Dimension: item.Dimension || '—',
      Category: item.Category || 'Consumables',
      Brand: item.Brand || '—',
      SerialNo: item.SerialNo || '—',
      ActualCount: item.ActualCount || 0,
      Damaged: item.Damaged || 0,
      UOM: item.UOM || 'pcs',
      qty: 1,
      remarks: ''
    };

    setManifestItems([...manifestItems, newItem]);
    setSearchQuery('');
    showSuccessToast(`Added "${item.ItemDescription}" to manifest.`);
  };

  // Update item field in manifest
  const handleUpdateManifestField = (index, field, value) => {
    const updated = [...manifestItems];
    if (field === 'qty') {
      const num = Number(value);
      if (transactionType === 'OUT' && num > updated[index].ActualCount) {
        showErrorToast(
          `Cannot exceed available stock of ${updated[index].ActualCount} ${updated[index].UOM} for ${updated[index].ItemDescription}.`
        );
        updated[index].qty = updated[index].ActualCount;
      } else {
        updated[index].qty = Math.max(1, num || 1);
      }
    } else {
      updated[index][field] = value;
    }
    setManifestItems(updated);
  };

  // Remove item from manifest
  const handleRemoveManifestItem = (index) => {
    setManifestItems(manifestItems.filter((_, i) => i !== index));
  };

  const handleInitiateConfirm = (e) => {
    e.preventDefault();

    if (transactionType === 'OUT' && !transactorName.trim()) {
      showErrorToast('Please select or enter the Personnel Name.');
      return;
    }

    if (transactionType === 'IN' && !preparedBy.trim()) {
      showErrorToast('Prepared Name is missing from session.');
      return;
    }

    if (manifestItems.length === 0) {
      showErrorToast('Please add at least one material to the table before confirming.');
      return;
    }

    // Validate OUT limits
    if (transactionType === 'OUT') {
      for (const item of manifestItems) {
        if (item.qty > item.ActualCount) {
          showErrorToast(
            `Quantity for "${item.ItemDescription}" exceeds available stock (${item.ActualCount} ${item.UOM}).`
          );
          return;
        }
      }
    }

    setIsConfirmModalOpen(true);
  };

  // Final submit transaction
  const handleConfirmSubmit = async () => {
    try {
      setIsSaving(true);
      const config = getAuthConfig();
      const finalName =
        transactionType === 'IN'
          ? (preparedBy.trim() || 'System User')
          : (transactorName.trim() || 'Personnel Stock Release');

      const payload = {
        transactionType,
        name: finalName,
        date: transactionDate || getTodayDateString(),
        time: transactionTime || getCurrentTimeString(),
        items: manifestItems.map((item) => ({
          consumableId: item.consumableId,
          Code: item.Code,
          ItemDescription: item.ItemDescription,
          Segment: item.Segment,
          Dimension: item.Dimension,
          Category: item.Category,
          Brand: item.Brand,
          SerialNo: item.SerialNo,
          UOM: item.UOM,
          qty: Number(item.qty),
          remarks: item.remarks || ''
        }))
      };

      const res = await axios.post(TRANSACTIONS_URL, payload, config);

      showSuccessToast(
        `Successfully logged Stock ${transactionType}! Ref: ${res.data?.transactionNo || 'Generated'}`
      );

      // Reset form
      setManifestItems([]);
      setTransactionTime(getCurrentTimeString());
      setIsConfirmModalOpen(false);

      // Refresh list
      await fetchData();
    } catch (err) {
      console.error('Transaction creation error:', err);
      const msg = err.response?.data?.message || 'Failed to submit transaction.';
      showErrorToast(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Create new consumable item
  const handleCreateNewItem = async (e) => {
    e.preventDefault();

    if (!newItemDesc.trim()) {
      showErrorToast('Item Description is required.');
      return;
    }

    try {
      const config = getAuthConfig();
      const payload = {
        ItemDescription: newItemDesc.trim(),
        Segment: newItemSegment.trim() || 'Consumables',
        Dimension: newItemDimension.trim() || '—',
        Category: newItemCategory.trim() || 'Consumables',
        Brand: newItemBrand.trim() || '—',
        SerialNo: newItemSerialNo.trim() || '—',
        ActualCount: Number(newItemActualCount) || 0,
        Damaged: Number(newItemDamaged) || 0,
        UOM: newItemUOM.trim() || 'pcs'
      };

      const res = await axios.post(CONSUMABLES_URL, payload, config);
      showSuccessToast(`Created new consumable: ${res.data.ItemDescription}`);

      // Reset new item form
      setNewItemDesc('');
      setNewItemSegment('');
      setNewItemDimension('');
      setNewItemCategory('');
      setNewItemBrand('');
      setNewItemSerialNo('');
      setNewItemActualCount(0);
      setNewItemDamaged(0);
      setNewItemUOM('pcs');
      setIsNewItemModalOpen(false);

      // Refresh consumables
      await fetchData();

      // Automatically add to manifest
      if (res.data && res.data._id) {
        handleSelectConsumable(res.data);
      }
    } catch (err) {
      console.error('Error creating consumable:', err);
      showErrorToast(err.response?.data?.message || 'Failed to create consumable item.');
    }
  };

  // Generate & Download PDF
  // --- AUDIT LEDGER STYLED PDF EXPORT (INDIVIDUAL SLIP) ---
  const handleDownloadPDF = (txRecord = null) => {
    const tx = txRecord || selectedTransaction;
    if (!tx) return;
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

      const txDateStr = tx.date || (tx.transactionDate ? new Date(tx.transactionDate).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      }) : (tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      }) : '—'));

      // --- PAGE 1 METADATA BLOCK (Matching Audit Ledger layout) ---
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);

      doc.text("Slip / Tx No.:", 14, 38);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(24, 23, 78);
      doc.text(`${tx.transactionNo || '—'}`, 48, 38);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Date Generated:", 185, 38);
      doc.setFont("helvetica", "normal");
      doc.text(`${formattedDate}`, 220, 38);

      doc.setFont("helvetica", "bold");
      doc.text("Action Type:", 14, 45);
      doc.setFont("helvetica", "bold");
      if (tx.transactionType === 'IN') {
        doc.setTextColor(16, 185, 129);
        doc.text("STOCK IN (INVENTORY ADDITION)", 48, 45);
      } else {
        doc.setTextColor(225, 29, 72);
        doc.text("STOCK OUT (PERSONNEL RELEASE)", 48, 45);
      }

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Date Logged:", 185, 45);
      doc.setFont("helvetica", "normal");
      doc.text(`${txDateStr}${tx.time ? ` (${tx.time})` : ''}`, 220, 45);

      doc.setFont("helvetica", "bold");
      doc.text(tx.transactionType === 'IN' ? "Prepared By:" : "Personnel Name:", 14, 52);
      doc.setFont("helvetica", "normal");
      doc.text(`${tx.transactorName || tx.name || tx.preparedBy || 'Authorized Staff'}`, 48, 52);

      doc.setFont("helvetica", "bold");
      doc.text("Log Status:", 185, 52);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(16, 185, 129);
      doc.text("VERIFIED & RECORDED", 220, 52);

      // Compute totals
      const itemsList = tx.items || [];
      const totalItemsCount = itemsList.length;
      const totalUnits = itemsList.reduce((acc, it) => acc + (Number(it.qty) || 0), 0);

      // KPI Header Table
      autoTable(doc, {
        startY: 58,
        margin: { top: 38, bottom: 20, left: 14, right: 14 },
        head: [["1. TOTAL LINE ITEMS", "2. TOTAL UNITS PROCESSED", "3. TRANSACTION CLASSIFICATION", "4. AUDIT COMPLIANCE"]],
        body: [[
          `${totalItemsCount} Consumables`,
          `${totalUnits.toLocaleString()} Units`,
          `STOCK ${tx.transactionType?.toUpperCase()} OPERATION`,
          "VERIFIED & RECORDED"
        ]],
        theme: 'grid',
        headStyles: {
          fillColor: tx.transactionType === 'IN' ? [16, 185, 129] : [24, 23, 78],
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

      // Group records by Category (matching Consolidated Registry Report)
      const groupedData = {};
      itemsList.forEach(it => {
        const cat = it.Category || it.consumableId?.Category || it.Segment || 'CONSUMABLES & PPE';
        const key = cat.trim().toUpperCase() || 'CONSUMABLES & PPE';
        if (!groupedData[key]) {
          groupedData[key] = [];
        }
        groupedData[key].push(it);
      });

      const tableRows = [];
      Object.keys(groupedData).sort().forEach(groupName => {
        const itemsInGroup = groupedData[groupName];

        // Section Header Banner across all 5 columns
        tableRows.push([
          {
            content: `CATEGORY: ${groupName}   (${itemsInGroup.length} ${itemsInGroup.length === 1 ? 'ITEM' : 'ITEMS'})`,
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

        itemsInGroup.forEach(it => {
          const desc = it.ItemDescription || it.consumableId?.ItemDescription || '—';
          const dim = it.Dimension || it.consumableId?.Dimension || '—';
          const countVal = String(it.qty || 1);
          const uom = it.UOM || it.consumableId?.UOM || 'pcs';
          const rem = it.remarks || (it.Brand ? `Brand: ${it.Brand}` : '—');

          tableRows.push([desc, dim, countVal, uom, rem]);
        });
      });

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 6,
        margin: { top: 38, bottom: 20, left: 14, right: 14 },
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: tx.transactionType === 'IN' ? [16, 185, 129] : [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, valign: 'middle' },
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
            if (tx.transactionType === 'IN') {
              doc.setFillColor(240, 253, 244);
              doc.rect(data.cell.x + 0.3, data.cell.y + 0.3, data.cell.width - 0.6, data.cell.height - 0.6, 'F');
              doc.setTextColor(16, 185, 129);
            } else {
              doc.setFillColor(238, 242, 255);
              doc.rect(data.cell.x + 0.3, data.cell.y + 0.3, data.cell.width - 0.6, data.cell.height - 0.6, 'F');
              doc.setTextColor(24, 23, 78);
            }
            doc.setFont("helvetica", "bold");
            doc.text(String(data.cell.text), data.cell.x + (data.cell.width / 2), data.cell.y + (data.cell.height / 2) + 1, { align: 'center' });
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
        } catch (e) {
          console.warn("Watermark asset omitted.", e);
        }

        // Top Header Banner
        doc.setFillColor(24, 23, 78);
        doc.rect(0, 0, pageWidth, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(`CONSUMABLE & PPE TRANSACTION AUDIT LEDGER SLIP (${tx.transactionType})`, centerX, 12, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(215, 220, 245);
        doc.text(`Operations Supplies & Consumables Control Registry  |  Slip: ${tx.transactionNo}  |  Generated: ${formattedDate}`, centerX, 20, { align: 'center' });

        // Footer
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text("CONFIDENTIAL AUDIT LEDGER - FOR INTERNAL AUTHORIZED USE ONLY", 14, pageHeight - 8);

        const pageNumber = `Page ${i} of ${totalPages}`;
        doc.text(pageNumber, pageWidth - 14, pageHeight - 8, { align: 'right' });
      }

      doc.save(`CONSUMABLE_SLIP_${tx.transactionNo || 'Record'}.pdf`);
      showSuccessToast("Audit Ledger PDF Slip downloaded successfully.");
    } catch (e) {
      console.error("PDF download failure:", e);
      showErrorToast("Something went wrong while downloading the PDF.");
    }
  };

  // --- CONSOLIDATED HISTORY LOGS AUDIT LEDGER PDF ---
  const handleExportHistoryLedgerPDF = () => {
    const recordsToExport = filteredTransactions && filteredTransactions.length > 0 ? filteredTransactions : transactions;
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
      doc.text("Consumable Materials & PPE Transaction Registry", 48, 38);

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
      doc.text(`${recordsToExport.length} Recorded Movements`, 220, 45);

      if (historySearchQuery.trim()) {
        doc.setFont("helvetica", "bold");
        doc.text("Filter Applied:", 14, 52);
        doc.setFont("helvetica", "normal");
        doc.text(`Search Keyword: "${historySearchQuery}"`, 48, 52);
      }

      // Compute KPI summary
      let totalUnitsProcessed = 0;
      let totalStockIn = 0;
      let totalStockOut = 0;

      recordsToExport.forEach(rec => {
        const items = rec.items || [];
        items.forEach(it => {
          const qty = Number(it.qty || 0);
          totalUnitsProcessed += qty;
          if (rec.transactionType === 'IN') totalStockIn += qty;
          else totalStockOut += qty;
        });
      });

      const kpiStartY = historySearchQuery.trim() ? 58 : 52;
      autoTable(doc, {
        startY: kpiStartY,
        margin: { top: 38, bottom: 20, left: 14, right: 14 },
        head: [["1. TOTAL TRANSACTIONS LOGGED", "2. STOCK INFLOW (ADDITIONS)", "3. STOCK OUTFLOW (DISPATCHED)", "4. NET INVENTORY IMPACT"]],
        body: [[
          `${recordsToExport.length} Transactions`,
          `+${totalStockIn.toLocaleString()} Units In`,
          `-${totalStockOut.toLocaleString()} Units Out`,
          `${(totalStockIn - totalStockOut) >= 0 ? '+' : ''}${(totalStockIn - totalStockOut).toLocaleString()} Units Net`
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

      const tableColumns = ["#", "Slip No", "Type", "Date & Time", "Personnel / Origin", "Items Summary", "Total Units", "Status"];
      const tableRows = recordsToExport.map((rec, idx) => {
        const items = rec.items || [];
        const dateStr = rec.date || (rec.transactionDate ? new Date(rec.transactionDate).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric'
        }) : '-');

        const totalQty = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);

        const itemsSummary = items.map(it => {
          const desc = it.ItemDescription || it.consumableId?.ItemDescription || "Item";
          const qty = Number(it.qty || 0);
          const uom = it.UOM || it.consumableId?.UOM || 'pcs';
          return `• ${desc}: ${qty} ${uom}`.trim();
        }).slice(0, 3).join('\n') + (items.length > 3 ? `\n… (+${items.length - 3} more)` : '');

        return [
          String(idx + 1),
          rec.transactionNo || '—',
          `STOCK ${rec.transactionType?.toUpperCase() || 'TX'}`,
          `${dateStr}${rec.time ? ` ${rec.time}` : ''}`,
          rec.transactorName || rec.name || rec.preparedBy || 'Staff',
          itemsSummary || '—',
          `${totalQty.toLocaleString()} units`,
          "VERIFIED"
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
          2: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
          3: { cellWidth: 30 },
          4: { cellWidth: 40 },
          5: { cellWidth: 78 },
          6: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
          7: { cellWidth: 25, halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] }
        },
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 6) {
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

        doc.setFillColor(24, 23, 78);
        doc.rect(0, 0, pageWidth, 28, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text("CONSUMABLES & PPE TRANSACTION AUDIT LEDGER", centerX, 12, { align: 'center' });

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(215, 220, 245);
        doc.text(`Operations Supplies & Consumables Control Registry  |  Total: ${recordsToExport.length} Logged Entries  |  Generated: ${formattedDate}`, centerX, 20, { align: 'center' });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text("CONFIDENTIAL AUDIT LEDGER - FOR INTERNAL AUTHORIZED USE ONLY", 14, pageHeight - 8);

        const pageNumber = `Page ${i} of ${totalPages}`;
        doc.text(pageNumber, pageWidth - 14, pageHeight - 8, { align: 'right' });
      }

      doc.save(`CONSUMABLES_HISTORY_AUDIT_LEDGER_${new Date().toISOString().split('T')[0]}.pdf`);
      showSuccessToast("Consolidated Consumables Audit Ledger (PDF) exported successfully!");
    } catch (e) {
      console.error("Critical failure exporting History Ledger PDF:", e);
      showErrorToast("Failed to export History Ledger PDF: " + e.message);
    }
  };

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
        <PageHeader activeTab="consumables" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* LEFT COLUMN: MAIN WORKFLOW FORM */}
        <div
          className={`lg:col-span-3 ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100'
            } p-6 rounded-2xl border flex flex-col gap-6 shadow-sm`}
        >
          {/* Top Card Header: Title on left, Browse Table & New Item on right (sa taas ng transaction) */}
          <div
            className={`border-b ${isDark ? 'border-slate-800 text-slate-200' : 'border-slate-100 text-slate-600'
              } pb-3 flex flex-wrap items-center justify-between gap-3`}
          >
            <div className="flex items-center gap-2 text-sm font-bold">
              <ListPlus className="w-4 h-4 text-[#ff6600]" />
              <span>Consumable Materials Management</span>
            </div>

            {/* BUTTONS: Browse Table & New Item */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBrowseModalOpen(true)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-sm ${isDark
                  ? 'bg-[#141622] border-slate-700 text-indigo-400 hover:bg-indigo-950/60'
                  : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-50'
                  }`}
                title="Browse all consumables masterlist"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Browse Table</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNewItemModalOpen(true)}
                className="flex items-center gap-1.5 bg-[#ff6600] hover:bg-[#e05a00] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Item</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleInitiateConfirm} className="flex flex-col gap-4">
            {/* COMPACT TRANSACTION TYPE CONTAINER (Same UI as Outbound / Raw Materials) */}
            <div
              className={`px-3.5 py-2 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 overflow-x-auto ${isDark ? 'bg-[#141622]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
            >
              <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
                <span className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Transaction Type:
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${transactionType === 'OUT'
                    ? isDark
                      ? 'bg-rose-950/60 text-rose-400 border-rose-800'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                    : isDark
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                >
                  {transactionType === 'OUT' ? '🔴 OUT (Stock Deduction)' : '🟢 IN (Stock Addition)'}
                </span>
              </div>

              {/* ACTION TOGGLE BUTTONS */}
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0 flex-nowrap shrink-0">

                <button
                  type="button"
                  onClick={() => setTransactionType('OUT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${transactionType === 'OUT'
                    ? isDark
                      ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                      : 'bg-red-600 text-white border-red-700 shadow-xs'
                    : isDark
                      ? 'bg-[#0e1017] text-slate-400 border-slate-700 hover:bg-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  🔴 OUT
                </button>
                <button
                  type="button"
                  onClick={() => setTransactionType('IN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${transactionType === 'IN'
                    ? isDark
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                      : 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : isDark
                      ? 'bg-[#0e1017] text-slate-400 border-slate-700 hover:bg-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  🟢 IN
                </button>


              </div>
            </div>


            {/* PERSONNEL NAME / PREPARED NAME (TYPE + DROPDOWN) */}
            <div ref={personnelDropdownRef} className="relative">
              <div className="flex items-center justify-between mb-1.5">
                <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase`}>
                  {transactionType === 'IN' ? 'Prepared Name *' : 'Personnel Name *'}
                </label>
                {transactionType === 'OUT' && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    Type or pick from dropdown
                  </span>
                )}
              </div>

              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 z-10" />

                {transactionType === 'IN' ? (
                  <input
                    type="text"
                    readOnly
                    value={preparedBy}
                    className={`w-full ${isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                      } border rounded-lg pl-9 pr-3 py-2 text-sm font-semibold select-none cursor-not-allowed focus:outline-none`}
                  />
                ) : (
                  <>
                    <input
                      type="text"
                      required
                      value={transactorName}
                      onChange={(e) => {
                        setTransactorName(e.target.value);
                        setIsPersonnelDropdownOpen(true);
                      }}
                      onFocus={() => setIsPersonnelDropdownOpen(true)}
                      placeholder="Type or select personnel / worker name..."
                      className={`w-full ${isDark
                        ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]'
                        : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'
                        } border rounded-lg pl-9 pr-16 py-2 text-sm focus:outline-none font-semibold transition-all`}
                    />

                    <div className="absolute right-2 top-2 flex items-center gap-1 z-10">
                      {transactorName && (
                        <button
                          type="button"
                          onClick={() => {
                            setTransactorName('');
                            setIsPersonnelDropdownOpen(true);
                          }}
                          title="Clear name"
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

                    {/* FLOATING TYPE+DROPDOWN MENU */}
                    {isPersonnelDropdownOpen && (
                      <div
                        className={`absolute left-0 right-0 top-[102%] mt-1 ${isDark
                          ? 'bg-[#0e1017] border-slate-700 divide-slate-800/80 shadow-2xl'
                          : 'bg-white border-slate-200 divide-slate-100 shadow-xl'
                          } border rounded-xl max-h-60 overflow-y-auto z-50 divide-y p-1`}
                      >
                        {filteredEmployees.length > 0 ? (
                          filteredEmployees.map((emp) => (
                            <button
                              key={emp._id}
                              type="button"
                              onClick={() => {
                                setTransactorName(emp.name);
                                setIsPersonnelDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between gap-2 rounded-lg transition-colors cursor-pointer ${transactorName === emp.name
                                ? isDark
                                  ? 'bg-[#ff6600]/20 text-[#ff6600]'
                                  : 'bg-indigo-50 text-[#18174e]'
                                : isDark
                                  ? 'text-slate-200 hover:bg-slate-800'
                                  : 'text-slate-700 hover:bg-slate-50'
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
                              {transactorName === emp.name && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center text-xs text-slate-400">
                            No registered personnel matches "{transactorName}".
                          </div>
                        )}

                        {transactorName && !registeredEmployees.some((e) => e.name?.toLowerCase() === transactorName.toLowerCase()) && (
                          <button
                            type="button"
                            onClick={() => setIsPersonnelDropdownOpen(false)}
                            className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 rounded-lg ${isDark ? 'bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              } transition-colors cursor-pointer`}
                          >
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span>Use custom typed name: <strong>"{transactorName}"</strong></span>
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>




            {/* STEP 2: TYPE / SELECT MATERIALS FOR STOCK ADDITION / DEDUCTION */}
            <div
              className={`${isDark ? 'bg-[#141622]/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                } p-4 rounded-xl border flex flex-col gap-2.5 relative`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label
                    className={`block text-xs sm:text-sm font-bold uppercase leading-snug ${transactionType === 'IN'
                      ? isDark
                        ? 'text-emerald-400'
                        : 'text-emerald-800'
                      : isDark
                        ? 'text-rose-400'
                        : 'text-rose-800'
                      }`}
                  >
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
                    value={selectedSegment}
                    onChange={(e) => setSelectedSegment(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      } border rounded-lg px-3 py-2 text-sm focus:outline-none font-semibold cursor-pointer`}
                  >
                    <option value="All Segments">All Segments ({uniqueSegments.length})</option>
                    {uniqueSegments.map((seg) => (
                      <option key={seg} value={seg}>
                        {seg}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. SMART MULTI-ATTRIBUTE SEARCH */}
                <div className="sm:col-span-2 relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search description, dimension (e.g. 2700, 50x50), or code..."
                    className={`w-full ${isDark
                      ? 'bg-[#0e1017] border-slate-700 text-white placeholder:text-slate-500'
                      : 'bg-white border-slate-200 text-slate-800'
                      } border rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none`}
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
                <div
                  className={`absolute left-0 right-0 top-[102%] ${isDark
                    ? 'bg-[#0e1017] border-slate-700 divide-slate-800 shadow-2xl'
                    : 'bg-white border-slate-200 divide-slate-100 shadow-xl'
                    } border rounded-xl max-h-72 overflow-y-auto z-50 divide-y p-1`}
                >
                  {filteredSuggestions.length > 0 ? (
                    filteredSuggestions.map((item) => {
                      const dimension = item.Dimension || item.Dimensions || item.dimension;
                      const segment = item.Segment || item.segment;
                      const count = item.ActualCount || item.actualCount || 0;
                      const isAdded = manifestItems.some((i) => i.consumableId === item._id);

                      return (
                        <div
                          key={item._id}
                          onClick={() => {
                            handleSelectConsumable(item);
                            setSearchQuery('');
                          }}
                          className={`p-2.5 ${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50'
                            } cursor-pointer flex items-center justify-between gap-3 rounded-lg transition-colors ${isAdded ? 'opacity-60 bg-emerald-50/20' : ''
                            }`}
                        >
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-800'} whitespace-normal break-words`}>
                                {item.ItemDescription}
                              </span>
                              {dimension && dimension !== '—' && (
                                <span
                                  className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${isDark
                                    ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                    }`}
                                >
                                  {dimension}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                              {segment && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${isDark
                                    ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                                    : 'bg-slate-100 border-slate-200 text-slate-600'
                                    }`}
                                >
                                  {segment}
                                </span>
                              )}
                              <span className="font-mono text-[10px] text-slate-400">{item.Code}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-md font-bold uppercase ${count > 0
                                ? isDark
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isDark
                                  ? 'bg-rose-950/60 text-rose-400 border border-rose-800'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}
                            >
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
                        No consumables found matching &ldquo;{searchQuery}&rdquo;{' '}
                        {selectedSegment !== 'All Segments' ? `in ${selectedSegment}` : ''}.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setNewItemDesc(searchQuery);
                          setIsNewItemModalOpen(true);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        + Create &ldquo;{searchQuery}&rdquo; as a New Consumable Item
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MANIFEST TABLE (SHOW ONLY WHEN ITEMS ARE SELECTED) */}
            {manifestItems.length > 0 && (
              <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-md w-fit uppercase ${transactionType === 'IN'
                      ? isDark
                        ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800'
                        : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                      : isDark
                        ? 'text-rose-400 bg-rose-950/40 border border-rose-800'
                        : 'text-rose-700 bg-rose-50 border border-rose-200'
                      }`}
                  >
                    {transactionType === 'IN'
                      ? '🟢 Quantities will be automatically added'
                      : '🔴 Quantities will be automatically deducted'}
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

                <div
                  className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'
                    } rounded-xl border shadow-sm overflow-x-auto`}
                >
                  <table className="w-full text-left border-collapse text-sm min-w-[950px]">
                    <thead>
                      <tr
                        className={`text-white font-bold uppercase text-xs whitespace-nowrap ${transactionType === 'IN'
                          ? isDark
                            ? 'bg-[#0f111d]'
                            : 'bg-emerald-700'
                          : isDark
                            ? 'bg-[#180a0e]'
                            : 'bg-rose-700'
                          }`}
                      >
                        <th className="py-3 px-4 text-center w-28 min-w-[112px]">QTY</th>
                        <th className="py-3 px-4 text-center">UOM</th>
                        <th className="py-3 px-4 text-center w-28 min-w-[112px]">Actual</th>
                        <th className="py-3 px-4">Segment</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Dimension</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Brand</th>
                        <th className="py-3 px-4">Serial No.</th>
                        <th className="py-3 px-4">Remarks</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>

                    <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 bg-[#090b10]' : 'divide-slate-100'}`}>
                      {manifestItems.map((item, index) => (
                        <tr
                          key={item.consumableId || index}
                          className={`${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'
                            } text-xs`}
                        >
                          <td className="py-2 px-4 w-28 min-w-[112px]">
                            <input
                              type="number"
                              min="1"
                              max={transactionType === 'OUT' ? item.ActualCount : undefined}
                              value={item.qty}
                              onChange={(e) => handleUpdateManifestField(index, 'qty', e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              className={`w-full border text-center rounded py-1 text-sm font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${transactionType === 'IN'
                                ? isDark
                                  ? 'bg-[#141622] border-slate-700 text-emerald-400 focus:border-emerald-500'
                                  : 'border-slate-200 text-emerald-700 focus:border-emerald-600'
                                : isDark
                                  ? 'bg-[#141622] border-slate-700 text-rose-400 focus:border-rose-500'
                                  : 'border-slate-200 text-rose-700 focus:border-rose-600'
                                }`}
                            />
                          </td>

                          <td className="py-2 px-4 text-center">
                            <span
                              className={`${isDark
                                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                                : 'bg-slate-100 text-slate-700'
                                } px-2 py-0.5 rounded text-xs`}
                            >
                              {item.UOM}
                            </span>
                          </td>

                          <td className="py-2 px-4 text-center font-bold font-mono text-xs w-28 min-w-[112px]">
                            <span className={item.ActualCount > 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-700') : 'text-rose-500'}>
                              {item.ActualCount ?? 0}
                            </span>
                          </td>

                          <td className={`py-2 px-4 italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.Segment}
                          </td>

                          <td
                            className={`py-2 px-4 min-w-[200px] whitespace-normal break-words ${isDark ? 'text-slate-200' : 'text-slate-800'
                              }`}
                            title={item.ItemDescription}
                          >
                            <div className="font-semibold">{item.ItemDescription}</div>
                            <div className="font-mono text-[10px] text-slate-400">{item.Code}</div>
                          </td>

                          <td className="py-2 px-4 whitespace-nowrap">
                            {item.Dimension && item.Dimension !== '—' ? (
                              <span
                                className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${isDark
                                  ? 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
                                  : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                  }`}
                              >
                                {item.Dimension}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">—</span>
                            )}
                          </td>

                          <td className={`py-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.Category}
                          </td>

                          <td className={`py-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.Brand}
                          </td>

                          <td className={`py-2 px-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {item.SerialNo}
                          </td>

                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={item.remarks}
                              onChange={(e) => handleUpdateManifestField(index, 'remarks', e.target.value)}
                              placeholder="Remarks..."
                              className={`w-full border ${isDark
                                ? 'bg-[#141622] border-slate-700 text-white'
                                : 'border-slate-200 text-slate-800'
                                } rounded px-2 py-1 text-xs focus:outline-none focus:border-[#ff6600]`}
                            />
                          </td>

                          <td className="py-2 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveManifestItem(index)}
                              className="text-red-500 hover:text-red-700 cursor-pointer p-1"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* CONFIRM BUTTON */}
                <button
                  type="submit"
                  className={`w-full font-bold py-2.5 px-4 rounded-xl text-sm transition-all cursor-pointer uppercase shadow-sm flex items-center justify-center gap-2 ${transactionType === 'IN'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                >
                  {transactionType === 'IN' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Stock IN (Addition)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm Stock OUT (Release)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* RIGHT COLUMN: HISTORY LOGS */}
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
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              placeholder="Search slip or transactor..."
              className={`w-full ${isDark
                ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
            />
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[440px] pr-1 custom-scrollbar">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.slice(0, 50).map((tx) => (
                <div
                  key={tx._id}
                  onClick={() => {
                    setSelectedTransaction(tx);
                    setIsDetailModalOpen(true);
                  }}
                  className={`${isDark
                    ? 'bg-[#141622] border-slate-800 hover:border-[#ff6600]/60 hover:bg-[#181b29]'
                    : 'bg-white border-slate-100 hover:border-[#18174e]/50 hover:shadow-md'
                    } border rounded-xl p-2.5 flex flex-col gap-0.5 transition-all cursor-pointer group`}
                >
                  <div className={`flex justify-between items-center pb-0.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                    <span
                      className={`text-xs font-black truncate max-w-[150px] ${tx.transactionType === 'IN'
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                        : isDark
                          ? 'text-rose-400'
                          : 'text-rose-600'
                        }`}
                    >
                      {tx.transactionNo}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 font-bold rounded-md border ${tx.transactionType === 'IN'
                        ? isDark
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : isDark
                          ? 'bg-rose-950/60 text-rose-400 border-rose-800'
                          : 'bg-rose-50 text-rose-600 border-rose-200'
                        }`}
                    >
                      {tx.transactionType === 'IN' ? 'IN' : 'OUT'}
                    </span>
                  </div>

                  <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'} truncate`}>
                    {tx.transactorName || tx.name || tx.preparedBy || '—'}
                  </span>

                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                    <span>{tx.date || (tx.transactionDate ? new Date(tx.transactionDate).toLocaleDateString() : 'No Date')}</span>
                    <span className="font-bold text-slate-400">
                      {(tx.items || []).length} items
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <span className="text-center pt-4 text-rose-500 italic font-medium text-xs">
                No matching records found.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {isConfirmModalOpen && (
        <div
          className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'
            } backdrop-blur-sm flex items-center justify-center z-50 p-4`}
        >
          <div
            className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              } border rounded-2xl w-full max-w-md p-6 shadow-xl flex flex-col gap-4`}
          >
            <div className="flex items-center gap-2 border-b pb-3 border-slate-700/50">
              <CheckCircle2
                className={`w-5 h-5 ${transactionType === 'IN' ? 'text-emerald-500' : 'text-rose-500'}`}
              />
              <h3 className="font-bold text-base">
                Confirm Consumable Stock {transactionType === 'IN' ? 'IN' : 'OUT'}
              </h3>
            </div>

            <p className="text-sm">
              Are you sure you want to process this transaction for{' '}
              <span className="font-bold">{manifestItems.length}</span> consumable items under{' '}
              {transactionType === 'IN' ? 'prepared by' : 'personnel'}{' '}
              <span className="font-bold">{transactionType === 'IN' ? preparedBy : transactorName}</span>?
            </p>

            <div
              className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
            >
              <div>
                <span className="font-semibold text-slate-400">Type: </span>
                <span className={`font-bold ${transactionType === 'IN' ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {transactionType === 'IN' ? 'Stock Addition (IN)' : 'Stock Release (OUT)'}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Date & Time: </span>
                <span className="font-bold">
                  {transactionDate} at {transactionTime}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Total Items: </span>
                <span className="font-bold">{manifestItems.reduce((sum, it) => sum + Number(it.qty), 0)} units</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsConfirmModalOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmSubmit}
                className={`px-4 py-2 rounded-lg text-sm font-bold text-white cursor-pointer flex items-center gap-1.5 ${transactionType === 'IN'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
                  }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Yes, Submit</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION SLIP DETAILS MODAL */}
      {isDetailModalOpen && selectedTransaction && (
        <div
          className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'
            } backdrop-blur-sm flex items-center justify-center z-50 p-4`}
        >
          <div
            className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
              } border rounded-2xl w-full max-w-3xl p-6 shadow-xl relative flex flex-col gap-4`}
          >
            <div
              className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'
                } pb-3`}
            >
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-lg`}>
                Consumable Slip: {selectedTransaction.transactionNo}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedTransaction)}
                  className="flex items-center gap-1.5 bg-[#18174e] hover:bg-[#13123f] text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm"
                  title="Export Audit Ledger PDF Slip"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Audit Ledger (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className={`${isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    } p-1 rounded-lg cursor-pointer transition-colors`}
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div
              className={`grid grid-cols-2 sm:grid-cols-3 text-sm gap-2.5 ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-100'
                } p-4 rounded-xl border`}
            >
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Transaction Type</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${selectedTransaction.transactionType === 'IN'
                    ? isDark
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : isDark
                      ? 'bg-rose-950/60 text-rose-300 border border-rose-800'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                >
                  {selectedTransaction.transactionType === 'IN' ? '🟢 Stock IN' : '🔴 Stock OUT'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Slip Number</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {selectedTransaction.transactionNo}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                  {selectedTransaction.transactionType === 'IN' ? 'Prepared Name' : 'Personnel Name'}
                </span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {selectedTransaction.transactorName || selectedTransaction.name || selectedTransaction.preparedBy || 'System User'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Date</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {selectedTransaction.date || (selectedTransaction.transactionDate ? new Date(selectedTransaction.transactionDate).toLocaleDateString() : '-')}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Time</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {selectedTransaction.time || '-'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Quantity</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {(selectedTransaction.items || []).reduce((sum, it) => sum + Number(it.qty || 1), 0)} units
                </span>
              </div>
            </div>

            {(() => {
              const txItems = selectedTransaction.items || [];
              const modalIndexOfLastRow = modalPage * modalRowsPerPage;
              const modalIndexOfFirstRow = modalIndexOfLastRow - modalRowsPerPage;
              const paginatedTxItems = txItems.slice(modalIndexOfFirstRow, modalIndexOfLastRow);

              return (
                <div className={`border ${isDark ? 'border-slate-800' : 'border-slate-200/60'} rounded-xl relative shadow-sm overflow-hidden flex flex-col`}>
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
                        {paginatedTxItems.map((it, idx) => {
                          const desc = it.ItemDescription || it.consumableId?.ItemDescription || '—';
                          const code = it.Code || it.consumableId?.Code;
                          const segment = it.Segment || it.consumableId?.Segment || '—';
                          const dimension = it.Dimension || it.consumableId?.Dimension || '—';
                          const uom = it.UOM || it.consumableId?.UOM || 'pcs';

                          return (
                            <tr
                              key={it._id || idx}
                              className={`${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/50'} transition-colors`}
                            >
                              <td className={`p-3 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} whitespace-nowrap align-middle`}>
                                {segment}
                              </td>
                              <td className={`p-3 font-bold ${isDark ? 'text-white' : 'text-[#18174e]'} text-xs min-w-[200px] whitespace-normal break-words align-middle`} title={desc}>
                                <div>{desc}</div>
                                {code && <div className="font-mono text-[10px] text-slate-400">{code}</div>}
                              </td>
                              <td className={`p-3 ${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium whitespace-nowrap align-middle`}>
                                {dimension}
                              </td>
                              <td className="p-3 text-center font-bold font-mono text-emerald-400 align-middle whitespace-nowrap">
                                {it.qty} {uom}
                              </td>
                              <td className={`p-3 italic ${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium text-[11px] min-w-[120px] whitespace-normal break-words align-middle pl-4`}>
                                {it.remarks || (it.Brand ? `Brand: ${it.Brand}` : '—')}
                              </td>
                            </tr>
                          );
                        })}
                        {txItems.length === 0 && (
                          <tr>
                            <td colSpan="5" className="p-4 text-center text-slate-400 italic">
                              No consumable items recorded.
                            </td>
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
                    totalRows={txItems.length}
                    options={[5, 10, 20, 50, 100]}
                  />
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* BROWSE ALL CONSUMABLES MODAL */}
      {/* (User columns: New Item, Item Description, Segment, Dimension, Category, Brand, Serial No., Actual Count, Damaged, UOM, Action) */}
      {isBrowseModalOpen && (
        <div
          className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'
            } backdrop-blur-sm flex items-center justify-center z-50 p-4`}
        >
          <div
            className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              } border rounded-2xl w-full max-w-5xl p-6 shadow-xl relative max-h-[90vh] flex flex-col gap-4`}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'
                } pb-3`}
            >
              <div className="flex items-center gap-3">
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                  Browse Consumables Masterlist
                </h3>
                <button
                  type="button"
                  onClick={() => setIsNewItemModalOpen(true)}
                  className="flex items-center gap-1.5 bg-[#ff6600] hover:bg-[#e05a00] text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Item</span>
                </button>
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
                <label
                  className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'
                    } uppercase mb-1.5`}
                >
                  Filter by Segment
                </label>
                <select
                  value={browseSegmentFilter}
                  onChange={(e) => setBrowseSegmentFilter(e.target.value)}
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                    } border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600] cursor-pointer`}
                >
                  <option value="All Segments">All Segments ({uniqueSegments.length})</option>
                  {uniqueSegments.map((seg) => (
                    <option key={seg} value={seg}>
                      {seg}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label
                  className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'
                    } uppercase mb-1.5`}
                >
                  Search Description, Dimension, Category, Brand or Serial
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={browseSearchQuery}
                    onChange={(e) => setBrowseSearchQuery(e.target.value)}
                    placeholder="Search consumables..."
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      } border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                </div>
              </div>
            </div>

            {/* Table: Item Description | Segment | Dimension | Category | Brand | Serial No. | Actual Count | Damaged | UOM | Action */}
            <div
              className={`rounded-xl border overflow-x-auto overflow-y-auto flex-1 max-h-96 ${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-200'
                }`}
            >
              <table className="w-full text-left text-xs border-collapse whitespace-nowrap min-w-[900px]">
                <thead>
                  <tr
                    className={`text-white font-bold uppercase text-[11px] sticky top-0 z-10 whitespace-nowrap ${isDark ? 'bg-[#0f111d]' : 'bg-[#18174e]'
                      }`}
                  >
                    <th className="py-2.5 px-3 whitespace-nowrap">Item Description</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Segment</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Dimension</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Category</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Brand</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">Serial No.</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Actual Count</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Damaged</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">UOM</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                  {browseFilteredMaterials.length > 0 ? (
                    browseFilteredMaterials.map((item) => {
                      const isAdded = manifestItems.some((i) => i.consumableId === item._id);

                      return (
                        <tr
                          key={item._id}
                          className={`${isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                            } transition-colors whitespace-nowrap`}
                        >
                          <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span>{item.ItemDescription}</span>
                              <span className="font-mono text-[10px] text-slate-400">({item.Code})</span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${isDark
                                ? 'bg-slate-800 border-slate-700 text-slate-300'
                                : 'bg-slate-100 border-slate-200 text-slate-600'
                                }`}
                            >
                              {item.Segment || '—'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap font-mono">{item.Dimension || '—'}</td>

                          <td className="py-2.5 px-3 whitespace-nowrap">{item.Category || '—'}</td>

                          <td className="py-2.5 px-3 whitespace-nowrap">{item.Brand || '—'}</td>

                          <td className="py-2.5 px-3 whitespace-nowrap font-mono">{item.SerialNo || '—'}</td>

                          <td className="py-2.5 px-3 text-center font-bold font-mono whitespace-nowrap">
                            <span className={item.ActualCount > 0 ? 'text-emerald-500' : 'text-rose-500'}>
                              {item.ActualCount}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-center font-bold font-mono whitespace-nowrap text-amber-500">
                            {item.Damaged || 0}
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">{item.UOM}</td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {isAdded ? (
                              <span className="text-[11px] font-bold text-emerald-500 inline-flex items-center gap-1 whitespace-nowrap">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Added
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectConsumable(item)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap ${isDark
                                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400 hover:bg-emerald-900/60'
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
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
                      <td colSpan="10" className="text-center py-8 text-slate-400 italic">
                        No consumables found matching your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* NEW ITEM MODAL */}
      {isNewItemModalOpen && (
        <div
          className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'
            } backdrop-blur-sm flex items-center justify-center z-50 p-4`}
        >
          <div
            className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              } border rounded-2xl w-full max-w-lg p-6 shadow-xl relative max-h-[90vh] overflow-y-auto flex flex-col gap-4`}
          >
            <div
              className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'
                } pb-3`}
            >
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                Add New Consumable Item
              </h3>
              <button
                type="button"
                onClick={() => setIsNewItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewItem} className="flex flex-col gap-3">
              <div>
                <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                  Item Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Masking Tape 1 inch, Drill Bit 5mm"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                    } border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                    Segment
                  </label>
                  <input
                    type="text"
                    list="new-item-segments"
                    placeholder="e.g. Packaging, Hardware"
                    value={newItemSegment}
                    onChange={(e) => setNewItemSegment(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      } border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="new-item-segments">
                    {uniqueSegments.map((s, i) => (
                      <option key={i} value={s} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                    Dimension
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50mm x 25m, 2700"
                    value={newItemDimension}
                    onChange={(e) => setNewItemDimension(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      } border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                    Category
                  </label>
                  <input
                    type="text"
                    list="new-item-categories"
                    placeholder="e.g. Tools, Consumables"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      } border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="new-item-categories">
                    {uniqueCategories.map((c, i) => (
                      <option key={i} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                    Brand
                  </label>
                  <input
                    type="text"
                    list="new-item-brands"
                    placeholder="e.g. 3M, Stanley"
                    value={newItemBrand}
                    onChange={(e) => setNewItemBrand(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      } border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="new-item-brands">
                    {uniqueBrands.map((b, i) => (
                      <option key={i} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                    Serial No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SN-001 or —"
                    value={newItemSerialNo}
                    onChange={(e) => setNewItemSerialNo(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      } border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                    UOM *
                  </label>
                  <input
                    type="text"
                    required
                    list="new-item-uoms"
                    placeholder="e.g. pcs, rolls, meters"
                    value={newItemUOM}
                    onChange={(e) => setNewItemUOM(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      } border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                  <datalist id="new-item-uoms">
                    {uniqueUOMs.map((u, i) => (
                      <option key={i} value={u} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                    Initial Stock Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItemActualCount}
                    onChange={(e) => setNewItemActualCount(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      } border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1`}>
                    Initial Damaged Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItemDamaged}
                    onChange={(e) => setNewItemDamaged(e.target.value)}
                    className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                      } border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600]`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700/50 mt-2">
                <button
                  type="button"
                  onClick={() => setIsNewItemModalOpen(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#ff6600] hover:bg-[#e05a00] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm cursor-pointer transition-all"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Consumable;
