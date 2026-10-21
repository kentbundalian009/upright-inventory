import React, { useState, useEffect, useRef } from 'react';
import { 
    Bold, Italic, Underline, Strikethrough, AlignLeft, 
    AlignCenter, AlignRight, AlignJustify, List, ListOrdered, 
    CheckSquare, Download, Printer, RotateCcw, Undo, Redo, 
    Eye, Edit3, Plus, Calendar, FileText, 
    Highlighter, Minus, Table, Layers, X, FileDown, FolderPlus,
    Image as ImageIcon, Crop, MoveUp, MoveDown, Trash2, Stamp, 
    Sparkles, Shield, PenTool, Scissors
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import PageHeader from './layout/PageHeader';
import { useTheme } from '../context/ThemeContext';
import ImageCropperModal from './ImageCropperModal';

const STORAGE_KEY = 'oneinventory_documents_v1';

// Clean, modern DIV-based signature block (NEVER a table, sitting at the very bottom)
const MODERN_SIGNATURE_HTML = `
<div class="signature-section" style="margin-top: 50px; margin-bottom: 25px; width: 100%; clear: both; page-break-inside: avoid !important; break-inside: avoid !important; display: block;">
    <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; max-width: 100%;">
        <div style="width: 44%; text-align: center; box-sizing: border-box;">
            <div style="border-bottom: 2px solid #0f172a; width: 85%; margin: 0 auto 8px auto; height: 1px;"></div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                Toolkeeper
            </div>
            <div style="font-size: 11px; font-weight: 500; color: #64748b; margin-top: 2px;">
                Signature over Printed Name
            </div>
        </div>
        <div style="width: 44%; text-align: center; box-sizing: border-box;">
            <div style="border-bottom: 2px solid #0f172a; width: 85%; margin: 0 auto 8px auto; height: 1px;"></div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                Inventory Assistant
            </div>
            <div style="font-size: 11px; font-weight: 500; color: #64748b; margin-top: 2px;">
                Signature over Printed Name
            </div>
        </div>
    </div>
    <div style="clear: both; height: 0;"></div>
</div>
`.trim();

// Upgrade existing saved tabs to replace any table signatures with clean div signatures
const upgradeTabSignatures = (html) => {
    if (!html) return html;
    
    // Replace any table containing Toolkeeper or Inventory Assistant or Prepared & Endorsed By with the modern div block
    const tableRegex = /<table[^>]*>[\s\S]*?(?:Toolkeeper|Inventory Assistant|Prepared & Endorsed By|Acknowledged & Received By)[\s\S]*?<\/table>/gi;
    if (tableRegex.test(html)) {
        return html.replace(tableRegex, MODERN_SIGNATURE_HTML);
    }
    return html;
};

const DEFAULT_DOC_STATE = {
    documentTitle: "Documents",
    activeTabId: "tab-1",
    showWatermark: true,
    showHeaderLogo: true,
    tabs: [
        {
            id: "tab-1",
            name: "Document 1",
            htmlContent: `
                <h1 style="color: #18174e; font-size: 22px; font-weight: bold; margin: 0 0 4px 0; letter-spacing: 0.5px;">
                    OPERATIONAL REMARKS & ENDORSEMENT
                </h1>
                <p style="color: #64748b; font-size: 12px; margin-bottom: 18px; border-bottom: 2px solid #ff6600; padding-bottom: 8px;">
                    <strong>Subject:</strong> Toolroom Daily Log & Material Handover &nbsp;|&nbsp; 
                    <strong>Shift:</strong> Day Shift (08:00 AM - 05:00 PM)
                </p>

                <h3 style="color: #18174e; font-size: 15px; font-weight: bold; margin-top: 14px; margin-bottom: 8px;">
                    1. Toolroom Handover & Operations Log:
                </h3>
                <ul>
                    <li style="margin-bottom: 6px;"><strong>[TOOLROOM]:</strong> Complete daily audit for fabrication hand tools, impact drills, and safety gear.</li>
                    <li style="margin-bottom: 6px;"><strong>[RACKINGS]:</strong> Recount and verify pallet variance in Racking Bay B-04 before dispatch.</li>
                    <li style="margin-bottom: 6px;"><strong>[SUPPLIES]:</strong> Expected supplier delivery for bubble wraps & packaging tapes arriving tomorrow morning.</li>
                    <li style="margin-bottom: 6px;"><strong>[WIP]:</strong> Fabrication batch #84 acrylic sheets pending QA inspection.</li>
                </ul>

                <h3 style="color: #18174e; font-size: 15px; font-weight: bold; margin-top: 20px; margin-bottom: 8px;">
                    2. Shift Handover Notes:
                </h3>
                <p style="margin-bottom: 12px; line-height: 1.6;">
                    Please ensure that all outgoing pallets for PO-2026-092 are shrink-wrapped with corner protectors prior to dispatch.
                </p>

                <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 30px 0 20px 0;" />

                ${MODERN_SIGNATURE_HTML}
            `
        }
    ]
};

function Documents() {
    const { isDark } = useTheme();

    // Date & Time state for header and print visibility
    const [currentDateTime, setCurrentDateTime] = useState(() => {
        const now = new Date();
        return {
            date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
    });

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentDateTime({
                date: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
            });
        };
        const timer = setInterval(updateTime, 30000);
        return () => clearInterval(timer);
    }, []);

    // Load saved document state from localStorage
    const [docData, setDocData] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
                    return {
                        ...parsed,
                        showWatermark: parsed.showWatermark !== undefined ? parsed.showWatermark : true,
                        showHeaderLogo: parsed.showHeaderLogo !== undefined ? parsed.showHeaderLogo : true,
                        tabs: parsed.tabs.map(t => ({
                            ...t,
                            htmlContent: upgradeTabSignatures(t.htmlContent)
                        }))
                    };
                }
            }
        } catch (e) {
            console.error("Failed to parse saved document data:", e);
        }
        return DEFAULT_DOC_STATE;
    });

    const [isEditing, setIsEditing] = useState(true);
    const [showAddTabModal, setShowAddTabModal] = useState(false);
    const [newTabName, setNewTabName] = useState("");
    const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

    // Watermark & Centered Header Logo toggles
    const [showWatermark, setShowWatermark] = useState(() => {
        return docData.showWatermark !== undefined ? docData.showWatermark : true;
    });
    const [showHeaderLogo, setShowHeaderLogo] = useState(() => {
        return docData.showHeaderLogo !== undefined ? docData.showHeaderLogo : true;
    });

    // Image manipulation & Cropping state
    const [selectedImageEl, setSelectedImageEl] = useState(null);
    const [imgToolbarPos, setImgToolbarPos] = useState(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState(null);

    // References
    const fileInputRef = useRef(null);
    const paperContainerRef = useRef(null);

    // Color pickers dropdown state
    const [showTextColorPalette, setShowTextColorPalette] = useState(false);
    const [showBgColorPalette, setShowBgColorPalette] = useState(false);

    // On-screen visual page break offsets (dat makita nadin kase sa documents)
    const [pageBreakOffsets, setPageBreakOffsets] = useState([]);

    // Ref to contentEditable paper canvas
    const editorRef = useRef(null);
    const isInternalUpdate = useRef(false);

    // Active Tab
    const activeTab = docData.tabs.find(t => t.id === docData.activeTabId) || docData.tabs[0];

    // Calculate real-time A4 page boundaries for on-screen document canvas
    useEffect(() => {
        const updatePageBreaks = () => {
            if (!paperContainerRef.current) return;
            const containerWidth = paperContainerRef.current.clientWidth;
            if (!containerWidth) return;

            // A4 Aspect Ratio: 297mm / 210mm = 1.4142857
            const a4HeightPx = Math.round(containerWidth * (297 / 210));
            const totalHeight = paperContainerRef.current.scrollHeight;

            const numPages = Math.floor(totalHeight / a4HeightPx);
            const offsets = [];
            for (let i = 1; i <= numPages; i++) {
                offsets.push({
                    pageIndex: i,
                    top: i * a4HeightPx
                });
            }
            setPageBreakOffsets(offsets);
        };

        updatePageBreaks();

        const resizeObserver = new ResizeObserver(() => {
            updatePageBreaks();
        });

        if (paperContainerRef.current) {
            resizeObserver.observe(paperContainerRef.current);
        }
        if (editorRef.current) {
            resizeObserver.observe(editorRef.current);
        }

        return () => resizeObserver.disconnect();
    }, [activeTab.id, docData.tabs, isEditing]);

    // Sync watermark and header logo toggles to docData
    useEffect(() => {
        setDocData(prev => ({
            ...prev,
            showWatermark,
            showHeaderLogo
        }));
    }, [showWatermark, showHeaderLogo]);

    // Load active tab HTML into editorRef when active tab changes (with signature upgrade)
    useEffect(() => {
        if (editorRef.current && activeTab) {
            isInternalUpdate.current = true;
            editorRef.current.innerHTML = upgradeTabSignatures(activeTab.htmlContent || "");
            isInternalUpdate.current = false;
        }
    }, [activeTab.id]);

    // Autosave to localStorage
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(docData));
            } catch (e) {
                console.error("Autosave error:", e);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [docData]);

    // Handle typing inside contentEditable canvas
    const handleInput = () => {
        if (isInternalUpdate.current) return;
        if (!editorRef.current) return;

        const currentHtml = editorRef.current.innerHTML;
        setDocData(prev => ({
            ...prev,
            tabs: prev.tabs.map(tab => {
                if (tab.id === activeTab.id) {
                    return { ...tab, htmlContent: currentHtml };
                }
                return tab;
            })
        }));
    };

    // Execute standard rich text formatting command
    const formatDoc = (cmd, value = null) => {
        if (!isEditing) {
            setIsEditing(true);
        }
        if (editorRef.current) {
            editorRef.current.focus();
        }
        document.execCommand(cmd, false, value);
        handleInput();
    };

    // Font Size formatting helper
    const handleFontSizeChange = (sizeVal) => {
        if (!isEditing) setIsEditing(true);
        if (editorRef.current) editorRef.current.focus();

        if (sizeVal.startsWith("h")) {
            document.execCommand('formatBlock', false, `<${sizeVal}>`);
        } else if (sizeVal === "p") {
            document.execCommand('formatBlock', false, '<p>');
        } else {
            document.execCommand('fontSize', false, sizeVal);
        }
        handleInput();
    };

    // Insert Checkbox helper
    const handleInsertCheckbox = () => {
        if (!isEditing) setIsEditing(true);
        if (editorRef.current) editorRef.current.focus();
        const checkboxHtml = `<p style="display: flex; align-items: center; gap: 8px; margin: 4px 0;"><input type="checkbox" style="width: 16px; height: 16px; cursor: pointer; accent-color: #ff6600;" /> <span>[Task / Item Description]</span></p>`;
        document.execCommand('insertHTML', false, checkboxHtml);
        handleInput();
    };

    // Insert Table helper
    const handleInsertTable = () => {
        if (!isEditing) setIsEditing(true);
        if (editorRef.current) editorRef.current.focus();
        const tableHtml = `
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid #cbd5e1;">
                <thead>
                    <tr style="background-color: #18174e; color: #ffffff;">
                        <th style="border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left;">Item / Task</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: center; width: 120px;">Category</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: center; width: 110px;">Status</th>
                        <th style="border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left;">Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 12px;">Pallet Recount Bay B-04</td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: center;">Rackings</td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: center; color: #d97706; font-weight: bold;">Pending</td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 12px;">Needs count verification</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 12px;">Bubble Wrap Inbound</td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: center;">Supplies</td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: center; color: #10b981; font-weight: bold;">Received</td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px; font-size: 12px;">Staged in bay 2</td>
                    </tr>
                </tbody>
            </table>
            <p><br /></p>
        `;
        document.execCommand('insertHTML', false, tableHtml);
        handleInput();
        toast.success("Table inserted!");
    };

    // Insert Date stamp
    const handleInsertDateStamp = () => {
        const dateStr = new Date().toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        formatDoc('insertHTML', `<strong>[${dateStr}]:</strong> `);
    };

    // Update position of floating image toolbar relative to paper canvas
    const updateImgToolbarPosition = (imgEl) => {
        if (!imgEl || !paperContainerRef.current) return;
        const imgRect = imgEl.getBoundingClientRect();
        const paperRect = paperContainerRef.current.getBoundingClientRect();

        const top = Math.max(10, (imgRect.top - paperRect.top) - 48);
        const left = Math.max(10, Math.min(paperRect.width - 360, (imgRect.left - paperRect.left) + (imgRect.width / 2) - 180));

        setImgToolbarPos({ top, left });
    };

    // Reposition floating toolbar on scroll or resize
    useEffect(() => {
        const handleReposition = () => {
            if (selectedImageEl) {
                updateImgToolbarPosition(selectedImageEl);
            }
        };
        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);
        return () => {
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
        };
    }, [selectedImageEl]);

    // Handle clicks inside editor canvas to select/deselect images
    const handleEditorClick = (e) => {
        if (e.target && e.target.tagName === 'IMG') {
            e.stopPropagation();
            if (selectedImageEl && selectedImageEl !== e.target) {
                selectedImageEl.style.outline = 'none';
            }
            e.target.style.outline = '2px solid #ff6600';
            e.target.style.outlineOffset = '3px';
            setSelectedImageEl(e.target);
            updateImgToolbarPosition(e.target);
        } else {
            if (selectedImageEl) {
                selectedImageEl.style.outline = 'none';
                setSelectedImageEl(null);
                setImgToolbarPos(null);
            }
        }
    };

    // Double-click image to immediately open cropper
    const handleEditorDoubleClick = (e) => {
        if (e.target && e.target.tagName === 'IMG') {
            e.stopPropagation();
            e.preventDefault();
            setSelectedImageEl(e.target);
            setCropImageSrc(e.target.src);
            setIsCropperOpen(true);
        }
    };

    // Trigger file picker for inserting image
    const handleInsertImageClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.click();
        }
    };

    // File selected from device
    const handleImageFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Please select a valid image file (PNG, JPG, WebP, etc.).");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error("Image size too large. Please select an image under 10MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
            const dataUrl = uploadEvent.target?.result;
            if (!dataUrl) return;

            if (!isEditing) setIsEditing(true);
            if (editorRef.current) editorRef.current.focus();

            const imgHtml = `
                <div class="doc-image-wrapper" style="text-align: center; margin: 16px 0; page-break-inside: avoid !important; break-inside: avoid !important;">
                    <img 
                        src="${dataUrl}" 
                        alt="Inserted Image" 
                        draggable="true" 
                        style="max-width: 100%; max-height: 480px; height: auto; border-radius: 4px; display: inline-block; cursor: pointer;" 
                    />
                </div>
                <p><br /></p>
            `;
            document.execCommand('insertHTML', false, imgHtml);
            handleInput();
            toast.success("Image inserted! Click the image to move, resize, or crop.");
        };
        reader.readAsDataURL(file);
    };

    // Insert Upright Logo centered
    const handleInsertUprightLogo = () => {
        if (!isEditing) setIsEditing(true);
        if (editorRef.current) editorRef.current.focus();

        const logoHtml = `
            <div class="doc-image-wrapper" style="text-align: center; margin: 18px 0; page-break-inside: avoid !important; break-inside: avoid !important;">
                <img 
                    src="/upright.png" 
                    alt="Upright Logo" 
                    draggable="true" 
                    style="height: 64px; max-height: 80px; width: auto; object-fit: contain; display: inline-block; cursor: pointer;" 
                />
            </div>
            <p><br /></p>
        `;
        document.execCommand('insertHTML', false, logoHtml);
        handleInput();
        toast.success("Upright logo inserted at center!");
    };

    // Insert Toolkeeper and Inventory Assistant signature lines (Clean DIV-based, NO table, placed at the very bottom)
    const handleInsertSignatures = () => {
        if (!isEditing) setIsEditing(true);
        if (editorRef.current) {
            // Clean up any existing signature sections or legacy tables containing Toolkeeper or Inventory Assistant
            const candidates = Array.from(editorRef.current.querySelectorAll('.signature-section, table'));
            candidates.forEach(el => {
                const text = el.innerText || '';
                if (text.includes('Toolkeeper') || text.includes('Inventory Assistant') || text.includes('Prepared & Endorsed By')) {
                    el.remove();
                }
            });

            // Append cleanly at the very end ("yun last nayan")
            const wrapper = document.createElement('div');
            wrapper.innerHTML = MODERN_SIGNATURE_HTML;
            editorRef.current.appendChild(wrapper.firstElementChild);
            handleInput();
            toast.success("Signature block for Toolkeeper & Inventory Assistant placed at the bottom!");
        }
    };

    // Insert manual Page Break
    const handleInsertPageBreak = () => {
        if (!isEditing) setIsEditing(true);
        if (editorRef.current) editorRef.current.focus();

        const breakHtml = `
            <div class="doc-page-break" style="page-break-before: always; break-before: page; margin: 32px 0 24px 0; border-top: 2px dashed #ff6600; text-align: center; padding-top: 6px; user-select: none;">
                <span style="background-color: #18174e; color: #ffffff; font-size: 10px; font-weight: bold; padding: 3px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px; border: 1px solid #ff6600;">
                    ✂ PAGE BREAK (Starts on next page)
                </span>
            </div>
            <p><br /></p>
        `;
        document.execCommand('insertHTML', false, breakHtml);
        handleInput();
        toast.success("Page break inserted!");
    };

    // Clipboard Paste handler for images
    const handleEditorPaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target?.result;
                    const imgHtml = `
                        <div class="doc-image-wrapper" style="text-align: center; margin: 16px 0; page-break-inside: avoid !important; break-inside: avoid !important;">
                            <img 
                                src="${dataUrl}" 
                                alt="Pasted Image" 
                                draggable="true" 
                                style="max-width: 100%; max-height: 480px; height: auto; border-radius: 4px; display: inline-block; cursor: pointer;" 
                            />
                        </div>
                        <p><br /></p>
                    `;
                    document.execCommand('insertHTML', false, imgHtml);
                    handleInput();
                    toast.success("Pasted image inserted!");
                };
                reader.readAsDataURL(blob);
                return;
            }
        }
    };

    // Drag-and-drop handler for image files
    const handleEditorDrop = (e) => {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                e.preventDefault();
                const reader = new FileReader();
                reader.onload = (event) => {
                    const dataUrl = event.target?.result;
                    const imgHtml = `
                        <div class="doc-image-wrapper" style="text-align: center; margin: 16px 0; page-break-inside: avoid !important; break-inside: avoid !important;">
                            <img 
                                src="${dataUrl}" 
                                alt="Dropped Image" 
                                draggable="true" 
                                style="max-width: 100%; max-height: 480px; height: auto; border-radius: 4px; display: inline-block; cursor: pointer;" 
                            />
                        </div>
                        <p><br /></p>
                    `;
                    document.execCommand('insertHTML', false, imgHtml);
                    handleInput();
                    toast.success("Dropped image inserted!");
                };
                reader.readAsDataURL(file);
            }
        }
    };

    // Align selected image
    const handleAlignSelectedImage = (alignment) => {
        if (!selectedImageEl) return;
        const parent = selectedImageEl.parentElement;

        if (alignment === 'left') {
            selectedImageEl.style.display = 'block';
            selectedImageEl.style.marginLeft = '0';
            selectedImageEl.style.marginRight = 'auto';
            selectedImageEl.style.float = 'none';
            if (parent && parent !== editorRef.current) parent.style.textAlign = 'left';
        } else if (alignment === 'center') {
            selectedImageEl.style.display = 'block';
            selectedImageEl.style.marginLeft = 'auto';
            selectedImageEl.style.marginRight = 'auto';
            selectedImageEl.style.float = 'none';
            if (parent && parent !== editorRef.current) parent.style.textAlign = 'center';
        } else if (alignment === 'right') {
            selectedImageEl.style.display = 'block';
            selectedImageEl.style.marginLeft = 'auto';
            selectedImageEl.style.marginRight = '0';
            selectedImageEl.style.float = 'none';
            if (parent && parent !== editorRef.current) parent.style.textAlign = 'right';
        } else if (alignment === 'float-left') {
            selectedImageEl.style.display = 'inline-block';
            selectedImageEl.style.float = 'left';
            selectedImageEl.style.margin = '4px 16px 12px 0';
            if (parent && parent !== editorRef.current) parent.style.textAlign = 'left';
        } else if (alignment === 'float-right') {
            selectedImageEl.style.display = 'inline-block';
            selectedImageEl.style.float = 'right';
            selectedImageEl.style.margin = '4px 0 12px 16px';
            if (parent && parent !== editorRef.current) parent.style.textAlign = 'right';
        }
        handleInput();
        updateImgToolbarPosition(selectedImageEl);
    };

    // Resize selected image
    const handleResizeSelectedImage = (pct) => {
        if (!selectedImageEl) return;
        selectedImageEl.style.width = pct;
        selectedImageEl.style.maxWidth = '100%';
        selectedImageEl.style.height = 'auto';
        handleInput();
        updateImgToolbarPosition(selectedImageEl);
    };

    // Move selected image up or down in document hierarchy
    const handleMoveSelectedImage = (direction) => {
        if (!selectedImageEl || !editorRef.current) return;
        let targetBlock = selectedImageEl;
        while (targetBlock && targetBlock.parentElement && targetBlock.parentElement !== editorRef.current) {
            targetBlock = targetBlock.parentElement;
        }

        if (!targetBlock) return;

        if (direction === 'up') {
            const prev = targetBlock.previousElementSibling;
            if (prev) {
                editorRef.current.insertBefore(targetBlock, prev);
                handleInput();
                updateImgToolbarPosition(selectedImageEl);
                toast.success("Moved image up");
            } else {
                toast.error("Image is already at the top");
            }
        } else if (direction === 'down') {
            const next = targetBlock.nextElementSibling;
            if (next) {
                editorRef.current.insertBefore(next, targetBlock);
                handleInput();
                updateImgToolbarPosition(selectedImageEl);
                toast.success("Moved image down");
            } else {
                toast.error("Image is already at the bottom");
            }
        }
    };

    // Delete selected image
    const handleDeleteSelectedImage = () => {
        if (!selectedImageEl) return;
        const parent = selectedImageEl.parentElement;
        if (parent && parent !== editorRef.current && parent.childNodes.length === 1) {
            parent.remove();
        } else {
            selectedImageEl.remove();
        }
        setSelectedImageEl(null);
        setImgToolbarPos(null);
        handleInput();
        toast.success("Image removed");
    };

    // Apply crop from ImageCropperModal
    const handleApplyCrop = (croppedBase64) => {
        if (selectedImageEl) {
            selectedImageEl.src = croppedBase64;
            handleInput();
            updateImgToolbarPosition(selectedImageEl);
            toast.success("Image cropped successfully!");
        }
        setIsCropperOpen(false);
    };

    // Clear Document Canvas to Blank
    const handleClearToBlank = () => {
        if (!window.confirm("Clear this page to a completely blank document?")) return;
        if (editorRef.current) {
            editorRef.current.innerHTML = "<p><br /></p>";
            handleInput();
        }
        toast.success("Cleared to blank document!");
    };

    // Reset to Template
    const handleResetTemplate = () => {
        if (!window.confirm("Reset this document to the default template?")) return;
        setDocData(DEFAULT_DOC_STATE);
        localStorage.removeItem(STORAGE_KEY);
        if (editorRef.current) {
            editorRef.current.innerHTML = DEFAULT_DOC_STATE.tabs[0].htmlContent;
        }
        toast.success("Document reset to template!");
    };

    // Tab Management: Switch Tab
    const handleSelectTab = (tabId) => {
        setDocData(prev => ({ ...prev, activeTabId: tabId }));
    };

    // Tab Management: Create Tab
    const handleCreateTab = (e) => {
        e.preventDefault();
        if (!newTabName.trim()) {
            toast.error("Please enter a tab name.");
            return;
        }

        const newId = `tab-${Date.now()}`;
        const newTab = {
            id: newId,
            name: newTabName.trim(),
            htmlContent: `
                <h2 style="color: #18174e; font-weight: bold; margin-bottom: 10px;">${newTabName.trim()}</h2>
                <p style="color: #64748b; font-size: 12px; margin-bottom: 15px;">Date: ${new Date().toLocaleDateString('en-US')}</p>
                <p>Type your notes and remarks here...</p>
            `
        };

        setDocData(prev => ({
            ...prev,
            activeTabId: newId,
            tabs: [...prev.tabs, newTab]
        }));

        setNewTabName("");
        setShowAddTabModal(false);
        toast.success(`Created tab: "${newTab.name}"`);
    };

    // Tab Management: Delete Tab
    const handleDeleteTab = (tabId, tabName) => {
        if (docData.tabs.length <= 1) {
            toast.error("Cannot delete the only remaining tab.");
            return;
        }
        if (!window.confirm(`Delete tab "${tabName}" and its content?`)) return;

        setDocData(prev => {
            const filtered = prev.tabs.filter(t => t.id !== tabId);
            const nextActiveId = prev.activeTabId === tabId ? filtered[0].id : prev.activeTabId;
            return {
                ...prev,
                activeTabId: nextActiveId,
                tabs: filtered
            };
        });
        toast.success(`Tab "${tabName}" removed.`);
    };

    // --- BULLETPROOF PDF GENERATION (ISOLATED SANDBOX + DIRECT JSPDF FALLBACK) ---
    const fallbackDirectJsPDF = () => {
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 14;
            const maxLineWidth = pageWidth - (margin * 2);

            // Top Corporate Banner
            doc.setFillColor(24, 23, 78);
            doc.rect(0, 0, pageWidth, 24, 'F');
            doc.setFillColor(255, 102, 0);
            doc.rect(0, 23, pageWidth, 1.5, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.text("ONE INVENTORY MANAGEMENT SYSTEM", pageWidth / 2, 11, { align: 'center' });

            doc.setFontSize(8.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(215, 220, 245);
            doc.text(`${docData.documentTitle || 'Documents'} — [${activeTab.name}]`, pageWidth / 2, 18, { align: 'center' });

            let currentY = 32;

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = editorRef.current ? editorRef.current.innerHTML : (activeTab.htmlContent || '');

            // Parse tables if any
            const tables = tempDiv.querySelectorAll('table');
            if (tables.length > 0) {
                tables.forEach(tbl => {
                    const head = [];
                    const body = [];
                    const ths = tbl.querySelectorAll('thead th, tr:first-child th');
                    if (ths.length > 0) {
                        const headRow = [];
                        ths.forEach(th => headRow.push(th.innerText.trim()));
                        head.push(headRow);
                    }
                    const trs = tbl.querySelectorAll('tbody tr, tr:not(:first-child)');
                    trs.forEach(tr => {
                        const rowData = [];
                        tr.querySelectorAll('td').forEach(td => rowData.push(td.innerText.trim()));
                        if (rowData.length > 0) body.push(rowData);
                    });

                    if (body.length > 0) {
                        autoTable(doc, {
                            startY: currentY,
                            margin: { left: margin, right: margin },
                            head: head.length > 0 ? head : undefined,
                            body: body,
                            theme: 'grid',
                            headStyles: { fillColor: [24, 23, 78], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
                            bodyStyles: { fontSize: 8, textColor: [30, 41, 59] }
                        });
                        currentY = doc.lastAutoTable.finalY + 8;
                    }
                });
            }

            // Clean narrative text paragraphs
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9.5);
            doc.setTextColor(40, 40, 40);

            const blocks = tempDiv.querySelectorAll('h1, h2, h3, h4, p, li');
            if (blocks.length > 0) {
                blocks.forEach(b => {
                    const tagName = b.tagName.toLowerCase();
                    const textContent = (b.innerText || b.textContent || '').trim();
                    if (!textContent) return;

                    if (tagName === 'h1') {
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(14);
                        doc.setTextColor(24, 23, 78);
                        currentY += 4;
                    } else if (tagName === 'h2') {
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(12);
                        doc.setTextColor(24, 23, 78);
                        currentY += 3;
                    } else if (tagName === 'h3') {
                        doc.setFont("helvetica", "bold");
                        doc.setFontSize(10.5);
                        doc.setTextColor(24, 23, 78);
                        currentY += 2;
                    } else if (tagName === 'li') {
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(9);
                        doc.setTextColor(51, 65, 85);
                    } else {
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(9);
                        doc.setTextColor(30, 41, 59);
                    }

                    const prefix = tagName === 'li' ? '• ' : '';
                    const splitLines = doc.splitTextToSize(prefix + textContent, maxLineWidth);
                    splitLines.forEach(line => {
                        if (currentY > pageHeight - 20) {
                            doc.addPage();
                            currentY = 20;
                        }
                        doc.text(line, margin, currentY);
                        currentY += 5;
                    });
                    currentY += 2;
                });
            } else {
                const rawText = (tempDiv.innerText || tempDiv.textContent || '').trim();
                const splitRaw = doc.splitTextToSize(rawText, maxLineWidth);
                splitRaw.forEach(line => {
                    if (currentY > pageHeight - 20) {
                        doc.addPage();
                        currentY = 20;
                    }
                    doc.text(line, margin, currentY);
                    currentY += 5;
                });
            }

            // Footer on all pages
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(130, 130, 130);
                doc.text(`ONE INVENTORY SYSTEM  |  Generated on ${new Date().toLocaleDateString()}  |  CONFIDENTIAL`, margin, pageHeight - 8);
                doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
            }

            const cleanTitle = (docData.documentTitle || activeTab.name || "Documents").replace(/[^a-zA-Z0-9]/g, '_');
            doc.save(`${cleanTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success("Document PDF generated successfully!", { id: "pdf-download" });
        } catch (e) {
            console.error("Direct PDF generator error:", e);
            toast.error("Could not export PDF. Please use the Print button to Save as PDF.", { id: "pdf-download" });
        }
    };

    const handleDownloadPDF = async () => {
        setIsDownloadingPDF(true);
        toast.loading("Generating document PDF...", { id: "pdf-download" });

        try {
            if (!paperContainerRef.current) {
                toast.error("Document canvas not found.");
                return;
            }

            // 1. Deselect any active image to remove outlines or quick toolbars from the capture
            if (selectedImageEl) {
                selectedImageEl.style.outline = 'none';
            }
            setSelectedImageEl(null);
            setImgToolbarPos(null);

            // 2. Ensure all images inside the paper are fully loaded
            const images = Array.from(paperContainerRef.current.querySelectorAll('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(res => {
                    img.onload = res;
                    img.onerror = res;
                    setTimeout(res, 2000);
                });
            }));

            await new Promise(resolve => setTimeout(resolve, 150));

            // 3. Capture paperContainerRef directly (Exact 1:1 WYSIWYG matching what the user sees on screen)
            const element = paperContainerRef.current;

            const canvas = await html2canvas(element, {
                scale: 2, // 2x high resolution
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                scrollX: 0,
                scrollY: 0,
                windowWidth: document.documentElement.offsetWidth,
                windowHeight: document.documentElement.offsetHeight,
                ignoreElements: (el) => {
                    return (
                        el.classList?.contains('doc-page-divider') ||
                        el.classList?.contains('doc-img-quick-toolbar') ||
                        el.hasAttribute('data-html2canvas-ignore')
                    );
                }
            });

            // 4. Exact standard A4 slicing matching the on-screen visual page breaks
            const canvasWidth = canvas.width;
            const totalCanvasHeight = canvas.height;
            const a4Ratio = 297 / 210; // Exact standard A4 ratio
            const pageCanvasHeight = Math.round(canvasWidth * a4Ratio);

            // Compute total pages, ignoring negligible trailing blank slivers under 40px
            const remainder = totalCanvasHeight % pageCanvasHeight;
            const totalPages = Math.max(1, Math.floor(totalCanvasHeight / pageCanvasHeight) + (remainder > 40 ? 1 : 0));

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            for (let p = 0; p < totalPages; p++) {
                if (p > 0) {
                    pdf.addPage();
                }

                // Create discrete page canvas slice
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvasWidth;
                pageCanvas.height = pageCanvasHeight;
                const pctx = pageCanvas.getContext('2d');

                // Fill with pure white background
                pctx.fillStyle = '#ffffff';
                pctx.fillRect(0, 0, canvasWidth, pageCanvasHeight);

                const srcY = p * pageCanvasHeight;
                const srcHeight = Math.min(pageCanvasHeight, totalCanvasHeight - srcY);

                if (srcHeight > 0) {
                    pctx.drawImage(
                        canvas,
                        0, srcY, canvasWidth, srcHeight,
                        0, 0, canvasWidth, srcHeight
                    );
                }

                const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
                pdf.addImage(pageImgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            }

            const cleanTitle = (docData.documentTitle || activeTab.name || "Documents").replace(/[^a-zA-Z0-9]/g, '_');
            pdf.save(`${cleanTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success("Document PDF downloaded successfully!", { id: "pdf-download" });

        } catch (err) {
            console.error("Direct canvas export error, using fallbackDirectJsPDF:", err);
            fallbackDirectJsPDF();
        } finally {
            setIsDownloadingPDF(false);
        }
    };

    // Native Browser Print
    const handlePrint = () => {
        if (selectedImageEl) {
            selectedImageEl.style.outline = 'none';
        }
        setSelectedImageEl(null);
        setImgToolbarPos(null);
        window.print();
    };

    // Color presets
    const textColors = [
        { name: "Default (Black)", value: "#1e293b" },
        { name: "Navy Blue", value: "#18174e" },
        { name: "Orange", value: "#ff6600" },
        { name: "Emerald Green", value: "#10b981" },
        { name: "Amber / Yellow", value: "#d97706" },
        { name: "Crimson Red", value: "#dc2626" },
        { name: "Royal Purple", value: "#7c3aed" },
        { name: "Slate Muted", value: "#64748b" }
    ];

    const bgColors = [
        { name: "None", value: "transparent" },
        { name: "Yellow Highlight", value: "#fef08a" },
        { name: "Green Highlight", value: "#bbf7d0" },
        { name: "Orange Highlight", value: "#fed7aa" },
        { name: "Blue Highlight", value: "#bfdbfe" },
        { name: "Rose Highlight", value: "#fecdd3" },
        { name: "Purple Highlight", value: "#e9d5ff" }
    ];

    return (
        <div className="mx-6 md:mx-10 lg:mx-14 mt-6 flex flex-col gap-6 font-sans antialiased relative">
            {/* Consistent Page Header */}
            <PageHeader activeTab="documents" />

            {/* MASTER DOCUMENT WORKSPACE CONTAINER */}
            <div className={`w-full ${isDark ? 'bg-[#0e1017] border-slate-800 text-slate-200' : 'bg-white border-slate-100 text-slate-700'} border rounded-2xl shadow-sm flex flex-col transition-colors duration-200 overflow-hidden`}>

                {/* 1. TOP HEADER & MAIN CONTROLS BAR (Clean & Direct) */}
                <div className={`p-4 md:px-6 md:py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${
                    isDark ? 'border-slate-800 bg-[#12141f]' : 'border-slate-100 bg-slate-50/80'
                }`}>
                    {/* Left: Clean Document Title Input (No clutter/icons) */}
                    <div className="flex items-center gap-2 min-w-0">
                        <input 
                            type="text"
                            value={docData.documentTitle}
                            onChange={(e) => setDocData({ ...docData, documentTitle: e.target.value })}
                            className={`text-base md:text-lg font-bold bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-[#ff6600] focus:outline-hidden px-1.5 py-0.5 rounded truncate max-w-[280px] sm:max-w-md ${
                                isDark ? 'text-white' : 'text-slate-900'
                            }`}
                            title="Click to rename document"
                        />
                    </div>

                    {/* Right: Action Buttons (Download PDF, Print, View/Edit Mode, Blank Page) */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Download PDF Button */}
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isDownloadingPDF}
                            className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg bg-[#18174e] text-white hover:bg-[#12113d] transition-all cursor-pointer shadow-xs disabled:opacity-50"
                            title="Download document as clean A4 PDF"
                        >
                            <FileDown className="w-3.5 h-3.5 text-[#ff6600]" />
                            <span>{isDownloadingPDF ? "Generating PDF..." : "Download PDF"}</span>
                        </button>

                        {/* Print Button */}
                        <button
                            onClick={handlePrint}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-all cursor-pointer shadow-2xs ${
                                isDark ? 'bg-[#141622] text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                            title="Print Document"
                        >
                            <Printer className="w-3.5 h-3.5 text-slate-400" />
                            <span className="hidden sm:inline">Print</span>
                        </button>

                        {/* View / Edit Mode Toggle */}
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-all cursor-pointer shadow-2xs ${
                                isEditing
                                    ? (isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800' : 'bg-amber-50 text-amber-800 border-amber-300')
                                    : (isDark ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/60' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100')
                            }`}
                            title={isEditing ? "Lock to read-only view" : "Enable typing and editing"}
                        >
                            {isEditing ? <Eye className="w-3.5 h-3.5 text-amber-500" /> : <Edit3 className="w-3.5 h-3.5 text-indigo-500" />}
                            <span>{isEditing ? "View Mode" : "Edit Doc"}</span>
                        </button>

                        {/* Blank Page Button */}
                        <button
                            onClick={handleClearToBlank}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                                isDark 
                                    ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                            title="Clear page to start a completely blank document"
                        >
                            <Plus className="w-3.5 h-3.5 text-[#ff6600]" />
                            <span className="hidden sm:inline">Blank Page</span>
                        </button>

                        {/* Reset to Sample Template */}
                        <button
                            onClick={handleResetTemplate}
                            className={`p-2 rounded-lg border transition-all cursor-pointer ${
                                isDark ? 'border-slate-800 text-slate-400 hover:text-rose-400' : 'border-slate-200 text-slate-400 hover:text-rose-600'
                            }`}
                            title="Reset to default template"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* 2. DOCUMENT TABS STRIP */}
                <div className={`px-4 md:px-6 py-2 border-b flex items-center gap-2 overflow-x-auto ${
                    isDark ? 'border-slate-800/80 bg-[#0a0c13]' : 'border-slate-100 bg-slate-100/60'
                }`}>
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
                        <Layers className="w-3.5 h-3.5 text-[#ff6600]" />
                        <span>Tabs:</span>
                    </div>

                    {docData.tabs.map((tab) => {
                        const isActive = tab.id === activeTab.id;
                        return (
                            <div
                                key={tab.id}
                                onClick={() => handleSelectTab(tab.id)}
                                className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                                    isActive
                                        ? isDark
                                            ? 'bg-[#18174e] text-white border-[#ff6600]/50 shadow-xs'
                                            : 'bg-[#18174e] text-white border-[#18174e] shadow-xs'
                                        : isDark
                                            ? 'bg-[#141622] text-slate-400 border-slate-700 hover:text-white'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span>{tab.name}</span>
                                {docData.tabs.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTab(tab.id, tab.name);
                                        }}
                                        className="opacity-40 group-hover:opacity-100 hover:text-rose-400 transition-opacity ml-1"
                                        title="Delete tab"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    <button
                        onClick={() => setShowAddTabModal(true)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed transition-all shrink-0 cursor-pointer ${
                            isDark 
                                ? 'border-slate-700 text-slate-400 hover:text-[#ff6600] hover:border-[#ff6600]' 
                                : 'border-slate-300 text-slate-500 hover:text-[#18174e] hover:border-[#18174e]'
                        }`}
                        title="Add a new document tab"
                    >
                        <Plus className="w-3 h-3 text-[#ff6600]" />
                        <span>New Tab</span>
                    </button>
                </div>

                {/* 3. RICH TEXT EDITING TOOLBAR */}
                <div className={`px-4 md:px-6 py-2.5 border-b flex flex-wrap items-center gap-1.5 ${
                    isDark ? 'border-slate-800 bg-[#0c0e17]' : 'border-slate-100 bg-slate-50'
                }`}>
                    {/* Undo / Redo */}
                    <div className="flex items-center gap-0.5 pr-2 border-r border-slate-300 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => formatDoc('undo')}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => formatDoc('redo')}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Paragraph Style / Heading dropdown */}
                    <select
                        onChange={(e) => handleFontSizeChange(e.target.value)}
                        defaultValue="p"
                        className={`text-xs font-semibold px-2 py-1 rounded border focus:outline-hidden cursor-pointer ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
                        }`}
                        title="Text Formatting / Heading Style"
                    >
                        <option value="p">Normal text</option>
                        <option value="h1">Heading 1 (Large)</option>
                        <option value="h2">Heading 2 (Medium)</option>
                        <option value="h3">Heading 3 (Small)</option>
                        <option value="h4">Heading 4</option>
                    </select>

                    {/* Font Size dropdown */}
                    <select
                        onChange={(e) => formatDoc('fontSize', e.target.value)}
                        defaultValue="3"
                        className={`text-xs font-semibold px-2 py-1 rounded border focus:outline-hidden cursor-pointer ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
                        }`}
                        title="Font Size"
                    >
                        <option value="1">10 pt</option>
                        <option value="2">11 pt</option>
                        <option value="3">12 pt (Normal)</option>
                        <option value="4">14 pt</option>
                        <option value="5">18 pt</option>
                        <option value="6">24 pt</option>
                        <option value="7">36 pt</option>
                    </select>

                    {/* Font Family */}
                    <select
                        onChange={(e) => formatDoc('fontName', e.target.value)}
                        defaultValue="Poppins, sans-serif"
                        className={`text-xs font-semibold px-2 py-1 rounded border focus:outline-hidden cursor-pointer hidden sm:block ${
                            isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'
                        }`}
                        title="Font Family"
                    >
                        <option value="Poppins, sans-serif">Poppins</option>
                        <option value="Arial, sans-serif">Arial</option>
                        <option value="'Times New Roman', serif">Times New Roman</option>
                        <option value="'Courier New', monospace">Courier New</option>
                        <option value="Georgia, serif">Georgia</option>
                    </select>

                    {/* BOLD, ITALIC, UNDERLINE, STRIKETHROUGH */}
                    <div className="flex items-center gap-0.5 px-2 border-l border-r border-slate-300 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => formatDoc('bold')}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                            title="Bold (Ctrl+B)"
                        >
                            <Bold className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => formatDoc('italic')}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 italic cursor-pointer"
                            title="Italic (Ctrl+I)"
                        >
                            <Italic className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => formatDoc('underline')}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 underline cursor-pointer"
                            title="Underline (Ctrl+U)"
                        >
                            <Underline className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => formatDoc('strikeThrough')}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 line-through cursor-pointer"
                            title="Strikethrough"
                        >
                            <Strikethrough className="w-4 h-4" />
                        </button>
                    </div>

                    {/* TEXT COLOR & HIGHLIGHT COLOR */}
                    <div className="flex items-center gap-1 px-1 relative">
                        {/* Text Color Picker */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowTextColorPalette(!showTextColorPalette);
                                    setShowBgColorPalette(false);
                                }}
                                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
                                title="Text Color"
                            >
                                <span className="font-bold underline text-sm leading-none" style={{ textDecorationColor: '#ff6600', textDecorationThickness: '3px' }}>A</span>
                            </button>
                            {showTextColorPalette && (
                                <div className={`absolute top-full left-0 mt-1 z-30 p-2 rounded-xl shadow-xl border grid grid-cols-4 gap-1.5 w-36 ${
                                    isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                                }`}>
                                    {textColors.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => {
                                                formatDoc('foreColor', c.value);
                                                setShowTextColorPalette(false);
                                            }}
                                            style={{ backgroundColor: c.value }}
                                            className="w-6 h-6 rounded-md border border-black/10 cursor-pointer hover:scale-110 transition-transform"
                                            title={c.name}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Highlight Color Picker */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowBgColorPalette(!showBgColorPalette);
                                    setShowTextColorPalette(false);
                                }}
                                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                                title="Highlight Color"
                            >
                                <Highlighter className="w-4 h-4 text-amber-500" />
                            </button>
                            {showBgColorPalette && (
                                <div className={`absolute top-full left-0 mt-1 z-30 p-2 rounded-xl shadow-xl border grid grid-cols-4 gap-1.5 w-36 ${
                                    isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                                }`}>
                                    {bgColors.map(c => (
                                        <button
                                            key={c.name}
                                            type="button"
                                            onClick={() => {
                                                formatDoc('hiliteColor', c.value);
                                                formatDoc('backColor', c.value);
                                                setShowBgColorPalette(false);
                                            }}
                                            style={{ backgroundColor: c.value === 'transparent' ? '#ffffff' : c.value }}
                                            className="w-6 h-6 rounded-md border border-slate-300 dark:border-slate-700 cursor-pointer hover:scale-110 transition-transform text-[10px] flex items-center justify-center font-bold"
                                            title={c.name}
                                        >
                                            {c.value === 'transparent' ? '✕' : ''}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ALIGNMENT (Left, Center, Right, Justify) */}
                    <div className="flex items-center gap-0.5 px-2 border-l border-r border-slate-300 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => formatDoc('justifyLeft')}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                            title="Align Left (Ctrl+L)"
                        >
                            <AlignLeft className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => formatDoc('justifyCenter')}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                            title="Align Center (Ctrl+E)"
                        >
                            <AlignCenter className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => formatDoc('justifyRight')}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                            title="Align Right (Ctrl+R)"
                        >
                            <AlignRight className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => formatDoc('justifyFull')}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                            title="Justify (Ctrl+J)"
                        >
                            <AlignJustify className="w-4 h-4" />
                        </button>
                    </div>

                    {/* LISTS */}
                    <div className="flex items-center gap-0.5 px-2 border-r border-slate-300 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => formatDoc('insertUnorderedList')}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                            title="Bulleted List"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => formatDoc('insertOrderedList')}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                            title="Numbered List"
                        >
                            <ListOrdered className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleInsertCheckbox}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                            title="Insert Checkbox Item"
                        >
                            <CheckSquare className="w-4 h-4 text-[#ff6600]" />
                        </button>
                    </div>

                    {/* INSERTS: Image, Upright Logo, Table, Divider, Date, Watermark & Header Toggles */}
                    <div className="flex items-center gap-1 pl-1 flex-wrap">
                        {/* Hidden File Input for Device Image Selection */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageFileChange}
                        />

                        {/* Insert Image Button */}
                        <button
                            type="button"
                            onClick={handleInsertImageClick}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Insert image from device"
                        >
                            <ImageIcon className="w-4 h-4 text-[#ff6600]" />
                            <span className="hidden md:inline">Insert Image</span>
                        </button>

                        {/* Insert Centered Upright Logo Button */}
                        <button
                            type="button"
                            onClick={handleInsertUprightLogo}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Insert centered Upright logo at cursor"
                        >
                            <Shield className="w-4 h-4 text-[#18174e] dark:text-[#ff6600]" />
                            <span className="hidden md:inline">Upright Logo</span>
                        </button>

                        <span className="text-slate-300 dark:text-slate-700">|</span>

                        {/* Insert Table */}
                        <button
                            type="button"
                            onClick={handleInsertTable}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Insert Table"
                        >
                            <Table className="w-4 h-4" />
                            <span className="hidden md:inline">Table</span>
                        </button>

                        {/* Insert Divider Line */}
                        <button
                            type="button"
                            onClick={() => formatDoc('insertHorizontalRule')}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Insert Divider Line"
                        >
                            <Minus className="w-4 h-4" />
                            <span className="hidden md:inline">Line</span>
                        </button>

                        {/* Insert Timestamp */}
                        <button
                            type="button"
                            onClick={handleInsertDateStamp}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Insert Timestamp"
                        >
                            <Calendar className="w-4 h-4 text-[#ff6600]" />
                            <span className="hidden md:inline">Date</span>
                        </button>

                        {/* Insert Signatures (Toolkeeper & Inventory Assistant) */}
                        <button
                            type="button"
                            onClick={handleInsertSignatures}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Insert Toolkeeper & Inventory Assistant signature lines at bottom"
                        >
                            <PenTool className="w-4 h-4 text-[#ff6600]" />
                            <span className="hidden md:inline">Signatures</span>
                        </button>

                        {/* Insert Manual Page Break Button */}
                        <button
                            type="button"
                            onClick={handleInsertPageBreak}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Insert manual Page Break (Starts next section on a new page)"
                        >
                            <Scissors className="w-4 h-4 text-[#ff6600]" />
                            <span className="hidden md:inline">Page Break</span>
                        </button>

                        <span className="text-slate-300 dark:text-slate-700">|</span>

                        {/* Watermark Toggle (Gitna) */}
                        <button
                            type="button"
                            onClick={() => setShowWatermark(prev => !prev)}
                            className={`p-1.5 rounded transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                                showWatermark
                                    ? 'bg-[#18174e]/10 text-[#18174e] dark:bg-[#ff6600]/20 dark:text-[#ff6600]'
                                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                            title="Toggle Upright logo watermark sa gitna (center)"
                        >
                            <Stamp className="w-4 h-4" />
                            <span className="hidden lg:inline">Watermark {showWatermark ? 'ON' : 'OFF'}</span>
                        </button>

                        {/* Header Logo Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowHeaderLogo(prev => !prev)}
                            className={`p-1.5 rounded transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                                showHeaderLogo
                                    ? 'bg-[#18174e]/10 text-[#18174e] dark:bg-[#ff6600]/20 dark:text-[#ff6600]'
                                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                            title="Toggle Upright centered header banner"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span className="hidden lg:inline">Header {showHeaderLogo ? 'ON' : 'OFF'}</span>
                        </button>
                    </div>
                </div>

                {/* 3.5 ACTIVE IMAGE CONTROLS STRIP (Whenever an image in document is clicked) */}
                {selectedImageEl && (
                    <div className={`px-4 md:px-6 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs transition-all animate-fadeIn ${
                        isDark ? 'bg-[#141829] border-[#ff6600]/40 text-slate-200' : 'bg-orange-50/90 border-[#ff6600]/30 text-slate-800'
                    }`}>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#ff6600] flex items-center gap-1 uppercase tracking-wider text-[11px]">
                                <ImageIcon className="w-3.5 h-3.5" />
                                Image Controls:
                            </span>
                            <span className="text-slate-400">|</span>
                            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Align:</span>
                            <button 
                                type="button"
                                onClick={() => handleAlignSelectedImage('left')} 
                                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer" 
                                title="Align Left"
                            >
                                <AlignLeft className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleAlignSelectedImage('center')} 
                                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer" 
                                title="Align Center"
                            >
                                <AlignCenter className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleAlignSelectedImage('right')} 
                                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer" 
                                title="Align Right"
                            >
                                <AlignRight className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleAlignSelectedImage('float-left')} 
                                className="px-1.5 py-0.5 rounded font-bold text-[10px] hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer border border-slate-300 dark:border-slate-700" 
                                title="Float Left with text wrap"
                            >
                                Wrap Left
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleAlignSelectedImage('float-right')} 
                                className="px-1.5 py-0.5 rounded font-bold text-[10px] hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer border border-slate-300 dark:border-slate-700" 
                                title="Float Right with text wrap"
                            >
                                Wrap Right
                            </button>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Move:</span>
                            <button 
                                type="button"
                                onClick={() => handleMoveSelectedImage('up')} 
                                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-1 font-semibold cursor-pointer border border-slate-300 dark:border-slate-700" 
                                title="Move image above previous block"
                            >
                                <MoveUp className="w-3.5 h-3.5" />
                                <span>Move Up</span>
                            </button>
                            <button 
                                type="button"
                                onClick={() => handleMoveSelectedImage('down')} 
                                className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 flex items-center gap-1 font-semibold cursor-pointer border border-slate-300 dark:border-slate-700" 
                                title="Move image below next block"
                            >
                                <MoveDown className="w-3.5 h-3.5" />
                                <span>Move Down</span>
                            </button>
                            <span className="text-slate-400">|</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setCropImageSrc(selectedImageEl.src);
                                    setIsCropperOpen(true);
                                }}
                                className="flex items-center gap-1 px-3 py-1 rounded-md bg-[#ff6600] text-white font-bold hover:bg-[#e05a00] cursor-pointer shadow-xs active:scale-95 transition-all"
                                title="Crop and adjust this image"
                            >
                                <Crop className="w-3.5 h-3.5" />
                                <span>Crop Image</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteSelectedImage}
                                className="p-1 rounded text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                title="Delete Image"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* 4. THE DOCUMENT CANVAS WORKSPACE */}
                <div className={`w-full py-8 px-2 sm:px-6 md:px-12 flex justify-center items-start min-h-[850px] overflow-x-auto ${
                    isDark ? 'bg-[#08090e]' : 'bg-[#eef1f6]'
                }`}>
                    <div 
                        ref={paperContainerRef}
                        className="documents-printable-paper relative w-full max-w-[850px] min-h-[1100px] bg-white text-slate-900 rounded-sm shadow-2xl p-8 sm:p-14 md:p-16 border border-slate-200 flex flex-col font-sans transition-all duration-200 overflow-hidden"
                    >
                        {/* Visual On-Screen Page Break Dividers (dat makita nadin kase sa documents) */}
                        {pageBreakOffsets.map(pb => (
                            <div
                                key={`page-boundary-${pb.pageIndex}`}
                                className="doc-page-divider absolute left-0 right-0 pointer-events-none select-none z-20 print:hidden flex items-center justify-center transition-all duration-150"
                                style={{ top: `${pb.top}px` }}
                            >
                                <div className="w-full border-t-2 border-dashed border-[#ff6600]/80 relative flex items-center justify-center">
                                    <span className="bg-[#18174e] text-white text-[10px] sm:text-[11px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 transform -translate-y-1/2 uppercase tracking-wider border border-[#ff6600]/50">
                                        <Scissors className="w-3.5 h-3.5 text-[#ff6600]" />
                                        <span>Page {pb.pageIndex} Ends &nbsp;|&nbsp; Page {pb.pageIndex + 1} Starts Here</span>
                                    </span>
                                </div>
                            </div>
                        ))}
                        {/* Floating Quick Action Toolbar for Selected Image */}
                        {selectedImageEl && imgToolbarPos && (
                            <div 
                                className="doc-img-quick-toolbar absolute z-30 flex items-center gap-1 p-1.5 rounded-xl bg-[#18174e] text-white shadow-2xl border border-slate-700 text-xs animate-fadeIn"
                                style={{
                                    top: `${imgToolbarPos.top}px`,
                                    left: `${imgToolbarPos.left}px`
                                }}
                            >
                                {/* Alignment */}
                                <div className="flex items-center gap-0.5 border-r border-white/20 pr-1">
                                    <button 
                                        type="button" 
                                        onClick={() => handleAlignSelectedImage('left')}
                                        className="p-1 rounded hover:bg-white/20 cursor-pointer"
                                        title="Align Left"
                                    >
                                        <AlignLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => handleAlignSelectedImage('center')}
                                        className="p-1 rounded hover:bg-white/20 cursor-pointer"
                                        title="Align Center"
                                    >
                                        <AlignCenter className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => handleAlignSelectedImage('right')}
                                        className="p-1 rounded hover:bg-white/20 cursor-pointer"
                                        title="Align Right"
                                    >
                                        <AlignRight className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => handleAlignSelectedImage('float-left')}
                                        className="px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-white/20 cursor-pointer"
                                        title="Wrap Text Left"
                                    >
                                        Wrap L
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => handleAlignSelectedImage('float-right')}
                                        className="px-1.5 py-0.5 rounded text-[10px] font-bold hover:bg-white/20 cursor-pointer"
                                        title="Wrap Text Right"
                                    >
                                        Wrap R
                                    </button>
                                </div>

                                {/* Move Up / Down */}
                                <div className="flex items-center gap-0.5 border-r border-white/20 pr-1">
                                    <button 
                                        type="button" 
                                        onClick={() => handleMoveSelectedImage('up')}
                                        className="p-1 rounded hover:bg-white/20 cursor-pointer"
                                        title="Move Image Up"
                                    >
                                        <MoveUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => handleMoveSelectedImage('down')}
                                        className="p-1 rounded hover:bg-white/20 cursor-pointer"
                                        title="Move Image Down"
                                    >
                                        <MoveDown className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Size Presets */}
                                <div className="flex items-center gap-0.5 border-r border-white/20 pr-1">
                                    {['25%', '50%', '75%', '100%'].map(sz => (
                                        <button
                                            key={sz}
                                            type="button"
                                            onClick={() => handleResizeSelectedImage(sz)}
                                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold hover:bg-white/20 cursor-pointer"
                                            title={`Resize to ${sz} width`}
                                        >
                                            {sz}
                                        </button>
                                    ))}
                                </div>

                                {/* Crop Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCropImageSrc(selectedImageEl.src);
                                        setIsCropperOpen(true);
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#ff6600] hover:bg-[#e05a00] font-bold text-white text-[11px] cursor-pointer shadow-xs active:scale-95 transition-all"
                                    title="Crop this image"
                                >
                                    <Crop className="w-3.5 h-3.5" />
                                    <span>Crop</span>
                                </button>

                                {/* Delete */}
                                <button
                                    type="button"
                                    onClick={handleDeleteSelectedImage}
                                    className="p-1 rounded hover:bg-rose-500/30 text-rose-300 hover:text-white cursor-pointer"
                                    title="Delete Image"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Deselect */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedImageEl) selectedImageEl.style.outline = 'none';
                                        setSelectedImageEl(null);
                                        setImgToolbarPos(null);
                                    }}
                                    className="p-1 rounded hover:bg-white/20 text-slate-400 hover:text-white cursor-pointer"
                                    title="Deselect"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}

                        {/* 1. Centered Upright Watermark in Document Body (Naka center, hinde slant, walang text) */}
                        {showWatermark && (
                            <div 
                                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
                                style={{ pointerEvents: 'none' }}
                            >
                                <img 
                                    src="/upright.png" 
                                    alt="Upright Watermark" 
                                    className="w-[300px] sm:w-[380px] md:w-[440px] max-w-[65%] object-contain opacity-[0.065] select-none"
                                />
                            </div>
                        )}

                        {/* 2. Top-Right Upright Logo Header Banner with Toolroom Department & Date/Time */}
                        {showHeaderLogo && (
                            <div className="relative z-10 flex items-center justify-between pb-4 mb-6 border-b-2 border-[#18174e] select-none print:flex">
                                <div className="flex flex-col text-left">
                                    <div className="text-base sm:text-lg font-black text-[#18174e] tracking-tight uppercase leading-tight">
                                        UPRIGHT STORAGE SOLUTIONS PH
                                    </div>
                                    <div className="text-xs sm:text-sm font-bold text-[#ff6600] tracking-normal uppercase mt-0.5">
                                        Toolroom Department
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1.5 print:text-black">
                                        <span><strong>Date:</strong> {currentDateTime.date}</span>
                                        <span>•</span>
                                        <span><strong>Time:</strong> {currentDateTime.time}</span>
                                    </div>
                                </div>
                                <div className="shrink-0 pl-3">
                                    <img 
                                        src="/upright.png" 
                                        alt="Upright Logo" 
                                        className="h-12 sm:h-14 md:h-16 object-contain"
                                    />
                                </div>
                            </div>
                        )}

                        {/* 3. The ContentEditable Document Canvas */}
                        <div
                            ref={editorRef}
                            contentEditable={isEditing}
                            onInput={handleInput}
                            onClick={handleEditorClick}
                            onDoubleClick={handleEditorDoubleClick}
                            onPaste={handleEditorPaste}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleEditorDrop}
                            suppressContentEditableWarning={true}
                            spellCheck={true}
                            className={`relative z-10 w-full h-full min-h-[960px] outline-hidden leading-relaxed text-slate-800 text-sm md:text-base font-normal ${
                                isEditing ? 'cursor-text focus:outline-hidden' : 'cursor-default select-text'
                            }`}
                            style={{
                                fontFamily: "'Poppins', Arial, sans-serif",
                                minHeight: "960px"
                            }}
                        />
                    </div>
                </div>

            </div>

            {/* MODAL: IMAGE CROPPER */}
            <ImageCropperModal
                isOpen={isCropperOpen}
                imageSrc={cropImageSrc}
                onClose={() => setIsCropperOpen(false)}
                onApplyCrop={handleApplyCrop}
            />

            {/* MODAL: CREATE NEW DOCUMENT TAB */}
            {showAddTabModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className={`w-full max-w-sm rounded-2xl border shadow-2xl p-5 flex flex-col gap-4 animate-scale-up ${
                        isDark ? 'bg-[#0f121d] border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                    }`}>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                            <h4 className="text-sm font-bold flex items-center gap-2">
                                <FolderPlus className="w-4 h-4 text-[#ff6600]" />
                                <span>Create New Document Tab</span>
                            </h4>
                            <button 
                                onClick={() => setShowAddTabModal(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTab} className="flex flex-col gap-3 text-xs">
                            <div className="flex flex-col gap-1">
                                <label className="font-bold text-slate-700 dark:text-slate-300">
                                    Tab Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="e.g. Tab 2, Endorsement..."
                                    value={newTabName}
                                    onChange={(e) => setNewTabName(e.target.value)}
                                    className={`w-full px-3 py-2 rounded-lg border focus:outline-hidden focus:ring-2 focus:ring-[#ff6600] ${
                                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                                    }`}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddTabModal(false)}
                                    className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 rounded-lg bg-[#ff6600] text-white font-bold cursor-pointer hover:bg-[#e05a00]"
                                >
                                    Create Tab
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Documents;
