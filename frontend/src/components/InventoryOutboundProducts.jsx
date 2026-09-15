import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { FileText, ClipboardList, Calendar, Trash2, Search, X, Download, User, ArrowLeftRight, Eye, ShieldAlert, CheckCircle2, AlertCircle, Loader2, Layers, Pencil, Copy } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from './PageHeader';
import TablePagination from './TablePagination';
import toast, { Toaster } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = '/api';

const RAW_MAT_URL = `${API_BASE_URL}/raw-materials`;
const PL_URL = `${API_BASE_URL}/packing-lists`;
const CLIENT_URL = `${API_BASE_URL}/clients`;

const MASTER_CANCELLATION_KEY = "VOID-CONFIRM-2026";

function InventoryOutboundProducts() {
  const { isDark } = useTheme();
  const [dbRawMaterials, setDbRawMaterials] = useState([]);
  const [plRecords, setPlRecords] = useState([]);
  const [registeredCustomers, setRegisteredCustomers] = useState([]);
  const [registeredLogistics, setRegisteredLogistics] = useState([]);
  const [rawMatSearchQuery, setRawMatSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPage, setModalPage] = useState(1);
  const [modalRowsPerPage, setModalRowsPerPage] = useState(10);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setModalPage(1);
  }, [selectedSlip, isModalOpen]);

  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  const [voidReasonInput, setVoidReasonInput] = useState('');

  const [transactionType, setTransactionType] = useState('Reserve');
  const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [customer, setCustomer] = useState('');
  const [carrier, setCarrier] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [manifestItems, setManifestItems] = useState([]);
  const [referencePlNo, setReferencePlNo] = useState('');
  const [preparedBy, setPreparedBy] = useState('System User');

  const [selectedMaterialSegment, setSelectedMaterialSegment] = useState('All Segments');
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalSegmentFilter, setModalSegmentFilter] = useState('All Segments');

  const uniqueSegments = Array.from(
    new Set(
      dbRawMaterials
        .map(item => item.Segment || item.segment)
        .filter(Boolean)
    )
  ).sort();

  const [existingCustomers, setExistingCustomers] = useState([]);
  const [existingCarriers, setExistingCarriers] = useState([]);
  const [existingDestinations, setExistingDestinations] = useState([]);

  const [quickReserveSearch, setQuickReserveSearch] = useState('');

  // Drag-and-drop reordering for Quick-Assistant packed rack cards
  const [cardOrderIds, setCardOrderIds] = useState(() => {
    try {
      const saved = localStorage.getItem('quick_assistant_box_order');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [draggedCardIndex, setDraggedCardIndex] = useState(null);
  const [dragOverCardIndex, setDragOverCardIndex] = useState(null);
  const [isDraggingCard, setIsDraggingCard] = useState(false);

  const handleCardDragStart = (e, index) => {
    setDraggedCardIndex(index);
    setIsDraggingCard(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleCardDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCardIndex !== index) {
      setDragOverCardIndex(index);
    }
  };

  const handleCardDragEnd = () => {
    setDraggedCardIndex(null);
    setDragOverCardIndex(null);
    setTimeout(() => setIsDraggingCard(false), 120);
  };

  const handleCardDrop = (e, dropIndex, currentList) => {
    e.preventDefault();
    if (draggedCardIndex === null || draggedCardIndex === dropIndex) {
      handleCardDragEnd();
      return;
    }

    const updated = [...currentList];
    const [movedItem] = updated.splice(draggedCardIndex, 1);
    updated.splice(dropIndex, 0, movedItem);

    const newOrderIds = updated.map(item => item._id);
    setCardOrderIds(newOrderIds);
    try {
      localStorage.setItem('quick_assistant_box_order', JSON.stringify(newOrderIds));
    } catch (err) {
      console.error("Error saving card order:", err);
    }

    handleCardDragEnd();
    showSuccessToast("Packed rack arrangement updated!");
  };

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
      const [rawMatRes, plsRes, customersRes, logisticsRes] = await Promise.all([
        axios.get(RAW_MAT_URL),
        axios.get(PL_URL),
        axios.get(`${CLIENT_URL}?type=Customer`).catch(() => ({ data: [] })),
        axios.get(`${CLIENT_URL}?type=Logistics`).catch(() => ({ data: [] }))
      ]);

      if (rawMatRes.data) {
        setDbRawMaterials(rawMatRes.data.filter(p => !p.isArchived));
      }
      if (customersRes?.data) {
        setRegisteredCustomers(customersRes.data);
      }
      if (logisticsRes?.data) {
        setRegisteredLogistics(logisticsRes.data);
      }
      if (plsRes.data) {
        setPlRecords(plsRes.data);
        const records = plsRes.data;
        const uniqueCustomers = [...new Set(records.map(r => r.customer).filter(Boolean))].sort();
        const uniqueCarriers = [...new Set(records.map(r => r.carrier).filter(Boolean))].sort();
        const uniqueDestinations = [...new Set(records.map(r => r.destinationAddress).filter(Boolean))].sort();

        setExistingCustomers(uniqueCustomers);
        setExistingCarriers(uniqueCarriers);
        setExistingDestinations(uniqueDestinations);
        window.dispatchEvent(new Event('packingListUpdated'));
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
      } catch (e) {
        console.error("Error configuration session context:", e);
      }
    }
  }, []);

  const handleCustomerChange = (e) => {
    const selectedName = e.target.value;
    setCustomer(selectedName);
    const found = registeredCustomers.find(c => c.name === selectedName);
    if (found && found.address) {
      setDestinationAddress(found.address);
    } else if (!selectedName) {
      setDestinationAddress('');
    }
  };

  const handleSelectRawMaterial = (item) => {
    if (manifestItems.some(i => i.materialId === item._id || i.productId === item._id)) {
      showErrorToast("This material is already in the manifest list.");
      return setRawMatSearchQuery('');
    }
    setManifestItems([...manifestItems, {
      materialId: item._id,
      Code: item.Code,
      ItemDescription: item.ItemDescription,
      Category: item.Category || 'N/A',
      Segment: item.Segment || 'N/A',
      Dimension: item.Dimension || 'N/A',
      AccountTo: item.AccountTo || 'N/A',
      qtyRequested: 1,
      UOM: item.UOM,
      actualCountShipped: 1,
      remarks: ''
    }]);
    setRawMatSearchQuery('');
  };

  const handleFastReturnCopy = (reserveSlip, targetMode = "Outbound") => {
    setTransactionType(targetMode);
    setCustomer(reserveSlip.customer || '');
    setCarrier(reserveSlip.carrier || '');
    setDestinationAddress(reserveSlip.destinationAddress || '');
    setReferencePlNo(reserveSlip.plNo);
    if (reserveSlip.shipmentDate) {
      setShipmentDate(new Date(reserveSlip.shipmentDate).toISOString().split('T')[0]);
    }

    const fastItems = reserveSlip.items.map(it => {
      const targetMaterial = it.materialId || it.productId;
      const uom = targetMaterial?.UOM || 'pcs';
      return {
        materialId: targetMaterial?._id || targetMaterial,
        Code: targetMaterial?.Code || 'N/A',
        ItemDescription: targetMaterial?.ItemDescription || '-',
        Segment: targetMaterial?.Segment || targetMaterial?.segment || 'N/A',
        Dimension: targetMaterial?.Dimension || targetMaterial?.dimension || targetMaterial?.Dimensions || targetMaterial?.dimensions || 'N/A',
        qtyRequested: it.qtyRequested,
        UOM: uom,
        actualCountShipped: it.qtyRequested,
        remarks: targetMode === "Outbound"
          ? `Released from Reserve Slip ${reserveSlip.plNo}`
          : (it.remarks || `Reserved in ${reserveSlip.plNo}`)
      };
    });

    setManifestItems(fastItems);
    if (targetMode === "Reserve") {
      showSuccessToast(`Loaded Reservation ${reserveSlip.plNo} for editing.`);
    } else {
      showSuccessToast(`Loaded items from Reserve Slip ${reserveSlip.plNo} to fulfill.`);
    }
  };

  const handleDuplicatePackedRack = (reserveSlip) => {
    setTransactionType("Reserve");
    setCustomer(reserveSlip.customer || '');
    setCarrier(reserveSlip.carrier || '');
    setDestinationAddress(reserveSlip.destinationAddress || '');
    setReferencePlNo('');
    if (reserveSlip.shipmentDate) {
      setShipmentDate(new Date(reserveSlip.shipmentDate).toISOString().split('T')[0]);
    }

    const fastItems = reserveSlip.items.map(it => {
      const targetMaterial = it.materialId || it.productId;
      const uom = targetMaterial?.UOM || 'pcs';
      return {
        materialId: targetMaterial?._id || targetMaterial,
        Code: targetMaterial?.Code || 'N/A',
        ItemDescription: targetMaterial?.ItemDescription || '-',
        Segment: targetMaterial?.Segment || targetMaterial?.segment || 'N/A',
        Dimension: targetMaterial?.Dimension || targetMaterial?.dimension || targetMaterial?.Dimensions || targetMaterial?.dimensions || 'N/A',
        qtyRequested: it.qtyRequested,
        UOM: uom,
        actualCountShipped: it.qtyRequested,
        remarks: it.remarks?.includes(reserveSlip.plNo)
          ? it.remarks.replace(reserveSlip.plNo, `Copy of ${reserveSlip.plNo}`)
          : (it.remarks || `Duplicated from ${reserveSlip.plNo}`)
      };
    });

    setManifestItems(fastItems);
    showSuccessToast(`Duplicated ${reserveSlip.plNo}! Ready to save as a new packed rack reservation.`);
  };

  const handleUpdateField = (index, field, val) => {
    const updated = [...manifestItems];
    updated[index][field] = val;
    if (field === 'qtyRequested') {
      updated[index]['actualCountShipped'] = val;
    }
    setManifestItems(updated);
  };

  const handleInitiateConfirm = (e) => {
    e.preventDefault();
    if (manifestItems.length === 0) {
      showErrorToast("Please add material lines into your list manifest.");
      return;
    }

    if (!referencePlNo) {
      for (const item of manifestItems) {
        const currentDbItem = dbRawMaterials.find(db => db._id === item.materialId);

        if (currentDbItem) {
          const availableStock = currentDbItem.ActualCount || 0;

          if (item.qtyRequested > availableStock) {
            showErrorToast(`Insufficient stock for ${item.Code}: Requested ${item.qtyRequested}, Available ${availableStock}.`);
            return;
          }
        }
      }
    } else if (transactionType === 'Reserve') {
      const origReserve = plRecords.find(r => r.plNo === referencePlNo);
      for (const item of manifestItems) {
        const currentDbItem = dbRawMaterials.find(db => db._id === item.materialId);
        if (currentDbItem) {
          const origItem = origReserve?.items?.find(oi => {
            const mId = oi.materialId?._id || oi.materialId;
            return mId === item.materialId;
          });
          const origQty = origItem ? Number(origItem.qtyRequested || 0) : 0;
          const additionalNeeded = Math.max(0, Number(item.qtyRequested) - origQty);
          const availableStock = currentDbItem.ActualCount || 0;

          if (additionalNeeded > availableStock) {
            showErrorToast(`Insufficient stock for ${item.Code}: Needs +${additionalNeeded} additional, but only ${availableStock} available.`);
            return;
          }
        }
      }
    }

    setIsConfirmModalOpen(true);
  };

  const handleSavePL = async () => {
    setIsSaving(true);
    const payload = {
      transactionType, shipmentDate, customer, carrier, destinationAddress, preparedBy, referencePlNo,
      items: manifestItems.map(i => ({
        materialId: i.materialId || i.productId,
        qtyRequested: Number(i.qtyRequested),
        actualCountShipped: Number(i.actualCountShipped),
        remarks: i.remarks
      }))
    };

    try {
      const res = await axios.post(PL_URL, payload);
      if (res.status === 200 || res.status === 201) {
        const successMsg = res.data?.message || (transactionType === 'Reserve' && referencePlNo
          ? `Reservation ${referencePlNo} updated successfully!`
          : `Material ${transactionType} Slip generated and stock updated!`);
        showSuccessToast(successMsg);
        setManifestItems([]); setCustomer(''); setCarrier(''); setDestinationAddress(''); setReferencePlNo('');
        setTransactionType('Outbound');
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
      doc.text(`${selectedSlip.plNo}`, 45, 42);
      doc.setFont("helvetica", "bold");
      doc.text("Date Logged:", 120, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.shipmentDate ? new Date(selectedSlip.shipmentDate).toLocaleDateString() : '-'}`, 155, 42);

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
      doc.text("Customer Name:", 14, 56);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.customer || 'N/A'}`, 45, 56);

      doc.setFont("helvetica", "bold");
      doc.text("Logistics / Carrier:", 120, 56);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.carrier || 'N/A'}`, 155, 56);

      doc.setFont("helvetica", "bold");
      doc.text("Destination:", 14, 63);
      doc.setFont("helvetica", "normal");
      doc.text(`${selectedSlip.destinationAddress || 'N/A'}`, 45, 63);

      const tableColumns = ["Description", "Segment", "Dimension", "Requested QTY", "Shipped QTY Count", "Item Remarks"];

      const tableRows = selectedSlip.items?.map(it => {
        const targetMaterial = it.materialId || it.productId;
        const targetId = targetMaterial?._id || targetMaterial;
        const fullMat = dbRawMaterials?.find(m => m._id === targetId);

        const descOnly = fullMat?.ItemDescription || targetMaterial?.ItemDescription || "-";

        const segment = fullMat?.Segment || fullMat?.segment ||
          targetMaterial?.Segment || targetMaterial?.segment || "N/A";

        let dimension = "N/A";
        if (fullMat?.Dimension || fullMat?.dimension || fullMat?.Dimensions || fullMat?.dimensions) {
          dimension = fullMat.Dimension || fullMat.dimension || fullMat.Dimensions || fullMat.dimensions;
        } else if (targetMaterial?.Dimension || targetMaterial?.dimension || targetMaterial?.Dimensions || targetMaterial?.dimensions) {
          dimension = targetMaterial.Dimension || targetMaterial.dimension || targetMaterial.Dimensions || targetMaterial.dimensions;
        } else {
          const l = fullMat?.Length || fullMat?.length || targetMaterial?.Length || targetMaterial?.length;
          const w = fullMat?.Width || fullMat?.width || targetMaterial?.Width || targetMaterial?.width;
          const h = fullMat?.Height || fullMat?.height || targetMaterial?.Height || targetMaterial?.height;
          if (l || w || h) {
            dimension = `${l || '-'} × ${w || '-'} × ${h || '-'}`;
          }
        }

        const uom = fullMat?.UOM || targetMaterial?.UOM || '';
        const qtyRequested = `${it.qtyRequested} ${uom}`;
        const actualCountShipped = `${it.actualCountShipped} ${uom}`;
        const remarks = it.remarks || "-";

        return [descOnly, segment, dimension, qtyRequested, actualCountShipped, remarks];
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
          doc.text(`MATERIAL OUTBOUND SLIP (${selectedSlip.transactionType.toUpperCase()})`, centerX, 13, { align: 'center' });

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(200, 200, 220);
          doc.text(`Warehouse Logistics & Outbound Control Registry  |  Generated: ${formattedDate}`, centerX, 21, { align: 'center' });

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text("CONFIDENTIAL - INTERNAL USE ONLY", 14, pageHeight - 10);

          const pageNumber = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
          doc.text(pageNumber, pageWidth - 14, pageHeight - 10, { align: 'right' });
        },
        headStyles: {
          fillColor: [32, 31, 85],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
          valign: 'middle',
          overflow: 'visible'
        },
        bodyStyles: { fontSize: 8, textColor: [60, 60, 60], valign: 'middle' },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { overflow: 'linebreak', cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.2 },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 35 }
        }
      });

      doc.save(`OUTBOUND_SLIP_${selectedSlip.plNo}.pdf`);
      showSuccessToast("PDF Downloaded successfully!");
    } catch (e) {
      console.error(e);
      showErrorToast("Failed to download PDF slip configuration.");
    }
  };

  const handleOpenVoidModal = (slip) => {
    setSelectedSlip(slip);
    setPasskeyInput('');
    setIsVoidModalOpen(true);
  };

  const handleExecuteCancellation = async () => {
    const isReserve = selectedSlip.transactionType?.toLowerCase() === 'reserve';
    if (!isReserve && passkeyInput !== MASTER_CANCELLATION_KEY) {
      showErrorToast("ACCESS DENIED: Invalid authorization token code.");
      return;
    }

    try {
      const res = await axios.delete(`${PL_URL}/${selectedSlip._id}`, {
        data: {
          voidReason: voidReasonInput.trim() || "Erroneous transaction entry voided by user",
          voidedBy: preparedBy || "System User"
        }
      });
      if (res.status === 200) {
        showSuccessToast(isReserve
          ? `Packed rack ${selectedSlip.plNo} cleared! All reserved stocks have been returned to inventory.`
          : `Log Entry ${selectedSlip.plNo} successfully voided.`
        );
        setIsVoidModalOpen(false);
        setIsModalOpen(false);
        setSelectedSlip(null);
        fetchData();
      }
    } catch (err) {
      const errMessage = err.response?.data?.message || "Failed to execute cancellation request.";
      showErrorToast(errMessage);
    }
  };

  const filteredRawMatSuggestions = dbRawMaterials.filter(item => {
    const matchesSegment = selectedMaterialSegment === 'All Segments' ||
      (item.Segment && item.Segment.toLowerCase() === selectedMaterialSegment.toLowerCase());
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

  const modalFilteredMaterials = dbRawMaterials.filter(item => {
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

  const completedPlNumbers = plRecords
    .filter(r => r.transactionType?.toLowerCase() === "outbound" && r.referencePlNo)
    .map(r => r.referencePlNo.toString().replace("REF: ", "").trim().toLowerCase());

  const activeReserves = plRecords.filter(r =>
    !r.isVoided &&
    r.transactionType?.toLowerCase() === "reserve" &&
    !completedPlNumbers.includes(r.plNo?.toString().trim().toLowerCase())
  );

  // Preserve user custom order of packed rack boxes
  const orderedActiveReserves = useMemo(() => {
    if (!cardOrderIds || cardOrderIds.length === 0) return activeReserves;
    const map = new Map(activeReserves.map(item => [item._id, item]));
    const ordered = [];
    for (const id of cardOrderIds) {
      if (map.has(id)) {
        ordered.push(map.get(id));
        map.delete(id);
      }
    }
    for (const item of map.values()) {
      ordered.push(item);
    }
    return ordered;
  }, [activeReserves, cardOrderIds]);

  const filteredHistoryLogs = plRecords.filter(rec =>
    rec.plNo?.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
    rec.customer?.toLowerCase().includes(historySearchQuery.toLowerCase())
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
        <PageHeader activeTab="packing-list" />
      </div>

      {activeReserves.length > 0 && (
        <div className={`${isDark ? 'bg-[#0e1017] border-slate-800' : 'bg-indigo-50/50 border-indigo-100'} rounded-xl p-4 flex flex-col gap-3 border`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className={`flex items-center gap-2 text-xs font-bold ${isDark ? 'text-slate-200' : 'text-[#18174e]'} uppercase`}>
              <Eye className="w-3.5 h-3.5 text-[#ff6600]" />
              <span>Quick-Assistant: Select a packed rack below to fulfill transaction</span>

            </div>

            <div className="relative w-full sm:w-64">
              <Search className={`absolute left-2.5 top-2 w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-[#18174e]/60'}`} />
              <input
                type="text"
                placeholder="Type PL No or Customer to filter..."
                value={quickReserveSearch}
                onChange={(e) => setQuickReserveSearch(e.target.value)}
                className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-indigo-200/80 text-[#18174e] placeholder-indigo-300'} border rounded-lg pl-8 pr-2 py-1 text-xs focus:outline-none focus:border-[#ff6600]`}
              />
            </div>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 text-xs select-none">
            {orderedActiveReserves
              .filter(b =>
                b.plNo?.toLowerCase().includes(quickReserveSearch.toLowerCase()) ||
                b.customer?.toLowerCase().includes(quickReserveSearch.toLowerCase())
              )
              .map((b, index, filteredList) => {
                const isDraggingThis = draggedCardIndex === index;
                const isOverThis = dragOverCardIndex === index;

                return (
                  <div
                    key={b._id}
                    draggable
                    onDragStart={(e) => handleCardDragStart(e, index)}
                    onDragOver={(e) => handleCardDragOver(e, index)}
                    onDragEnd={handleCardDragEnd}
                    onDrop={(e) => handleCardDrop(e, index, filteredList)}
                    className={`relative inline-block shrink-0 overflow-visible group transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${isDraggingThis
                      ? 'opacity-35 scale-90 rotate-2 border-2 border-dashed border-[#ff6600] rounded-xl'
                      : isOverThis
                        ? 'scale-105 ring-2 ring-[#ff6600] ring-offset-2 shadow-xl -translate-y-1'
                        : 'hover:scale-[1.02]'
                      }`}
                    title="Drag and drop to rearrange order, or click to fulfill"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (isDraggingCard) return;
                        handleFastReturnCopy(b, "Outbound");
                        setQuickReserveSearch('');
                      }}
                      className="bg-yellow-400 border border-slate-900 hover:border-slate-800 text-[#000] rounded-lg shadow-2xs font-medium cursor-pointer transition-all flex flex-col justify-center items-center text-center p-1.5 pt-4 w-28 h-22 shrink-0 select-none pointer-events-auto"
                    >
                      <span className="font-bold text-[#000] text-[12px] tracking-tighter block mb-0.5 line-clamp-2 break-words max-w-full leading-tight pointer-events-none">
                        {b.customer}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-800 opacity-75 pointer-events-none">{b.plNo}</span>
                    </button>

                    <div
                      className="absolute top-1 right-1 flex items-center gap-1 z-20"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDraggingCard) return;
                          setSelectedSlip(b);
                          setIsModalOpen(true);
                        }}
                        className="w-5 h-5 bg-yellow-400 border border-slate-900 hover:border-slate-800 hover:border-indigo-400 text-slate-900 hover:text-indigo-700 rounded-full shadow-md transition-all cursor-pointer flex items-center justify-center"
                        title="View Reservation Details"
                      >
                        <Eye className="w-2.5 h-2.5 shrink-0" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDraggingCard) return;
                          handleFastReturnCopy(b, "Reserve");
                          setQuickReserveSearch('');
                        }}
                        className="w-5 h-5 bg-yellow-400 border border-slate-900 hover:border-slate-800 hover:border-amber-400 text-slate-900 hover:text-amber-800 rounded-full shadow-md transition-all cursor-pointer flex items-center justify-center"
                        title="Edit Reservation (Items & Quantities)"
                      >
                        <Pencil className="w-2.5 h-2.5 shrink-0" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDraggingCard) return;
                          handleDuplicatePackedRack(b);
                          setQuickReserveSearch('');
                        }}
                        className="w-5 h-5 bg-yellow-400 border border-slate-900 hover:border-slate-800 hover:border-emerald-600 text-slate-900 hover:text-emerald-800 rounded-full shadow-md transition-all cursor-pointer flex items-center justify-center"
                        title="Duplicate as New Reservation"
                      >
                        <Copy className="w-2.5 h-2.5 shrink-0" />
                      </button>
                    </div>
                  </div>
                );
              })}

            {activeReserves.filter(b =>
              b.plNo?.toLowerCase().includes(quickReserveSearch.toLowerCase()) ||
              b.customer?.toLowerCase().includes(quickReserveSearch.toLowerCase())
            ).length === 0 && (
                <span className={`${isDark ? 'text-slate-500' : 'text-indigo-400'} italic text-xs py-1`}>No matching reservation logs found.</span>
              )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className={`lg:col-span-3 ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100'} p-4 sm:p-6 rounded-2xl border flex flex-col gap-6 shadow-sm`}>
          <div className={`border-b ${isDark ? 'border-slate-800 text-slate-200' : 'border-slate-100 text-slate-600'} pb-3 flex items-center justify-between gap-2 text-sm font-bold`}>
            <div className="flex items-center gap-2 min-w-0">
              <ArrowLeftRight className="w-4 h-4 text-[#ff6600] flex-shrink-0" />
              <span className="truncate">Outbound Racking Materials</span>
            </div>
            {manifestItems.length > 0 && (
              <button
                type="button"
                onClick={() => { setManifestItems([]); setReferencePlNo(''); setTransactionType('Outbound'); showSuccessToast("Form grid cleared."); }}
                className="text-xs font-bold text-rose-400 hover:underline cursor-pointer flex-shrink-0"
              >
                Clear Form Grid
              </button>
            )}
          </div>

          <form onSubmit={handleInitiateConfirm} className="flex flex-col gap-5">

            {/* CONTEXTUAL PACKED RACK BANNER */}
            {referencePlNo && (
              <div className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-all animate-in fade-in duration-200 ${transactionType === 'Reserve'
                ? (isDark ? 'bg-amber-950/20 border-amber-800/60 text-slate-200' : 'bg-amber-50/70 border-amber-200 text-slate-800')
                : (isDark ? 'bg-rose-950/20 border-rose-800/60 text-slate-200' : 'bg-rose-50/70 border-rose-200 text-slate-800')
                }`}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`font-bold uppercase px-2.5 py-1 rounded-md text-[10px] tracking-wider border shadow-2xs shrink-0 ${transactionType === 'Reserve'
                    ? (isDark ? 'bg-amber-900/60 border-amber-700 text-amber-200' : 'bg-amber-100 border-amber-300 text-amber-800')
                    : (isDark ? 'bg-rose-900/60 border-rose-700 text-rose-200' : 'bg-rose-100 border-rose-300 text-rose-800')
                    }`}>
                    {transactionType === 'Reserve' ? '🟡 Editing Packed Rack' : '🔴 Fulfilling Packed Rack'}
                  </span>
                  <span className={`font-medium leading-tight ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Slip: <strong className="font-mono text-[#ff8533] font-bold">{referencePlNo}</strong> — {
                      transactionType === 'Reserve'
                        ? 'Changes will update this reservation and reconcile inventory.'
                        : 'Any unverified or partial balance will automatically remain reserved.'
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => {
                      const oldRef = referencePlNo;
                      setReferencePlNo('');
                      setTransactionType('Reserve');
                      setManifestItems(prev => prev.map(it => ({
                        ...it,
                        remarks: it.remarks?.includes(oldRef) ? it.remarks.replace(oldRef, `Copy of ${oldRef}`) : (it.remarks || `Duplicated from ${oldRef}`)
                      })));
                      showSuccessToast(`Duplicated ${oldRef}! Ready to save as a new packed rack reservation.`);
                    }}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-xs ${isDark
                      ? 'bg-[#141622] text-slate-200 border-slate-700 hover:border-amber-500 hover:text-amber-400 hover:bg-slate-800'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-amber-500 hover:text-amber-700 hover:bg-amber-50/50'
                      }`}
                    title="Duplicate this packed rack as a new reservation"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Duplicate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReferencePlNo('');
                      setManifestItems([]);
                      setCustomer('');
                      setDestinationAddress('');
                      setCarrier('');
                      setTransactionType('Outbound');
                      showSuccessToast("Detached and cleared reference slip.");
                    }}
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-xs ${isDark
                      ? 'bg-[#141622] text-rose-300 border-slate-700 hover:border-rose-700 hover:bg-rose-950/40 hover:text-rose-200'
                      : 'bg-white text-rose-600 border-slate-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700'
                      }`}
                    title="Detach and clear this reference slip"
                  >
                    <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>Detach / Clear Ref</span>
                  </button>
                </div>
              </div>
            )}

            {/* COMPACT TRANSACTION TYPE CONTAINER */}
            <div className={`px-3.5 py-2 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 overflow-x-auto ${isDark ? 'bg-[#141622]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
                <span className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Transaction Type:
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${transactionType === 'Outbound'
                  ? (isDark ? 'bg-rose-950/60 text-rose-400 border-rose-800' : 'bg-rose-50 text-rose-700 border-rose-200')
                  : (isDark ? 'bg-amber-950/60 text-amber-400 border-amber-800' : 'bg-amber-50 text-amber-700 border-amber-200')
                  }`}>
                  {transactionType === 'Outbound' ? '🔴 Outbound (Deduct)' : '🟡 Reserve (Hold)'}
                </span>
              </div>

              {/* ACTION TOGGLE BUTTONS */}
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0 flex-nowrap shrink-0">
                <button
                  type="button"
                  onClick={() => setTransactionType('Reserve')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${transactionType === 'Reserve'
                    ? (isDark ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs' : 'bg-amber-500 text-white border-amber-600 shadow-xs')
                    : (isDark ? 'bg-[#0e1017] text-slate-400 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')
                    }`}
                >
                  🟡 Reserve
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionType('Outbound')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${transactionType === 'Outbound'
                    ? (isDark ? 'bg-rose-600 text-white border-rose-500 shadow-xs' : 'bg-red-600 text-white border-red-700 shadow-xs')
                    : (isDark ? 'bg-[#0e1017] text-slate-400 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')
                    }`}
                >
                  🔴 Outbound
                </button>
              </div>
            </div>

            {/* FORM FIELDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Customer Name *</label>
                <select
                  value={customer}
                  onChange={handleCustomerChange}
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
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Logistics Provider *</label>
                <select
                  value={carrier}
                  onChange={e => setCarrier(e.target.value)}
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-800 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer font-medium`}
                  required
                >
                  <option value="" className={isDark ? 'bg-[#141622] text-slate-300' : ''}>Select Logistics</option>
                  {registeredLogistics.map((log) => (
                    <option key={log._id} value={log.name} className={isDark ? 'bg-[#141622] text-white' : ''}>
                      {log.name}
                    </option>
                  ))}
                  {carrier && !registeredLogistics.some(l => l.name === carrier) && (
                    <option value={carrier} className={isDark ? 'bg-[#141622] text-white' : ''}>{carrier}</option>
                  )}
                  {registeredLogistics.length === 0 && (
                    <option disabled value="">No registered logistics found (Go to Client Records)</option>
                  )}
                </select>
              </div>

              <div>
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Date Processed</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="date" value={shipmentDate} onChange={e => setShipmentDate(e.target.value)} className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none`} required />
                </div>
              </div>

              <div>
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Destination Address</label>
                <input
                  type="text"
                  value={destinationAddress}
                  readOnly
                  placeholder="Automatically fetched from selected Customer..."
                  className={`w-full ${isDark ? 'bg-slate-900/70 border-slate-800 text-slate-300 placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400'} border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none cursor-not-allowed select-none`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={`block text-xs sm:text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>Slip Number</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="text" value={referencePlNo ? `REF: ${referencePlNo}` : "[ AUTO-GENERATED ]"} disabled className={`w-full ${isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'} border rounded-lg pl-9 pr-3 py-2 text-sm font-bold select-none cursor-not-allowed focus:outline-none`} />
                </div>
              </div>
            </div>

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
                      const isAdded = manifestItems.some(i => i.materialId === item._id || i.productId === item._id);

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
                        No materials found matching &ldquo;{rawMatSearchQuery}&rdquo; {selectedMaterialSegment !== 'All Segments' ? `in ${selectedMaterialSegment}` : ''}.
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
                  <span className={`text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-md w-fit uppercase ${transactionType === 'Reserve'
                    ? (isDark ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40' : 'text-amber-700 bg-amber-50 border border-amber-200/60')
                    : (isDark ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40' : 'text-rose-700 bg-rose-50 border border-rose-200/60')
                    }`}>
                    {transactionType === 'Reserve' ? '🟡 Quantities will be reserved / held' : '🔴 Quantities will be automatically deducted'}
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

                <div className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'} rounded-xl border shadow-sm overflow-x-auto`}>
                  <table className="w-full text-left border-collapse text-sm min-w-[1000px]">
                    <thead>
                      <tr className={`text-white font-bold ${isDark ? 'bg-[#1c1117] text-rose-300' : 'bg-red-700'} uppercase text-xs whitespace-nowrap`}>
                        <th className="py-3 px-4 text-center w-28 min-w-[112px]">QTY</th>
                        <th className="py-3 px-4 text-center">UOM</th>
                        <th className="py-3 px-4 text-center w-28 min-w-[112px]">Verified Shipped</th>
                        <th className="py-3 px-4">Segment</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Dimension</th>
                        <th className="py-3 px-4">Remarks / Notes</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 bg-[#090b10]' : 'divide-slate-100'}`}>
                      {manifestItems.map((item, index) => (
                        <tr key={index} className={`${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'} text-xs`}>
                          <td className="py-2 px-4 w-28 min-w-[112px]">
                            <input
                              type="number"
                              value={item.qtyRequested}
                              onChange={e => handleUpdateField(index, 'qtyRequested', Number(e.target.value))}
                              onWheel={(e) => e.currentTarget.blur()}
                              className={`w-full border ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'border-slate-200 text-slate-800'} text-center rounded py-1 text-sm focus:outline-none focus:border-[#ff6600] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                              min="1"
                              required
                            />
                          </td>
                          <td className="py-2 px-4 text-center">
                            <span className={`${isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700'} px-2 py-0.5 rounded text-xs`}>{item.UOM}</span>
                          </td>
                          <td className="py-2 px-4 w-28 min-w-[112px]">
                            <input
                              type="number"
                              value={item.actualCountShipped}
                              onChange={e => handleUpdateField(index, 'actualCountShipped', Number(e.target.value))}
                              onWheel={(e) => e.currentTarget.blur()}
                              className={`w-full border ${isDark ? 'bg-[#141622] border-slate-700 text-rose-400' : 'border-slate-200 text-red-600'} text-center rounded py-1 text-sm font-bold focus:outline-none focus:border-red-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                              min="1"
                              required
                            />
                          </td>
                          <td className={`py-2 px-4 italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{item.Segment}</td>
                          <td className={`py-2 px-4 min-w-[200px] whitespace-normal break-words ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={item.ItemDescription}>
                            {item.ItemDescription}
                          </td>
                          <td className={`py-2 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'} whitespace-nowrap`}>{item.Dimension}</td>
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={item.remarks}
                              onChange={e => handleUpdateField(index, 'remarks', e.target.value)}
                              placeholder="Provide context details..."
                              className={`w-full border ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'border-slate-200 text-slate-800'} rounded px-2 py-1 text-xs focus:outline-none focus:border-[#ff6600]`}
                            />
                          </td>
                          <td className="py-2 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setManifestItems(manifestItems.filter((_, i) => i !== index));
                                showSuccessToast("Item removed from outbound manifest lines.");
                              }}
                              className="text-red-500 hover:text-red-700 cursor-pointer p-1 inline-block"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button type="submit" className="w-full bg-[#ff6600] hover:bg-[#e05a00] text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer uppercase shadow-sm">
                  {transactionType === 'Reserve' && referencePlNo
                    ? `Update Reservation (${referencePlNo})`
                    : transactionType === 'Reserve'
                      ? 'Confirm Reservation Slip'
                      : referencePlNo
                        ? `Confirm Outbound & Fulfill (${referencePlNo})`
                        : 'Confirm Outbound Slip'
                  }
                </button>
              </div>
            )}
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
              <input
                type="text"
                value={historySearchQuery}
                onChange={e => setHistorySearchQuery(e.target.value)}
                placeholder="Search slip, customer, or carrier..."
                className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800'} border rounded-lg pl-8 pr-2 py-1 text-xs focus:outline-none`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[440px] pr-1 custom-scrollbar">
            {displayedHistoryLogs.length > 0 ? (
              displayedHistoryLogs.map((rec) => (
                <div
                  key={rec._id}
                  onClick={() => { setSelectedSlip(rec); setIsModalOpen(true); }}
                  className={`${isDark ? 'bg-[#141622] border-slate-800 hover:border-[#ff6600]/60 hover:bg-[#181b29]' : 'bg-white border-slate-100 hover:border-[#18174e]/50 hover:shadow-md'} border rounded-xl p-2.5 flex flex-col gap-0.5 transition-all cursor-pointer group`}
                >
                  <div className={`flex justify-between items-center pb-0.5 border-b ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                    <span className={`text-xs font-black ${isDark ? 'text-[#ff8533] group-hover:text-emerald-400' : 'text-[#18174e] group-hover:text-emerald-600'} flex items-center gap-1 truncate max-w-[150px]`}>
                      {rec.plNo}
                      {rec.isVoided && <span className="text-[8px] bg-rose-950/60 text-rose-300 border border-rose-800 px-1 py-0.5 rounded font-black uppercase">VOIDED</span>}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded-md border ${rec.isVoided
                      ? 'bg-slate-800 text-slate-500 border-slate-700 line-through'
                      : rec.transactionType?.toLowerCase() === 'reserve'
                        ? (isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-600 border-amber-200')
                        : (isDark ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-600 border-emerald-200')
                      }`}>
                      {rec.transactionType}
                    </span>
                  </div>
                  <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'} truncate`}>{rec.customer || 'N/A'}</span>
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                    <span>{rec.shipmentDate ? new Date(rec.shipmentDate).toLocaleDateString() : 'No Date'}</span>
                    <span className="font-bold text-slate-400 truncate max-w-[120px]">
                      {rec.carrier ? `🚚 ${rec.carrier}` : `${rec.items?.length || 0} items`}
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

      {isVoidModalOpen && selectedSlip && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'} backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200'} border rounded-xl w-full max-w-md p-6 shadow-2xl relative animate-in slide-in-from-top-5 duration-300`}>

            {selectedSlip.transactionType?.toLowerCase() === 'reserve' ? (
              <>
                <div className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3 flex items-center justify-between`}>
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-sm tracking-wide flex items-center gap-2`}>
                    Clear Packed Rack
                  </h3>
                  <button
                    onClick={() => setIsVoidModalOpen(false)}
                    className={`${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'} p-1 rounded-lg cursor-pointer flex items-center`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-amber-950/30 border-amber-800/60' : 'bg-amber-50 border-amber-200/80'}`}>
                    <h4 className={`text-sm font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} mb-1.5`}>
                      Are you sure you want to clear this packed rack?
                    </h4>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Slip: <span className="font-mono font-bold text-[#ff8533]">{selectedSlip.plNo}</span> — <span className="font-bold">{selectedSlip.customer}</span>
                    </p>
                    <p className={`text-xs leading-relaxed mt-2.5 font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      ✓ All {selectedSlip.items?.length || 0} item line(s) will be cleared, and all reserved stocks will immediately be returned to your active inventory.
                    </p>
                  </div>
                </div>

                <div className={`flex items-center justify-end gap-2 mt-6 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <button
                    type="button"
                    onClick={() => setIsVoidModalOpen(false)}
                    className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer`}
                  >
                    Keep Packed Rack
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteCancellation}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    Yes, Clear All Items & Return Stock
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={`border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3 flex items-center justify-between`}>
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-sm tracking-wide flex items-center gap-2`}>
                    Void Transaction Log
                  </h3>
                  <button
                    onClick={() => setIsVoidModalOpen(false)}
                    className={`${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'} p-1 rounded-lg cursor-pointer flex items-center`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-4">

                  <div>
                    <label className={`block text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-1`}>
                      Reason for Cancellation / Discrepancy Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={voidReasonInput}
                      onChange={e => setVoidReasonInput(e.target.value)}
                      placeholder="e.g., Wrong item quantity or customer mistake"
                      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400'} border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#ff6600]`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-1`}>
                      Management Reversal Passkey
                    </label>
                    <input
                      type="password"
                      value={passkeyInput}
                      onChange={e => setPasskeyInput(e.target.value)}
                      placeholder="Enter authorized key token"
                      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-slate-700 placeholder-slate-400'} border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff6600] font-mono`}
                    />
                  </div>
                </div>

                <div className={`flex items-center justify-end gap-2 mt-6 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <button
                    type="button"
                    onClick={() => setIsVoidModalOpen(false)}
                    className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer`}
                  >
                    Keep Log Entry
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteCancellation}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Confirm System Void
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {isModalOpen && selectedSlip && (
        <div className={`fixed inset-0 ${isDark ? 'bg-slate-950/70' : 'bg-slate-900/40'} backdrop-blur-sm flex items-center justify-center z-50 p-4`}>
          <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-2xl w-full max-w-3xl p-6 shadow-xl relative flex flex-col gap-4`}>

            <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
              <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-lg`}>
                {selectedSlip.transactionType?.toLowerCase() === 'reserve' ? 'Reservation Slip' : 'Outbound No'}: {selectedSlip.plNo}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={`${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'} p-1 rounded-lg cursor-pointer transition-colors`}
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className={`grid grid-cols-2 text-sm gap-2 ${isDark ? 'bg-[#141622] border-slate-800' : 'bg-slate-50 border-slate-100'} p-4 rounded-xl border`}>
              <div><span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Tracking No:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.plNo}</span></div>
              <div><span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Shipment Date:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.shipmentDate ? new Date(selectedSlip.shipmentDate).toLocaleDateString() : '-'}</span></div>
              <div><span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Log Type:</span> <span className={`font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-700'} uppercase`}>{selectedSlip.transactionType}</span></div>
              <div><span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Prepared By:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.preparedBy || preparedBy}</span></div>
              <div><span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Customer:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.customer || 'N/A'}</span></div>
              <div><span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Logistics:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.carrier || 'N/A'}</span></div>
              <div className="col-span-2"><span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>Destination:</span> <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{selectedSlip.destinationAddress || 'N/A'}</span></div>
              {selectedSlip.referencePlNo && (
                <div className={`col-span-2 text-xs ${isDark ? 'text-amber-300 bg-amber-950/40 border-amber-800' : 'text-amber-700 bg-amber-50 border-amber-200'} font-bold px-2 py-1 rounded border`}>
                  Linked Reference: {selectedSlip.referencePlNo}
                </div>
              )}
            </div>

            {(() => {
              const slipItems = selectedSlip.items || [];
              const modalIndexOfLastRow = modalPage * modalRowsPerPage;
              const modalIndexOfFirstRow = modalIndexOfLastRow - modalRowsPerPage;
              const paginatedSlipItems = slipItems.slice(modalIndexOfFirstRow, modalIndexOfLastRow);

              return (
                <div className={`border ${isDark ? 'border-slate-800' : 'border-slate-200/60'} rounded-xl relative shadow-sm overflow-hidden flex flex-col`}>
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[650px]">

                      <thead className={`sticky top-0 z-10 ${isDark ? 'bg-[#1c1117] text-rose-300' : 'bg-red-700 text-white'} text-[11px] font-bold uppercase whitespace-nowrap`}>
                        <tr>
                          <th className="p-3 text-left">Segment</th>
                          <th className="p-3 text-left">Item Description</th>
                          <th className="p-3 text-left">Dimension</th>
                          <th className="p-3 text-right">
                            {selectedSlip.transactionType?.toLowerCase() === 'reserve' ? 'Reserved Qty' : 'Verified Shipped'}
                          </th>
                        </tr>
                      </thead>

                      <tbody className={`divide-y ${isDark ? 'bg-[#090b10] divide-slate-800' : 'bg-white divide-slate-100'}`}>
                        {paginatedSlipItems.map((it, idx) => {
                          const targetMaterial = it.materialId || it.productId;
                          const targetId = targetMaterial?._id || targetMaterial;
                          const fullMat = dbRawMaterials?.find(m => m._id === targetId);

                          const segment = fullMat?.Segment || fullMat?.segment ||
                            targetMaterial?.Segment || targetMaterial?.segment || "N/A";

                          const description = fullMat?.ItemDescription || targetMaterial?.ItemDescription || "-";

                          let dimension = "N/A";
                          if (fullMat?.Dimension || fullMat?.dimension || fullMat?.Dimensions || fullMat?.dimensions) {
                            dimension = fullMat.Dimension || fullMat.dimension || fullMat.Dimensions || fullMat.dimensions;
                          } else if (targetMaterial?.Dimension || targetMaterial?.dimension || targetMaterial?.Dimensions || targetMaterial?.dimensions) {
                            dimension = targetMaterial.Dimension || targetMaterial.dimension || targetMaterial.Dimensions || targetMaterial.dimensions;
                          } else {
                            const l = fullMat?.Length || fullMat?.length || targetMaterial?.Length || targetMaterial?.length;
                            const w = fullMat?.Width || fullMat?.width || targetMaterial?.Width || targetMaterial?.width;
                            const h = fullMat?.Height || fullMat?.height || targetMaterial?.Height || targetMaterial?.height;
                            if (l || w || h) {
                              dimension = `${l || '-'} × ${w || '-'} × ${h || '-'}`;
                            }
                          }

                          const uom = fullMat?.UOM || targetMaterial?.UOM || '';

                          return (
                            <tr key={it._id || idx} className={`${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/50'} transition-colors`}>
                              <td className={`p-3 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'} whitespace-nowrap align-middle`}>
                                {segment}
                              </td>

                              <td className={`p-3 font-bold ${isDark ? 'text-white' : 'text-[#18174e]'} text-xs min-w-[200px] whitespace-normal break-words align-middle`} title={description}>
                                {description}
                              </td>

                              <td className={`p-3 ${isDark ? 'text-slate-400' : 'text-slate-600'} font-medium whitespace-nowrap align-middle`}>
                                {dimension}
                              </td>

                              <td className="p-3 text-right font-bold text-emerald-400 align-middle whitespace-nowrap">
                                {it.actualCountShipped} {uom}
                              </td>
                            </tr>
                          );
                        })}

                        {(!selectedSlip.items || selectedSlip.items.length === 0) && (
                          <tr>
                            <td colSpan="4" className="p-4 text-center text-slate-400 italic">
                              No materials recorded.
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
                  {transactionType === 'Reserve' && referencePlNo
                    ? `Confirm Update to Reservation ${referencePlNo}`
                    : `Confirm Material ${transactionType} Slip`
                  }
                </h3>
                <p className="text-xs text-slate-400">
                  {transactionType === 'Reserve' && referencePlNo
                    ? 'Review modified reservation lines before updating registry records.'
                    : 'Please review the shipment details before saving to the registry.'
                  }
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

            {/* Context Notice for Partial Outbound or Edit Reserve */}
            {referencePlNo && transactionType === 'Outbound' && manifestItems.some(i => Number(i.actualCountShipped) < Number(i.qtyRequested)) && (
              <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-200 ${isDark ? 'bg-amber-950/40 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <span className="font-bold block uppercase tracking-wider text-[10px]">Partial Outbound Fulfillment</span>
                  <p className="text-[11px] leading-relaxed mt-0.5">
                    Only verified shipped quantities will be dispatched as Outbound. The remaining unshipped items will <strong>automatically be re-reserved under a new packed rack slip</strong> in Quick-Assistant.
                  </p>
                </div>
              </div>
            )}

            {referencePlNo && transactionType === 'Reserve' && (
              <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-200 ${isDark ? 'bg-amber-950/40 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <span className="font-bold block uppercase tracking-wider text-[10px]">Updating Reservation {referencePlNo}</span>
                  <p className="text-[11px] leading-relaxed mt-0.5">
                    Saving these changes will directly update this packed rack in the registry and reconcile raw material stock counts accordingly.
                  </p>
                </div>
              </div>
            )}

            {/* Details Summary Card */}
            <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border text-xs ${isDark ? 'bg-[#141622]/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Transaction Type</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${transactionType === 'Outbound' ? (isDark ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800' : 'bg-indigo-50 text-indigo-700 border border-indigo-200') : (isDark ? 'bg-amber-950/60 text-amber-300 border border-amber-800' : 'bg-amber-50 text-amber-700 border border-amber-200')}`}>
                  {transactionType}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Shipment Date</span>
                <span className="font-semibold">{shipmentDate ? new Date(shipmentDate).toLocaleDateString() : '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Customer</span>
                <span className="font-semibold">{customer || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Carrier</span>
                <span className="font-semibold">{carrier || 'N/A'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Destination Address</span>
                <span className="font-semibold truncate block">{destinationAddress || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Prepared By</span>
                <span className="font-semibold">{preparedBy}</span>
              </div>
              {referencePlNo && (
                <div className="sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Reference Slip</span>
                  <span className={`font-mono font-bold ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`}>{referencePlNo}</span>
                </div>
              )}
            </div>

            {/* Manifest Items Table */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-xs font-bold px-1">
                <span className="uppercase text-slate-400">Materials to Dispatch ({manifestItems.length})</span>
                <span className="text-rose-500 font-bold">
                  Total Shipped: {manifestItems.reduce((sum, item) => sum + (Number(item.actualCountShipped) || 0), 0)}
                </span>
              </div>
              <div className={`rounded-xl border overflow-hidden max-h-56 overflow-y-auto ${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-200'}`}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className={`uppercase text-[10px] font-bold ${isDark ? 'bg-[#141622] text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-600 border-b border-slate-200'}`}>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">Segment</th>
                      <th className="py-2 px-3">Dimension</th>
                      <th className="py-2 px-3 text-center">Qty Req</th>
                      <th className="py-2 px-3 text-center font-bold text-rose-500">Shipped Qty</th>
                      <th className="py-2 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                    {manifestItems.map((item, idx) => (
                      <tr key={idx} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                        <td className="py-2 px-3 font-semibold min-w-[180px] whitespace-normal break-words" title={item.ItemDescription}>
                          {item.ItemDescription}
                        </td>
                        <td className="py-2 px-3 text-slate-400">
                          {item.Segment || item.segment || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{item.Dimension || item.dimensions || '—'}</td>
                        <td className="py-2 px-3 text-center text-slate-400">
                          {item.qtyRequested}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-rose-500">
                          {item.actualCountShipped}
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
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
              >
                Cancel / Edit
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSavePL}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#ff6600] hover:bg-[#e05a00] disabled:opacity-50 transition-all cursor-pointer shadow-md"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Slip...</span>
                  </>
                ) : (
                  <span>
                    {transactionType === 'Reserve' && referencePlNo
                      ? `Save Changes to Reservation`
                      : `Save Packaging List`
                    }
                  </span>
                )}
              </button>
            </div>

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
                  Browse Raw Materials
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
                    placeholder="Search description, dimension, segment, or code..."
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
                    <th className="py-2.5 px-3 whitespace-nowrap">Segment</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Available Stock</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                  {modalFilteredMaterials.length > 0 ? (
                    modalFilteredMaterials.map(item => {
                      const isAdded = manifestItems.some(i => i.materialId === item._id || i.productId === item._id);
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

            {/* Footer */}
            <div className={`flex items-center justify-between mt-2 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                Showing {modalFilteredMaterials.length} of {dbRawMaterials.length} materials
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

export default InventoryOutboundProducts;
