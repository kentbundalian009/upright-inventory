import React, { useState, useEffect, useRef } from 'react';
import { 
    Bold, Italic, Underline, Strikethrough, AlignLeft, 
    AlignCenter, AlignRight, AlignJustify, List, ListOrdered, 
    CheckSquare, Download, Printer, RotateCcw, Undo, Redo, 
    Eye, Edit3, Plus, Calendar, FileText, 
    Highlighter, Minus, Table, Layers, X, FileDown, FolderPlus
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import PageHeader from './layout/PageHeader';
import { useTheme } from '../context/ThemeContext';

const STORAGE_KEY = 'oneinventory_documents_v1';

const DEFAULT_DOC_STATE = {
    documentTitle: "Documents",
    activeTabId: "tab-1",
    tabs: [
        {
            id: "tab-1",
            name: "Document 1",
            htmlContent: `
                <h1 style="color: #18174e; font-size: 24px; font-weight: bold; margin-bottom: 6px; text-align: left;">
                    OPERATIONAL REMARKS & ENDORSEMENT
                </h1>
                <p style="color: #64748b; font-size: 13px; margin-bottom: 18px; border-bottom: 2px solid #ff6600; padding-bottom: 8px;">
                    <strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} &nbsp;|&nbsp; 
                    <strong>Shift:</strong> Day Shift (08:00 AM - 05:00 PM)
                </p>

                <h3 style="color: #18174e; font-size: 16px; font-weight: bold; margin-top: 14px; margin-bottom: 8px;">
                    1. Pending Action Items & Remarks:
                </h3>
                <ul>
                    <li style="margin-bottom: 6px;"><strong>[RACKINGS]:</strong> Recount and verify pallet variance in Racking Bay B-04 before dispatch.</li>
                    <li style="margin-bottom: 6px;"><strong>[SUPPLIES]:</strong> Expected supplier delivery for bubble wraps & packaging tapes arriving tomorrow morning.</li>
                    <li style="margin-bottom: 6px;"><strong>[WIP]:</strong> Fabrication batch #84 acrylic sheets pending QA inspection.</li>
                </ul>

                <h3 style="color: #18174e; font-size: 16px; font-weight: bold; margin-top: 20px; margin-bottom: 8px;">
                    2. Shift Handover Notes:
                </h3>
                <p style="margin-bottom: 12px; line-height: 1.6;">
                    Please ensure that all outgoing pallets for PO-2026-092 are shrink-wrapped with corner protectors prior to dispatch.
                </p>

                <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 30px 0 20px 0;" />

                <table style="width: 100%; border-collapse: collapse; margin-top: 25px;">
                    <tr>
                        <td style="width: 50%; padding: 15px; text-align: center; vertical-align: bottom;">
                            <div style="border-bottom: 1px solid #94a3b8; width: 80%; margin: 0 auto 6px auto;"></div>
                            <span style="font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">
                                Prepared & Endorsed By
                            </span>
                        </td>
                        <td style="width: 50%; padding: 15px; text-align: center; vertical-align: bottom;">
                            <div style="border-bottom: 1px solid #94a3b8; width: 80%; margin: 0 auto 6px auto;"></div>
                            <span style="font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase;">
                                Acknowledged & Received By
                            </span>
                        </td>
                    </tr>
                </table>
            `
        }
    ]
};

function Documents() {
    const { isDark } = useTheme();

    // Load saved document state from localStorage
    const [docData, setDocData] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
                    return parsed;
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

    // Color pickers dropdown state
    const [showTextColorPalette, setShowTextColorPalette] = useState(false);
    const [showBgColorPalette, setShowBgColorPalette] = useState(false);

    // Ref to contentEditable paper canvas
    const editorRef = useRef(null);
    const isInternalUpdate = useRef(false);

    // Active Tab
    const activeTab = docData.tabs.find(t => t.id === docData.activeTabId) || docData.tabs[0];

    // Load active tab HTML into editorRef when active tab changes
    useEffect(() => {
        if (editorRef.current && activeTab) {
            isInternalUpdate.current = true;
            editorRef.current.innerHTML = activeTab.htmlContent || "";
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

        let iframe = null;
        try {
            iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.top = '-10000px';
            iframe.style.left = '-10000px';
            iframe.style.width = '794px';
            iframe.style.minHeight = '1123px';
            iframe.style.border = 'none';
            iframe.style.backgroundColor = '#ffffff';
            document.body.appendChild(iframe);

            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="utf-8">
                        <title>${docData.documentTitle || 'Document'}</title>
                        <style>
                            * { box-sizing: border-box; }
                            body {
                                font-family: Arial, Helvetica, sans-serif;
                                margin: 0;
                                padding: 36px 40px;
                                color: #1e293b;
                                background-color: #ffffff;
                                line-height: 1.6;
                                font-size: 13px;
                                width: 794px;
                            }
                            h1 { font-size: 22px; color: #18174e; margin: 0 0 10px 0; font-weight: bold; }
                            h2 { font-size: 18px; color: #18174e; margin: 16px 0 8px 0; font-weight: bold; }
                            h3 { font-size: 15px; color: #18174e; margin: 14px 0 6px 0; font-weight: bold; }
                            h4 { font-size: 13px; color: #18174e; margin: 12px 0 4px 0; font-weight: bold; }
                            p { margin: 0 0 10px 0; }
                            ul, ol { margin: 0 0 12px 24px; padding: 0; }
                            li { margin-bottom: 6px; }
                            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
                            th { background-color: #18174e; color: #ffffff; padding: 8px 10px; font-size: 12px; border: 1px solid #cbd5e1; text-align: left; }
                            td { padding: 8px 10px; font-size: 12px; border: 1px solid #cbd5e1; }
                            tr:nth-child(even) td { background-color: #f8fafc; }
                            hr { border: none; border-top: 1px solid #cbd5e1; margin: 24px 0; }
                            input[type="checkbox"] { width: 14px; height: 14px; margin-right: 6px; }
                        </style>
                    </head>
                    <body>
                        ${editorRef.current ? editorRef.current.innerHTML : (activeTab.htmlContent || '')}
                    </body>
                </html>
            `);
            iframeDoc.close();

            await new Promise(resolve => setTimeout(resolve, 250));

            const canvas = await html2canvas(iframeDoc.body, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: 794
            });

            if (iframe && iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
                iframe = null;
            }

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 10;
            const contentWidth = pageWidth - (margin * 2);
            const contentHeight = (canvas.height * contentWidth) / canvas.width;

            let heightLeft = contentHeight;
            let position = margin;

            pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
            heightLeft -= (pageHeight - (margin * 2));

            while (heightLeft > 0) {
                position = heightLeft - contentHeight + margin;
                pdf.addPage();
                pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
                heightLeft -= (pageHeight - (margin * 2));
            }

            const cleanTitle = (docData.documentTitle || activeTab.name || "Documents").replace(/[^a-zA-Z0-9]/g, '_');
            pdf.save(`${cleanTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success("Document PDF downloaded successfully!", { id: "pdf-download" });

        } catch (err) {
            console.warn("Iframe canvas export error, using fallbackDirectJsPDF:", err);
            if (iframe && iframe.parentNode) {
                iframe.parentNode.removeChild(iframe);
            }
            fallbackDirectJsPDF();
        } finally {
            setIsDownloadingPDF(false);
        }
    };

    // Native Browser Print
    const handlePrint = () => {
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

                    {/* INSERTS: Table, Divider, Date Stamp */}
                    <div className="flex items-center gap-1 pl-1">
                        <button
                            type="button"
                            onClick={handleInsertTable}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Insert Table"
                        >
                            <Table className="w-4 h-4" />
                            <span className="hidden md:inline">Table</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => formatDoc('insertHorizontalRule')}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Insert Divider Line"
                        >
                            <Minus className="w-4 h-4" />
                            <span className="hidden md:inline">Line</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleInsertDateStamp}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Insert Timestamp"
                        >
                            <Calendar className="w-4 h-4 text-[#ff6600]" />
                            <span className="hidden md:inline">Date</span>
                        </button>
                    </div>
                </div>

                {/* 4. THE DOCUMENT CANVAS WORKSPACE */}
                <div className={`w-full py-8 px-2 sm:px-6 md:px-12 flex justify-center items-start min-h-[850px] overflow-x-auto ${
                    isDark ? 'bg-[#08090e]' : 'bg-[#eef1f6]'
                }`}>
                    <div className="relative w-full max-w-[850px] min-h-[1100px] bg-white text-slate-900 rounded-sm shadow-2xl p-8 sm:p-14 md:p-16 border border-slate-200 flex flex-col font-sans transition-all duration-200">
                        <div
                            ref={editorRef}
                            contentEditable={isEditing}
                            onInput={handleInput}
                            suppressContentEditableWarning={true}
                            spellCheck={true}
                            className={`w-full h-full min-h-[960px] outline-hidden leading-relaxed text-slate-800 text-sm md:text-base font-normal ${
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
