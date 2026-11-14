export const RACKINGS_UNIT_STORAGE_KEY = 'oneinventory_unit_calculator_records_v1';

export const DEFAULT_UNIT_RECORDS = [
    {
        id: 'unit-bodega-blue-orange-4l',
        unitName: 'Bodega Racks Frame Set Standard BLUE + ORANGE (4 Layer)',
        segment: 'BODEGA RACKS',
        description: 'Bodega Racks Frame Set Standard BLUE + ORANGE (4 Layer)',
        uom: 'UNIT',
        createdAt: '2026-10-21T04:00:00.000Z',
        components: [
            {
                id: 'c-b-bo-1',
                materialId: '6a6db426778d106c83bfc935',
                role: 'Steel Decking "BLUE+ORANGE" -(New Stock)',
                searchHint: 'decking',
                divisor: 8,
                pcsPerUnit: 8,
                uom: 'PCS',
                dimension: 'L: 670mm | D: 560mm'
            },
            {
                id: 'c-b-bo-2',
                materialId: '6a6db884778d106c83bfcbc7',
                role: 'Step Beam "ORANGE"-',
                searchHint: 'beam',
                divisor: 8,
                pcsPerUnit: 8,
                uom: 'PCS',
                dimension: 'L: 1340.5mm | P: 60mm'
            },
            {
                id: 'c-b-bo-3',
                materialId: '6a6dae6d778d106c83bfc5f1',
                role: 'Upright Frame "BLUE" -',
                searchHint: 'upright',
                divisor: 1,
                pcsPerUnit: 1,
                uom: 'UNITS',
                dimension: 'H: 2000mm'
            }
        ]
    },
    {
        id: 'unit-bodega-black-4l',
        unitName: 'Bodega Racks Frame Set Standard Black (4 Layer)',
        segment: 'BODEGA RACKS',
        description: 'Bodega Racks Frame Set Standard Black (4 Layer)',
        uom: 'UNIT',
        createdAt: '2026-10-21T04:01:00.000Z',
        components: [
            {
                id: 'c-b-bk-1',
                materialId: '6a6db79b778d106c83bfcb0d',
                role: 'Step Beam "BLACK"- satndard',
                searchHint: 'beam',
                divisor: 8,
                pcsPerUnit: 8,
                uom: 'PCS',
                dimension: 'L: 1840.5mm | P: 60mm'
            },
            {
                id: 'c-b-bk-2',
                materialId: '6a6db35e778d106c83bfc890',
                role: 'Steel Decking BLACK+BLACK -(New Stock)',
                searchHint: 'decking',
                divisor: 8,
                pcsPerUnit: 8,
                uom: 'PCS',
                dimension: 'L: 920mm | D: 560mm'
            },
            {
                id: 'c-b-bk-3',
                materialId: '6a6daf32778d106c83bfc64f',
                role: 'Upright Frame "BLACK" -',
                searchHint: 'upright',
                divisor: 1,
                pcsPerUnit: 1,
                uom: 'UNITS',
                dimension: 'H: 2000mm'
            }
        ]
    },
    {
        id: 'unit-bodega-gray-4l',
        unitName: 'Bodega Racks Frame Set Standard Gray (4 Layer)',
        segment: 'BODEGA RACKS',
        description: 'Bodega Racks Frame Set Standard Gray (4 Layer)',
        uom: 'UNIT',
        createdAt: '2026-10-21T04:02:00.000Z',
        components: [
            {
                id: 'c-b-gy-1',
                materialId: '6a6db6cd778d106c83bfca91',
                role: 'Step Beam "GRAY"-',
                searchHint: 'beam',
                divisor: 8,
                pcsPerUnit: 8,
                uom: 'PCS',
                dimension: 'L: 1840.5mm | P: 60mm'
            },
            {
                id: 'c-b-gy-2',
                materialId: '6a6db2c9778d106c83bfc822',
                role: 'Steel Decking GRAY+GRAY -(New Stock)',
                searchHint: 'decking',
                divisor: 8,
                pcsPerUnit: 8,
                uom: 'PCS',
                dimension: 'L: 920mm | D: 560mm'
            },
            {
                id: 'c-b-gy-3',
                materialId: '6a6dae99778d106c83bfc620',
                role: 'Upright Frame "GRAY" -',
                searchHint: 'upright',
                divisor: 1,
                pcsPerUnit: 1,
                uom: 'UNITS',
                dimension: 'H: 2000mm'
            }
        ]
    },
    {
        id: 'unit-boltless-standard-4l',
        unitName: 'Boltless Frame Set Standard (4 Layer)',
        segment: 'BOLTLESS SHELVINGS',
        description: 'Boltless Frame Set Standard (4 Layer)',
        uom: 'UNIT',
        createdAt: '2026-10-21T04:03:00.000Z',
        components: [
            {
                id: 'c-bt-1',
                materialId: '6a4f14174f85c7add05c8624',
                role: 'Post',
                searchHint: 'post',
                divisor: 1,
                pcsPerUnit: 1,
                uom: 'WRAPS',
                dimension: 'L: 2000mm'
            },
            {
                id: 'c-bt-2',
                materialId: '6a4f2c1b4f85c7add05c8625',
                role: 'Steel Decking w/ bracket',
                searchHint: 'decking',
                divisor: 1,
                pcsPerUnit: 1,
                uom: 'BOXES',
                dimension: 'L: 1200mm | D: 400mm'
            }
        ]
    }
];

export const UNIT_COLOR_OPTIONS = [
    { name: 'Emerald / Green', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800', prefix: '🟢' },
    { name: 'Blue / Indigo', classes: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800', prefix: '🔵' },
    { name: 'Amber / Orange', classes: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800', prefix: '🟡' },
    { name: 'Rose / Red', classes: 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800', prefix: '🔴' },
    { name: 'Orange', classes: 'bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800', prefix: '🟠' },
    { name: 'Purple / Violet', classes: 'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800', prefix: '🟣' },
    { name: 'Slate / Muted Gray', classes: 'bg-slate-50 text-slate-700 border-slate-200/60 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700', prefix: '⚪' },
    { name: 'Cyan / Teal', classes: 'bg-cyan-50 text-cyan-700 border-cyan-200/60 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800', prefix: '🌐' }
];

export const BASE_API_URL = import.meta.env.MODE === 'production'
    ? 'https://upright-inventory.onrender.com/api'
    : 'http://localhost:5000/api';

export const monthsList = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' }
];

export const reportModules = [
    { id: 'raw-materials', label: 'Rackings' },
    { id: 'rackings-unit', label: 'Rackings Unit' },
    { id: 'supplies', label: 'Tools & Equipments' },
    { id: 'consumables', label: 'Consumables' },
];

