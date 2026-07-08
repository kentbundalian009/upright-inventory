import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, ClipboardList, Calendar, Trash2, Search, X, Download, User, ArrowLeftRight, Eye, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import PageHeader from '../Common/PageHeader';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.MODE === 'production'
  ? 'https://one-inventory.onrender.com/api'
  : 'http://localhost:5000/api';

const RAW_MAT_URL = `${API_BASE_URL}/raw-materials`;
const PL_URL = `${API_BASE_URL}/packing-lists`;

// Security Master Passkey kapag pinilit i-cancel ang isang "Outbound" log type
const MASTER_CANCELLATION_KEY = "VOID-CONFIRM-2026";

function OutboundProducts() {
  const [dbRawMaterials, setDbRawMaterials] = useState([]);
  const [plRecords, setPlRecords] = useState([]);
  const [rawMatSearchQuery, setRawMatSearchQuery] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState(''); 
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Mga bagong states para sa Custom Void Modal
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [passkeyInput, setPasskeyInput] = useState('');
  
  // Packing List Form States
  const [transactionType, setTransactionType] = useState('Outbound'); 
  const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [customer, setCustomer] = useState('');
  const [carrier, setCarrier] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [manifestItems, setManifestItems] = useState([]);
  const [referencePlNo, setReferencePlNo] = useState(''); 
  const [preparedBy, setPreparedBy] = useState('System User');
  
  // Unique lists para sa dropdown suggestions
  const [existingCustomers, setExistingCustomers] = useState([]);
  const [existingCarriers, setExistingCarriers] = useState([]);
  const [existingDestinations, setExistingDestinations] = useState([]);

  // CUSTOM TOAST TEMPLATE LAYOUTS FOR UI CONSISTENCY
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
      const [rawMatRes, plsRes] = await Promise.all([
        axios.get(RAW_MAT_URL), 
        axios.get(PL_URL)
      ]);

      if (rawMatRes.data) {
        setDbRawMaterials(rawMatRes.data.filter(p => !p.isArchived));
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
      }
    } catch (err) { 
      console.error("Error loading registry data:", err);
      showErrorToast("Failed to load registry data from server.");
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

  const handleSelectRawMaterial = (item) => {
    if (manifestItems.some(i => i.materialId === item._id || i.productId === item._id)) {
      showErrorToast("This material is already in the manifest list.");
      return setRawMatSearchQuery('');
    }
    setManifestItems([...manifestItems, {
      materialId: item._id, // Ginawang materialId para magtugma sa raw material schema
      Code: item.Code, 
      ItemDescription: item.ItemDescription,
      qtyRequested: 1, 
      UOM: item.UOM, 
      actualCountShipped: 1, 
      remarks: ''
    }]);
    setRawMatSearchQuery('');
  };

  const handleFastReturnCopy = (reserveSlip) => {
    setTransactionType("Outbound"); 
    setCustomer(reserveSlip.customer || '');
    setCarrier(reserveSlip.carrier || '');
    setDestinationAddress(reserveSlip.destinationAddress || '');
    setReferencePlNo(reserveSlip.plNo); 
    
    const fastItems = reserveSlip.items.map(it => {
      const targetMaterial = it.materialId || it.productId;
      return {
        materialId: targetMaterial?._id || targetMaterial,
        Code: targetMaterial?.Code || 'N/A',
        ItemDescription: targetMaterial?.ItemDescription || '-',
        qtyRequested: it.qtyRequested,
        UOM: targetMaterial?.UOM || 'pcs',
        actualCountShipped: it.qtyRequested, 
        remarks: `Released from Reserve Slip ${reserveSlip.plNo}`
      };
    });
    
    setManifestItems(fastItems);
    showSuccessToast(`Loaded items from Reserve Slip ${reserveSlip.plNo}`);
  };

  const handleUpdateField = (index, field, val) => {
    const updated = [...manifestItems];
    updated[index][field] = val;
    if (field === 'qtyRequested') {
      updated[index]['actualCountShipped'] = val;
    }
    setManifestItems(updated);
  };

  const handleSubmitPL = async (e) => {
    e.preventDefault();
    if (manifestItems.length === 0) {
      showErrorToast("Please add material lines into your list manifest.");
      return;
    }

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
        showSuccessToast(`Material ${transactionType} Slip generated and stock updated!`);
        setManifestItems([]); setCustomer(''); setCarrier(''); setDestinationAddress(''); setReferencePlNo('');
        setTransactionType('Outbound');
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

      // Row 1 Meta
      doc.text("Slip Number:", 14, 42); 
      doc.setFont("helvetica", "normal"); 
      doc.text(`${selectedSlip.plNo}`, 45, 42);
      doc.setFont("helvetica", "bold"); 
      doc.text("Date Logged:", 120, 42); 
      doc.setFont("helvetica", "normal"); 
      doc.text(`${selectedSlip.shipmentDate ? new Date(selectedSlip.shipmentDate).toLocaleDateString() : '-'}`, 155, 42);

      // Row 2 Meta
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

      // Row 3 Meta
      doc.setFont("helvetica", "bold");
      doc.text("Customer Name:", 14, 56); 
      doc.setFont("helvetica", "normal"); 
      doc.text(`${selectedSlip.customer || 'N/A'}`, 45, 56);

      // Row 4 Meta
      doc.setFont("helvetica", "bold");
      doc.text("Destination:", 14, 63); 
      doc.setFont("helvetica", "normal"); 
      doc.text(`${selectedSlip.destinationAddress || 'N/A'}`, 45, 63);

      const tableColumns = ["Material Profile", "Requested QTY", "Shipped QTY Count", "Item Remarks"];
      const tableRows = selectedSlip.items?.map(it => {
        const targetMaterial = it.materialId || it.productId;
        return [
          `${targetMaterial?.Code || 'N/A'}\n${targetMaterial?.ItemDescription || '-'}`,
          `${it.qtyRequested} ${targetMaterial?.UOM || ''}`,
          `${it.actualCountShipped} ${targetMaterial?.UOM || ''}`,
          it.remarks || "-"
        ];
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
        headStyles: { fillColor: [32, 31, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9, valign: 'middle' },
        bodyStyles: { fontSize: 8, textColor: [60, 60, 60], valign: 'middle' },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { overflow: 'linebreak', cellPadding: 3, lineColor: [230, 230, 230], lineWidth: 0.2 },
        columnStyles: { 
          0: { cellWidth: 85 }, 
          1: { cellWidth: 28, halign: 'center' }, 
          2: { cellWidth: 32, halign: 'center', fontStyle: 'bold' }, 
          3: { cellWidth: 41 } 
        }
      });
      
      doc.save(`OUTBOUND_SLIP_${selectedSlip.plNo}.pdf`);
      showSuccessToast("PDF Downloaded successfully!");
    } catch(e) {
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
      const res = await axios.delete(`${PL_URL}/${selectedSlip._id}`);
      if (res.status === 200) {
        showSuccessToast(`Log Entry ${selectedSlip.plNo} successfully voided.`);
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

  const filteredRawMatSuggestions = dbRawMaterials.filter(item => 
    item.Code?.toLowerCase().includes(rawMatSearchQuery.toLowerCase()) ||
    item.ItemDescription?.toLowerCase().includes(rawMatSearchQuery.toLowerCase())
  );

  const completedPlNumbers = plRecords
    .filter(r => r.transactionType?.toLowerCase() === "outbound" && r.referencePlNo)
    .map(r => r.referencePlNo.toString().replace("REF: ", "").trim().toLowerCase());

  const activeReserves = plRecords.filter(r => 
    r.transactionType?.toLowerCase() === "reserve" && 
    !completedPlNumbers.includes(r.plNo?.toString().trim().toLowerCase())
  );

  const filteredHistoryLogs = plRecords.filter(rec => 
    rec.plNo?.toLowerCase().includes(historySearchQuery.toLowerCase()) ||
    rec.customer?.toLowerCase().includes(historySearchQuery.toLowerCase())
  );

  const displayedHistoryLogs = historySearchQuery ? filteredHistoryLogs : filteredHistoryLogs.slice(0, 4);

  return (
    <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased text-slate-600">
      
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
        <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
            <Eye className="w-3.5 h-3.5 text-amber-600" />
            <span>Quick-Outbound Assistant: Select a pending reserved stock log below to fulfill transaction</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            {activeReserves.map(b => (
              <div key={b._id} className="flex items-center bg-white border border-amber-200 rounded-lg shadow-2xs group shrink-0 overflow-hidden">
                <button 
                  type="button" 
                  onClick={() => handleFastReturnCopy(b)}
                  className="hover:bg-amber-50/70 text-amber-900 px-3 py-1.5 font-medium cursor-pointer transition-all flex items-center gap-1 border-r border-amber-100"
                >
                  Fulfill <span className="font-bold text-[#18174e]">{b.plNo}</span> ({b.customer})
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenVoidModal(b)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                  title="Void and Cancel This Reservation Entry"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 flex flex-col gap-6 shadow-sm">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between text-sm font-bold text-slate-600">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-[#18174e]" />
              <span>Materials Outbound & Logistics Slip</span>
            </div>
            {manifestItems.length > 0 && (
              <button type="button" onClick={() => { setManifestItems([]); setReferencePlNo(''); setTransactionType('Outbound'); showSuccessToast("Form grid cleared."); }} className="text-xs font-bold text-rose-500 hover:underline cursor-pointer">Clear Form Grid</button>
            )}
          </div>

          <form onSubmit={handleSubmitPL} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Slip Number</label>
                <div className="relative"><FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="text" value={referencePlNo ? `REF: ${referencePlNo}` : "[ AUTO-GENERATED ]"} disabled className="w-full bg-slate-50 border border-slate-200 text-slate-400 rounded-lg pl-9 pr-3 py-2 text-sm font-bold select-none cursor-not-allowed focus:outline-none" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Transaction Type</label>
                <select 
                  value={transactionType} 
                  onChange={e => setTransactionType(e.target.value)} 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none text-[#18174e]"
                >
                  <option value="Outbound">🔴 Outbound (Deduct & Dispatch)</option>
                  <option value="Reserve">🟡 Reserve (Hold Stock)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Date Processed</label>
                <div className="relative"><Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="date" value={shipmentDate} onChange={e => setShipmentDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Customer Name</label>
                <input 
                  type="text" 
                  list="customers-list"
                  value={customer} 
                  onChange={e => setCustomer(e.target.value)} 
                  placeholder="Enter customer name" 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" 
                  required 
                />
                <datalist id="customers-list">
                  {existingCustomers.map((cust, i) => (
                    <option key={i} value={cust} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Logistics</label>
                <input 
                  type="text" 
                  list="carriers-list"
                  value={carrier} 
                  onChange={e => setCarrier(e.target.value)} 
                  placeholder="Enter logistics name" 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" 
                />
                <datalist id="carriers-list">
                  {existingCarriers.map((car, i) => (
                    <option key={i} value={car} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Destination Address</label>
                <input 
                  type="text" 
                  list="destinations-list"
                  value={destinationAddress} 
                  onChange={e => setDestinationAddress(e.target.value)} 
                  placeholder="Enter destination address" 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" 
                />
                <datalist id="destinations-list">
                  {existingDestinations.map((dest, i) => (
                    <option key={i} value={dest} />
                  ))}
                </datalist>
              </div>
              
              <div className="sm:col-span-3">
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Prepared Name</label>
                <div className="relative"><User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="text" value={preparedBy} disabled className="w-full bg-slate-50 border border-slate-200 text-slate-400 rounded-lg pl-9 pr-3 py-2 text-sm font-semibold cursor-not-allowed select-none focus:outline-none" />
                </div>
              </div>
            </div>

            {/* --- STEP 1: ALLOCATE RAW MATERIAL (INPUT) --- */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col gap-1.5 relative">
              <label className="block text-sm font-bold text-red-800 uppercase">Step 1: Type / Select Materials for Stock Deduction  </label>
              <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input type="text" value={rawMatSearchQuery} onChange={e => setRawMatSearchQuery(e.target.value)} placeholder="Search raw material code or description..." className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none" />
              </div>
              {rawMatSearchQuery && (
                <div className="absolute left-0 right-0 top-[102%] bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto z-50 divide-y divide-slate-100 p-1">
                  {filteredRawMatSuggestions.length > 0 ? (
                    filteredRawMatSuggestions.map(item => (
                      <div key={item._id} onClick={() => handleSelectRawMaterial(item)} className="p-3 hover:bg-slate-50 cursor-pointer flex flex-col gap-1 rounded-lg transition-colors">
                        <div className="flex justify-between items-center font-bold text-slate-800 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-mono">{item.Code}</span>
                            <span className="text-xs font-medium text-slate-400 lowercase italic">{item.UOM || 'pcs'}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Avail: {item.ActualCount || 0}
                          </span>
                        </div>
                        <span className="text-slate-800 font-semibold text-sm truncate">{item.ItemDescription}</span>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 font-medium pt-0.5">
                          <span className="bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Cat: {item.Category || item.category || 'Raw Material'}</span>
                          {(item.Segment || item.segment) && <span className="bg-slate-50 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Seg: {item.Segment || item.segment}</span>}
                          {(item.Dimensions || item.dimensions || item.Dimension || item.dimension) && (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-mono">Dim: {item.Dimensions || item.dimensions || item.Dimension || item.dimension}</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-xs italic text-slate-400 text-center">No raw material stock found matching.</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-1 rounded w-fit uppercase tracking-wider">Quantities will be automatically deducted</span>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="text-white font-bold bg-[#18174e] uppercase text-xs whitespace-nowrap">
                      <th className="py-3 px-4">Material Code</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-center w-16">QTY</th>
                      <th className="py-3 px-4 text-center">UOM</th>
                      <th className="py-3 px-4 text-center w-20">Verified Shipped</th>
                      <th className="py-3 px-4">Remarks / Notes</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {manifestItems.length > 0 ? (
                      manifestItems.map((item, index) => (
                        <tr key={index} className="hover:bg-slate-50/80">
                          <td className="py-2 px-4 font-bold">{item.Code}</td>
                          <td className="py-2 px-4 text-xs truncate max-w-[165px]">{item.ItemDescription}</td>
                          <td className="py-2 px-4"><input type="number" value={item.qtyRequested} onChange={e => handleUpdateField(index, 'qtyRequested', Number(e.target.value))} className="w-12 border text-center rounded text-sm" min="1" required /></td>
                          <td className="py-2 px-4 text-center"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{item.UOM}</span></td>
                          <td className="py-2 px-4"><input type="number" value={item.actualCountShipped} onChange={e => handleUpdateField(index, 'actualCountShipped', Number(e.target.value))} className="w-14 border text-center rounded text-sm font-bold text-emerald-600" min="1" required /></td>
                          <td className="py-2 px-4"><input type="text" value={item.remarks} onChange={e => handleUpdateField(index, 'remarks', e.target.value)} placeholder="Provide context details" className="w-full border rounded px-1 text-xs" /></td>
                          <td className="py-2 px-4 text-center">
                            <button type="button" onClick={() => { setManifestItems(manifestItems.filter((_, i) => i !== index)); showSuccessToast("Item removed from outbound manifest lines."); }} className="text-red-500 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="7" className="text-center py-6 text-slate-400 italic text-xs">No entries added. Use search input or select from Quick-Outbound Assistant.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <button type="submit" className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xs text-sm transition-colors cursor-pointer uppercase">Save Packaging List</button>
          </form>
        </div>

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
                placeholder="Search slip or customer..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1 text-xs focus:outline-none" 
              />
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5 overflow-hidden">
            {displayedHistoryLogs.length > 0 ? (
              displayedHistoryLogs.map((rec) => (
                <div 
                  key={rec._id} 
                  onClick={() => { setSelectedSlip(rec); setIsModalOpen(true); }} 
                  className="bg-white border border-slate-100 rounded-xl p-2.5 flex flex-col gap-0.5 hover:border-[#18174e]/50 transition-all cursor-pointer hover:shadow-md group"
                >
                  <div className="flex justify-between items-center pb-0.5 border-b border-slate-50">
                    <span className="text-xs font-black text-[#18174e] group-hover:text-emerald-600">{rec.plNo}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 font-bold rounded-md ${rec.transactionType?.toLowerCase() === 'reserve' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {rec.transactionType}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate">{rec.customer || 'N/A'}</span>
                  <span className="text-[10px] font-semibold text-slate-400">{rec.shipmentDate ? new Date(rec.shipmentDate).toLocaleDateString() : 'No Date'}</span>
                </div>
              ))
            ) : (
              <span className="text-center text-xs italic text-slate-400 pt-4">No matching logs found.</span>
            )}
          </div>

          {!historySearchQuery && plRecords.length > 4 && (
            <div className="text-[10px] text-center font-semibold text-slate-400 mt-auto pt-2 border-t border-slate-50">
              Showing latest 4 entries. Use search to view more records.
            </div>
          )}
        </div>
      </div>

      {/* CUSTOM VOID TRANSACTION CONFIRMATION MODAL */}
      {isVoidModalOpen && selectedSlip && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-10 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-2xl relative animate-in slide-in-from-top-5 duration-300">
            
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm tracking-wide flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#18174e]" /> Void Transaction Log
              </h3>
              <button 
                onClick={() => setIsVoidModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="bg-slate-50 text-slate-600 border border-slate-100 rounded-lg p-4 text-xs font-medium leading-relaxed flex flex-col gap-2">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-[#18174e] shrink-0" />
                  Security Warning Notice
                </div>
                {selectedSlip.transactionType?.toLowerCase() === 'outbound' ? (
                  <span>
                    This is an active <span className="font-bold text-[#18174e]">OUTBOUND</span> dispatch record. 
                    Cancelling dispatched orders disrupts supply chain tracking and returns items back to the active stock pile. 
                    You must provide a valid system reversal passkey.
                  </span>
                ) : (
                  <span>
                    Are you sure you want to cancel Reserve Slip: <span className="font-bold text-[#18174e]">{selectedSlip.plNo}</span>? 
                    All locked stock volumes from this log will be fully returned to available registry counts.
                  </span>
                )}
              </div>

              {selectedSlip.transactionType?.toLowerCase() === 'outbound' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Management Reversal Passkey
                  </label>
                  <input 
                    type="password"
                    value={passkeyInput}
                    onChange={e => setPasskeyInput(e.target.value)}
                    placeholder="Enter authorized key token" 
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e] focus:ring-1 focus:ring-[#18174e]/20 text-slate-700 placeholder-slate-400 font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setIsVoidModalOpen(false)} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Keep Log Entry
              </button>
              <button 
                type="button" 
                onClick={handleExecuteCancellation}
                className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Confirm System Void
              </button>
            </div>

          </div>
        </div>
      )}

      {/* VIEW DETAILS LOG MODAL */}
      {isModalOpen && selectedSlip && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl p-6 shadow-xl relative text-slate-700 flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-lg">Log View: {selectedSlip.plNo}</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleOpenVoidModal(selectedSlip)} 
                  className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Void Transaction
                </button>

                <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer">
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {selectedSlip.transactionType?.toLowerCase() === 'outbound' && (
              <div className="bg-red-200 text-red-800 border border-red-500 rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
                <span>Notice: Cancelling active Outbound entries strictly demands high-level managerial approval passkey.</span>
              </div>
            )}

            <div className="grid grid-cols-2 text-sm gap-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div><span className="font-semibold text-slate-400">Tracking No:</span> <span className="font-bold text-slate-800">{selectedSlip.plNo}</span></div>
              <div><span className="font-semibold text-slate-400">Shipment Date:</span> <span className="font-bold text-slate-800">{selectedSlip.shipmentDate ? new Date(selectedSlip.shipmentDate).toLocaleDateString() : '-'}</span></div>
              <div><span className="font-semibold text-slate-400">Log Type:</span> <span className="font-bold text-indigo-700 uppercase">{selectedSlip.transactionType}</span></div>
              <div><span className="font-semibold text-slate-400">Prepared By:</span> <span className="font-bold text-slate-800">{selectedSlip.preparedBy || preparedBy}</span></div>
              <div><span className="font-semibold text-slate-400">Customer:</span> <span className="font-bold text-slate-800">{selectedSlip.customer || 'N/A'}</span></div>
              <div><span className="font-semibold text-slate-400">Destination:</span> <span className="font-bold text-slate-800">{selectedSlip.destinationAddress || 'N/A'}</span></div>
              {selectedSlip.referencePlNo && (
                <div className="col-span-2 text-xs text-amber-700 font-bold bg-amber-50 px-2 py-1 rounded border border-amber-200">Linked Reference: {selectedSlip.referencePlNo}</div>
              )}
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-64 border border-slate-100 rounded-xl relative">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#18174e] text-white font-bold uppercase sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="p-3">Material Profile</th>
                    <th className="p-3 text-center">QTY Ordered</th>
                    <th className="p-3 text-center">Verified Shipped</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {selectedSlip.items?.map((it, idx) => {
                    const targetMaterial = it.materialId || it.productId;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <div className="font-bold text-[#18174e]">{targetMaterial?.Code || "N/A"}</div>
                          <div className="text-slate-400 text-[11px] max-w-xs truncate" title={targetMaterial?.ItemDescription}>{targetMaterial?.ItemDescription || "-"}</div>
                        </td>
                        <td className="p-3 text-center font-semibold text-slate-700">{it.qtyRequested} {targetMaterial?.UOM}</td>
                        <td className="p-3 text-center font-bold text-emerald-600">{it.actualCountShipped} {targetMaterial?.UOM}</td>
                        <td className="p-3 italic text-slate-500">{it.remarks || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default OutboundProducts;