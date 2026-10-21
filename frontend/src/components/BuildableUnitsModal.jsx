import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Download, Layers, Plus, Trash2, Save, RotateCcw, AlertTriangle,
  CheckCircle2, Box, Info, Sparkles, FileText, ArrowRight, Search,
  Image as ImageIcon, Filter, ChevronRight, Check, Eye, Calculator
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import RackDimensionCell, { parseRackDimension } from './common/RackDimensionCell';

const STORAGE_KEY = 'oneinventory_unit_assembly_recipes_v1';

const getBackendBaseUrl = () => {
  if (import.meta.env.MODE === 'production') {
    return 'https://one-inventory.onrender.com';
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname || 'localhost'}:5000`;
  }
  return 'http://localhost:5000';
};

const getImageSrc = (imageUrl) => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) return imageUrl;
  const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${getBackendBaseUrl()}${cleanPath}`;
};

// Default initial starter recipes
const DEFAULT_RECIPES = [
  {
    id: 'default-4-layer-rack',
    name: 'Standard 4-Layer Rack (8 Beams, 8 Deckings, 2 Posts)',
    description: 'Medium Duty Shelving Unit (4 Levels, 2 Upright Frames / Posts)',
    components: [
      { id: 'comp-1', role: 'Beam', materialId: '', searchHint: 'beam', divisor: 8 },
      { id: 'comp-2', role: 'Decking', materialId: '', searchHint: 'decking', divisor: 8 },
      { id: 'comp-3', role: 'Post / Upright', materialId: '', searchHint: 'post', divisor: 2 }
    ]
  },
  {
    id: 'default-3-layer-rack',
    name: 'Standard 3-Layer Rack (6 Beams, 6 Deckings, 2 Posts)',
    description: 'Medium Duty Shelving Unit (3 Levels, 2 Upright Frames / Posts)',
    components: [
      { id: 'comp-1', role: 'Beam', materialId: '', searchHint: 'beam', divisor: 6 },
      { id: 'comp-2', role: 'Decking', materialId: '', searchHint: 'decking', divisor: 6 },
      { id: 'comp-3', role: 'Post / Upright', materialId: '', searchHint: 'post', divisor: 2 }
    ]
  },
  {
    id: 'default-pallet-starter',
    name: 'Heavy Duty Pallet Starter Bay (8 Beams, 4 Posts)',
    description: 'Pallet Rack Starter Bay (2 Upright Frames = 4 Posts, 8 Beams)',
    components: [
      { id: 'comp-1', role: 'Beam', materialId: '', searchHint: 'beam', divisor: 8 },
      { id: 'comp-2', role: 'Post / Upright', materialId: '', searchHint: 'post', divisor: 4 }
    ]
  }
];

export default function BuildableUnitsModal({ isOpen, onClose, rawMaterials = [], isDark = false }) {
  // Load saved presets from localStorage
  const [recipes, setRecipes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load recipes from localStorage:", e);
    }
    return DEFAULT_RECIPES;
  });

  const [selectedRecipeId, setSelectedRecipeId] = useState(DEFAULT_RECIPES[0].id);
  const [recipeName, setRecipeName] = useState(DEFAULT_RECIPES[0].name);
  const [recipeDescription, setRecipeDescription] = useState(DEFAULT_RECIPES[0].description);
  const [components, setComponents] = useState(DEFAULT_RECIPES[0].components);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Material Picker Modal States
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerTargetRowId, setPickerTargetRowId] = useState(null);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [pickerSelectedSegment, setPickerSelectedSegment] = useState('All Segments');
  const [pickerSelectedPartType, setPickerSelectedPartType] = useState('All Parts');
  const [previewImage, setPreviewImage] = useState(null);

  // Auto-save recipes list to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
    } catch (e) {
      console.error("Failed to save recipes to localStorage:", e);
    }
  }, [recipes]);

  // Map of materials by ID for fast lookup
  const materialsMap = useMemo(() => {
    const map = new Map();
    (rawMaterials || []).forEach(mat => {
      if (mat && mat._id) map.set(mat._id, mat);
    });
    return map;
  }, [rawMaterials]);

  // Distinct Segments for Segregated Selection
  const availableSegments = useMemo(() => {
    const segs = new Set();
    (rawMaterials || []).forEach(m => {
      const s = (m?.Segment || '').trim();
      if (s && s !== 'N/A' && s !== 'Standard') {
        segs.add(s);
      }
    });
    return ['All Segments', ...Array.from(segs).sort((a, b) => a.localeCompare(b))];
  }, [rawMaterials]);

  // Count items per segment for the pill badges
  const segmentItemCounts = useMemo(() => {
    const counts = { 'All Segments': (rawMaterials || []).length };
    (rawMaterials || []).forEach(m => {
      const s = (m?.Segment || '').trim() || 'Uncategorized';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [rawMaterials]);

  // Smart Auto-match: Prioritize materials with AVAILABLE STOCK > 0 first!
  useEffect(() => {
    if (!rawMaterials || rawMaterials.length === 0) return;

    setComponents(prevComponents =>
      prevComponents.map(comp => {
        // If already assigned and still valid in DB with stock, keep it
        if (comp.materialId && materialsMap.has(comp.materialId)) {
          return comp;
        }

        const hint = (comp.searchHint || comp.role || '').toLowerCase();
        if (!hint) return comp;

        // 1. Find matching materials that have positive stock (sorted by highest stock first!)
        const matchingWithStock = rawMaterials
          .filter(m => {
            const seg = (m.Segment || '').toLowerCase();
            const desc = (m.ItemDescription || '').toLowerCase();
            const code = (m.Code || '').toLowerCase();
            const matches = seg.includes(hint) || desc.includes(hint) || code.includes(hint);
            const avail = Math.max(0, (Number(m.ActualCount) || 0) - (Number(m.ReserveCount) || 0));
            return matches && avail > 0;
          })
          .sort((a, b) => {
            const aAvail = Math.max(0, (Number(a.ActualCount) || 0) - (Number(a.ReserveCount) || 0));
            const bAvail = Math.max(0, (Number(b.ActualCount) || 0) - (Number(b.ReserveCount) || 0));
            return bAvail - aAvail;
          });

        let matched = matchingWithStock[0];

        // 2. Fallback to any matching material if none has stock
        if (!matched) {
          matched = rawMaterials.find(m => {
            const seg = (m.Segment || '').toLowerCase();
            const desc = (m.ItemDescription || '').toLowerCase();
            const code = (m.Code || '').toLowerCase();
            return seg.includes(hint) || desc.includes(hint) || code.includes(hint);
          });
        }

        if (matched) {
          return { ...comp, materialId: matched._id };
        }
        return comp;
      })
    );
  }, [rawMaterials, selectedRecipeId]);

  // Load recipe when dropdown changes
  const handleSelectRecipe = (id) => {
    setSelectedRecipeId(id);
    const found = recipes.find(r => r.id === id);
    if (found) {
      setRecipeName(found.name);
      setRecipeDescription(found.description || '');
      setComponents(found.components || []);
      setSaveSuccessMsg('');
    }
  };

  // Add new blank component row
  const handleAddComponent = () => {
    const newComp = {
      id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      role: 'Additional Part',
      materialId: '',
      searchHint: '',
      divisor: 1
    };
    setComponents(prev => [...prev, newComp]);
  };

  // Update component field (supports manual customPcs override!)
  const handleUpdateComponent = (id, field, value) => {
    setComponents(prev =>
      prev.map(c => {
        if (c.id === id) {
          if (field === 'divisor') {
            const num = Math.max(1, parseInt(value, 10) || 1);
            return { ...c, divisor: num };
          }
          if (field === 'customPcs') {
            return { ...c, customPcs: value };
          }
          return { ...c, [field]: value };
        }
        return c;
      })
    );
  };

  // Remove component row
  const handleRemoveComponent = (id) => {
    if (components.length <= 1) {
      alert("A unit must contain at least 1 material component.");
      return;
    }
    setComponents(prev => prev.filter(c => c.id !== id));
  };

  // Open Material Picker for a specific row
  const handleOpenPicker = (rowId, currentMat, role) => {
    setPickerTargetRowId(rowId);
    setPickerSearchQuery('');
    setPickerSelectedPartType('All Parts');

    // Pre-select segment if row's material or role matches
    if (currentMat?.Segment && currentMat.Segment !== 'N/A' && currentMat.Segment !== 'Standard') {
      const segMatch = availableSegments.find(s => s.toLowerCase() === currentMat.Segment.toLowerCase());
      setPickerSelectedSegment(segMatch || 'All Segments');
    } else {
      const roleStr = (role || '').toLowerCase();
      const matched = availableSegments.find(s => s !== 'All Segments' && roleStr.includes(s.toLowerCase()));
      setPickerSelectedSegment(matched || 'All Segments');
    }

    setIsPickerOpen(true);
  };

  // Pick a material and assign to row
  const handleSelectMaterial = (materialId) => {
    if (pickerTargetRowId) {
      handleUpdateComponent(pickerTargetRowId, 'materialId', materialId);
      // Reset any custom manual override when a new material is chosen
      handleUpdateComponent(pickerTargetRowId, 'customPcs', undefined);
    }
    setIsPickerOpen(false);
  };

  // Save / Update Preset
  const handleSaveRecipe = () => {
    if (!recipeName.trim()) {
      alert("Please provide a name for this recipe / unit template.");
      return;
    }

    const currentId = selectedRecipeId || `recipe-${Date.now()}`;
    const newRecipe = {
      id: currentId,
      name: recipeName.trim(),
      description: recipeDescription.trim(),
      components: components.map(c => ({
        id: c.id,
        role: c.role || 'Component',
        materialId: c.materialId || '',
        searchHint: c.searchHint || '',
        divisor: Number(c.divisor) || 1,
        customPcs: c.customPcs
      }))
    };

    setRecipes(prev => {
      const idx = prev.findIndex(r => r.id === currentId);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = newRecipe;
        return copy;
      }
      return [...prev, newRecipe];
    });

    setSelectedRecipeId(currentId);
    setSaveSuccessMsg('Recipe preset saved successfully!');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  // Delete current preset
  const handleDeleteRecipe = () => {
    if (recipes.length <= 1) {
      alert("Cannot delete the only remaining recipe preset.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete preset "${recipeName}"?`)) return;

    const remaining = recipes.filter(r => r.id !== selectedRecipeId);
    setRecipes(remaining);
    const nextRecipe = remaining[0];
    setSelectedRecipeId(nextRecipe.id);
    setRecipeName(nextRecipe.name);
    setRecipeDescription(nextRecipe.description || '');
    setComponents(nextRecipe.components || []);
  };

  // Reset to default templates
  const handleResetToDefaults = () => {
    if (window.confirm("Reset all recipes back to factory default templates? Custom presets will be removed.")) {
      setRecipes(DEFAULT_RECIPES);
      setSelectedRecipeId(DEFAULT_RECIPES[0].id);
      setRecipeName(DEFAULT_RECIPES[0].name);
      setRecipeDescription(DEFAULT_RECIPES[0].description);
      setComponents(DEFAULT_RECIPES[0].components);
    }
  };

  // --- CALCULATION LOGIC ---
  const calculationResults = useMemo(() => {
    const validRows = [];
    let lowestUnits = Infinity;
    let bottleneckItem = null;
    let totalPcsSum = 0;

    components.forEach((comp, idx) => {
      const mat = comp.materialId ? materialsMap.get(comp.materialId) : null;
      const divisor = Math.max(1, Number(comp.divisor) || 1);

      let physicalCount = 0;
      let reserveCount = 0;
      let liveAvailableStock = 0;

      if (mat) {
        physicalCount = Number(mat.ActualCount) || 0;
        reserveCount = Number(mat.ReserveCount) || 0;
        liveAvailableStock = Math.max(0, physicalCount - reserveCount);
      }

      // Check if user entered a custom manual Total Pcs override
      const hasCustomPcs = comp.customPcs !== undefined && comp.customPcs !== null && comp.customPcs !== '';
      const totalPcs = hasCustomPcs ? Math.max(0, Number(comp.customPcs) || 0) : liveAvailableStock;

      totalPcsSum += totalPcs;

      // Units this specific component converts to: Total Pcs ÷ Divisor
      const unitsCapable = mat || hasCustomPcs ? Math.floor(totalPcs / divisor) : 0;

      if ((mat || hasCustomPcs) && unitsCapable < lowestUnits) {
        lowestUnits = unitsCapable;
        bottleneckItem = {
          comp,
          mat,
          unitsCapable,
          totalPcs,
          divisor,
          shortageForNext: ((unitsCapable + 1) * divisor) - totalPcs
        };
      }

      validRows.push({
        id: comp.id,
        index: idx + 1,
        role: comp.role || `Component #${idx + 1}`,
        materialId: comp.materialId,
        mat,
        divisor,
        totalPcs,
        liveStock: liveAvailableStock,
        hasCustomPcs,
        physicalCount,
        reserveCount,
        unitsCapable
      });
    });

    const maxCompleteUnits = lowestUnits === Infinity ? 0 : lowestUnits;

    // Second pass to determine consumed, surplus, and bottleneck flags
    const processedRows = validRows.map(row => {
      const consumed = maxCompleteUnits * row.divisor;
      const surplus = Math.max(0, row.totalPcs - consumed);
      const isBottleneck = Boolean((row.mat || row.hasCustomPcs) && row.unitsCapable === maxCompleteUnits);
      const shortageForNext = isBottleneck ? ((maxCompleteUnits + 1) * row.divisor) - row.totalPcs : 0;

      return {
        ...row,
        consumed,
        surplus,
        isBottleneck,
        shortageForNext
      };
    });

    const totalPartsAllocated = processedRows.reduce((sum, r) => sum + r.consumed, 0);
    const totalSurplusParts = processedRows.reduce((sum, r) => sum + r.surplus, 0);

    return {
      rows: processedRows,
      maxCompleteUnits,
      bottleneckItem,
      totalPcsSum,
      totalPartsAllocated,
      totalSurplusParts,
      hasUnselectedMaterials: components.some(c => !c.materialId && (c.customPcs === undefined || c.customPcs === null))
    };
  }, [components, materialsMap]);

  // Grouped and Filtered Materials for the Segregated Picker (Stock > 0 sorted first!)
  const pickerMaterialsBySegment = useMemo(() => {
    const q = pickerSearchQuery.toLowerCase().trim();
    const partFilter = pickerSelectedPartType.toLowerCase();

    // 1. Filter materials
    const filtered = (rawMaterials || []).filter(mat => {
      // Segment filter
      if (pickerSelectedSegment !== 'All Segments') {
        const matSeg = (mat.Segment || '').trim();
        if (matSeg.toLowerCase() !== pickerSelectedSegment.toLowerCase()) return false;
      }

      // Quick Part Type filter (Beam, Decking, Post, Brace)
      if (partFilter !== 'all parts') {
        const desc = (mat.ItemDescription || '').toLowerCase();
        const seg = (mat.Segment || '').toLowerCase();
        if (partFilter === 'beam' && !desc.includes('beam')) return false;
        if (partFilter === 'decking' && !desc.includes('decking') && !desc.includes('plywood')) return false;
        if (partFilter === 'post / upright' && !desc.includes('post') && !desc.includes('upright') && !desc.includes('frame')) return false;
        if (partFilter === 'brace' && !desc.includes('brace')) return false;
      }

      // Text search query
      if (!q) return true;
      const desc = (mat.ItemDescription || '').toLowerCase();
      const code = (mat.Code || '').toLowerCase();
      const dim = (mat.Dimension || '').toLowerCase();
      const seg = (mat.Segment || '').toLowerCase();
      return desc.includes(q) || code.includes(q) || dim.includes(q) || seg.includes(q);
    });

    // 2. Group by Segment & Sort stock > 0 to the top
    const groups = {};
    filtered.forEach(mat => {
      const segKey = (mat.Segment && mat.Segment.trim()) || 'Standard / Uncategorized';
      if (!groups[segKey]) groups[segKey] = [];
      groups[segKey].push(mat);
    });

    // Sort items inside each group so positive stock appears first!
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const aAvail = Math.max(0, (Number(a.ActualCount) || 0) - (Number(a.ReserveCount) || 0));
        const bAvail = Math.max(0, (Number(b.ActualCount) || 0) - (Number(b.ReserveCount) || 0));
        return bAvail - aAvail;
      });
    });

    return groups;
  }, [rawMaterials, pickerSearchQuery, pickerSelectedSegment, pickerSelectedPartType]);

  // --- PDF EXPORT HANDLER ---
  const handleExportPDF = () => {
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
      const loggedUser = localStorage.getItem("username") || localStorage.getItem("SystemRole") || "System User";

      // 1. Watermark
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

      // 2. Top Header Banner
      doc.setFillColor(24, 23, 78); // Brand Navy
      doc.rect(0, 0, pageWidth, 26, 'F');

      // Top title
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("ONEINVENTORY - UPRIGHT PRODUCTION & LOGISTICS REGISTRY", centerX, 10.5, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(215, 220, 245);
      doc.text("Bill of Materials (BOM) Component Ratio Audit & Buildable Units Capacity Report", centerX, 18, { align: 'center' });

      // 3. Metadata Header Info
      doc.setTextColor(40, 40, 40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);

      doc.text("Assembly Unit:", 14, 34);
      doc.setFont("helvetica", "normal");
      doc.text(recipeName || 'Custom Unit Assembly', 45, 34);

      doc.setFont("helvetica", "bold");
      doc.text("Date Generated:", 190, 34);
      doc.setFont("helvetica", "normal");
      doc.text(formattedDate, 222, 34);

      doc.setFont("helvetica", "bold");
      doc.text("Specification:", 14, 40);
      doc.setFont("helvetica", "normal");
      doc.text(recipeDescription || 'Standard Production Assembly', 45, 40);

      doc.setFont("helvetica", "bold");
      doc.text("Prepared By:", 190, 40);
      doc.setFont("helvetica", "normal");
      doc.text(loggedUser, 222, 40);

      // 4. Executive Summary KPI Blocks (3 Cards)
      const cardY = 46;
      const cardHeight = 22;
      const cardWidth = 86;

      // Card 1: Maximum Complete Units (Emerald / Navy)
      doc.setFillColor(236, 253, 245); // Emerald-50
      doc.roundedRect(14, cardY, cardWidth, cardHeight, 1.5, 1.5, 'F');
      doc.setDrawColor(16, 185, 129); // Emerald-500
      doc.setLineWidth(0.4);
      doc.roundedRect(14, cardY, cardWidth, cardHeight, 1.5, 1.5, 'S');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(5, 150, 105);
      doc.text("MAXIMUM COMPLETE UNITS BUILDABLE", 18, cardY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(6, 95, 70);
      doc.text(`${calculationResults.maxCompleteUnits} COMPLETE UNITS`, 18, cardY + 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(75, 85, 99);
      doc.text(
        calculationResults.maxCompleteUnits > 0
          ? "Ready for production based on live available stock"
          : "Insufficient inventory to build complete unit",
        18, cardY + 18.5
      );

      // Card 2: Bottleneck Material (Rose / Red)
      const card2X = 14 + cardWidth + 5;
      doc.setFillColor(255, 241, 242); // Rose-50
      doc.roundedRect(card2X, cardY, cardWidth, cardHeight, 1.5, 1.5, 'F');
      doc.setDrawColor(244, 63, 94); // Rose-500
      doc.setLineWidth(0.4);
      doc.roundedRect(card2X, cardY, cardWidth, cardHeight, 1.5, 1.5, 'S');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(225, 29, 72);
      doc.text("CRITICAL BOTTLENECK MATERIAL (LIMITING FACTOR)", card2X + 4, cardY + 5.5);

      const bottleneckMatName = calculationResults.bottleneckItem?.mat?.ItemDescription || 'No bottleneck identified';
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(159, 18, 57);
      const truncatedBottleneck = bottleneckMatName.length > 36 ? `${bottleneckMatName.substring(0, 34)}...` : bottleneckMatName;
      doc.text(truncatedBottleneck, card2X + 4, cardY + 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      const shortageMsg = calculationResults.bottleneckItem
        ? `Limits assembly to ${calculationResults.maxCompleteUnits} units (Shortage: +${calculationResults.bottleneckItem.shortageForNext} pcs for next unit)`
        : 'All parts balanced';
      doc.text(shortageMsg, card2X + 4, cardY + 18.5);

      // Card 3: Material Utilization & Surplus (Sky / Indigo)
      const card3X = card2X + cardWidth + 5;
      doc.setFillColor(240, 249, 255); // Sky-50
      doc.roundedRect(card3X, cardY, cardWidth, cardHeight, 1.5, 1.5, 'F');
      doc.setDrawColor(14, 165, 233); // Sky-500
      doc.setLineWidth(0.4);
      doc.roundedRect(card3X, cardY, cardWidth, cardHeight, 1.5, 1.5, 'S');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(3, 105, 161);
      doc.text("TOTAL ALLOCATED & SURPLUS PARTS", card3X + 4, cardY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(12, 74, 110);
      doc.text(`${calculationResults.totalPartsAllocated} Pcs Used  |  ${calculationResults.totalSurplusParts} Pcs Surplus`, card3X + 4, cardY + 13);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${calculationResults.totalPcsSum.toLocaleString()} total pieces across ${components.length} components`, card3X + 4, cardY + 18.5);

      // 5. BOM Details Table with Dedicated TOTAL ROW
      const tableColumns = [
        "#",
        "Component Role",
        "Material Name & Description",
        "Segment",
        "Dimension",
        "Total Pcs (Stock)",
        "Divisor (Ratio)",
        "Converted Units",
        "Allocated Qty",
        "Surplus Left",
        "BOM Status"
      ];

      const tableRows = calculationResults.rows.map(r => {
        const matDesc = r.mat ? r.mat.ItemDescription : (r.hasCustomPcs ? 'Manual Custom Component' : '⚠️ Unassigned Material');
        const segName = r.mat?.Segment || '—';
        const dimStr = r.mat?.Dimension || '—';
        const parsedDim = parseRackDimension(dimStr);
        const displayDim = parsedDim.badges && parsedDim.badges.length > 0
          ? parsedDim.badges.map(b => `${b.label}: ${b.value}`).join(' | ')
          : dimStr;

        const statusText = (!r.mat && !r.hasCustomPcs)
          ? 'Not Configured'
          : r.isBottleneck
            ? `BOTTLENECK (Max ${r.unitsCapable})`
            : `Sufficient (${r.unitsCapable} Units)`;

        return [
          r.index.toString(),
          r.role,
          matDesc,
          segName,
          displayDim,
          `${r.totalPcs.toLocaleString()} ${r.mat?.UOM || 'PCS'}`,
          `÷ ${r.divisor}`,
          `${r.unitsCapable} Units`,
          `${r.consumed.toLocaleString()} ${r.mat?.UOM || 'PCS'}`,
          `${r.surplus.toLocaleString()} ${r.mat?.UOM || 'PCS'}`,
          statusText
        ];
      });

      // Total Row for PDF
      const tableFoot = [[
        "TOTAL",
        "—",
        `BOM Assembly Summary (${components.length} Parts)`,
        "—",
        "—",
        `${calculationResults.totalPcsSum.toLocaleString()} PCS`,
        "—",
        `${calculationResults.maxCompleteUnits.toLocaleString()} COMPLETE UNITS`,
        `${calculationResults.totalPartsAllocated.toLocaleString()} PCS`,
        `${calculationResults.totalSurplusParts.toLocaleString()} PCS`,
        calculationResults.maxCompleteUnits > 0 ? "FEASIBLE" : "SHORTAGE"
      ]];

      autoTable(doc, {
        startY: 73,
        margin: { top: 32, bottom: 24, left: 14, right: 14 },
        head: [tableColumns],
        body: tableRows,
        foot: tableFoot,
        theme: 'grid',
        headStyles: {
          fillColor: [24, 23, 78],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'center',
          valign: 'middle',
          cellPadding: 2.5
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [50, 50, 50],
          valign: 'middle',
          cellPadding: 2.2
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
          1: { cellWidth: 26, fontStyle: 'bold' },
          2: { cellWidth: 62 },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 30 },
          5: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
          6: { cellWidth: 20, halign: 'center' },
          7: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
          8: { cellWidth: 18, halign: 'center' },
          9: { cellWidth: 18, halign: 'center' },
          10: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const rowIndex = data.row.index;
            const rowData = calculationResults.rows[rowIndex];

            if (rowData && rowData.isBottleneck) {
              if (data.column.index === 10 || data.column.index === 7) {
                data.cell.styles.fillColor = [254, 226, 226]; // Rose-100
                data.cell.styles.textColor = [185, 28, 28]; // Rose-700
                data.cell.styles.fontStyle = 'bold';
              }
            } else if (rowData && (rowData.mat || rowData.hasCustomPcs)) {
              if (data.column.index === 10) {
                data.cell.styles.fillColor = [209, 250, 229]; // Emerald-100
                data.cell.styles.textColor = [4, 120, 87]; // Emerald-700
              }
            }
          }
        }
      });

      // 6. Signature Blocks & Footer
      let finalY = doc.lastAutoTable.finalY + 8;
      if (finalY + 28 > pageHeight - 12) {
        doc.addPage();
        finalY = 30;
      }

      // Calculation Formula Disclaimer
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(14, finalY, pageWidth - 28, 7, 1, 1, 'F');
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        "* Calculation Formula: Converted Units = Floor(Total Pcs ÷ Divisor). Complete buildable units is strictly governed by the component with the lowest capability (Limiting Bottleneck).",
        18, finalY + 4.5
      );

      finalY += 12;

      // Signature Blocks (3 Columns)
      const sigColWidth = 75;
      const sigY = finalY;

      // Col 1: Prepared By
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text("Prepared By (Inventory Officer):", 14, sigY);
      doc.line(14, sigY + 9, 14 + sigColWidth, sigY + 9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 40, 40);
      doc.text(loggedUser, 14, sigY + 13);

      // Col 2: Verified By
      const sig2X = 14 + sigColWidth + 18;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Verified By (Production Lead / Engineer):", sig2X, sigY);
      doc.line(sig2X, sigY + 9, sig2X + sigColWidth, sigY + 9);
      doc.setFont("helvetica", "italic");
      doc.text("Signature & Date", sig2X, sigY + 13);

      // Col 3: Approved By
      const sig3X = sig2X + sigColWidth + 18;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Approved By (Operations / Plant Manager):", sig3X, sigY);
      doc.line(sig3X, sigY + 9, sig3X + sigColWidth, sigY + 9);
      doc.setFont("helvetica", "italic");
      doc.text("Signature & Date", sig3X, sigY + 13);

      // 7. Page Decoration Footer on all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(140, 140, 140);
        doc.text("CONFIDENTIAL - FOR INTERNAL PRODUCTION & INVENTORY PLANNING ONLY", 14, pageHeight - 6);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
      }

      const safeName = (recipeName || 'BUILDABLE_UNITS').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`BUILDABLE_UNITS_REPORT_${safeName}_${Date.now()}.pdf`);
    } catch (err) {
      console.error("Failed to generate Buildable Units PDF:", err);
      alert(`Error generating PDF: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div
        className={`relative w-full max-w-5xl rounded-2xl border shadow-2xl flex flex-col my-auto transition-colors duration-200 overflow-hidden ${
          isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className={`p-5 border-b flex items-center justify-between gap-4 ${isDark ? 'border-slate-800 bg-[#141622]' : 'border-slate-100 bg-slate-50/70'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Buildable Units & BOM Feasibility Calculator
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  Total Pcs → Converted Units
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Calculate total pieces, convert each material into units with custom divisors, and view the overall total.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#18174e] hover:bg-[#18174e]/90 dark:bg-[#ff6600] dark:hover:bg-[#ff6600]/90 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Download publication-ready PDF report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Report (PDF)</span>
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 flex flex-col gap-5 max-h-[calc(88vh-130px)] overflow-y-auto custom-scrollbar">

          {/* SECTION 1: PRESET & RECIPE CONTROLS */}
          <div className={`p-4 rounded-xl border flex flex-col gap-3 ${isDark ? 'bg-[#141622]/60 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5" />
                <span>Unit Recipe / Assembly Presets</span>
              </span>

              <div className="flex items-center gap-1.5">
                {saveSuccessMsg && (
                  <span className="text-xs text-emerald-500 font-bold flex items-center gap-1 animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {saveSuccessMsg}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveRecipe}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer transition-colors"
                  title="Save current unit formula as a reusable preset"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Preset</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteRecipe}
                  className="p-1 text-xs font-bold rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                  title="Delete this saved recipe"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="p-1 text-xs font-bold rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  title="Reset to default factory templates"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Preset Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Load Saved Preset:
                </label>
                <select
                  value={selectedRecipeId}
                  onChange={(e) => handleSelectRecipe(e.target.value)}
                  className={`w-full text-xs font-semibold rounded-lg px-3 py-2 border transition-colors cursor-pointer ${
                    isDark ? 'bg-[#0e1017] border-slate-700 text-slate-200 focus:border-[#ff6600]' : 'bg-white border-slate-300 text-slate-800 focus:border-[#18174e]'
                  }`}
                >
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipe Name Input */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Recipe / Unit Name:
                </label>
                <input
                  type="text"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="e.g. Standard 4-Layer Rack (2.0m)"
                  className={`w-full text-xs font-bold rounded-lg px-3 py-2 border transition-colors ${
                    isDark ? 'bg-[#0e1017] border-slate-700 text-slate-100 focus:border-[#ff6600]' : 'bg-white border-slate-300 text-slate-800 focus:border-[#18174e]'
                  }`}
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Specifications / Notes:
                </label>
                <input
                  type="text"
                  value={recipeDescription}
                  onChange={(e) => setRecipeDescription(e.target.value)}
                  placeholder="e.g. Medium Duty 4 Shelves with 2 Posts"
                  className={`w-full text-xs font-medium rounded-lg px-3 py-2 border transition-colors ${
                    isDark ? 'bg-[#0e1017] border-slate-700 text-slate-100 focus:border-[#ff6600]' : 'bg-white border-slate-300 text-slate-800 focus:border-[#18174e]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: EXECUTIVE SUMMARY KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Card 1: Max Complete Units */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              calculationResults.maxCompleteUnits > 0
                ? (isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' : 'bg-emerald-50/60 border-emerald-200 text-emerald-900')
                : (isDark ? 'bg-rose-950/20 border-rose-800/40 text-rose-300' : 'bg-rose-50/60 border-rose-200 text-rose-900')
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                  Total Complete Units Buildable
                </span>
                <CheckCircle2 className={`w-4 h-4 ${calculationResults.maxCompleteUnits > 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
              </div>

              <div className="my-2">
                <div className="text-3xl font-black font-mono tracking-tight">
                  {calculationResults.maxCompleteUnits.toLocaleString()}
                  <span className="text-sm font-semibold ml-1.5 opacity-80">Units</span>
                </div>
              </div>

              <div className="text-[11px] font-medium opacity-75">
                {calculationResults.maxCompleteUnits > 0
                  ? "Based on all material components combined"
                  : "Insufficient component stock to form full unit"}
              </div>
            </div>

            {/* Card 2: Primary Bottleneck */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              isDark ? 'bg-rose-950/30 border-rose-800/50 text-rose-300' : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
                  Limiting Bottleneck Component
                </span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>

              <div className="my-1.5">
                <div className="text-sm font-bold truncate" title={calculationResults.bottleneckItem?.mat?.ItemDescription || 'No bottleneck identified'}>
                  {calculationResults.bottleneckItem?.mat?.ItemDescription || 'None (All Balanced)'}
                </div>
                <div className="text-xs font-mono font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                  {calculationResults.bottleneckItem
                    ? `Restricts capacity to ${calculationResults.bottleneckItem.unitsCapable} Units`
                    : 'Stock is balanced across parts'}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {calculationResults.bottleneckItem
                  ? `Need +${calculationResults.bottleneckItem.shortageForNext} pcs for the next complete unit`
                  : 'All materials have equal or higher capacity'}
              </div>
            </div>

            {/* Card 3: Material Utilization & Surplus */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              isDark ? 'bg-indigo-950/20 border-indigo-800/40 text-indigo-200' : 'bg-indigo-50/60 border-indigo-200 text-indigo-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                  Total Pieces & Allocation
                </span>
                <Sparkles className="w-4 h-4 text-indigo-500" />
              </div>

              <div className="my-2">
                <div className="text-xl font-bold font-mono">
                  {calculationResults.totalPcsSum.toLocaleString()}{' '}
                  <span className="text-xs font-normal opacity-80">Total Pcs</span>
                  <span className="mx-1.5 text-slate-400">|</span>
                  <span className="text-emerald-500">{calculationResults.totalPartsAllocated.toLocaleString()}</span>{' '}
                  <span className="text-xs font-normal opacity-80">Used</span>
                </div>
              </div>

              <div className="text-[11px] font-medium opacity-75">
                Surplus leftover: <strong>{calculationResults.totalSurplusParts.toLocaleString()} pcs</strong>
              </div>
            </div>
          </div>

          {/* SECTION 3: COMPONENT FORMULAS TABLE (USER CONTROLLED WITH TOTALS!) */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  BOM Components & Divisor Ratios
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  (Total pcs are divided by ratio to convert each component into units)
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddComponent}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-500/40 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Component Material</span>
              </button>
            </div>

            {/* Table */}
            <div className={`border rounded-xl overflow-hidden shadow-xs ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[840px]">
                  <thead className={`text-[11px] font-bold uppercase ${
                    isDark ? 'bg-[#181b28] text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-700 border-b border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-2.5 px-3 text-center w-10">#</th>
                      <th className="py-2.5 px-3 w-32">Role / Part Name</th>
                      <th className="py-2.5 px-3 min-w-[320px]">
                        Select Material (Image, Name, Dimension)
                      </th>
                      <th className="py-2.5 px-3 text-center w-32">Total Pcs (Stock)</th>
                      <th className="py-2.5 px-3 text-center w-28">Divisor (Ratio)</th>
                      <th className="py-2.5 px-3 text-center w-32">Converted Units</th>
                      <th className="py-2.5 px-3 text-center w-24">Allocated</th>
                      <th className="py-2.5 px-3 text-center w-24">Surplus</th>
                      <th className="py-2.5 px-3 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                    {calculationResults.rows.map((row) => {
                      const mat = row.mat;
                      return (
                        <tr
                          key={row.id}
                          className={`transition-colors ${
                            row.isBottleneck
                              ? (isDark ? 'bg-rose-950/20 hover:bg-rose-950/30' : 'bg-rose-50/50 hover:bg-rose-50/80')
                              : (isDark ? 'hover:bg-[#141622]' : 'hover:bg-slate-50/60')
                          }`}
                        >
                          {/* 1. Index */}
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                            {row.index}
                          </td>

                          {/* 2. Role / Part Name */}
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={row.role}
                              onChange={(e) => handleUpdateComponent(row.id, 'role', e.target.value)}
                              placeholder="e.g. Beam, Decking"
                              className={`w-full text-xs font-bold px-2 py-1.5 rounded border ${
                                isDark ? 'bg-[#0e1017] border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                              }`}
                            />
                          </td>

                          {/* 3. MATERIAL DISPLAY: IMAGE, NAME, DIMENSION ONLY */}
                          <td className="py-2.5 px-3">
                            {mat ? (
                              <div
                                onClick={() => handleOpenPicker(row.id, mat, row.role)}
                                className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer group ${
                                  isDark
                                    ? 'bg-[#141622] border-slate-800 hover:border-[#ff6600]/80 hover:bg-[#181b28]'
                                    : 'bg-white border-slate-200 hover:border-[#18174e]/60 hover:shadow-xs'
                                }`}
                                title="Click to change or select another material by segment"
                              >
                                {/* IMAGE */}
                                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                                  {mat.ImageUrl ? (
                                    <img
                                      src={getImageSrc(mat.ImageUrl)}
                                      alt={mat.ItemDescription}
                                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                  ) : null}
                                  <div
                                    className={`w-full h-full flex items-center justify-center text-slate-400 ${
                                      mat.ImageUrl ? 'hidden' : 'flex'
                                    }`}
                                  >
                                    <ImageIcon className="w-5 h-5 opacity-60" />
                                  </div>
                                </div>

                                {/* NAME & DIMENSION */}
                                <div className="flex flex-col min-w-0 flex-1 gap-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span
                                      className={`font-bold text-xs truncate leading-snug group-hover:text-[#ff6600] dark:group-hover:text-[#ff8533] transition-colors ${
                                        isDark ? 'text-slate-100' : 'text-slate-900'
                                      }`}
                                      title={mat.ItemDescription}
                                    >
                                      {mat.ItemDescription}
                                    </span>
                                    <span className="text-[10px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center">
                                      Change <ChevronRight className="w-3 h-3 ml-0.5" />
                                    </span>
                                  </div>

                                  {/* DIMENSION BADGES */}
                                  <div className="flex items-center flex-wrap gap-1">
                                    <RackDimensionCell dimension={mat.Dimension} isDark={isDark} />
                                    {mat.Segment && mat.Segment !== 'N/A' && mat.Segment !== 'Standard' && (
                                      <span className="text-[10px] px-1.5 py-0.5 font-bold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                        {mat.Segment}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenPicker(row.id, null, row.role)}
                                className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border border-dashed transition-all cursor-pointer text-left ${
                                  isDark
                                    ? 'border-slate-700 hover:border-[#ff6600] bg-[#141622]/40 hover:bg-[#141622]'
                                    : 'border-slate-300 hover:border-[#18174e] bg-slate-50/60 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-10 h-10 rounded-lg bg-slate-200/70 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                    <ImageIcon className="w-4 h-4" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                      Select Material from Inventory
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      Choose material with Image, Name, Dimension
                                    </span>
                                  </div>
                                </div>
                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shrink-0">
                                  Browse Segments
                                </span>
                              </button>
                            )}
                          </td>

                          {/* 4. Total Pcs (Stock) with Custom Edit capability */}
                          <td className="py-2.5 px-3 text-center font-mono">
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  value={row.totalPcs}
                                  onChange={(e) => handleUpdateComponent(row.id, 'customPcs', e.target.value === '' ? '' : Number(e.target.value))}
                                  className={`w-20 text-center font-bold font-mono text-xs px-1.5 py-1 rounded border ${
                                    row.hasCustomPcs
                                      ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                                      : (isDark ? 'bg-[#0e1017] border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900')
                                  }`}
                                  title={row.hasCustomPcs ? "Custom total pcs override entered. Click reset below to use live DB count." : "Live inventory available stock. You can also type a custom quantity here."}
                                />
                                <span className="text-[10px] text-slate-400 font-semibold">{row.mat?.UOM || 'PCS'}</span>
                              </div>

                              {row.hasCustomPcs ? (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateComponent(row.id, 'customPcs', undefined)}
                                  className="text-[9.5px] font-bold text-amber-500 hover:underline cursor-pointer"
                                  title="Reset to live database stock"
                                >
                                  Reset to DB ({row.liveStock})
                                </button>
                              ) : (
                                <span className="text-[9.5px] text-slate-400">
                                  {row.reserveCount > 0 ? `(${row.reserveCount} res)` : 'Live DB Stock'}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 5. Divisor (Ratio per unit) */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center justify-center gap-1">
                              <span className="text-slate-400 font-bold">÷</span>
                              <input
                                type="number"
                                min="1"
                                value={row.divisor}
                                onChange={(e) => handleUpdateComponent(row.id, 'divisor', e.target.value)}
                                className={`w-14 text-center font-bold text-xs px-2 py-1 rounded border ${
                                  isDark ? 'bg-[#0e1017] border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                              <span className="text-[10px] text-slate-400 font-semibold">pcs</span>
                            </div>
                          </td>

                          {/* 6. Converted Units (Total Pcs ÷ Divisor) */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold border ${
                                  row.isBottleneck
                                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                }`}
                                title={row.isBottleneck ? `Bottleneck: Limits total capacity to ${row.unitsCapable} units` : `${row.unitsCapable} units possible from this component`}
                              >
                                {row.unitsCapable.toLocaleString()} Units
                                {row.isBottleneck && <span className="text-[10px]">🔴</span>}
                              </span>
                              <span className="text-[9.5px] text-slate-400 font-mono">
                                ({row.totalPcs} ÷ {row.divisor})
                              </span>
                            </div>
                          </td>

                          {/* 7. Allocated Qty */}
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                            {row.consumed.toLocaleString()} pcs
                          </td>

                          {/* 8. Surplus Left */}
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span className={`font-semibold ${row.surplus > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                              {row.surplus.toLocaleString()} pcs
                            </span>
                          </td>

                          {/* 9. Action (Delete Row) */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveComponent(row.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                              title="Remove this component row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* --- DEDICATED TOTAL SUMMARY ROW --- */}
                  <tfoot className={`font-bold border-t-2 ${
                    isDark ? 'bg-[#141622] border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}>
                    <tr>
                      <td className="py-3 px-3 text-center font-black text-xs text-indigo-500">
                        TOTAL
                      </td>
                      <td className="py-3 px-3 uppercase text-[11px] tracking-wider text-slate-500">
                        Summary
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500">
                        All {components.length} BOM Components Configured
                      </td>
                      {/* TOTAL PCS */}
                      <td className="py-3 px-3 text-center font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {calculationResults.totalPcsSum.toLocaleString()} PCS
                      </td>
                      {/* DIVISOR */}
                      <td className="py-3 px-3 text-center text-slate-400 text-xs">
                        —
                      </td>
                      {/* TOTAL COMPLETE CONVERTED UNITS */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black font-mono shadow-xs ${
                          calculationResults.maxCompleteUnits > 0
                            ? 'bg-emerald-600 text-white ring-1 ring-emerald-500'
                            : 'bg-rose-600 text-white ring-1 ring-rose-500'
                        }`}>
                          <Calculator className="w-3.5 h-3.5" />
                          <span>{calculationResults.maxCompleteUnits.toLocaleString()} COMPLETE UNITS</span>
                        </span>
                      </td>
                      {/* TOTAL ALLOCATED */}
                      <td className="py-3 px-3 text-center font-mono text-xs text-slate-600 dark:text-slate-300">
                        {calculationResults.totalPartsAllocated.toLocaleString()} pcs
                      </td>
                      {/* TOTAL SURPLUS */}
                      <td className="py-3 px-3 text-center font-mono text-xs text-emerald-600 dark:text-emerald-400">
                        {calculationResults.totalSurplusParts.toLocaleString()} pcs
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 4: INSTRUCTION & METHODOLOGY CALLOUT */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
            isDark ? 'bg-[#141622] border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Paliwanag sa Total Pcs at Converted Units:
              </span>
              <p>
                Awtomatikong nakalagay ang <strong>Total Pcs</strong> ng bawat materyales mula sa live stock (maaari mo rin itong i-type o baguhin nang manu-mano kung nais mag-simulate).
                Ang bawat Total Pcs ay hinahati sa <strong>Divisor (Ratio)</strong> upang ma-convert sa units (halimbawa: 116 pcs ÷ 8 = 14 Units).
                Sa ilalim ng talahanayan, makikita ang <strong>TOTAL ROW</strong> na nagpapakita ng kabuuang pcs ng lahat ng pyesa at ang <strong>Complete Units</strong> na mabubuo.
              </p>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className={`p-4 border-t flex items-center justify-between flex-wrap gap-2 ${
          isDark ? 'border-slate-800 bg-[#141622]' : 'border-slate-100 bg-slate-50/70'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Target Assembly: <strong className="text-slate-700 dark:text-slate-300">{recipeName}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#18174e] hover:bg-[#18174e]/90 dark:bg-[#ff6600] dark:hover:bg-[#ff6600]/90 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Buildable Units (PDF)</span>
            </button>
          </div>
        </div>

      </div>

      {/* --- SEGREGATED MATERIAL PICKER MODAL --- */}
      {isPickerOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[70] p-3 sm:p-6 overflow-y-auto"
          onClick={() => setIsPickerOpen(false)}
        >
          <div
            className={`relative w-full max-w-4xl rounded-2xl border shadow-2xl flex flex-col max-h-[88vh] overflow-hidden ${
              isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* PICKER HEADER */}
            <div className={`p-4 border-b flex items-center justify-between gap-3 ${
              isDark ? 'border-slate-800 bg-[#141622]' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Select Material by Segment
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose an item with its image, description, and dimensions. Items with stock are sorted to the top.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsPickerOpen(false)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SEARCH & SEGMENT TABS */}
            <div className={`p-4 border-b flex flex-col gap-3 ${
              isDark ? 'border-slate-800 bg-[#11131c]' : 'border-slate-100 bg-white'
            }`}>
              {/* Search bar */}
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={pickerSearchQuery}
                  onChange={(e) => setPickerSearchQuery(e.target.value)}
                  placeholder="Search item name, code, or dimension..."
                  className={`w-full text-xs font-semibold pl-9 pr-8 py-2 rounded-xl border focus:outline-none transition-colors ${
                    isDark
                      ? 'bg-[#181b28] border-slate-700 text-white placeholder-slate-500 focus:border-[#ff6600]'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-[#18174e]'
                  }`}
                />
                {pickerSearchQuery && (
                  <button
                    onClick={() => setPickerSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Segment Pills / Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {availableSegments.map(seg => {
                  const isActive = pickerSelectedSegment === seg;
                  const count = segmentItemCounts[seg] || 0;
                  return (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => setPickerSelectedSegment(seg)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                        isActive
                          ? (isDark ? 'bg-[#ff6600] text-white shadow-sm' : 'bg-[#18174e] text-white shadow-sm')
                          : (isDark
                              ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900')
                      }`}
                    >
                      <span>{seg}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Part Type Filters */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">Quick Part:</span>
                {['All Parts', 'Beam', 'Decking', 'Post / Upright', 'Brace'].map(pt => {
                  const isPartActive = pickerSelectedPartType === pt;
                  return (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setPickerSelectedPartType(pt)}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                        isPartActive
                          ? 'bg-indigo-500 text-white border-indigo-600'
                          : (isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200')
                      }`}
                    >
                      {pt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PICKER LIST: GROUPED BY SEGMENT */}
            <div className="p-4 flex-1 overflow-y-auto max-h-[60vh] flex flex-col gap-5 custom-scrollbar">
              {Object.keys(pickerMaterialsBySegment).length > 0 ? (
                Object.keys(pickerMaterialsBySegment).sort().map(segName => {
                  const groupItems = pickerMaterialsBySegment[segName];
                  return (
                    <div key={segName} className="flex flex-col gap-2.5">
                      {/* Segment Group Header */}
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-200/80 dark:border-slate-800">
                        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          {segName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          ({groupItems.length} {groupItems.length === 1 ? 'item' : 'items'})
                        </span>
                      </div>

                      {/* Grid of Materials */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {groupItems.map(item => {
                          const physical = Number(item.ActualCount) || 0;
                          const reserved = Number(item.ReserveCount) || 0;
                          const avail = Math.max(0, physical - reserved);
                          const isCurrent = calculationResults.rows.find(r => r.id === pickerTargetRowId)?.materialId === item._id;

                          return (
                            <div
                              key={item._id}
                              onClick={() => handleSelectMaterial(item._id)}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer group ${
                                isCurrent
                                  ? (isDark ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500' : 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-300')
                                  : (isDark
                                      ? 'bg-[#141622] border-slate-800 hover:border-[#ff6600] hover:bg-[#181b28]'
                                      : 'bg-white border-slate-200 hover:border-[#18174e] hover:shadow-sm')
                              }`}
                            >
                              {/* Thumbnail */}
                              <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                                {item.ImageUrl ? (
                                  <img
                                    src={getImageSrc(item.ImageUrl)}
                                    alt={item.ItemDescription}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : null}
                                <div
                                  className={`w-full h-full flex items-center justify-center text-slate-400 ${
                                    item.ImageUrl ? 'hidden' : 'flex'
                                  }`}
                                >
                                  <ImageIcon className="w-6 h-6 opacity-60" />
                                </div>

                                {item.ImageUrl && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewImage(getImageSrc(item.ImageUrl));
                                    }}
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                    title="View large image"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              {/* Details: Name, Dimension, Available Stock */}
                              <div className="flex flex-col min-w-0 flex-1 gap-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`font-bold text-xs truncate leading-snug group-hover:text-[#ff6600] dark:group-hover:text-[#ff8533] transition-colors ${
                                      isDark ? 'text-white' : 'text-slate-900'
                                    }`}
                                    title={item.ItemDescription}
                                  >
                                    {item.ItemDescription}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-[10px] font-bold text-indigo-500 flex items-center gap-0.5 shrink-0">
                                      <Check className="w-3.5 h-3.5" /> Selected
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center flex-wrap gap-1">
                                  <RackDimensionCell dimension={item.Dimension} isDark={isDark} />
                                </div>

                                <div className="flex items-center justify-between text-[11px] pt-0.5">
                                  <span className="text-slate-400 font-mono">
                                    Code: <strong className="text-slate-600 dark:text-slate-300">{item.Code}</strong>
                                  </span>
                                  <span className={`font-mono font-bold ${
                                    avail > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                                  }`}>
                                    Stock: {avail > 0 ? `${avail.toLocaleString()} ${item.UOM || 'PCS'}` : '0 PCS (Out of Stock)'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center p-12 text-slate-400 italic text-xs">
                  No materials found matching your filters in &ldquo;{pickerSelectedSegment}&rdquo;.
                </div>
              )}
            </div>

            {/* PICKER FOOTER */}
            <div className={`p-3 border-t flex justify-end ${
              isDark ? 'border-slate-800 bg-[#141622]' : 'border-slate-100 bg-slate-50'
            }`}>
              <button
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LIGHTBOX CONTAINER FOR FULL IMAGE PREVIEW --- */}
      {previewImage && (
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
            <img
              src={previewImage}
              alt="Large Display"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
