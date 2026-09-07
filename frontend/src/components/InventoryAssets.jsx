import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Archive, X, Filter, RotateCcw, EyeOff, CheckCircle2, Download } from 'lucide-react';
import axios from 'axios';
import PageHeader from './PageHeader';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from '../context/ThemeContext';

function InventoryAssets() {
  const { isDark } = useTheme();
  const userRole = localStorage.getItem("SystemRole") || "Inventory";
  const isViewer = userRole?.toLowerCase() === 'viewer';

  const [assetsList, setAssetsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  const [successMessage, setSuccessMessage] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    actionType: '',
    targetAsset: null
  });

  const categories = [
    'All Categories',
    ...[...new Set(assetsList.map(item => item.Category).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  ];

  const segments = [
    'All Segments',
    ...[...new Set(assetsList.map(item => item.Segment).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  ];

  const descriptions = [
    'All Item Descriptions',
    ...[...new Set(assetsList.map(item => item.ItemDescription).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  ];

  const uniqueCategoriesInDB = [...new Set(assetsList.map(item => item.Category).filter(Boolean))];
  const uniqueSegmentsInDB = [...new Set(assetsList.map(item => item.Segment).filter(Boolean))];
  const uniqueDescriptionsInDB = [...new Set(assetsList.map(item => item.ItemDescription).filter(Boolean))];
  const uniqueModelsInDB = [...new Set(assetsList.map(item => item.Model).filter(Boolean))];
  const uniqueBrandsInDB = [...new Set(assetsList.map(item => item.Brand).filter(Boolean))];
  const uniqueSerialsInDB = [...new Set(assetsList.map(item => item.SerialNo).filter(Boolean))];
  const uniqueUomsInDB = [...new Set(assetsList.map(item => item.UOM).filter(Boolean))];
  const uniqueAccountsInDB = [...new Set(assetsList.map(item => item.AccountTo).filter(Boolean))];
  const uniqueLocationsInDB = [...new Set(assetsList.map(item => item.Location).filter(Boolean))];

  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedSegment, setSelectedSegment] = useState('All Segments');
  const [selectedDescription, setSelectedDescription] = useState('All Item Descriptions');
  const [selectedConditionFilter, setSelectedConditionFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const [assetCode, setAssetCode] = useState('');
  const [assetCategory, setAssetCategory] = useState('');
  const [assetSegment, setAssetSegment] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [assetModel, setAssetModel] = useState('');
  const [assetBrand, setAssetBrand] = useState('');
  const [assetSerialNo, setAssetSerialNo] = useState('');
  const [assetUom, setAssetUom] = useState('');
  const [actualCount, setActualCount] = useState(1);
  const [accountTo, setAccountTo] = useState('');
  const [assetLocation, setAssetLocation] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');

  const [goodCount, setGoodCount] = useState(1);
  const [usedCount, setUsedCount] = useState(0);
  const [damagedCount, setDamagedCount] = useState(0);

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

  const handleActualCountChange = (val) => {
    const count = Number(val) || 0;
    setActualCount(count);
    setGoodCount(count);
    setUsedCount(0);
    setDamagedCount(0);
  };

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
    setAssetModel('');
    setAssetBrand('');
    setAssetSerialNo('');
    setAssetUom('');
    setActualCount(1);
    setGoodCount(1);
    setUsedCount(0);
    setDamagedCount(0);
    setAccountTo('');
    setAssetLocation('');
    setAcquisitionDate('');
    setIsModalOpen(true);
  };

  const openEditModal = (asset) => {
    setIsEditing(true);
    setCurrentId(asset._id);
    setAssetCode(asset.Code);
    setAssetCategory(asset.Category);
    setAssetSegment(asset.Segment || '');
    setItemDescription(asset.ItemDescription);
    setAssetModel(asset.Model || '');
    setAssetBrand(asset.Brand || '');
    setAssetSerialNo(asset.SerialNo || '');
    setAssetUom(asset.UOM);
    setActualCount(asset.ActualCount || 0);
    setGoodCount(asset.ConditionBreakdown?.Good || 0);
    setUsedCount(asset.ConditionBreakdown?.Used || 0);
    setDamagedCount(asset.ConditionBreakdown?.Damaged || 0);
    setAccountTo(asset.AccountTo || '');
    setAssetLocation(asset.Location || '');
    if (asset.AcquisitionDate) {
      setAcquisitionDate(new Date(asset.AcquisitionDate).toISOString().split('T')[0]);
    } else {
      setAcquisitionDate('');
    }
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
      Model: assetModel.trim(),
      Brand: assetBrand.trim(),
      SerialNo: assetSerialNo.trim(),
      UOM: assetUom.trim(),
      ActualCount: Number(actualCount),
      ConditionBreakdown: {
        Good: Number(goodCount),
        Used: Number(usedCount),
        Damaged: Number(damagedCount),
      },
      AccountTo: accountTo.trim(),
      Location: assetLocation.trim(),
      AcquisitionDate: acquisitionDate || null,
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
      !searchTerm ||
      (asset.Code && asset.Code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.Category && asset.Category.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.Segment && asset.Segment.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.ItemDescription && asset.ItemDescription.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.Brand && asset.Brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.Model && asset.Model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.SerialNo && asset.SerialNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.Location && asset.Location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.AccountTo && asset.AccountTo.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSegment && matchesDescription && matchesCondition && matchesSearch;
  });

  const downloadPDFReport = () => {
    try {
      if (filteredAssets.length === 0) {
        alert("No data available to export for the current filters.");
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = 297;
      const pageHeight = 210;
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;

      const formattedDate = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);

      doc.text("Report Type:", 14, 42);
      doc.setFont("helvetica", "normal");
      doc.text("Asset Management Registry", 45, 42);

      doc.setFont("helvetica", "bold");
      doc.text("Date Generated:", 180, 42);
      doc.setFont("helvetica", "normal");
      doc.text(`${new Date().toLocaleDateString()}`, 215, 42);

      doc.setFont("helvetica", "bold");
      doc.text("Target Category:", 14, 49);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text(`${selectedCategory}`, 45, 49);

      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.text("Registry Status:", 180, 49);
      doc.setFont("helvetica", "normal");
      doc.text(`${showArchivedOnly ? 'Archived Assets Only' : 'Active Registry Only'}`, 215, 49);

      const tableColumns = ["Code", "Category", "Description", "Model", "Brand", "Serial No.", "Qty", "UOM", "Condition Breakdown", "Account To", "Location", "Acq. Date"];
      const tableRows = filteredAssets.map(asset => [
        asset.Code || '—',
        asset.Category || '—',
        asset.ItemDescription || '—',
        asset.Model || '—',
        asset.Brand || '—',
        asset.SerialNo || '—',
        asset.ActualCount ? String(asset.ActualCount) : '0',
        asset.UOM || '—',
        `G: ${asset.ConditionBreakdown?.Good || 0} | U: ${asset.ConditionBreakdown?.Used || 0} | D: ${asset.ConditionBreakdown?.Damaged || 0}`,
        asset.AccountTo || '—',
        asset.Location || '—',
        asset.AcquisitionDate ? new Date(asset.AcquisitionDate).toLocaleDateString() : '—'
      ]);

      autoTable(doc, {
        startY: 58,
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',
        didDrawPage: (data) => {
          doc.saveGraphicsState();
          doc.setGState(new doc.GState({ opacity: 0.05 }));
          const logoWidth = 75;
          const logoHeight = 75;
          const logoX = centerX - (logoWidth / 2);
          const logoY = centerY - (logoHeight / 2);
          doc.addImage('/cropped_circle_image.png', 'PNG', logoX, logoY, logoWidth, logoHeight);
          doc.restoreGraphicsState();

          doc.setFillColor(24, 23, 78);
          doc.rect(0, 0, pageWidth, 30, 'F');

          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.text(`ASSET INVENTORY MASTER REPORT`, centerX, 13, { align: 'center' });

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(200, 200, 220);
          doc.text(`Internal Material Control & Asset Management System  |  Generated: ${formattedDate}`, centerX, 21, { align: 'center' });

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text("CONFIDENTIAL - INTERNAL USE ONLY", 14, pageHeight - 10);

          const pageNumber = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
          doc.text(pageNumber, pageWidth - 14, pageHeight - 10, { align: 'right' });
        },
        headStyles: { fillColor: [32, 31, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, valign: 'middle' },
        bodyStyles: { fontSize: 7, textColor: [60, 60, 60], valign: 'middle' },
        alternateRowStyles: { fillColor: [248, 249, 250] },
        styles: { overflow: 'linebreak', cellPadding: 1.5, lineColor: [230, 230, 230], lineWidth: 0.2 },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 20 },
          2: { cellWidth: 38 },
          3: { cellWidth: 18 },
          4: { cellWidth: 18 },
          5: { cellWidth: 20 },
          6: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
          7: { cellWidth: 12, halign: 'center' },
          8: { cellWidth: 38 },
          9: { cellWidth: 25 },
          10: { cellWidth: 34 },
          11: { cellWidth: 20, halign: 'center' }
        }
      });

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

      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100 text-slate-600'} border rounded-2xl p-6 shadow-sm flex flex-col gap-6 transition-colors duration-200`}>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'} flex-shrink-0`}>
              <Filter className={`w-4 h-4 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
              <span>{showArchivedOnly ? 'Archive' : 'Filter'}</span>
            </div>
            
            {!isViewer && (
              <button
                onClick={() => setShowArchivedOnly(!showArchivedOnly)}
                title={showArchivedOnly ? "Show Active Assets" : "View Archive Vault"}
                className={`flex items-center gap-2 text-xs font-bold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition-all cursor-pointer flex-shrink-0 ${
                  showArchivedOnly 
                    ? (isDark ? 'bg-rose-950/40 text-rose-300 border-rose-900/60' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100') 
                    : (isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                }`}
              >
                {showArchivedOnly ? (
                  <>
                    <EyeOff className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> 
                    <span className="hidden md:inline">Show Active Assets</span> 
                    <span className="text-[11px] font-bold">({activeCount})</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> 
                    <span className="hidden md:inline">View Archive Vault</span> 
                    <span className="text-[11px] font-bold">({archivedCount})</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className={`flex overflow-x-auto gap-2 items-center mt-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 lg:grid ${isViewer ? 'lg:grid-cols-5' : 'lg:grid-cols-7'} lg:pb-0`}>
            
            <div className="min-w-[150px] w-full lg:min-w-0">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none w-full cursor-pointer`}>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="min-w-[150px] w-full lg:min-w-0">
              <select value={selectedSegment} onChange={(e) => setSelectedSegment(e.target.value)} className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none w-full cursor-pointer`}>
                {segments.map(seg => (
                  <option key={seg} value={seg}>{seg}</option>
                ))}
              </select>
            </div>

            <div className="min-w-[170px] w-full lg:min-w-0">
              <select value={selectedDescription} onChange={(e) => setSelectedDescription(e.target.value)} className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none w-full cursor-pointer`}>
                {descriptions.map(desc => (
                  <option key={desc} value={desc}>{desc}</option>
                ))}
              </select>
            </div>

            <div className="min-w-[160px] w-full lg:min-w-0">
              <select value={selectedConditionFilter} onChange={(e) => setSelectedConditionFilter(e.target.value)} className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'} border rounded-lg px-3 py-2 text-sm focus:outline-none font-medium w-full cursor-pointer`}>
                <option value="All">All Stocks</option>
                <option value="Has Good">🟢 Contains Good Items</option>
                <option value="Has Used">🟡 Contains Used Items</option>
                <option value="Has Damaged">🔴 Contains Damaged Items</option>
              </select>
            </div>

            <div className="min-w-[200px] w-full lg:min-w-0">
              <div className="relative w-full">
                <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input type="text" placeholder="Search Code, Category, Segment, Description..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none`} />
              </div>
            </div>

            {!isViewer && (
              <div className="min-w-[130px] w-full lg:min-w-0">
                <button onClick={downloadPDFReport} className={`flex items-center justify-center ${isDark ? 'bg-[#141622] hover:bg-slate-800 border-slate-700 text-slate-200 border' : 'bg-[#18174e] hover:bg-[#18174e]/90 text-white'} disabled:bg-slate-700 px-4 py-2 rounded-lg text-xs font-bold shadow-sm w-full cursor-pointer transition-all h-[38px] whitespace-nowrap`}>
                  Download PDF
                </button>
              </div>
            )}

            {!isViewer && (
              <div className="min-w-[120px] w-full lg:min-w-0">
                <button onClick={openAddModal} disabled={showArchivedOnly} className={`flex items-center justify-center ${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} disabled:bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm w-full cursor-pointer transition-all h-[38px] whitespace-nowrap`}>
                  Add Asset
                </button>
              </div>
            )}
            
          </div>
          <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-full mt-3`}></div>
        </div>

        <div className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'} rounded-xl border shadow-sm overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className={`text-white font-bold uppercase text-nowrap text-sm ${isDark ? 'bg-[#0f111d] border-b border-slate-800' : 'bg-[#18174e]'}`}>
                  <th 
                    className={`py-3 px-4 whitespace-nowrap static md:sticky md:left-0 z-20 ${isDark ? 'bg-[#0f111d]' : 'bg-[#18174e]'}`}
                    style={{ boxShadow: isDark ? 'inset -2px 0 0 0 #475569, 6px 0 10px -2px rgba(0, 0, 0, 0.4)' : 'inset -2px 0 0 0 #cbd5e1, 6px 0 10px -2px rgba(0, 0, 0, 0.15)' }}
                  >
                    <span className={`hidden md:block absolute right-0 top-0 bottom-0 w-[2px] ${isDark ? 'bg-slate-600' : 'bg-slate-300'} pointer-events-none`} />
                    Item Description
                  </th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Model</th>
                  <th className="py-3 px-4">Brand</th>
                  <th className="py-3 px-4">Serial No.</th>
                  <th className={`py-3 px-4 text-center ${isDark ? 'bg-[#141626]' : 'bg-indigo-950'}`}>Actual Count</th>
                  <th className="py-3 px-4">UOM</th>
                  <th className="py-3 px-4 text-center">Condition Status Breakdown</th>
                  <th className="py-3 px-4">Account To</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Acquisition Date</th>
                  {!isViewer && (
                    <th className="py-3 px-4 text-center whitespace-nowrap">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80 bg-[#090b10]' : 'divide-slate-100 bg-white'}`}>
                {loading ? (
                  <tr>
                    <td colSpan={isViewer ? "12" : "13"} className="text-center py-10 text-green-700 font-medium italic">
                      Fetching secure asset data from database...
                    </td>
                  </tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={isViewer ? "12" : "13"} className="text-center py-10 text-red-600 font-medium italic">
                      No records match the selected filters or search queries.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr key={asset._id} className={`group ${isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600'} font-medium text-sm whitespace-nowrap transition-colors`}>
                      <td 
                        className={`py-3 px-4 font-semibold static md:sticky md:left-0 z-10 min-w-[160px] sm:min-w-[190px] md:max-w-[280px] whitespace-normal md:whitespace-nowrap transition-colors ${
                          isDark ? 'bg-[#090b10] group-hover:bg-[#141622] text-slate-100' : 'bg-white group-hover:bg-[#f8fafc] text-slate-800'
                        }`}
                        style={{ boxShadow: isDark ? 'inset -2px 0 0 0 #475569, 6px 0 10px -2px rgba(0, 0, 0, 0.4)' : 'inset -2px 0 0 0 #cbd5e1, 6px 0 10px -2px rgba(0, 0, 0, 0.08)' }}
                        title={asset.ItemDescription}
                      >
                        <span className={`hidden md:block absolute right-0 top-0 bottom-0 w-[2px] ${isDark ? 'bg-slate-600' : 'bg-slate-300'} pointer-events-none`} />
                        <div className="line-clamp-2 md:truncate font-semibold" title={asset.ItemDescription}>
                          {asset.ItemDescription}
                        </div>
                      </td>
                      <td className={`py-3 px-4 font-mono font-extrabold ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`}>{asset.Code}</td>
                      <td className="py-3 px-4"><span className={`${isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700'} px-2 py-1 rounded text-xs`}>{asset.Category}</span></td>
                      <td className={`py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>{asset.Model || '—'}</td>
                      <td className={`py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>{asset.Brand || '—'}</td>
                      <td className={`py-3 px-4 font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{asset.SerialNo || '—'}</td>
                      <td className={`py-3 px-4 text-center font-bold font-mono text-base ${isDark ? 'text-white' : 'text-slate-900 bg-slate-50/40'}`}>{asset.ActualCount}</td>
                      <td className={`py-3 px-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{asset.UOM}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {(asset.ConditionBreakdown?.Good > 0) && (
                            <span className={`text-[11px] ${isDark ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200'} border px-2 py-0.5 rounded font-bold`}>Good: {asset.ConditionBreakdown.Good}</span>
                          )}
                          {(asset.ConditionBreakdown?.Used > 0) && (
                            <span className={`text-[11px] ${isDark ? 'bg-amber-950/40 text-amber-300 border-amber-800/60' : 'bg-amber-50 text-amber-700 border-amber-200'} border px-2 py-0.5 rounded font-bold`}>Used: {asset.ConditionBreakdown.Used}</span>
                          )}
                          {(asset.ConditionBreakdown?.Damaged > 0) && (
                            <span className={`text-[11px] ${isDark ? 'bg-rose-950/40 text-rose-300 border-rose-800/60' : 'bg-rose-50 text-rose-700 border-rose-200'} border px-2 py-0.5 rounded font-bold`}>Repair: {asset.ConditionBreakdown.Damaged}</span>
                          )}
                        </div>
                      </td>
                      <td className={`py-3 px-4 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{asset.AccountTo || '—'}</td>
                      <td className={`py-3 px-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{asset.Location || '—'}</td>
                      <td className={`py-3 px-4 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {asset.AcquisitionDate ? new Date(asset.AcquisitionDate).toLocaleDateString() : '—'}
                      </td>
                      {!isViewer && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {!showArchivedOnly ? (
                              <>
                                <button onClick={() => openEditModal(asset)} className={`p-1 border ${isDark ? 'bg-[#181a26] border-slate-700 text-indigo-400 hover:bg-indigo-600 hover:text-white' : 'border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'} rounded cursor-pointer transition-colors`}><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => triggerArchiveConfirm(asset)} className={`p-1 border ${isDark ? 'bg-[#181a26] border-slate-700 text-rose-400 hover:bg-rose-600 hover:text-white' : 'border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'} rounded cursor-pointer transition-colors`}><Archive className="w-3.5 h-3.5" /></button>
                              </>
                            ) : (
                              <button onClick={() => triggerUnarchiveConfirm(asset)} className={`flex items-center gap-1 px-2 py-1 ${isDark ? 'bg-[#181a26] border-emerald-800/80 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-white border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white'} border rounded text-xs font-bold cursor-pointer transition-colors`}>
                                <RotateCcw className="w-3 h-3" /> Restore
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base">
                {isEditing ? 'Update Asset Information' : 'New Record Asset Information'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60 mt-3">
              <span className="block text-xs font-bold text-amber-800 uppercase mb-1">
                * System Inventory Protocol *
              </span>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Asset quantity represents the number of physical assets owned by the organization and is maintained for record-keeping purposes only through the <strong>Assets Components.</strong>
              </p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 mt-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Asset Code *</label>
                  <input
                    type="text"
                    disabled
                    readOnly
                    placeholder="AST-USSP-[Auto]"
                    value={assetCode || ''}
                    onChange={(e) => setAssetCode(e.target.value)}
                    className="w-full bg-slate-100 text-slate-500 border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-not-allowed font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Category *</label>
                  <input
                    type="text"
                    required
                    list="modal-categories-list"
                    placeholder="Enter category"
                    value={assetCategory}
                    onChange={(e) => setAssetCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                  <datalist id="modal-categories-list">
                    {uniqueCategoriesInDB.map((cat, i) => <option key={i} value={cat} />)}
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
                    {uniqueSegmentsInDB.map((seg, i) => <option key={i} value={seg} />)}
                  </datalist>
                </div>

                <div className="md:col-span-2">
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
                    {uniqueDescriptionsInDB.map((desc, i) => <option key={i} value={desc} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Model</label>
                  <input
                    type="text"
                    list="modal-models-list"
                    placeholder="Enter model"
                    value={assetModel}
                    onChange={(e) => setAssetModel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                  <datalist id="modal-models-list">
                    {uniqueModelsInDB.map((mod, i) => <option key={i} value={mod} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Brand</label>
                  <input
                    type="text"
                    list="modal-brands-list"
                    placeholder="Enter brand name"
                    value={assetBrand}
                    onChange={(e) => setAssetBrand(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                  <datalist id="modal-brands-list">
                    {uniqueBrandsInDB.map((brand, i) => <option key={i} value={brand} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Serial No.</label>
                  <input
                    type="text"
                    list="modal-serials-list"
                    placeholder="Enter serial code"
                    value={assetSerialNo}
                    onChange={(e) => setAssetSerialNo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                  <datalist id="modal-serials-list">
                    {uniqueSerialsInDB.map((ser, i) => <option key={i} value={ser} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">UOM *</label>
                  <input
                    type="text"
                    required
                    list="modal-uoms-list"
                    placeholder="Enter UOM"
                    value={assetUom}
                    onChange={(e) => setAssetUom(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                  <datalist id="modal-uoms-list">
                    {uniqueUomsInDB.map((uom, i) => <option key={i} value={uom} />)}
                  </datalist>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Actual Count * (Direct Input)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={actualCount}
                    onChange={(e) => handleActualCountChange(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    className="w-full bg-white border-2 border-indigo-100 rounded-xl px-3 py-2 text-sm font-bold font-mono text-[#18174e] focus:border-[#18174e] focus:outline-none transition-colors"
                  />
                </div>

                <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Condition Status Breakdown:
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-600 uppercase mb-1">🟢 Good Qty</label>
                      <input
                        type="number"
                        min="0"
                        value={goodCount}
                        onChange={(e) => handleBreakdownChange('good', e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-amber-600 uppercase mb-1">🟡 Used Qty</label>
                      <input
                        type="number"
                        min="0"
                        value={usedCount}
                        onChange={(e) => handleBreakdownChange('used', e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-rose-600 uppercase mb-1">🔴 Repair Qty</label>
                      <input
                        type="number"
                        min="0"
                        value={damagedCount}
                        onChange={(e) => handleBreakdownChange('damaged', e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Account To *</label>
                  <input
                    type="text"
                    required
                    list="modal-accounts-list"
                    placeholder="Enter account name"
                    value={accountTo}
                    onChange={(e) => setAccountTo(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                  <datalist id="modal-accounts-list">
                    {uniqueAccountsInDB.map((acc, i) => <option key={i} value={acc} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Location</label>
                  <input
                    type="text"
                    list="modal-locations-list"
                    placeholder="Enter location"
                    value={assetLocation}
                    onChange={(e) => setAssetLocation(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                  <datalist id="modal-locations-list">
                    {uniqueLocationsInDB.map((loc, i) => <option key={i} value={loc} />)}
                  </datalist>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-600 uppercase mb-1.5">Acquisition Date</label>
                  <input
                    type="date"
                    value={acquisitionDate}
                    onChange={(e) => setAcquisitionDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#18174e]"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#18174e] hover:bg-[#18174e]/90 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-sm"
                >
                  Save Details
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex justify-center items-start z-50 p-4 pt-5 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm p-5 shadow-2xl relative animate-in slide-in-from-top-5 duration-300">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-sm tracking-wide">{confirmModalConfig.title}</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mt-3">{confirmModalConfig.message}</p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button type="button" onClick={() => setIsConfirmModalOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer">Cancel</button>
              <button type="button" onClick={handleConfirmAction} className={`text-white font-semibold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer ${confirmModalConfig.actionType === 'archive' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryAssets;
