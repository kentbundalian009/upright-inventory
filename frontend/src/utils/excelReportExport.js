import ExcelJS from 'exceljs';

/**
 * UPRIGHT STORAGE SOLUTIONS PH - EXCEL AUDIT REPORT GENERATOR
 * Exports beautifully branded Upright Excel workbooks with official corporate template styling:
 * - Upright Navy (#18174E) & Vibrant Orange (#FF6600) branding
 * - Company header banner & optional logo watermark/badge
 * - Metadata audit ledger summary card (Covered period, timestamp, operator, classification)
 * - Segment-grouped hierarchy banners
 * - Visual status highlighting (Critical, Reorder, Overstock, Healthy, Reserves)
 * - Calibrated auto-fit column widths & accounting totals
 * - Frozen header row with auto-filter & visible grid lines
 */

const UPRIGHT_COLORS = {
    NAVY_PRIMARY: 'FF18174E',
    NAVY_DARK: 'FF0F0E36',
    NAVY_ACCENT: 'FF1E1D5E',
    ORANGE_BRAND: 'FFFF6600',
    ORANGE_LIGHT: 'FFFF8533',
    ICE_BLUE_BG: 'FFEAEFF9',
    SLATE_BG: 'FFF8FAFC',
    BORDER_LIGHT: 'FFE2E8F0',
    BORDER_DARK: 'FFCBD5E1',
    TEXT_MAIN: 'FF1E293B',
    TEXT_MUTED: 'FF64748B',
    WHITE: 'FFFFFFFF',

    // Status colors
    CRITICAL_BG: 'FFFECDD3',
    CRITICAL_TEXT: 'FF9F1239',
    REORDER_BG: 'FFFED7AA',
    REORDER_TEXT: 'FF78350F',
    OVERSTOCK_BG: 'FFBFDBFE',
    OVERSTOCK_TEXT: 'FF1E3A8A',
    HEALTHY_BG: 'FFA7F3D0',
    HEALTHY_TEXT: 'FF065F46',
    RESERVE_BG: 'FFFEF3C7',
    RESERVE_TEXT: 'FFB45309',
};

// Subtle border helper
const cellBorder = {
    top: { style: 'thin', color: { argb: UPRIGHT_COLORS.BORDER_LIGHT } },
    left: { style: 'thin', color: { argb: UPRIGHT_COLORS.BORDER_LIGHT } },
    bottom: { style: 'thin', color: { argb: UPRIGHT_COLORS.BORDER_LIGHT } },
    right: { style: 'thin', color: { argb: UPRIGHT_COLORS.BORDER_LIGHT } }
};

// Double bottom accounting border
const accountingTotalBorder = {
    top: { style: 'thin', color: { argb: UPRIGHT_COLORS.BORDER_DARK } },
    left: { style: 'thin', color: { argb: UPRIGHT_COLORS.BORDER_DARK } },
    bottom: { style: 'double', color: { argb: UPRIGHT_COLORS.NAVY_PRIMARY } },
    right: { style: 'thin', color: { argb: UPRIGHT_COLORS.BORDER_DARK } }
};

export const exportUprightAuditLedgerExcel = async ({
    activeModule = 'raw-materials',
    titleModule = 'Rackings',
    targetMonthLabel = 'Month',
    currentYearStr = new Date().getFullYear().toString(),
    formattedDate = new Date().toLocaleString(),
    exportData = [],
    rawMaterialsData = [],
    isRackings = true,
    isInventoryOnly = false,
    showAcquisitionCost = false,
    showZeroOnly = false,
    viewMode = 'detailed',
    formatDimension = (d) => d || '—',
    getCleanItemDescription = (desc) => desc || '',
    getItemConditions = () => [],
    discrepancyLogs = []
}) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ONEINVENTORY - Upright Storage Solutions PH';
    workbook.lastModifiedBy = 'Upright Storage Solutions PH';
    workbook.created = new Date();
    workbook.modified = new Date();

    const isAcquisitionReport = isRackings && showAcquisitionCost;
    const isDiscrepancy = activeModule === 'discrepancy';

    // Sheet Name (Max 31 chars in Excel)
    let sheetName = 'Inventory Ledger';
    if (isDiscrepancy) sheetName = 'Discrepancy Audit';
    else if (showZeroOnly) sheetName = 'Zero Qty Audit';
    else if (isInventoryOnly) sheetName = 'Inventory Masterlist';
    else if (isAcquisitionReport) sheetName = 'Valuation & Costs';
    else if (isRackings) sheetName = 'Consolidated Registry';
    else sheetName = `${titleModule.substring(0, 20)} Ledger`;

    const worksheet = workbook.addWorksheet(sheetName, {
        views: [{ showGridLines: true }]
    });

    // Determine Columns based on Report Type
    let columns = [];
    if (isDiscrepancy) {
        columns = [
            { header: 'Slip / PO No', key: 'slipNo', width: 20 },
            { header: 'Type', key: 'type', width: 16 },
            { header: 'Customer / Recipient', key: 'customer', width: 28 },
            { header: 'Date Voided', key: 'dateVoided', width: 16 },
            { header: 'Voided By', key: 'voidedBy', width: 20 },
            { header: 'Discrepancy / Void Reason', key: 'reason', width: 34 },
            { header: 'Restored Items & Quantities', key: 'restored', width: 38 }
        ];
    } else if (isRackings) {
        if (isInventoryOnly) {
            columns = [
                { header: 'Item Description', key: 'desc', width: 36 },
                { header: 'Segment', key: 'segment', width: 18 },
                { header: 'Dimension', key: 'dimension', width: 22 },
                { header: 'Actual Count', key: 'actualCount', width: 18 },
                { header: 'Reserve Count', key: 'reserveCount', width: 18 },
                { header: 'UOM', key: 'uom', width: 12 }
            ];
        } else if (isAcquisitionReport) {
            columns = [
                { header: 'Item Description', key: 'desc', width: 34 },
                { header: 'Segment', key: 'segment', width: 18 },
                { header: 'Dimension', key: 'dimension', width: 20 },
                { header: 'Actual Count', key: 'actualCount', width: 16 },
                { header: 'Reserve Count', key: 'reserveCount', width: 16 },
                { header: 'UOM', key: 'uom', width: 10 },
                { header: 'Acquisition Cost (PHP)', key: 'acqCost', width: 24 },
                { header: 'Total Value (PHP)', key: 'totalValue', width: 24 }
            ];
        } else {
            // Standard Consolidated Registry
            columns = [
                { header: 'Item Description', key: 'desc', width: 34 },
                { header: 'Segment', key: 'segment', width: 18 },
                { header: 'Dimension', key: 'dimension', width: 20 },
                { header: 'Actual Count', key: 'actualCount', width: 16 },
                { header: 'Reserve Count', key: 'reserveCount', width: 16 },
                { header: 'UOM', key: 'uom', width: 10 },
                { header: 'Inflows (This Month)', key: 'inflows', width: 30 },
                { header: 'Outflows (This Month)', key: 'outflows', width: 30 }
            ];
        }
    } else {
        // Other Modules (Supplies, Finished Goods, Consumables)
        columns = [
            { header: 'Item Description', key: 'desc', width: 36 },
            { header: 'Segment / Category', key: 'segment', width: 22 },
            { header: 'Dimension / Spec', key: 'dimension', width: 22 },
            { header: 'Serial / Code', key: 'serial', width: 20 },
            { header: 'Available Qty', key: 'actualCount', width: 18 },
            { header: 'UOM', key: 'uom', width: 12 }
        ];
    }

    const totalCols = columns.length;
    const endColLetter = String.fromCharCode(65 + totalCols - 1);

    // Apply Column Widths
    worksheet.columns = columns.map(c => ({ key: c.key, width: c.width }));

    // ==========================================
    // 1. BRANDED HEADER BANNER
    // ==========================================
    // Row 1: Orange accent stripe
    const row1 = worksheet.getRow(1);
    row1.height = 6;
    worksheet.mergeCells(`A1:${endColLetter}1`);
    worksheet.getCell('A1').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: UPRIGHT_COLORS.ORANGE_BRAND }
    };

    // Row 2: Company Main Title
    const row2 = worksheet.getRow(2);
    row2.height = 36;
    worksheet.mergeCells(`A2:${endColLetter}2`);
    const cellA2 = worksheet.getCell('A2');
    cellA2.value = 'UPRIGHT STORAGE SOLUTIONS PH';
    cellA2.font = { name: 'Calibri', size: 16, bold: true, color: { argb: UPRIGHT_COLORS.WHITE } };
    cellA2.alignment = { vertical: 'middle', horizontal: 'center' };
    cellA2.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: UPRIGHT_COLORS.NAVY_PRIMARY }
    };

    // Row 3: Report Header Subtitle
    const row3 = worksheet.getRow(3);
    row3.height = 24;
    worksheet.mergeCells(`A3:${endColLetter}3`);
    const cellA3 = worksheet.getCell('A3');
    const reportTitleText = isDiscrepancy
        ? 'DISCREPANCY & VOIDED TRANSACTION LOGS AUDIT REPORT'
        : showZeroOnly
            ? `${titleModule.toUpperCase()} ZERO QUANTITY (OUT OF STOCK) AUDIT REPORT`
            : isInventoryOnly
                ? `${titleModule.toUpperCase()} INVENTORY MASTERLIST REPORT`
                : isAcquisitionReport
                    ? `${titleModule.toUpperCase()} ACQUISITION COST & INVENTORY VALUATION REPORT`
                    : `${titleModule.toUpperCase()} CONSOLIDATED REGISTRY REPORT`;

    cellA3.value = reportTitleText;
    cellA3.font = { name: 'Calibri', size: 11, bold: true, color: { argb: UPRIGHT_COLORS.ORANGE_LIGHT } };
    cellA3.alignment = { vertical: 'middle', horizontal: 'center' };
    cellA3.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: UPRIGHT_COLORS.NAVY_ACCENT }
    };

    // Row 4: Tagline / Security Classification
    const row4 = worksheet.getRow(4);
    row4.height = 18;
    worksheet.mergeCells(`A4:${endColLetter}4`);
    const cellA4 = worksheet.getCell('A4');
    cellA4.value = `Material Flow Logistics & Audit Trail Control Registry  |  Covered: ${targetMonthLabel} ${currentYearStr}  |  Generated: ${formattedDate}`;
    cellA4.font = { name: 'Calibri', size: 8.5, italic: true, color: { argb: 'FFD7DCF5' } };
    cellA4.alignment = { vertical: 'middle', horizontal: 'center' };
    cellA4.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: UPRIGHT_COLORS.NAVY_PRIMARY }
    };

    // Optional: Try adding logo image if accessible
    try {
        const logoResp = await fetch('/upright.png');
        if (logoResp.ok) {
            const logoBlob = await logoResp.blob();
            const logoBuffer = await logoBlob.arrayBuffer();
            const logoId = workbook.addImage({
                buffer: logoBuffer,
                extension: 'png'
            });
            worksheet.addImage(logoId, {
                tl: { col: 0.1, row: 1.1 },
                ext: { width: 90, height: 32 }
            });
        }
    } catch {
        // Safe to ignore if logo is omitted
    }

    // Row 5: Blank spacer
    worksheet.getRow(5).height = 8;

    // ==========================================
    // 2. AUDIT METADATA CARD (Rows 6-8)
    // ==========================================
    const metaBoxFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: UPRIGHT_COLORS.SLATE_BG }
    };

    const setupMetaRow = (rowNum, label1, val1, label2, val2, val1Color = UPRIGHT_COLORS.NAVY_PRIMARY, val2Color = UPRIGHT_COLORS.TEXT_MAIN) => {
        const row = worksheet.getRow(rowNum);
        row.height = 20;

        // Col A: Label 1
        const cA = worksheet.getCell(`A${rowNum}`);
        cA.value = label1;
        cA.font = { name: 'Calibri', size: 9, bold: true, color: { argb: UPRIGHT_COLORS.TEXT_MUTED } };
        cA.alignment = { vertical: 'middle', horizontal: 'left' };
        cA.fill = metaBoxFill;
        cA.border = { top: cellBorder.top, bottom: cellBorder.bottom, left: cellBorder.left };

        // Col B to C: Value 1
        worksheet.mergeCells(`B${rowNum}:C${rowNum}`);
        const cB = worksheet.getCell(`B${rowNum}`);
        cB.value = val1;
        cB.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: val1Color } };
        cB.alignment = { vertical: 'middle', horizontal: 'left' };
        cB.fill = metaBoxFill;
        cB.border = { top: cellBorder.top, bottom: cellBorder.bottom };

        // Middle cols fill
        for (let i = 4; i < totalCols - 1; i++) {
            const colL = String.fromCharCode(65 + i - 1);
            if (colL !== 'D' && colL !== 'E') continue;
        }

        // Col D/E: Label 2
        const midColIdx = Math.max(4, Math.floor(totalCols / 2) + 1);
        const midColLetter = String.fromCharCode(65 + midColIdx - 1);
        const cMid = worksheet.getCell(`${midColLetter}${rowNum}`);
        cMid.value = label2;
        cMid.font = { name: 'Calibri', size: 9, bold: true, color: { argb: UPRIGHT_COLORS.TEXT_MUTED } };
        cMid.alignment = { vertical: 'middle', horizontal: 'left' };
        cMid.fill = metaBoxFill;
        cMid.border = { top: cellBorder.top, bottom: cellBorder.bottom };

        // Remaining Col to End: Value 2
        const nextColLetter = String.fromCharCode(65 + midColIdx);
        if (midColIdx < totalCols) {
            worksheet.mergeCells(`${nextColLetter}${rowNum}:${endColLetter}${rowNum}`);
            const cEnd = worksheet.getCell(`${nextColLetter}${rowNum}`);
            cEnd.value = val2;
            cEnd.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: val2Color } };
            cEnd.alignment = { vertical: 'middle', horizontal: 'left' };
            cEnd.fill = metaBoxFill;
            cEnd.border = { top: cellBorder.top, bottom: cellBorder.bottom, right: cellBorder.right };
        }
    };

    setupMetaRow(
        6,
        'Module Registry:',
        `${titleModule} ${showZeroOnly ? '(Zero Quantity Audit)' : 'Inventory'}`,
        'Date Generated:',
        formattedDate,
        UPRIGHT_COLORS.NAVY_PRIMARY,
        UPRIGHT_COLORS.TEXT_MAIN
    );

    setupMetaRow(
        7,
        'Covered Period:',
        `${targetMonthLabel} ${currentYearStr}`,
        'Total Items Listed:',
        `${exportData.length} Active Records`,
        UPRIGHT_COLORS.ORANGE_BRAND,
        UPRIGHT_COLORS.TEXT_MAIN
    );

    setupMetaRow(
        8,
        'Security Class:',
        'CONFIDENTIAL AUDIT LEDGER',
        'System Identifier:',
        'ONEINVENTORY - UPRIGHT PH',
        'FF059669', // Emerald
        UPRIGHT_COLORS.TEXT_MUTED
    );

    // Row 9: Blank spacer
    worksheet.getRow(9).height = 10;

    // ==========================================
    // 3. TABLE COLUMN HEADERS (Row 10)
    // ==========================================
    const row10 = worksheet.getRow(10);
    row10.height = 30;

    columns.forEach((col, idx) => {
        const colLetter = String.fromCharCode(65 + idx);
        const cell = worksheet.getCell(`${colLetter}10`);
        cell.value = col.header.toUpperCase();
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: UPRIGHT_COLORS.WHITE } };
        cell.alignment = {
            vertical: 'middle',
            horizontal: (col.key === 'desc' || col.key === 'customer' || col.key === 'reason' || col.key === 'inflows' || col.key === 'outflows' || col.key === 'restored')
                ? 'left'
                : (col.key.includes('Cost') || col.key.includes('Value')) ? 'right' : 'center',
            wrapText: true
        };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: UPRIGHT_COLORS.NAVY_PRIMARY }
        };
        cell.border = {
            top: { style: 'thin', color: { argb: UPRIGHT_COLORS.NAVY_DARK } },
            left: { style: 'thin', color: { argb: UPRIGHT_COLORS.NAVY_ACCENT } },
            bottom: { style: 'medium', color: { argb: UPRIGHT_COLORS.ORANGE_BRAND } },
            right: { style: 'thin', color: { argb: UPRIGHT_COLORS.NAVY_ACCENT } }
        };
    });

    // ==========================================
    // 4. DATA ROWS INSERTION
    // ==========================================
    let currentRowIndex = 11;

    if (isDiscrepancy) {
        // Discrepancy rows
        discrepancyLogs.forEach((log, logIdx) => {
            const row = worksheet.getRow(currentRowIndex);
            row.height = 24;
            const isAlt = logIdx % 2 === 1;
            const rowFill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isAlt ? UPRIGHT_COLORS.SLATE_BG : UPRIGHT_COLORS.WHITE }
            };

            const values = [
                log.slipNo || '—',
                log.transactionType || '—',
                log.customer || '—',
                log.voidedAt || '—',
                log.voidedBy || '—',
                log.voidReason || '—',
                log.itemsRestored || '—'
            ];

            values.forEach((val, vIdx) => {
                const cell = row.getCell(vIdx + 1);
                cell.value = val;
                cell.font = { name: 'Calibri', size: 9, color: { argb: UPRIGHT_COLORS.TEXT_MAIN } };
                cell.alignment = { vertical: 'middle', horizontal: vIdx === 0 || vIdx === 1 ? 'center' : 'left' };
                cell.fill = rowFill;
                cell.border = cellBorder;
            });

            currentRowIndex++;
        });
    } else {
        // Group by Segment (matches PDF & UI standard)
        const groupedData = {};
        exportData.forEach(item => {
            const rawVal = item.Segment;
            const key = rawVal?.trim() || 'STANDARD SEGMENT';
            if (!groupedData[key]) {
                groupedData[key] = [];
            }
            groupedData[key].push(item);
        });

        const sortedSegments = Object.keys(groupedData).sort();

        sortedSegments.forEach(groupName => {
            const itemsInGroup = groupedData[groupName];

            // --- SEGMENT HEADER BANNER ---
            const segRow = worksheet.getRow(currentRowIndex);
            segRow.height = 24;
            worksheet.mergeCells(`A${currentRowIndex}:${endColLetter}${currentRowIndex}`);

            const segCell = worksheet.getCell(`A${currentRowIndex}`);
            segCell.value = `SEGMENT: ${groupName.toUpperCase()}   (${itemsInGroup.length} ${itemsInGroup.length === 1 ? 'ITEM' : 'ITEMS'})`;
            segCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: UPRIGHT_COLORS.NAVY_PRIMARY } };
            segCell.alignment = { vertical: 'middle', horizontal: 'left' };
            segCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: UPRIGHT_COLORS.ICE_BLUE_BG }
            };
            segCell.border = {
                top: { style: 'thin', color: { argb: UPRIGHT_COLORS.BORDER_DARK } },
                left: { style: 'medium', color: { argb: UPRIGHT_COLORS.ORANGE_BRAND } },
                bottom: { style: 'thin', color: { argb: UPRIGHT_COLORS.BORDER_DARK } },
                right: { style: 'thin', color: { argb: UPRIGHT_COLORS.BORDER_DARK } }
            };

            currentRowIndex++;

            // --- ITEMS IN THIS SEGMENT ---
            itemsInGroup.forEach((item, itemIdx) => {
                const row = worksheet.getRow(currentRowIndex);
                const isAlt = itemIdx % 2 === 1;
                const baseFill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: isAlt ? UPRIGHT_COLORS.SLATE_BG : UPRIGHT_COLORS.WHITE }
                };

                const physicalCount = Number(item.ActualCount ?? 0);
                const reserveCount = Number(item.ReserveCount ?? 0);
                const netCount = Math.max(0, physicalCount - reserveCount);
                const formattedDim = isRackings ? formatDimension(item.Dimension) : (item.Dimension || '—');

                // Evaluate Stock Condition
                const crit = item.CriticalAlert !== undefined ? Number(item.CriticalAlert) : 0;
                const reord = item.RestockWarning !== undefined ? Number(item.RestockWarning) : 10;
                const overstk = item.MaxStorage !== undefined ? Number(item.MaxStorage) : 1000;

                let conditionType = 'healthy';
                if (netCount <= crit) conditionType = 'critical';
                else if (netCount <= reord) conditionType = 'reorder';
                else if (netCount > overstk) conditionType = 'overstock';

                // Description formatting
                const cleanDesc = getCleanItemDescription(item.ItemDescription, item.Segment);
                const conditions = getItemConditions(item);
                const descText = conditions.length > 0 ? `${cleanDesc} (${conditions.join(', ')})` : cleanDesc;
                const finalDesc = item.isArchived ? `${descText} (Archived)` : descText;

                // Format logs helper
                const formatLogs = (logs, isOutflow) => {
                    if (!logs || logs.length === 0) return isOutflow ? 'No outflows recorded' : 'No inflows recorded';
                    return logs.map(l => {
                        let typeTag = isOutflow
                            ? ((l.type === 'WIP_OUT' || l.type === 'WIP') ? 'WIP-OUT' : l.type === 'RESERVE' ? 'RESERVE' : 'OUT')
                            : (l.type === 'WIP_IN' ? 'WIP-IN' : l.type === 'WIP_RET' ? 'WIP-RET' : 'IN');
                        const sign = isOutflow ? '-' : '+';
                        const cleanLabel = (l.label || '').length > 20 ? (l.label || '').substring(0, 18) + '…' : (l.label || '');
                        return `${typeTag}: ${sign}${l.qty || 0} | ${cleanLabel} | ${l.date || ''}`;
                    }).join('\n');
                };

                let rowData = [];
                let heightNeeded = 22;

                if (isRackings) {
                    if (isInventoryOnly) {
                        rowData = [
                            { val: finalDesc, align: 'left', bold: true },
                            { val: item.Segment || 'Standard', align: 'left' },
                            { val: formattedDim, align: 'center' },
                            { val: netCount, align: 'center', bold: true, condition: conditionType },
                            { val: reserveCount > 0 ? reserveCount : 0, align: 'center', isReserve: true, hasReserve: reserveCount > 0 },
                            { val: item.UOM || 'PCS', align: 'center' }
                        ];
                    } else if (isAcquisitionReport) {
                        const costVal = Number(item.AcquisitionCost) || 0;
                        const totVal = viewMode === 'detailed'
                            ? (physicalCount * costVal)
                            : (Number(item.TotalAcquisitionCost) || 0);

                        rowData = [
                            { val: finalDesc, align: 'left', bold: true },
                            { val: item.Segment || 'Standard', align: 'left' },
                            { val: formattedDim, align: 'center' },
                            { val: netCount, align: 'center', bold: true, condition: conditionType },
                            { val: reserveCount > 0 ? reserveCount : 0, align: 'center', isReserve: true, hasReserve: reserveCount > 0 },
                            { val: item.UOM || 'PCS', align: 'center' },
                            { val: costVal, align: 'right', isCurrency: true },
                            { val: totVal, align: 'right', isCurrency: true, bold: true }
                        ];
                    } else {
                        // Standard Consolidated
                        const inflowsStr = formatLogs(item.inflows, false);
                        const outflowsStr = formatLogs(item.outflows, true);
                        const linesCount = Math.max((inflowsStr.split('\n').length), (outflowsStr.split('\n').length));
                        if (linesCount > 1) {
                            heightNeeded = Math.min(60, 16 + (linesCount * 12));
                        }

                        rowData = [
                            { val: finalDesc, align: 'left', bold: true },
                            { val: item.Segment || 'Standard', align: 'left' },
                            { val: formattedDim, align: 'center' },
                            { val: netCount, align: 'center', bold: true, condition: conditionType },
                            { val: reserveCount > 0 ? reserveCount : 0, align: 'center', isReserve: true, hasReserve: reserveCount > 0 },
                            { val: item.UOM || 'PCS', align: 'center' },
                            { val: inflowsStr, align: 'left', wrap: true },
                            { val: outflowsStr, align: 'left', wrap: true }
                        ];
                    }
                } else {
                    // Non-rackings
                    rowData = [
                        { val: finalDesc, align: 'left', bold: true },
                        { val: item.Segment || 'Standard', align: 'left' },
                        { val: formattedDim, align: 'center' },
                        { val: item.SerialNo || '—', align: 'center' },
                        { val: netCount, align: 'center', bold: true, condition: conditionType },
                        { val: item.UOM || 'PCS', align: 'center' }
                    ];
                }

                row.height = heightNeeded;

                // Write Cell values & apply status fills
                rowData.forEach((colData, colIndex) => {
                    const cell = row.getCell(colIndex + 1);
                    cell.value = colData.val;
                    cell.border = cellBorder;
                    cell.alignment = {
                        vertical: 'middle',
                        horizontal: colData.align || 'left',
                        wrapText: !!colData.wrap
                    };

                    // Default Font & Fill
                    let cellFill = baseFill;
                    let fontColor = UPRIGHT_COLORS.TEXT_MAIN;
                    let isBold = !!colData.bold;

                    // Condition Badge Fill
                    if (colData.condition) {
                        isBold = true;
                        if (colData.condition === 'critical') {
                            cellFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: UPRIGHT_COLORS.CRITICAL_BG } };
                            fontColor = UPRIGHT_COLORS.CRITICAL_TEXT;
                        } else if (colData.condition === 'reorder') {
                            cellFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: UPRIGHT_COLORS.REORDER_BG } };
                            fontColor = UPRIGHT_COLORS.REORDER_TEXT;
                        } else if (colData.condition === 'overstock') {
                            cellFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: UPRIGHT_COLORS.OVERSTOCK_BG } };
                            fontColor = UPRIGHT_COLORS.OVERSTOCK_TEXT;
                        } else {
                            cellFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: UPRIGHT_COLORS.HEALTHY_BG } };
                            fontColor = UPRIGHT_COLORS.HEALTHY_TEXT;
                        }
                    } else if (colData.isReserve && colData.hasReserve) {
                        isBold = true;
                        cellFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: UPRIGHT_COLORS.RESERVE_BG } };
                        fontColor = UPRIGHT_COLORS.RESERVE_TEXT;
                    }

                    // Currency number formatting
                    if (colData.isCurrency) {
                        cell.numFmt = '"PHP " #,##0.00;[Red]"PHP " -#,##0.00;"PHP " 0.00';
                    } else if (typeof colData.val === 'number') {
                        cell.numFmt = '#,##0';
                    }

                    cell.fill = cellFill;
                    cell.font = {
                        name: 'Calibri',
                        size: 9.5,
                        bold: isBold,
                        color: { argb: fontColor }
                    };
                });

                currentRowIndex++;
            });
        });

        // ==========================================
        // 5. SUMMARY & TOTALS ROW
        // ==========================================
        if (isAcquisitionReport) {
            const selectedTotal = exportData.reduce((sum, item) => {
                const count = Number(item.ActualCount) || 0;
                const cost = Number(item.AcquisitionCost) || 0;
                return sum + (count * cost);
            }, 0);

            const isAllSelected = exportData.length === rawMaterialsData.filter(i => !i.isArchived).length;
            const summaryRow = worksheet.getRow(currentRowIndex);
            summaryRow.height = 26;

            worksheet.mergeCells(`A${currentRowIndex}:F${currentRowIndex}`);
            const leftSumCell = worksheet.getCell(`A${currentRowIndex}`);
            leftSumCell.value = isAllSelected ? 'TOTAL ACQUISITION COST (ALL RACKINGS)' : 'TOTAL ACQUISITION COST (SELECTED ITEMS)';
            leftSumCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: UPRIGHT_COLORS.NAVY_PRIMARY } };
            leftSumCell.alignment = { vertical: 'middle', horizontal: 'right' };
            leftSumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: UPRIGHT_COLORS.ICE_BLUE_BG } };
            leftSumCell.border = accountingTotalBorder;

            worksheet.mergeCells(`G${currentRowIndex}:H${currentRowIndex}`);
            const rightSumCell = worksheet.getCell(`G${currentRowIndex}`);
            rightSumCell.value = selectedTotal;
            rightSumCell.numFmt = '"PHP " #,##0.00';
            rightSumCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFE11D48' } }; // Rose-600
            rightSumCell.alignment = { vertical: 'middle', horizontal: 'right' };
            rightSumCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: UPRIGHT_COLORS.ICE_BLUE_BG } };
            rightSumCell.border = accountingTotalBorder;

            currentRowIndex++;
        } else if (isRackings) {
            // General Quantity Totals
            const totalActual = exportData.reduce((acc, it) => acc + Math.max(0, (Number(it.ActualCount || 0) - Number(it.ReserveCount || 0))), 0);
            const totalReserve = exportData.reduce((acc, it) => acc + (Number(it.ReserveCount || 0)), 0);

            const summaryRow = worksheet.getRow(currentRowIndex);
            summaryRow.height = 24;

            worksheet.mergeCells(`A${currentRowIndex}:C${currentRowIndex}`);
            const lblCell = worksheet.getCell(`A${currentRowIndex}`);
            lblCell.value = 'TOTAL AUDIT QUANTITIES:';
            lblCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: UPRIGHT_COLORS.NAVY_PRIMARY } };
            lblCell.alignment = { vertical: 'middle', horizontal: 'right' };
            lblCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: UPRIGHT_COLORS.ICE_BLUE_BG } };
            lblCell.border = accountingTotalBorder;

            const cActual = worksheet.getCell(`D${currentRowIndex}`);
            cActual.value = totalActual;
            cActual.numFmt = '#,##0';
            cActual.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: UPRIGHT_COLORS.NAVY_PRIMARY } };
            cActual.alignment = { vertical: 'middle', horizontal: 'center' };
            cActual.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: UPRIGHT_COLORS.ICE_BLUE_BG } };
            cActual.border = accountingTotalBorder;

            const cRes = worksheet.getCell(`E${currentRowIndex}`);
            cRes.value = totalReserve;
            cRes.numFmt = '#,##0';
            cRes.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: UPRIGHT_COLORS.RESERVE_TEXT } };
            cRes.alignment = { vertical: 'middle', horizontal: 'center' };
            cRes.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: UPRIGHT_COLORS.ICE_BLUE_BG } };
            cRes.border = accountingTotalBorder;

            if (totalCols > 5) {
                worksheet.mergeCells(`F${currentRowIndex}:${endColLetter}${currentRowIndex}`);
                const cRest = worksheet.getCell(`F${currentRowIndex}`);
                cRest.value = '—';
                cRest.font = { name: 'Calibri', size: 9, color: { argb: UPRIGHT_COLORS.TEXT_MUTED } };
                cRest.alignment = { vertical: 'middle', horizontal: 'center' };
                cRest.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: UPRIGHT_COLORS.ICE_BLUE_BG } };
                cRest.border = accountingTotalBorder;
            }

            currentRowIndex++;
        }
    }

    // ==========================================
    // 6. CONFIDENTIALITY FOOTER
    // ==========================================
    worksheet.getRow(currentRowIndex).height = 10; // Spacer
    currentRowIndex++;

    const footerRow = worksheet.getRow(currentRowIndex);
    footerRow.height = 20;
    worksheet.mergeCells(`A${currentRowIndex}:${endColLetter}${currentRowIndex}`);
    const footerCell = worksheet.getCell(`A${currentRowIndex}`);
    footerCell.value = 'CONFIDENTIAL - UPRIGHT STORAGE SOLUTIONS PH CENTRAL INVENTORY AUDIT LEDGER - FOR AUTHORIZED USE ONLY';
    footerCell.font = { name: 'Calibri', size: 8, italic: true, color: { argb: UPRIGHT_COLORS.TEXT_MUTED } };
    footerCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Freeze panes: Keep header row 10 in view when scrolling!
    worksheet.views = [
        { state: 'frozen', ySplit: 10, activeCell: 'A11', showGridLines: true }
    ];

    // ==========================================
    // 7. WRITE TO BUFFER & TRIGGER BROWSER DOWNLOAD
    // ==========================================
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const activeModuleStr = activeModule ? activeModule.toUpperCase() : 'REGISTRY';
    const fileName = isDiscrepancy
        ? `DISCREPANCY_VOIDED_LOGS_REPORT_${new Date().toISOString().split('T')[0]}.xlsx`
        : showZeroOnly
            ? `${activeModuleStr}_ZERO_QTY_${viewMode.toUpperCase()}_${targetMonthLabel.toUpperCase()}_${currentYearStr}.xlsx`
            : isInventoryOnly
                ? `${activeModuleStr}_INVENTORY_ONLY_ALPHABETICAL_${targetMonthLabel.toUpperCase()}_${currentYearStr}.xlsx`
                : isAcquisitionReport
                    ? `${activeModuleStr}_ACQUISITION_COST_${viewMode.toUpperCase()}_${targetMonthLabel.toUpperCase()}_${currentYearStr}.xlsx`
                    : `${activeModuleStr}_${viewMode.toUpperCase()}_CONSOLIDATED_${targetMonthLabel.toUpperCase()}_${currentYearStr}.xlsx`;

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
    }

    return { fileName, buffer };
};
