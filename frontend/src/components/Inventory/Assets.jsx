import React, { useState, useEffect } from 'react';
// 1. Idinagdag ang Download icon dito
import { Search, Plus, Edit2, Archive, X, Filter, RotateCcw, EyeOff, CheckCircle2, Download } from 'lucide-react';
import axios from 'axios';
import PageHeader from '../Common/PageHeader';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function Assets() {
  const [assetsList, setAssetsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  // 🔔 UI Notification States
  const [successMessage, setSuccessMessage] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    actionType: '', // 'archive' o 'restore'
    targetAsset: null
  });

  // 🎯 Dropdown Filtering Options (Para sa filter bar)
  const categories = ['All Categories', ...new Set(assetsList.map(item => item.Category).filter(Boolean))];
  const segments = ['All Segments', ...new Set(assetsList.map(item => item.Segment).filter(Boolean))];
  const descriptions = ['All Item Descriptions', ...new Set(assetsList.map(item => item.ItemDescription).filter(Boolean))];

  // 🚀 DATALIST OPTIONS PARA SA LOOB NG MODAL (Unique values mula sa DB)
  const uniqueCategoriesInDB = [...new Set(assetsList.map(item => item.Category).filter(Boolean))];
  const uniqueSegmentsInDB = [...new Set(assetsList.map(item => item.Segment).filter(Boolean))];
  const uniqueDescriptionsInDB = [...new Set(assetsList.map(item => item.ItemDescription).filter(Boolean))];
  const uniqueBrandsInDB = [...new Set(assetsList.map(item => item.Brand).filter(Boolean))];
  const uniqueUomsInDB = [...new Set(assetsList.map(item => item.UOM).filter(Boolean))];
  const uniqueAccountsInDB = [...new Set(assetsList.map(item => item.AccountTo).filter(Boolean))];

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSegment, setSelectedSegment] = useState('All Segments');
  const [selectedDescription, setSelectedDescription] = useState('All Item Descriptions');
  const [selectedConditionFilter, setSelectedConditionFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // Form States
  const [assetCode, setAssetCode] = useState('');
  const [assetCategory, setAssetCategory] = useState('');
  const [assetSegment, setAssetSegment] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [assetBrand, setAssetBrand] = useState('');
  const [assetUom, setAssetUom] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [accountTo, setAccountTo] = useState('');
  const [actualCount, setActualCount] = useState(1);

  // Condition Breakdown States
  const [goodCount, setGoodCount] = useState(1);
  const [usedCount, setUsedCount] = useState(0);
  const [damagedCount, setDamagedCount] = useState(0);

  // Auto-dismiss success toast pagkalipas ng 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/assets');
      if (Array.isArray(response.data)) {
        setAssetsList(response.data);
      } else if (response.data && Array.isArray(response.data.data)) {
        setAssetsList(response.data.data);
      } else {
        setAssetsList([]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch database records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // Sync kapag binago ang mismong Actual Count Input
  const handleActualCountChange = (val) => {
    const count = Number(val) || 0;
    setActualCount(count);
    setGoodCount(count);
    setUsedCount(0);
    setDamagedCount(0);
  };

  // Sync kapag ang breakdown naman ang binago ng user
  const handleBreakdownChange = (type, val) => {
    const num = Number(val) || 0;
    let g = goodCount, u = usedCount, d = damagedCount;

    if (type === 'good') { setGoodCount(num); g = num; }
    if (type === 'used') { setUsedCount(num); u = num; }
    if (type === 'damaged') { setDamagedCount(num); d = num; }

    setActualCount(g + u + d);
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setAssetCode('');
    setAssetCategory('');
    setAssetSegment('');
    setItemDescription('');
    setAssetBrand('');
    setAssetUom('');
    setActualCount(1);
    setGoodCount(1);
    setUsedCount(0);
    setDamagedCount(0);
    setAcquisitionDate('');
    setAccountTo('');
    setIsModalOpen(true);
  };

  const openEditModal = (asset) => {
    setIsEditing(true);
    setCurrentId(asset._id);
    setAssetCode(asset.Code);
    setAssetCategory(asset.Category);
    setAssetSegment(asset.Segment || '');
    setItemDescription(asset.ItemDescription);
    setAssetBrand(asset.Brand || '');
    setAssetUom(asset.UOM);
    setActualCount(asset.ActualCount || 0);

    setGoodCount(asset.ConditionBreakdown?.Good || 0);
    setUsedCount(asset.ConditionBreakdown?.Used || 0);
    setDamagedCount(asset.ConditionBreakdown?.Damaged || 0);

    if (asset.AcquisitionDate) {
      setAcquisitionDate(new Date(asset.AcquisitionDate).toISOString().split('T')[0]);
    } else {
      setAcquisitionDate('');
    }
    setAccountTo(asset.AccountTo || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (Number(actualCount) <= 0) {
      alert("Please input a valid quantity for Actual Count.");
      return;
    }

    const payload = {
      Code: assetCode.trim(),
      Category: assetCategory.trim(),
      Segment: assetSegment.trim(),
      ItemDescription: itemDescription.trim(),
      Brand: assetBrand.trim(),
      UOM: assetUom.trim(),
      ActualCount: Number(actualCount),
      ConditionBreakdown: {
        Good: Number(goodCount),
        Used: Number(usedCount),
        Damaged: Number(damagedCount),
      },
      AcquisitionDate: acquisitionDate || null,
      AccountTo: accountTo.trim(),
    };

    try {
      if (isEditing) {
        await axios.put(`/api/assets/${currentId}`, payload);
        setSuccessMessage("Asset configuration has been successfully updated!");
      } else {
        await axios.post('/api/assets', payload);
        setSuccessMessage("New asset record successfully registered to database!");
      }
      setIsModalOpen(false);
      fetchAssets();
    } catch (err) {
      alert(err.response?.data?.message || "Error saving database item.");
    }
  };

  // 🔍 Trigger Custom Confirmation Modals
  const triggerArchiveConfirm = (asset) => {
    setConfirmModalConfig({
      title: 'Archive Asset Confirmation',
      message: `Are you sure you want to transfer "${asset.ItemDescription}" to the Archive Vault?`,
      actionType: 'archive',
      targetAsset: asset
    });
    setIsConfirmModalOpen(true);
  };

  const triggerUnarchiveConfirm = (asset) => {
    setConfirmModalConfig({
      title: 'Restore Asset Confirmation',
      message: `Are you sure you want to restore "${asset.ItemDescription}" back to the active list?`,
      actionType: 'restore',
      targetAsset: asset
    });
    setIsConfirmModalOpen(true);
  };

  // 🛠️ Handler para sa Custom Confirmation Action
  const handleConfirmAction = async () => {
    const { actionType, targetAsset } = confirmModalConfig;
    if (!targetAsset) return;

    try {
      if (actionType === 'archive') {
        await axios.delete(`/api/assets/${targetAsset._id}`);
        setSuccessMessage(`"${targetAsset.ItemDescription}" has been moved to Archive Vault.`);
      } else if (actionType === 'restore') {
        await axios.put(`/api/assets/${targetAsset._id}`, { ...targetAsset, isArchived: false });
        setSuccessMessage(`"${targetAsset.ItemDescription}" successfully restored to Active assets.`);
      }
      setIsConfirmModalOpen(false);
      fetchAssets();
    } catch (err) {
      alert(`Failed to complete action: ${actionType}`);
      setIsConfirmModalOpen(false);
    }
  };

  // Filtering Logic
  const currentDisplayList = assetsList.filter(asset =>
    showArchivedOnly ? asset.isArchived === true : !asset.isArchived
  );

  const filteredAssets = currentDisplayList.filter(asset => {
    const matchesCategory = selectedCategory === 'All Categories' || asset.Category === selectedCategory;
    const matchesSegment = selectedSegment === 'All Segments' || asset.Segment === selectedSegment;
    const matchesDescription = selectedDescription === 'All Item Descriptions' || asset.ItemDescription === selectedDescription;

    let matchesCondition = true;
    if (selectedConditionFilter === 'Has Good') matchesCondition = (asset.ConditionBreakdown?.Good > 0);
    if (selectedConditionFilter === 'Has Used') matchesCondition = (asset.ConditionBreakdown?.Used > 0);
    if (selectedConditionFilter === 'Has Damaged') matchesCondition = (asset.ConditionBreakdown?.Damaged > 0);

    const matchesSearch =
      (asset.Code && asset.Code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.Brand && asset.Brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.ItemDescription && asset.ItemDescription.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.AccountTo && asset.AccountTo.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSegment && matchesDescription && matchesCondition && matchesSearch;
  });

  // 📄 ENHANCED UI VERSION: Patterned after the Premium Top-Banner UI Design
  const downloadPDFReport = () => {
    try {
      if (filteredAssets.length === 0) {
        alert("No data available to export for the current filters.");
        return;
      }

      // 1. Setup A4 Landscape dimensions
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = 297;  // A4 Landscape Width
      const pageHeight = 210; // A4 Landscape Height
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;

      const formattedDate = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      // --- MGA DETALYE SA ITAAS NG TALAHANAYAN (Metadata Section) ---
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);

      // Row 1 Meta
      doc.text("Report Type:", 14, 42);
      doc.setFont("helvetica", "normal");
      doc.text("Asset Management Registry", 45, 42);

      doc.setFont("helvetica", "bold");
      doc.text("Date Generated:", 180, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${new Date().toLocaleDateString()}`, 215, 42);

      // Row 2 Meta
      doc.setFont("helvetica", "bold");
      doc.text("Target Category:", 14, 49);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229); // Accent text color
      doc.text(`${selectedCategory}`, 45, 49);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Registry Status:", 180, 49);
      doc.setFont("helvetica", "normal");
      doc.text(`${showArchivedOnly ? 'Archived Assets Only' : 'Active Registry Only'}`, 215, 49);

      // --- PAGHAHANDA NG DATA NG TALAHANAYAN ---
      const tableColumns = ["Code", "Category", "Description", "Brand", "Qty", "UOM", "Condition Breakdown", "Acq. Date", "Account To"];
      const tableRows = filteredAssets.map(asset => [
        asset.Code || '—',
        asset.Category || '—',
        asset.ItemDescription || '—',
        asset.Brand || '—',
        asset.ActualCount ? String(asset.ActualCount) : '0',
        asset.UOM || '—',
        `Good: ${asset.ConditionBreakdown?.Good || 0} | Used: ${asset.ConditionBreakdown?.Used || 0} | Repair: ${asset.ConditionBreakdown?.Damaged || 0}`,
        asset.AcquisitionDate ? new Date(asset.AcquisitionDate).toLocaleDateString() : '—',
        asset.AccountTo || '—'
      ]);

      // --- AUTOTABLE GENERATION WITH EMBEDDED TOP BANNER & WATERMARK ---
      autoTable(doc, {
        startY: 58,
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',

        didDrawPage: (data) => {
          // 1. Watermark Layer
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.05 }));
          const logoWidth = 75;
          const logoHeight = 75;
          const logoX = centerX - (logoWidth / 2);
          const logoY = centerY - (logoHeight / 2);
          doc.addImage('/one.logo.png', 'PNG', logoX, logoY, logoWidth, logoHeight);
          doc.restoreGraphicsState();

          // 2. Branding Header Top Bar Block (Full Landscape width)
          doc.setFillColor(24, 23, 78);
          doc.rect(0, 0, pageWidth, 30, 'F');

          // 3. Header Texts (Centered Alignment)
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text(`ASSET INVENTORY MASTER REPORT`, centerX, 13, { align: 'center' });

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(200, 200, 220);
          doc.text(`Internal Material Control & Asset Management System  |  Generated: ${formattedDate}`, centerX, 21, { align: 'center' });

          // 4. System Standard Absolute Footer
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text("CONFIDENTIAL - INTERNAL USE ONLY", 14, pageHeight - 10);

          const pageNumber = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
          doc.text(pageNumber, pageWidth - 14, pageHeight - 10, { align: 'right' });
        },

        // Premium Grid Styling matching your theme
        headStyles: { fillColor: [32, 31, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5, valign: 'middle' },
        bodyStyles: { fontSize: 7.5, textColor: [60, 60, 60], valign: 'middle' },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { overflow: 'linebreak', cellPadding: 2.5, lineColor: [230, 230, 230], lineWidth: 0.2 },

        // Exact horizontal allocation for Landscape width (Total 269mm layout boundary)
        columnStyles: {
          0: { cellWidth: 22 }, // Code
          1: { cellWidth: 28 }, // Category
          2: { cellWidth: 55 }, // Description
          3: { cellWidth: 25 }, // Brand
          4: { cellWidth: 12, halign: 'center', fontStyle: 'bold' }, // Qty
          5: { cellWidth: 15, halign: 'center' }, // UOM
          6: { cellWidth: 50 }, // Condition Breakdown
          7: { cellWidth: 25, halign: 'center' }, // Acq Date
          8: { cellWidth: 37 }  // Account To
        }
      });

      // --- SIGNATORIES SECTION ---
      const finalY = doc.lastAutoTable.finalY + 18;


      // Dynamic naming architecture
      const sanitizeCategory = selectedCategory.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`ASSET_REPORT_${sanitizeCategory.toUpperCase()}.pdf`);

    } catch (e) {
      console.error(e);
      alert("Failed to download Asset Report configuration.");
    }
  };

  const activeCount = assetsList.filter(a => !a.isArchived).length;
  const archivedCount = assetsList.filter(a => a.isArchived).length;

  return (
    <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased">
      <PageHeader activeTab="assets" />

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

      <div className="w-full bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-6">

        {/* FILTERS BAR */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Filter className="w-4 h-4 text-[#18174e]" />
              <span>{showArchivedOnly ? 'Viewing Archive Assets Vault' : 'Filter Assets'}</span>
            </div>
            <button
              onClick={() => setShowArchivedOnly(!showArchivedOnly)}
              className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${showArchivedOnly ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
            >
              {showArchivedOnly ? <><EyeOff className="w-3.5 h-3.5" /> Show Active Assets ({activeCount})</> : <><Archive className="w-3.5 h-3.5" /> View Archive Vault ({archivedCount})</>}
            </button>
          </div>

          {/* ⚡ BINAGO: Ginawang 7 columns ang grid para magkasya ang bagong button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 items-center mt-2">
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none w-full cursor-pointer">
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)} className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none w-full cursor-pointer">
              {segments.map(seg => <option key={seg} value={seg}>{seg}</option>)}
            </select>
            <select value={selectedDescription} onChange={(e) => setSelectedDescription(e.target.value)} className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none w-full cursor-pointer">
              {descriptions.map(desc => <option key={desc} value={desc}>{desc}</option>)}
            </select>
            <select value={selectedConditionFilter} onChange={(e) => setSelectedConditionFilter(e.target.value)} className="bg-white border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none font-medium w-full cursor-pointer">
              <option value="All">All Stocks</option>
              <option value="Has Good">🟢 Contains Good Items</option>
              <option value="Has Used">🟡 Contains Used Items</option>
              <option value="Has Damaged">🔴 Contains Damaged Items</option>
            </select>
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search Code, Brand..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none text-slate-700" />
            </div>

            {/* 📥 4. ITONG BUTTON ANG IDINAGDAG PARA SA PDF EXPORT */}
            <button
              onClick={downloadPDFReport}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm w-full cursor-pointer transition-all"
            >Download PDF
            </button>

            <button onClick={openAddModal} disabled={showArchivedOnly} className="flex items-center justify-center gap-2 bg-[#18174e] hover:bg-[#18174e]/90 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm w-full cursor-pointer transition-all">
              Add Asset
            </button>
          </div>
          <div className="h-px bg-slate-100 w-full mt-3"></div>
        </div>

        {/* TABLE DATA */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="text-white font-bold bg-[#18174e] uppercase text-nowrap text-sm">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4 text-center bg-indigo-950">Actual Count</th>
                  <th className="py-3 px-4">UOM</th>
                  <th className="py-3 px-4 text-center">Condition Status Breakdown</th>
                  <th className="py-3 px-4">Acquisition Date</th>
                  <th className="py-3 px-4">Account To</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-10 text-slate-400 font-medium italic">
                      <div className="flex items-center justify-center gap-2">
                        <span>Fetching secure asset data from database...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-10 text-slate-400 font-medium italic">
                      <div className="flex items-center justify-center gap-2">
                        <span>No records match the selected filters or search queries.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr key={asset._id} className="hover:bg-slate-50/80 text-slate-600 font-medium text-sm whitespace-nowrap">
                      <td className="py-3 px-4 font-mono font-extrabold text-[#18174e]">{asset.Code}</td>
                      <td className="py-3 px-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs text-slate-700">{asset.Category}</span></td>
                      <td className="py-3 px-4 text-slate-800 font-semibold">{asset.ItemDescription}</td>
                      <td className="py-3 px-4">{asset.Brand || '—'}</td>
                      <td className="py-3 px-4 text-center font-bold font-mono text-base text-slate-900 bg-slate-50/40">{asset.ActualCount}</td>
                      <td className="py-3 px-4 text-slate-500">{asset.UOM}</td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {(asset.ConditionBreakdown?.Good > 0) && (
                            <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                              Good: {asset.ConditionBreakdown.Good}
                            </span>
                          )}
                          {(asset.ConditionBreakdown?.Used > 0) && (
                            <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-bold">
                              Used: {asset.ConditionBreakdown.Used}
                            </span>
                          )}
                          {(asset.ConditionBreakdown?.Damaged > 0) && (
                            <span className="text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-bold">
                              Repair: {asset.ConditionBreakdown.Damaged}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-500">
                        {asset.AcquisitionDate ? new Date(asset.AcquisitionDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{asset.AccountTo || '—'}</td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!showArchivedOnly ? (
                            <>
                              <button onClick={() => openEditModal(asset)} className="p-1 border border-slate-200 rounded text-indigo-600 hover:bg-indigo-600 hover:text-white cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => triggerArchiveConfirm(asset)} className="p-1 border border-slate-200 rounded text-rose-600 hover:bg-rose-600 hover:text-white cursor-pointer"><Archive className="w-3.5 h-3.5" /></button>
                            </>
                          ) : (
                            <button onClick={() => triggerUnarchiveConfirm(asset)} className="flex items-center gap-1 px-2 py-1 bg-white border border-emerald-200 rounded text-emerald-600 hover:bg-emerald-600 hover:text-white text-xs font-bold cursor-pointer">
                              <RotateCcw className="w-3 h-3" /> Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CONTAINER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">{isEditing ? 'Update Asset Information' : 'New Record Asset Information'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 mt-3">
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Asset Code *</label>
                <input type="text" placeholder="Enter asset code" required disabled={isEditing} value={assetCode} onChange={(e) => setAssetCode(e.target.value)} className="w-full bg-white disabled:bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
              </div>

              {/* CATEGORY & SEGMENT */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Category *</label>
                  <input
                    type="text"
                    required
                    list="modal-categories-list"
                    placeholder="Enter category name"
                    value={assetCategory}
                    onChange={(e) => setAssetCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                  <datalist id="modal-categories-list">
                    {uniqueCategoriesInDB.map((cat, i) => (
                      <option key={i} value={cat} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Segment *</label>
                  <input
                    type="text"
                    required
                    list="modal-segments-list"
                    placeholder="Enter segment"
                    value={assetSegment}
                    onChange={(e) => setAssetSegment(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                  <datalist id="modal-segments-list">
                    {uniqueSegmentsInDB.map((seg, i) => (
                      <option key={i} value={seg} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* ITEM DESCRIPTION */}
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Item Description *</label>
                <input
                  type="text"
                  required
                  list="modal-descriptions-list"
                  placeholder="Enter item description"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                />
                <datalist id="modal-descriptions-list">
                  {uniqueDescriptionsInDB.map((desc, i) => (
                    <option key={i} value={desc} />
                  ))}
                </datalist>
              </div>

              {/* BRAND AT UOM */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Brand *</label>
                  <input
                    type="text"
                    list="modal-brands-list"
                    placeholder="Enter brand name"
                    value={assetBrand}
                    onChange={(e) => setAssetBrand(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                  <datalist id="modal-brands-list">
                    {uniqueBrandsInDB.map((brand, i) => (
                      <option key={i} value={brand} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">UOM *</label>
                  <input
                    type="text"
                    required
                    list="modal-uoms-list"
                    placeholder="Enter unit of measure"
                    value={assetUom}
                    onChange={(e) => setAssetUom(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                  <datalist id="modal-uoms-list">
                    {uniqueUomsInDB.map((uom, i) => (
                      <option key={i} value={uom} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* ACTUAL COUNT INPUT FIELD */}
              <div>
                <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Actual Count * (Direct Input)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={actualCount}
                  onChange={(e) => handleActualCountChange(e.target.value)}
                  className="w-full bg-white border-2 border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold font-mono text-indigo-950 focus:border-[#18174e] focus:outline-none"
                />
              </div>

              {/* KONDISYON BREAKDOWN QUANTITIES */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Condition Status Breakdown:</span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-600 mb-0.5">🟢 Good Qty</label>
                    <input type="number" min="0" value={goodCount} onChange={(e) => handleBreakdownChange('good', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm text-center font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-amber-600 mb-0.5">🟡 Used Qty</label>
                    <input type="number" min="0" value={usedCount} onChange={(e) => handleBreakdownChange('used', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm text-center font-bold" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-rose-600 mb-0.5">🔴 Repair Qty</label>
                    <input type="number" min="0" value={damagedCount} onChange={(e) => handleBreakdownChange('damaged', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm text-center font-bold" />
                  </div>
                </div>
              </div>

              {/* ACQUISITION DATE AT ACCOUNT TO */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Acquisition Date</label>
                  <input type="date" value={acquisitionDate} onChange={(e) => setAcquisitionDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Account To *</label>
                  <input
                    type="text"
                    list="modal-accounts-list"
                    placeholder="Enter account name"
                    value={accountTo}
                    onChange={(e) => setAccountTo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                  <datalist id="modal-accounts-list">
                    {uniqueAccountsInDB.map((acc, i) => (
                      <option key={i} value={acc} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm cursor-pointer">Cancel</button>
                <button type="submit" className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-4 rounded-lg text-sm cursor-pointer">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🤝 CUSTOM REUSABLE CONFIRMATION MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-5 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-5 shadow-2xl relative animate-in slide-in-from-top-5 duration-300">

            {/* Title Block */}
            <div className="border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-sm tracking-wide">
                {confirmModalConfig.title}
              </h3>
            </div>

            {/* Message Body */}
            <p className="text-sm text-slate-600 leading-relaxed mt-3">
              {confirmModalConfig.message}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer ${confirmModalConfig.actionType === 'archive'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Assets;