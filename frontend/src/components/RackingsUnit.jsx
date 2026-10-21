import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, AlertCircle, Filter, X, Edit2, Trash2, CheckCircle2,
  Image as ImageIcon, Coins, Download, Layers, Calculator, Plus,
  FileText, ArrowRight, RotateCcw, Box, Eye, Check,
  Sparkles, AlertTriangle, Upload, Loader2, ChevronDown
} from 'lucide-react';
import axios from 'axios';
import PageHeader from './layout/PageHeader';
import TablePagination from './common/TablePagination';
import { useTheme } from '../context/ThemeContext';
import RackDimensionCell, { parseRackDimension } from './common/RackDimensionCell';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const STORAGE_KEY = 'oneinventory_unit_calculator_records_v1';

const getBackendBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
  }
  return '';
};

const getImageSrc = (imageUrl) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) return imageUrl;
  const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  const base = getBackendBaseUrl();
  return base ? `${base}${cleanPath}` : cleanPath;
};

// Global color options identical to Rackings.jsx
const COLOR_OPTIONS = [
  { name: 'Emerald / Green', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800', rowBg: 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.16] dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border-l-4 border-l-emerald-500', prefix: '🟢' },
  { name: 'Blue / Indigo', classes: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800', rowBg: 'bg-blue-500/[0.08] hover:bg-blue-500/[0.16] dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border-l-4 border-l-blue-500', prefix: '🔵' },
  { name: 'Amber / Orange', classes: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800', rowBg: 'bg-amber-500/[0.08] hover:bg-amber-500/[0.16] dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border-l-4 border-l-amber-500', prefix: '🟡' },
  { name: 'Rose / Red', classes: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800', rowBg: 'bg-rose-500/[0.08] hover:bg-rose-500/[0.16] dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border-l-4 border-l-rose-500', prefix: '🔴' },
  { name: 'Orange', classes: 'bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800', rowBg: 'bg-orange-500/[0.08] hover:bg-orange-500/[0.16] dark:bg-orange-950/30 dark:hover:bg-orange-950/50 border-l-4 border-l-orange-500', prefix: '🟠' },
  { name: 'Purple / Violet', classes: 'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800', rowBg: 'bg-purple-500/[0.08] hover:bg-purple-500/[0.16] dark:bg-purple-950/30 dark:hover:bg-purple-950/50 border-l-4 border-l-purple-500', prefix: '🟣' },
  { name: 'Slate / Muted Gray', classes: 'bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', rowBg: 'bg-slate-500/[0.08] hover:bg-slate-500/[0.16] dark:bg-slate-900/40 dark:hover:bg-slate-900/60 border-l-4 border-l-slate-400', prefix: '⚪' },
  { name: 'Cyan / Teal', classes: 'bg-cyan-50 text-cyan-700 border-cyan-200/60 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800', rowBg: 'bg-cyan-500/[0.08] hover:bg-cyan-500/[0.16] dark:bg-cyan-950/30 dark:hover:bg-cyan-950/50 border-l-4 border-l-cyan-500', prefix: '🌐' }
];

// Initial starter records for the calculator
const DEFAULT_UNIT_RECORDS = [
  {
    id: 'unit-rec-1',
    unitName: 'Standard 4-Layer Bodega Rack',
    segment: 'BODEGA RACKS',
    description: '4 Shelving Levels Storage Bay with 2 Upright Frames',
    uom: 'UNIT',
    createdAt: new Date().toISOString(),
    components: [
      { id: 'c1', role: 'Beam', searchHint: 'beam', divisor: 8, pcsPerUnit: 8 },
      { id: 'c2', role: 'Decking', searchHint: 'decking', divisor: 8, pcsPerUnit: 8 },
      { id: 'c3', role: 'Post / Upright', searchHint: 'post', divisor: 2, pcsPerUnit: 2 }
    ]
  },
  {
    id: 'unit-rec-2',
    unitName: 'Standard 3-Layer Medium Rack',
    segment: 'MEDIUM RACKS',
    description: 'Medium Duty 3 Shelving Tiers with 2 Posts',
    uom: 'UNIT',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    components: [
      { id: 'c1', role: 'Step Beam', searchHint: 'beam', divisor: 6, pcsPerUnit: 6 },
      { id: 'c2', role: 'Steel Decking', searchHint: 'decking', divisor: 6, pcsPerUnit: 6 },
      { id: 'c3', role: 'Upright Post', searchHint: 'post', divisor: 2, pcsPerUnit: 2 }
    ]
  },
  {
    id: 'unit-rec-3',
    unitName: 'Heavy Duty Selective Pallet Starter Bay',
    segment: 'HEAVY/SELECTIVE DUTY',
    description: 'Heavy Duty Pallet Racking Starter Bay (4 Posts, 8 Beams)',
    uom: 'UNIT',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    components: [
      { id: 'c1', role: 'Beams', searchHint: 'beam', divisor: 8, pcsPerUnit: 8 },
      { id: 'c2', role: 'Upright Posts', searchHint: 'post', divisor: 4, pcsPerUnit: 4 }
    ]
  }
];

// 🌟 CUSTOM MATERIAL DROPDOWN WITH IMAGE THUMBNAIL (INSTEAD OF CODE) FILTERED BY SEGMENT
function MaterialImageDropdownCell({
  selectedMaterialId,
  materials,
  allMaterialsMap,
  isOpen,
  onToggle,
  onSelect,
  onPreviewImage,
  isDark,
  modalSegment,
  loading,
  isNearBottom
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const selectedMat = selectedMaterialId ? allMaterialsMap.get(selectedMaterialId) : null;
  const selectedImg = selectedMat?.ImageUrl ? getImageSrc(selectedMat.ImageUrl) : '';

  // Filter materials based on search query inside dropdown
  const filteredMaterials = useMemo(() => {
    if (!searchQuery.trim()) return materials;
    const q = searchQuery.toLowerCase();
    return materials.filter(m => {
      const desc = (m.ItemDescription || '').toLowerCase();
      const dim = (m.Dimension || '').toLowerCase();
      return desc.includes(q) || dim.includes(q);
    });
  }, [materials, searchQuery]);

  return (
    <div className="relative material-dropdown-container">
      {/* TRIGGER BUTTON (CLOSED/OPEN) */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between gap-2 p-1.5 rounded-lg border text-left transition-all cursor-pointer ${isOpen
          ? (isDark ? 'border-[#ff6600] ring-1 ring-[#ff6600] bg-[#141622]' : 'border-[#18174e] ring-1 ring-[#18174e] bg-slate-50')
          : (isDark ? 'bg-[#0e1017] border-slate-700 hover:border-slate-600 text-slate-100' : 'bg-white border-slate-300 hover:border-slate-400 text-slate-800')
          }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Material Image Thumbnail (INSTEAD OF CODE) */}
          {selectedImg ? (
            <img
              src={selectedImg}
              alt={selectedMat?.ItemDescription || 'Material'}
              className="w-9 h-9 rounded-md object-cover border border-slate-300 dark:border-slate-700 shrink-0 cursor-zoom-in"
              onClick={(e) => {
                e.stopPropagation();
                if (onPreviewImage) onPreviewImage(selectedImg);
              }}
              title="Click to zoom image"
            />
          ) : (
            <div className={`w-9 h-9 rounded-md flex items-center justify-center border border-dashed shrink-0 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-300 text-slate-400'
              }`}>
              <ImageIcon className="w-4 h-4" />
            </div>
          )}

          {/* Description & Dimension (NO CODE!) */}
          <div className="min-w-0 flex-1 flex flex-col">
            <span className="text-xs font-bold truncate leading-tight" title={selectedMat?.ItemDescription}>
              {selectedMat ? selectedMat.ItemDescription : `Select ${modalSegment || 'Racking'} Material...`}
            </span>
            {selectedMat ? (
              <span className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                {selectedMat.Dimension && selectedMat.Dimension !== 'N/A' ? selectedMat.Dimension : 'Standard'}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 mt-0.5">
                {materials.length} available in {modalSegment}
              </span>
            )}
          </div>
        </div>

        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-orange-500' : 'text-slate-400'}`} />
      </button>

      {/* FLOATING DROPDOWN MENU */}
      {isOpen && (
        <div
          className={`absolute left-0 ${isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            } w-80 sm:w-96 rounded-xl border shadow-2xl z-50 p-2.5 flex flex-col gap-2 ${isDark ? 'bg-[#0e1017] border-slate-700' : 'bg-white border-slate-200'
            }`}
          style={{ minWidth: '320px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input inside Dropdown */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${modalSegment || 'materials'}...`}
              className={`w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border focus:outline-none ${isDark ? 'bg-[#141622] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#18174e]'
                }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Segment & Count Header */}
          <div className="flex items-center justify-between text-[10px] px-1 font-semibold text-slate-400">
            <span>📁 {modalSegment || 'Segment'}</span>
            <span>{filteredMaterials.length} materials</span>
          </div>

          {/* List of Materials with Image Thumbnails */}
          <div className="flex-1 overflow-y-auto max-h-56 divide-y divide-slate-100 dark:divide-slate-800/60 custom-scrollbar">
            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                <span>Loading materials...</span>
              </div>
            ) : filteredMaterials.length > 0 ? (
              filteredMaterials.map((item) => {
                const p = Number(item.ActualCount) || 0;
                const res = Number(item.ReserveCount) || 0;
                const avail = Math.max(0, p - res);
                const isSelected = selectedMaterialId === item._id;
                const itemImg = item.ImageUrl ? getImageSrc(item.ImageUrl) : '';

                return (
                  <div
                    key={item._id}
                    onClick={() => {
                      onSelect(item._id);
                    }}
                    className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${isSelected
                      ? (isDark ? 'bg-orange-950/40 text-[#ff8533]' : 'bg-indigo-50 text-[#18174e]')
                      : (isDark ? 'hover:bg-[#141622] text-slate-200' : 'hover:bg-slate-50 text-slate-800')
                      }`}
                  >
                    {/* 🖼️ IMAGE THUMBNAIL (INSTEAD OF CODE!) */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                      {itemImg ? (
                        <img
                          src={itemImg}
                          alt={item.ItemDescription}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                      )}
                    </div>

                    {/* ITEM DESCRIPTION & DIMENSION (NO CODE!) */}
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-xs block truncate" title={item.ItemDescription}>
                        {item.ItemDescription}
                      </span>
                      {item.Dimension && item.Dimension !== 'N/A' && (
                        <span className="text-[10px] font-mono text-slate-400 block truncate">
                          {item.Dimension}
                        </span>
                      )}
                    </div>

                    {/* STOCK BADGE */}
                    <div className="text-right shrink-0">
                      <span className={`text-[11px] font-mono font-bold block ${avail > 0 ? (isDark ? 'text-emerald-400' : 'text-emerald-700') : 'text-rose-500'
                        }`}>
                        {avail.toLocaleString()} {item.UOM || 'PCS'}
                      </span>
                      <span className="text-[9px] text-slate-400 block">Available</span>
                    </div>

                    {/* CHECKMARK IF SELECTED */}
                    {isSelected && (
                      <Check className="w-4 h-4 text-orange-500 shrink-0 ml-1" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Walang materyales sa ilalim ng "{modalSegment}".
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RackingsUnit() {
  const { isDark } = useTheme();
  const userRole = localStorage.getItem("SystemRole") || "Inventory";

  // Database raw materials state
  const [rawMaterialsList, setRawMaterialsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Toast Notifications
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Global Segment Colors (same as Rackings.jsx)
  const [segmentColors, setSegmentColors] = useState({});

  const fetchPaletteSettings = async () => {
    try {
      const response = await axios.get('/api/settings/palette');
      if (response.data) {
        setSegmentColors(response.data.segmentColors || {});
      }
    } catch (err) {
      console.error("Failed to load palette data:", err);
    }
  };

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('All Segments');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Unit Records State (persisted in localStorage)
  const [unitRecords, setUnitRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load unit records:", e);
    }
    return DEFAULT_UNIT_RECORDS;
  });

  // Save records to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unitRecords));
    } catch (e) {
      console.error("Failed to save unit records:", e);
    }
  }, [unitRecords]);

  // Image Upload States (Same as Rackings.jsx)
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingImgPreview, setExistingImgPreview] = useState('');
  const [isCompressingImg, setIsCompressingImg] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [modalDescription, setModalDescription] = useState('');
  const [modalSegment, setModalSegment] = useState('');
  const [modalUom, setModalUom] = useState('UNIT');
  const [modalComponents, setModalComponents] = useState([]);
  const [openDropdownRowId, setOpenDropdownRowId] = useState(null);

  // Confirm Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Lightbox Image Preview
  const [previewImage, setPreviewImage] = useState(null);

  // Image compression identical to Rackings.jsx
  const compressImage = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.82) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
              type: 'image/webp',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }, 'image/webp', quality);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsCompressingImg(true);
      try {
        const compressed = await compressImage(file);
        setSelectedFile(compressed);
        const reader = new FileReader();
        reader.onload = (event) => {
          setExistingImgPreview(event.target.result);
        };
        reader.readAsDataURL(compressed);
      } catch (err) {
        console.error("Compression error, fallback:", err);
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (event) => {
          setExistingImgPreview(event.target.result);
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressingImg(false);
      }
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setExistingImgPreview('');
  };

  // Toast helper
  const triggerSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3500);
  };
  const triggerError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 3500);
  };

  // Fetch live Racking Materials identical to Rackings.jsx
  const fetchRawMaterials = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const endpoint = token ? '/api/raw-materials' : '/api/raw-materials/shared';

      let response;
      try {
        response = await axios.get(endpoint, { headers });
      } catch (primaryErr) {
        // Fallback to shared public endpoint if unauthorized or token expired
        response = await axios.get('/api/raw-materials/shared');
      }

      let dataList = [];
      if (Array.isArray(response.data)) {
        dataList = response.data;
      } else if (response.data && Array.isArray(response.data.Data)) {
        dataList = response.data.Data;
      } else if (response.data && Array.isArray(response.data.data)) {
        dataList = response.data.data;
      }

      // Filter active (non-archived) materials
      const activeMaterials = dataList.filter(m => !m.isArchived);
      setRawMaterialsList(activeMaterials);
      console.log("✅ Fetched Rackings Materials in RackingsUnit:", activeMaterials.length);
    } catch (err) {
      console.warn("Relative fetch failed, trying direct localhost fallback:", err);
      try {
        const fallbackRes = await axios.get('http://localhost:5000/api/raw-materials/shared');
        let dataList = [];
        if (Array.isArray(fallbackRes.data)) dataList = fallbackRes.data;
        else if (fallbackRes.data && Array.isArray(fallbackRes.data.Data)) dataList = fallbackRes.data.Data;
        else if (fallbackRes.data && Array.isArray(fallbackRes.data.data)) dataList = fallbackRes.data.data;

        const activeMaterials = dataList.filter(m => !m.isArchived);
        setRawMaterialsList(activeMaterials);
        console.log("✅ Fetched via direct localhost fallback:", activeMaterials.length);
      } catch (finalErr) {
        console.error("Critical: All fetch attempts failed:", finalErr);
        triggerError("Failed to fetch raw materials inventory.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRawMaterials();
    fetchPaletteSettings();

    // Auto-sync whenever inventory or packing slips update (same as Rackings.jsx)
    const handlePackingListSync = () => {
      fetchRawMaterials();
      fetchPaletteSettings();
    };
    window.addEventListener('packingListUpdated', handlePackingListSync);
    return () => {
      window.removeEventListener('packingListUpdated', handlePackingListSync);
    };
  }, []);

  // Close custom material dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.material-dropdown-container')) {
        setOpenDropdownRowId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Map of materials by ID for fast lookup
  const materialsMap = useMemo(() => {
    const map = new Map();
    rawMaterialsList.forEach(m => {
      if (m && m._id) {
        map.set(m._id, m);
        map.set(String(m._id), m);
      }
    });
    return map;
  }, [rawMaterialsList]);

  // Robust matching helper to associate component with database raw material
  const findMatchingMaterial = (comp, preferredSegment = null) => {
    if (!comp) return null;
    if (comp.materialId) {
      const byId = materialsMap.get(comp.materialId) || materialsMap.get(String(comp.materialId));
      if (byId) return byId;
    }

    const role = (comp.role || '').trim();
    const hint = (comp.searchHint || '').trim();
    if (!role && !hint) return null;

    const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanRole = clean(role);
    const cleanHint = clean(hint);

    // Segment priority: prioritize materials matching the record's segment
    const pool = (preferredSegment && preferredSegment !== 'All Segments')
      ? [
        ...rawMaterialsList.filter(m => (m?.Segment || '').trim().toLowerCase() === preferredSegment.trim().toLowerCase()),
        ...rawMaterialsList.filter(m => (m?.Segment || '').trim().toLowerCase() !== preferredSegment.trim().toLowerCase())
      ]
      : rawMaterialsList;

    // 1. Exact string match (case-insensitive)
    if (role) {
      const exact = pool.find(m => (m.ItemDescription || '').trim().toLowerCase() === role.toLowerCase());
      if (exact) return exact;
    }

    // 2. Exact clean alphanumeric match (ignores extra quotes, hyphens, and whitespace)
    if (cleanRole) {
      const cleanExact = pool.find(m => clean(m.ItemDescription) === cleanRole);
      if (cleanExact) return cleanExact;
    }

    // 3. Substring match (clean alphanumeric)
    if (cleanRole && cleanRole.length >= 4) {
      const sub = pool.find(m => {
        const cDesc = clean(m.ItemDescription);
        return cDesc && (cDesc.includes(cleanRole) || cleanRole.includes(cDesc));
      });
      if (sub) return sub;
    }

    // 4. Fallback searchHint match
    if (cleanHint) {
      const hintMatch = pool.find(m => {
        const cDesc = clean(m.ItemDescription);
        const cSeg = clean(m.Segment);
        return cDesc.includes(cleanHint) || cSeg.includes(cleanHint);
      });
      if (hintMatch) return hintMatch;
    }

    return null;
  };

  // Distinct segments directly from database
  const segmentsInDB = useMemo(() => {
    const segs = new Set();
    rawMaterialsList.forEach(m => {
      const s = (m?.Segment || '').trim();
      if (s && s !== 'N/A' && s !== 'Standard') segs.add(s);
    });
    const arr = Array.from(segs).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return arr.length > 0 ? arr : ['BODEGA RACKS', 'HEAVY/SELECTIVE DUTY', 'MEDIUM RACKS', 'LIGHT DUTY RACKS'];
  }, [rawMaterialsList]);

  // Filter segments including 'All Segments'
  const filterSegments = useMemo(() => {
    return ['All Segments', ...segmentsInDB];
  }, [segmentsInDB]);

  // Segment styling and row background identical to Rackings.jsx
  const getSegmentStyles = (segment) => {
    if (!segment) return { classes: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700", rowBg: "hover:bg-slate-50/80 dark:hover:bg-[#141622] border-l-4 border-l-transparent", prefix: "⚪" };
    const cleaned = segment.trim().toUpperCase();
    if (segmentColors[cleaned] !== undefined && COLOR_OPTIONS[segmentColors[cleaned]]) return COLOR_OPTIONS[segmentColors[cleaned]];
    const index = segmentsInDB.findIndex(seg => seg.trim().toUpperCase() === cleaned);
    return COLOR_OPTIONS[(index !== -1 ? index : 0) % COLOR_OPTIONS.length];
  };

  // Materials strictly filtered by the currently selected modalSegment
  const modalSegmentMaterials = useMemo(() => {
    if (!modalSegment || modalSegment === 'All Segments') return rawMaterialsList;
    const current = modalSegment.trim().toLowerCase();
    const filtered = rawMaterialsList.filter(m => (m?.Segment || '').trim().toLowerCase() === current);
    return filtered.length > 0 ? filtered : rawMaterialsList;
  }, [rawMaterialsList, modalSegment]);

  // Alphabetically sorted materials for the modal dropdown (strictly filtered by segment)
  const sortedModalSegmentMaterials = useMemo(() => {
    return [...modalSegmentMaterials].sort((a, b) =>
      (a.ItemDescription || '').localeCompare(b.ItemDescription || '', undefined, { sensitivity: 'base' })
    );
  }, [modalSegmentMaterials]);

  // Grouped raw materials by segment for segregated dashboard display
  const groupedMaterials = useMemo(() => {
    const groups = {};
    rawMaterialsList.forEach(item => {
      const seg = (item?.Segment || 'Other').trim() || 'Other';
      if (!groups[seg]) groups[seg] = [];
      groups[seg].push(item);
    });
    Object.keys(groups).forEach(seg => {
      groups[seg].sort((a, b) => (a.ItemDescription || '').localeCompare(b.ItemDescription || ''));
    });
    return groups;
  }, [rawMaterialsList]);

  // Sorted Optgroups: prioritized with active modalSegment at top
  const sortedGroupedMaterials = useMemo(() => {
    const entries = Object.entries(groupedMaterials);
    return entries.sort(([segA], [segB]) => {
      if (modalSegment && segA.toLowerCase() === modalSegment.toLowerCase()) return -1;
      if (modalSegment && segB.toLowerCase() === modalSegment.toLowerCase()) return 1;
      return segA.localeCompare(segB);
    });
  }, [groupedMaterials, modalSegment]);

  // Open Create / Add Modal
  const handleOpenCreateModal = () => {
    setEditingRecordId(null);
    setModalSegment(segmentsInDB[0] || 'BODEGA RACKS');
    setModalDescription('');
    setModalUom('UNIT');
    setSelectedFile(null);
    setExistingImgPreview('');

    // Initial 1 material row ready for selection
    setModalComponents([
      { id: `comp-${Date.now()}`, materialId: '', pcsPerUnit: 1 }
    ]);
    setIsModalOpen(true);
  };

  // Open Edit Modal for a saved record
  const handleOpenEditModal = (rec) => {
    setEditingRecordId(rec.id);
    setModalSegment(rec.segment || segmentsInDB[0] || 'BODEGA RACKS');
    setModalDescription(rec.description || rec.unitName || '');
    setModalUom(rec.uom || 'UNIT');
    setSelectedFile(null);
    setExistingImgPreview(rec.imageUrl || '');

    const comps = (rec.components || []).map(c => {
      const mat = findMatchingMaterial(c, rec.segment);
      return {
        id: c.id || `c-${Date.now()}-${Math.random()}`,
        materialId: mat ? (mat._id?.toString() || mat._id) : (c.materialId || ''),
        pcsPerUnit: Number(c.pcsPerUnit || c.divisor || 1),
        role: c.role || mat?.ItemDescription || '',
        uom: mat?.UOM || c.uom || 'PCS'
      };
    });

    setModalComponents(comps.length > 0 ? comps : [
      { id: `c-1`, materialId: '', pcsPerUnit: 8 }
    ]);
    setIsModalOpen(true);
  };

  // Add Material Row inside Modal
  const handleAddMaterialRow = () => {
    setModalComponents(prev => [
      ...prev,
      {
        id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        materialId: '',
        pcsPerUnit: 1
      }
    ]);
  };

  // Update component field inside Modal
  const handleUpdateModalComponent = (id, field, value) => {
    setModalComponents(prev =>
      prev.map(c => {
        if (c.id === id) {
          if (field === 'pcsPerUnit') {
            const num = Math.max(1, parseInt(value, 10) || 1);
            return { ...c, pcsPerUnit: num, divisor: num };
          }
          return { ...c, [field]: value };
        }
        return c;
      })
    );
  };

  // Remove component row inside Modal
  const handleRemoveModalComponent = (id) => {
    if (modalComponents.length <= 1) {
      alert("A unit formula must have at least 1 material component.");
      return;
    }
    setModalComponents(prev => prev.filter(c => c.id !== id));
  };

  // Save Record
  const handleSaveModalRecord = (e) => {
    if (e) e.preventDefault();
    if (!modalDescription.trim()) {
      alert("Please enter Item Description.");
      return;
    }
    if (modalComponents.length === 0) {
      alert("Please add at least 1 racking material component.");
      return;
    }

    const newRecord = {
      id: editingRecordId || `unit-rec-${Date.now()}`,
      unitName: modalDescription.trim(),
      description: modalDescription.trim(),
      segment: modalSegment || segmentsInDB[0] || 'BODEGA RACKS',
      uom: modalUom || 'UNIT',
      imageUrl: existingImgPreview || '',
      createdAt: editingRecordId
        ? (unitRecords.find(r => r.id === editingRecordId)?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
      components: modalComponents.map(c => {
        const mat = materialsMap.get(c.materialId) || materialsMap.get(String(c.materialId)) || findMatchingMaterial(c, modalSegment);
        const pcs = Math.max(1, Number(c.pcsPerUnit || c.divisor || 1));
        const uom = mat?.UOM || c.uom || 'PCS';
        return {
          id: c.id,
          materialId: mat ? (mat._id?.toString() || mat._id) : (c.materialId || ''),
          role: mat ? mat.ItemDescription : (c.role || 'Component'),
          pcsPerUnit: pcs,
          divisor: pcs,
          uom: uom,
          dimension: mat?.Dimension || c.dimension || ''
        };
      })
    };

    setUnitRecords(prev => {
      if (editingRecordId) {
        return prev.map(r => (r.id === editingRecordId ? newRecord : r));
      }
      return [newRecord, ...prev];
    });

    setIsModalOpen(false);
    triggerSuccess(`Successfully saved rackings unit "${newRecord.unitName}"!`);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!recordToDelete) return;
    setUnitRecords(prev => prev.filter(r => r.id !== recordToDelete.id));
    setIsDeleteModalOpen(false);
    setRecordToDelete(null);
    triggerSuccess("Unit calculation record deleted successfully.");
  };

  // Compute live calculation metrics for any given record
  const computeRecordMetrics = (rec) => {
    const comps = rec.components || [];
    let totalPcs = 0;
    let maxCompleteUnits = Infinity;

    const rowDetails = comps.map(c => {
      const mat = findMatchingMaterial(c, rec.segment);

      const physical = Number(mat?.ActualCount) || 0;
      const reserved = Number(mat?.ReserveCount) || 0;
      const stock = Math.max(0, physical - reserved);
      const pcsPerUnit = Math.max(1, Number(c.pcsPerUnit || c.divisor || 1));

      totalPcs += pcsPerUnit;

      const unitsCapable = mat ? Math.floor(stock / pcsPerUnit) : 0;
      if (unitsCapable < maxCompleteUnits) {
        maxCompleteUnits = unitsCapable;
      }

      const uom = mat?.UOM || c.uom || 'PCS';
      const dimension = mat?.Dimension || c.dimension || '—';

      return {
        comp: c,
        mat,
        stock,
        pcsPerUnit,
        unitsCapable,
        uom,
        dimension
      };
    });

    if (comps.length === 0 || maxCompleteUnits === Infinity) {
      maxCompleteUnits = 0;
    }

    const totalPcsForUnits = maxCompleteUnits * totalPcs;

    return {
      totalPcs,
      maxCompleteUnits,
      totalPcsForUnits,
      rowDetails
    };
  };

  // Live calculation for the active modal being edited (per 1 Unit)
  const modalLiveMetrics = useMemo(() => {
    let totalPcsForOneUnit = 0;

    const rows = modalComponents.map(c => {
      const mat = c.materialId ? (materialsMap.get(c.materialId) || materialsMap.get(String(c.materialId))) : findMatchingMaterial(c, modalSegment);
      const physical = Number(mat?.ActualCount) || 0;
      const reserved = Number(mat?.ReserveCount) || 0;
      const stock = Math.max(0, physical - reserved);
      const pcsPerUnit = Math.max(1, Number(c.pcsPerUnit || c.divisor || 1));

      totalPcsForOneUnit += pcsPerUnit;

      return {
        ...c,
        mat,
        stock,
        pcsPerUnit,
        uom: mat?.UOM || c.uom || 'PCS'
      };
    });

    return {
      totalPcsForOneUnit,
      rows
    };
  }, [modalComponents, materialsMap, rawMaterialsList, modalSegment]);

  // Filtered Unit Records for Main Table
  const filteredRecords = useMemo(() => {
    return unitRecords.filter(rec => {
      const matchesSearch = !searchTerm || [
        rec.unitName,
        rec.segment,
        rec.description,
        ...(rec.components || []).map(c => c.role)
      ].some(val => val && val.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesSeg = selectedSegment === 'All Segments' || rec.segment === selectedSegment;

      return matchesSearch && matchesSeg;
    });
  }, [unitRecords, searchTerm, selectedSegment]);

  // Pagination Calculations
  const totalRows = filteredRecords.length;
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const paginatedRecords = filteredRecords.slice(indexOfFirstRow, indexOfLastRow);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSegment]);

  // --- PDF EXPORT FOR A RECORD ---
  const handleExportRecordPDF = (rec) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = 297;
      const pageHeight = 210;
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;

      const metrics = computeRecordMetrics(rec);
      const formattedDate = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      const loggedUser = localStorage.getItem("username") || localStorage.getItem("SystemRole") || "System User";

      // Watermark
      try {
        doc.saveGraphicsState();
        doc.setGState(new doc.GState({ opacity: 0.05 }));
        const logoWidth = 75;
        const logoHeight = 75;
        doc.addImage('/cropped_circle_image.png', 'PNG', centerX - (logoWidth / 2), centerY - (logoHeight / 2), logoWidth, logoHeight);
        doc.restoreGraphicsState();
      } catch (e) { }

      // Header Navy Banner
      doc.setFillColor(24, 23, 78);
      doc.rect(0, 0, pageWidth, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("ONEINVENTORY - RACKINGS UNIT MATERIAL SPECIFICATION", centerX, 10.5, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(215, 220, 245);
      doc.text("Bill of Materials (BOM) & Material Ratio Formula (per 1 Unit)", centerX, 18, { align: 'center' });

      // Metadata Header Info
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);

      doc.text("Item Description:", 14, 34);
      doc.setFont("helvetica", "normal");
      doc.text(rec.description || rec.unitName || 'Custom Rack Unit', 52, 34);

      doc.setFont("helvetica", "bold");
      doc.text("Date Generated:", 190, 34);
      doc.setFont("helvetica", "normal");
      doc.text(formattedDate, 222, 34);

      doc.setFont("helvetica", "bold");
      doc.text("Target Segment:", 14, 40);
      doc.setFont("helvetica", "normal");
      doc.text(`${rec.segment || 'N/A'} (UOM: ${rec.uom || 'UNIT'})`, 52, 40);

      doc.setFont("helvetica", "bold");
      doc.text("Recorded By:", 190, 40);
      doc.setFont("helvetica", "normal");
      doc.text(loggedUser, 222, 40);

      // KPI Summary Cards
      const cardY = 46;
      const cardHeight = 20;
      const cardWidth = 86;

      // Card 1: Formula Components
      doc.setFillColor(240, 249, 255);
      doc.roundedRect(14, cardY, cardWidth, cardHeight, 1.5, 1.5, 'F');
      doc.setDrawColor(14, 165, 233);
      doc.setLineWidth(0.4);
      doc.roundedRect(14, cardY, cardWidth, cardHeight, 1.5, 1.5, 'S');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(3, 105, 161);
      doc.text("FORMULA COMPONENTS REQUIRED", 18, cardY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(12, 74, 110);
      doc.text(`${(rec.components || []).length} MATERIAL COMPONENTS`, 18, cardY + 13.5);

      // Card 2: Total Pieces per 1 Unit
      const card2X = 14 + cardWidth + 5;
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(card2X, cardY, cardWidth, cardHeight, 1.5, 1.5, 'F');
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.4);
      doc.roundedRect(card2X, cardY, cardWidth, cardHeight, 1.5, 1.5, 'S');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(180, 83, 9);
      doc.text("TOTAL PIECES (PER 1 UNIT)", card2X + 4, cardY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(146, 64, 14);
      doc.text(`${metrics.totalPcs} PCS / 1 UNIT`, card2X + 4, cardY + 13.5);

      // Card 3: Total Complete Units Capable
      const card3X = card2X + cardWidth + 5;
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(card3X, cardY, cardWidth, cardHeight, 1.5, 1.5, 'F');
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.4);
      doc.roundedRect(card3X, cardY, cardWidth, cardHeight, 1.5, 1.5, 'S');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(21, 128, 61);
      doc.text("TOTAL UNITS FORMABLE (LIVE STOCK)", card3X + 4, cardY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 83, 45);
      doc.text(`${metrics.maxCompleteUnits.toLocaleString()} ${rec.uom || 'UNITS'} (${metrics.totalPcsForUnits.toLocaleString()} PCS TOTAL)`, card3X + 4, cardY + 13.5);

      // BOM Table
      const columns = [
        "#",
        "Material Name & Description",
        "Segment",
        "Dimension",
        "Warehouse Stock",
        "Required Quantity (per 1 Unit)"
      ];

      const rows = metrics.rowDetails.map((r, idx) => {
        const mat = r.mat;
        const matDesc = mat ? `[${mat.Code}] ${mat.ItemDescription}` : (r.comp.role || '⚠️ Unassigned Material');
        const dimStr = mat?.Dimension || '—';
        const parsedDim = parseRackDimension(dimStr);
        const displayDim = parsedDim.badges && parsedDim.badges.length > 0
          ? parsedDim.badges.map(b => `${b.label}: ${b.value}`).join(' | ')
          : dimStr;

        return [
          (idx + 1).toString(),
          matDesc,
          mat?.Segment || rec.segment || '—',
          displayDim,
          mat ? `${r.stock.toLocaleString()} ${r.uom || mat.UOM || 'PCS'}` : '—',
          `${r.pcsPerUnit} ${r.uom || mat?.UOM || 'PCS'} / 1 UNIT`
        ];
      });

      const footRow = [[
        "TOTAL",
        `Formula Components (${(rec.components || []).length} Materials)`,
        "—",
        "—",
        "—",
        `${metrics.totalPcs.toLocaleString()} PCS TOTAL / 1 UNIT`
      ]];

      autoTable(doc, {
        startY: 71,
        margin: { top: 32, bottom: 24, left: 14, right: 14 },
        head: [columns],
        body: rows,
        foot: footRow,
        theme: 'grid',
        headStyles: {
          fillColor: [24, 23, 78],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
          valign: 'middle'
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [50, 50, 50],
          valign: 'middle'
        },
        footStyles: {
          fillColor: [24, 23, 78],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
          cellPadding: 3
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 9, halign: 'center' },
          1: { cellWidth: 80, fontStyle: 'bold' },
          2: { cellWidth: 35 },
          3: { cellWidth: 50 },
          4: { cellWidth: 35, halign: 'center' },
          5: { cellWidth: 60, halign: 'center', fontStyle: 'bold' }
        }
      });

      const safeName = (rec.description || rec.unitName || 'UNIT_FORMULA').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`RACKING_UNIT_SPEC_${safeName}_${Date.now()}.pdf`);
      triggerSuccess(`Exported Specification PDF for "${rec.description || rec.unitName}"!`);
    } catch (err) {
      console.error("PDF export error:", err);
      alert(`Error generating PDF: ${err.message}`);
    }
  };



  return (
    <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative">
      {/* 1. PAGE HEADER (MATCHING RACKINGS.JSX) */}
      <PageHeader activeTab="rackings-unit" />

      {/* 2. NOTIFICATION TOASTS */}
      {successMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm font-semibold">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-600 ml-2 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. MAIN WHITE / DARK CONTAINER (MATCHING RACKINGS.JSX EXACTLY) */}
      <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100 text-slate-600'} border rounded-2xl p-6 shadow-sm flex flex-col gap-6 transition-colors duration-200`}>

        {/* FILTER CONTROLS MASTER ROW */}
        <div className="flex flex-col gap-1.5">

          {/* TOP BAR */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className={`flex items-center gap-2 text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-500'} flex-shrink-0`}>
                <Filter className={`w-4 h-4 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
                <span>Filter</span>
              </div>
            </div>
          </div>

          {/* LAYER 2: 3-COLUMN FILTER GRID (Search, Segment, Add Button) */}
          <div className="flex overflow-x-auto gap-2 items-center mt-2 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:pb-0">
            {/* Search */}
            <div className="min-w-[180px] w-full md:min-w-0">
              <div className="relative w-full">
                <Search className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Search unit description, component, segment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'
                    } border rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none`}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Segment Filter */}
            <div className="min-w-[150px] w-full md:min-w-0">
              <select
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value)}
                className={`${isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                  } border font-semibold rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer w-full`}
              >
                {filterSegments.map(seg => {
                  if (seg === 'All Segments') return <option key={seg} value={seg}>{seg}</option>;
                  const config = getSegmentStyles(seg);
                  return <option key={seg} value={seg}>{config.prefix} {seg}</option>;
                })}
              </select>
            </div>

            {/* Add New Rackings Unit Button */}
            <div className="min-w-[160px] w-full md:min-w-0">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className={`flex items-center justify-center gap-2 ${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'
                  } text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm w-full cursor-pointer transition-all h-[38px]`}
              >
                <Plus className="w-4 h-4" />
                <span className="whitespace-nowrap">Add New Rackings Unit</span>
              </button>
            </div>
          </div>

          <div className={`h-px ${isDark ? 'bg-slate-800' : 'bg-slate-100'} w-full mt-3`}></div>
        </div>

        {/* MAIN RECORDS TABLE (SAME UI AS RACKINGS.JSX) */}
        <div className={`${isDark ? 'bg-[#0c0e14] border-slate-800' : 'bg-white border-slate-100'} rounded-xl border shadow-sm overflow-hidden`}>
          <TablePagination
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            totalRows={totalRows}
            options={[5, 10, 20, 50, 100]}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className={`text-white font-bold uppercase text-sm ${isDark ? 'bg-[#0f111d] border-b border-slate-800' : 'bg-[#18174e]'}`}>
                  <th className="py-3 px-3 text-center whitespace-nowrap">Image</th>
                  <th className="py-3 px-4 whitespace-nowrap">Item Description</th>
                  <th className="py-3 px-4 whitespace-nowrap">Rackings</th>
                  <th className="py-3 px-4 whitespace-nowrap">Dimension</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Formula Quantity</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">
                    <span>Stock Quantity</span>
                    <span className="block text-[10px] normal-case opacity-75 font-normal tracking-normal">(Need / Total)</span>
                  </th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Total Units</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/80 bg-[#090b10]' : 'divide-slate-100 bg-white'}`}>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((rec) => {
                    const metrics = computeRecordMetrics(rec);
                    const currentSegConfig = getSegmentStyles(rec.segment);

                    return (
                      <tr
                        key={rec.id}
                        className={`group ${currentSegConfig.rowBg || (isDark ? 'hover:bg-[#141622] text-slate-300' : 'hover:bg-slate-50/80 text-slate-600')
                          } transition-colors font-medium whitespace-nowrap text-sm`}
                      >
                        {/* Image Thumbnail */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {rec.imageUrl ? (
                            <img
                              src={rec.imageUrl}
                              alt={rec.description || rec.unitName}
                              onClick={() => setPreviewImage(rec.imageUrl)}
                              className={`w-10 h-10 object-cover rounded-lg cursor-pointer hover:scale-110 ${isDark ? 'hover:border-[#ff6600]' : 'hover:border-[#18174e]'} transition-all mx-auto shadow-sm border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                              title="Click to view full image"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-lg ${isDark ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-slate-100 text-slate-400 border-slate-200'} flex items-center justify-center border border-dashed mx-auto`}>
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </td>

                        {/* Unit Name & Description */}
                        <td className="py-3 px-4 min-w-[200px]">
                          <div className={`font-semibold whitespace-normal break-words transition-colors ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                            {rec.description || rec.unitName}
                          </div>
                        </td>

                        {/* Rackings Materials Column (with Material Photo) */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1.5 min-w-[220px]">
                            {(rec.components || []).map((c, cIdx) => {
                              const detail = metrics.rowDetails?.[cIdx];
                              const mat = detail?.mat;
                              const matDesc = mat?.ItemDescription || c.role || 'Component';
                              const matImg = mat?.ImageUrl || c.imageUrl;
                              return (
                                <div
                                  key={cIdx}
                                  className={`h-7 flex items-center gap-2 px-1.5 rounded-md text-xs font-semibold border ${
                                    isDark ? 'bg-[#141622] border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                  title={matDesc}
                                >
                                  {matImg ? (
                                    <img
                                      src={getImageSrc(matImg)}
                                      alt={matDesc}
                                      className="w-5 h-5 rounded object-cover border border-slate-300 dark:border-slate-600 shrink-0 cursor-zoom-in hover:scale-125 transition-transform shadow-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewImage(getImageSrc(matImg));
                                      }}
                                      title="Click to view full photo"
                                    />
                                  ) : (
                                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border border-dashed ${
                                      isDark ? 'bg-slate-800/80 border-slate-700 text-slate-500' : 'bg-slate-100 border-slate-300 text-slate-400'
                                    }`}>
                                      <Layers className="w-3 h-3" />
                                    </div>
                                  )}
                                  <span className="truncate max-w-[190px]">{matDesc}</span>
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Rackings Dimension Column */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5 min-w-[160px]">
                            {(rec.components || []).map((c, cIdx) => {
                              const detail = metrics.rowDetails?.[cIdx];
                              const dimension = detail?.dimension || detail?.mat?.Dimension || c.dimension || '—';
                              const parsed = parseRackDimension(dimension);
                              return (
                                <div
                                  key={cIdx}
                                  className={`h-7 flex items-center px-2.5 rounded-md text-xs border ${isDark ? 'bg-[#141622] border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                                  title={dimension}
                                >
                                  {parsed.badges && parsed.badges.length > 0 ? (
                                    <div className="flex items-center gap-1 overflow-hidden">
                                      {parsed.badges.map((b, bIdx) => (
                                        <span
                                          key={bIdx}
                                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border leading-none ${
                                            b.type === 'H' ? (isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200') :
                                            b.type === 'W' ? (isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200') :
                                            b.type === 'L' ? (isDark ? 'bg-teal-950/60 text-teal-300 border-teal-800' : 'bg-teal-50 text-teal-700 border-teal-200') :
                                            b.type === 'D' ? (isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-800 border-amber-200') :
                                            (isDark ? 'bg-purple-950/60 text-purple-300 border-purple-800' : 'bg-purple-50 text-purple-800 border-purple-200')
                                          }`}
                                        >
                                          <span className="font-bold mr-0.5 uppercase">{b.label}:</span>
                                          <span>{b.value}</span>
                                        </span>
                                      ))}
                                      {parsed.extra && (
                                        <span className="text-[10px] text-slate-400 truncate max-w-[90px]" title={parsed.extra}>
                                          {parsed.extra}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="font-mono text-xs truncate">{dimension}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Formula Quantity Column (Using material's actual UOM) */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex flex-col gap-1.5 min-w-[130px]">
                            {(rec.components || []).map((c, cIdx) => {
                              const detail = metrics.rowDetails?.[cIdx];
                              const uom = detail?.uom || c.uom || 'PCS';
                              return (
                                <div
                                  key={cIdx}
                                  className={`h-7 flex items-center justify-center px-2.5 rounded-md text-xs font-mono font-bold border ${isDark ? 'bg-[#141622] border-slate-700 text-amber-400' : 'bg-amber-50/70 border-amber-200 text-amber-700'
                                    }`}
                                >
                                  <span>{c.pcsPerUnit || c.divisor} {uom}</span>
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Stock Quantity Column (Need Quantity / Total Stock) */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex flex-col gap-1.5 min-w-[140px]">
                            {(rec.components || []).map((c, cIdx) => {
                              const detail = metrics.rowDetails?.[cIdx];
                              const uom = detail?.uom || c.uom || 'PCS';
                              const usedPcs = (Number(c.pcsPerUnit || c.divisor || 1)) * metrics.maxCompleteUnits;
                              const totalStock = detail ? Number(detail.stock || 0) : 0;
                              const remainder = Math.max(0, totalStock - usedPcs);
                              return (
                                <div
                                  key={cIdx}
                                  className={`h-7 flex items-center justify-center px-2.5 rounded-md text-xs font-mono font-bold border ${metrics.maxCompleteUnits > 0
                                    ? (isDark ? 'bg-[#141622] border-slate-700 text-emerald-400' : 'bg-emerald-50/70 border-emerald-200 text-emerald-700')
                                    : (isDark ? 'bg-[#141622] border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400')
                                    }`}
                                  title={`Need: ${usedPcs.toLocaleString()} ${uom} | Total Stock: ${totalStock.toLocaleString()} ${uom}${remainder > 0 ? ` | Butal: ${remainder.toLocaleString()} ${uom}` : ''}`}
                                >
                                  <span>{usedPcs.toLocaleString()}/{totalStock.toLocaleString()} {uom}</span>
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        {/* Total Units Column (Single Consistent Box matching Stock Quantity) */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex flex-col gap-1.5 min-w-[120px]">
                            <div
                              className={`h-7 flex items-center justify-center px-2.5 rounded-md text-xs font-mono font-bold border ${metrics.maxCompleteUnits > 0
                                ? (isDark ? 'bg-[#141622] border-slate-700 text-emerald-400' : 'bg-emerald-50/70 border-emerald-200 text-emerald-700')
                                : (isDark ? 'bg-[#141622] border-slate-700 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400')
                                }`}
                            >
                              <span>{metrics.maxCompleteUnits.toLocaleString()} {rec.uom || 'UNITS'}</span>
                            </div>
                          </div>
                        </td>

                        {/* Action Buttons (Edit & Delete only) */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(rec)}
                              title="Edit Rackings Unit"
                              className={`p-1 ${isDark ? 'bg-[#181a26] border-slate-700 text-indigo-400 hover:bg-indigo-600 hover:text-white' : 'bg-white border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white'} border rounded transition-all cursor-pointer`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => {
                                setRecordToDelete(rec);
                                setIsDeleteModalOpen(true);
                              }}
                              title="Delete this record"
                              className={`p-1 ${isDark ? 'bg-[#181a26] border-slate-700 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-600 hover:text-white'} border rounded transition-all cursor-pointer`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 italic text-xs">
                      No unit calculation records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* =========================================================================
          🌟 ADD NEW RACKINGS UNIT MODAL (MATCHING RACKINGS.JSX EXACTLY)
          ========================================================================= */}
      {
        isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200'} border rounded-2xl w-full max-w-xl sm:max-w-4xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto`}>

              {/* MODAL HEADER */}
              <div className={`flex items-center justify-between border-b ${isDark ? 'border-slate-800' : 'border-slate-100'} pb-3`}>
                <div className="flex items-center gap-2">
                  <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'} text-base`}>
                    {editingRecordId ? "Update Rackings Unit" : "Add New Rackings Unit"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'} p-1 cursor-pointer`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* SYSTEM PROTOCOL NOTICE BANNER */}
              <div className={`p-3 ${isDark ? 'bg-amber-950/30 border-amber-900/50' : 'bg-amber-50 border-amber-200/60'} rounded-xl border mt-3`}>
                <span className={`block text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase mb-1`}>
                  * System Inventory Protocol *
                </span>
                <p className={`text-[11px] ${isDark ? 'text-amber-300/80' : 'text-amber-700'} leading-relaxed`}>
                  Piliin ang mga materyales at ilagay ang dami na kailangan para buuin ang <strong>1 Unit</strong> ng rackings na ito. Ang formula ay awtomatikong gagamit ng opisyal na UOM mula sa database (hal. UNITS, PCS, SETS) para sa bawat materyal.
                </p>
              </div>

              <form onSubmit={handleSaveModalRecord} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* 1. ITEM IMAGE UPLOAD (SAME UI AS RACKINGS.JSX) */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase`}>
                        Item Image Upload
                      </label>
                    </div>

                    {/* IMAGE PREVIEW OR UPLOAD BOX */}
                    {(selectedFile || existingImgPreview || isCompressingImg) ? (
                      <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${isDark ? 'bg-[#141622] border-slate-700' : 'bg-slate-50 border-slate-200'
                        }`}>
                        <div className="flex items-center gap-3 min-w-0">
                          {isCompressingImg ? (
                            <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-slate-200 dark:bg-slate-800 shrink-0">
                              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                            </div>
                          ) : (
                            <img
                              src={selectedFile ? URL.createObjectURL(selectedFile) : existingImgPreview}
                              alt="Preview"
                              className={`w-14 h-14 rounded-lg object-cover border ${isDark ? 'border-slate-600' : 'border-slate-300'} shadow-sm shrink-0`}
                            />
                          )}
                          <div className="min-w-0">
                            {isCompressingImg ? (
                              <>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500 shrink-0" />
                                  <span>Optimizing photo...</span>
                                </div>
                                <span className="text-[10px] text-orange-500 font-medium">Compressing for instant upload</span>
                              </>
                            ) : selectedFile ? (
                              <>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span className="truncate">{selectedFile.name}</span>
                                </div>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                  Optimized ({(selectedFile.size / 1024).toFixed(0)} KB) • Ready for upload
                                </span>
                              </>
                            ) : (
                              <>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  Current Unit Image
                                </div>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Saved in record</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Direct Replace from device */}
                          <label className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`} title="Replace with new photo from device">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Replace</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                          </label>

                          <button
                            type="button"
                            onClick={handleClearImage}
                            title="Remove Image"
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className={`flex flex-col items-center justify-center ${isDark ? 'bg-[#141622] border-slate-700 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'} border-2 border-dashed rounded-xl py-4 px-3 transition-all cursor-pointer text-center mt-1`}>
                        <Upload className={`w-6 h-6 mb-1.5 ${isDark ? 'text-[#ff8533]' : 'text-[#18174e]'}`} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Upload Image from Device</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP (Auto-optimized)</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      </label>
                    )}
                  </div>

                  {/* 2. SEGMENT (DROPDOWN BASED ON DB) */}
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
                      Segment
                    </label>
                    <select
                      value={modalSegment}
                      onChange={(e) => setModalSegment(e.target.value)}
                      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer`}
                    >
                      {segmentsInDB.map((seg) => (
                        <option key={seg} value={seg}>{seg}</option>
                      ))}
                    </select>
                  </div>

                  {/* 3. ITEM DESCRIPTION * */}
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'} uppercase mb-1.5`}>
                      Item Description *
                    </label>
                    <input
                      type="text"
                      required
                      value={modalDescription}
                      onChange={(e) => setModalDescription(e.target.value)}
                      placeholder="Enter rack unit description"
                      className={`w-full ${isDark ? 'bg-[#141622] border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#ff6600]' : 'bg-white border-slate-200 text-slate-700 focus:border-[#18174e]'} border rounded-lg px-3 py-2 text-sm focus:outline-none`}
                    />
                  </div>

                  {/* 5. SECTION: + ADD RACKINGS MATERIALS */}
                  <div className="md:col-span-2 pt-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800 mb-3 flex-wrap gap-2">
                      <div>
                        <h4 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          Rackings Materials Required (per 1 Unit)
                        </h4>
                        <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Piliin ang raw material sa dropdown at ilagay ang dami (ayon sa UOM nito) na kailangan para sa 1 Unit.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={fetchRawMaterials}
                          title="Reload latest racking materials from database"
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                            } cursor-pointer transition-colors`}
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : ''}`} />
                          <span className="hidden sm:inline">Refresh Stock</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleAddMaterialRow}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white ${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'
                            } cursor-pointer transition-all shadow-xs active:scale-95`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Rackings Materials</span>
                        </button>
                      </div>
                    </div>

                    {/* TABLE OF SELECTED RACKING MATERIALS */}
                    <div className={`border rounded-xl shadow-xs ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                      <div className="overflow-x-auto min-h-[240px]">
                        <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                          <thead className={`text-[11px] font-bold uppercase ${isDark ? 'bg-[#181b28] text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-700 border-b border-slate-200'
                            }`}>
                            <tr>
                              <th className="py-2.5 px-3 text-center w-10">#</th>
                              <th className="py-2.5 px-3 min-w-[260px]">Select Racking Material (Dropdown)</th>
                              <th className="py-2.5 px-3 min-w-[120px]">Segment</th>
                              <th className="py-2.5 px-3 min-w-[140px]">Item Description</th>
                              <th className="py-2.5 px-3 min-w-[120px]">Dimension</th>
                              <th className="py-2.5 px-3 text-center w-28">Actual Count</th>
                              <th className="py-2.5 px-3 text-center w-28">Formula Qty / 1 Unit</th>
                              <th className="py-2.5 px-3 text-center w-10"></th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                            {modalLiveMetrics.rows.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="py-8 text-center">
                                  <p className="text-xs text-slate-400 mb-2">Walang racking materials na napili para sa unit na ito.</p>
                                  <button
                                    type="button"
                                    onClick={handleAddMaterialRow}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white ${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'
                                      } cursor-pointer shadow-xs`}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>+ Add Rackings Materials</span>
                                  </button>
                                </td>
                              </tr>
                            ) : (
                              modalLiveMetrics.rows.map((r, idx) => {
                                const mat = r.mat;

                                return (
                                  <tr
                                    key={r.id}
                                    className={`transition-colors ${isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/60'
                                      }`}
                                  >
                                    {/* Index */}
                                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                                      {idx + 1}
                                    </td>

                                    {/* Material Dropdown with Image instead of Code (Filtered to Selected Segment) */}
                                    <td className="py-2.5 px-3 min-w-[260px]">
                                      <MaterialImageDropdownCell
                                        selectedMaterialId={r.materialId}
                                        materials={sortedModalSegmentMaterials}
                                        allMaterialsMap={materialsMap}
                                        isOpen={openDropdownRowId === r.id}
                                        onToggle={() => setOpenDropdownRowId(prev => prev === r.id ? null : r.id)}
                                        onSelect={(matId) => {
                                          handleUpdateModalComponent(r.id, 'materialId', matId);
                                          setOpenDropdownRowId(null);
                                        }}
                                        onPreviewImage={(url) => setPreviewImage(url)}
                                        isDark={isDark}
                                        modalSegment={modalSegment}
                                        loading={loading}
                                        isNearBottom={idx >= modalLiveMetrics.rows.length - 2 && modalLiveMetrics.rows.length > 2}
                                      />
                                    </td>

                                    {/* Segment */}
                                    <td className="py-2.5 px-3">
                                      {mat ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                          {mat.Segment || '—'}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>

                                    {/* Item Description */}
                                    <td className="py-2.5 px-3">
                                      {mat ? (
                                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 line-clamp-1" title={mat.ItemDescription}>
                                          {mat.ItemDescription}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic">None selected</span>
                                      )}
                                    </td>

                                    {/* Dimension */}
                                    <td className="py-2.5 px-3">
                                      {mat ? (
                                        <RackDimensionCell dimension={mat.Dimension} isDark={isDark} />
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>

                                    {/* Actual Count */}
                                    <td className="py-2.5 px-3 text-center font-mono">
                                      {mat ? (
                                        <span className={`font-bold ${r.stock > 0 ? 'text-slate-800 dark:text-slate-200' : 'text-rose-500'}`}>
                                          {r.stock.toLocaleString()} {mat.UOM || 'PCS'}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </td>

                                    {/* Pcs / 1 Unit */}
                                    <td className="py-2.5 px-3 text-center">
                                      <div className="inline-flex items-center justify-center gap-1">
                                        <input
                                          type="number"
                                          min="1"
                                          value={r.pcsPerUnit}
                                          onChange={(e) => handleUpdateModalComponent(r.id, 'pcsPerUnit', e.target.value)}
                                          className={`w-14 text-center font-bold text-xs px-2 py-1 rounded border ${isDark ? 'bg-[#0e1017] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                            }`}
                                        />
                                        <span className="text-[10px] text-slate-400 font-semibold">{mat?.UOM || 'PCS'}</span>
                                      </div>
                                    </td>

                                    {/* Delete Row */}
                                    <td className="py-2.5 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveModalComponent(r.id)}
                                        className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                                        title="Remove component"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>

                          {/* Modal Table Total Row */}
                          <tfoot className={`font-bold border-t-2 ${isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                            }`}>
                            <tr>
                              <td className="py-2.5 px-3 text-center font-black text-xs text-indigo-500">TOTAL</td>
                              <td className="py-2.5 px-3 text-xs text-slate-500" colSpan={4}>
                                Formula Components ({modalComponents.length} Materials)
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-xs">
                                —
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-xs font-black text-amber-500 dark:text-amber-400">
                                {modalLiveMetrics.totalPcsForOneUnit.toLocaleString()} PCS
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>

                </div>

                {/* MODAL FOOTER BUTTONS (MATCHING RACKINGS.JSX EXACTLY) */}
                <div className={`flex items-center justify-end gap-2 mt-6 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isCompressingImg}
                    className={`${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'} font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCompressingImg}
                    className={`${isDark ? 'bg-[#ff6600] hover:bg-[#ff6600]/90' : 'bg-[#18174e] hover:bg-[#18174e]/90'} text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                  >
                    {isCompressingImg ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Optimizing photo...</span>
                      </>
                    ) : (
                      <span>{editingRecordId ? "Save Changes" : "Add Unit"}</span>
                    )}
                  </button>
                </div>

              </form>

            </div>
          </div>
        )
      }

      {/* =========================================================================
          CONFIRM DELETE MODAL
          ========================================================================= */}
      {
        isDeleteModalOpen && recordToDelete && (
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={() => setIsDeleteModalOpen(false)}
          >
            <div
              className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl flex flex-col gap-4 ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-rose-500/10 text-rose-500 shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">Delete Unit Record</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Are you sure you want to delete this unit calculation record?</p>
                </div>
              </div>

              <div className={`p-3 rounded-lg border text-xs font-semibold ${isDark ? 'bg-[#141622] border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                {recordToDelete.unitName}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                >
                  Yes, Delete Record
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* LIGHTBOX PREVIEW */}
      {
        previewImage && (
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[80] p-4"
            onClick={() => setPreviewImage(null)}
          >
            <div
              className="relative bg-white dark:bg-[#141622] p-2 rounded-2xl max-w-xl w-full shadow-2xl border dark:border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 bg-slate-900/80 text-white hover:bg-slate-800 p-2 rounded-full transition-all cursor-pointer z-10 shadow"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={previewImage} alt="Display" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
            </div>
          </div>
        )
      }

    </div >
  );
}
