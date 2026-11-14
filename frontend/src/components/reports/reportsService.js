import axios from 'axios';
import { BASE_API_URL, RACKINGS_UNIT_STORAGE_KEY, DEFAULT_UNIT_RECORDS } from './reportsConstants';

export const getAuthConfig = () => {
    const token = localStorage.getItem("token");
    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

export const fetchAllReportData = async () => {
    const config = getAuthConfig();
    const [resRaw, resSupp, resInbound, resWIP, resSuppMove, resPL, resCons, resConsTx] = await Promise.all([
        axios.get(`${BASE_API_URL}/raw-materials`, config).catch(() => null),
        axios.get(`${BASE_API_URL}/supplies`, config).catch(() => null),
        axios.get(`${BASE_API_URL}/purchase-orders`, config).catch(() => null),
        axios.get(`${BASE_API_URL}/conversions`, config).catch(() => null),
        axios.get(`${BASE_API_URL}/supplies-movements`, config).catch(() => null),
        axios.get(`${BASE_API_URL}/packing-lists`, config).catch(() => null),
        axios.get(`${BASE_API_URL}/consumables?all=true`, config).catch(() => null),
        axios.get(`${BASE_API_URL}/consumables/transactions`, config).catch(() => null),
    ]);

    return {
        rawMaterialsData: resRaw?.status === 200 ? resRaw.data : [],
        suppliesData: resSupp?.status === 200 ? resSupp.data : [],
        purchaseOrders: resInbound?.status === 200 ? resInbound.data : [],
        wipConversions: resWIP?.status === 200 ? resWIP.data : [],
        suppliesMovements: resSuppMove?.status === 200 ? resSuppMove.data : [],
        packingLists: resPL?.status === 200 ? resPL.data : [],
        consumablesData: resCons?.status === 200 ? (Array.isArray(resCons.data) ? resCons.data : (resCons.data?.data || [])) : [],
        consumableTransactions: resConsTx?.status === 200 ? (Array.isArray(resConsTx.data) ? resConsTx.data : (resConsTx.data?.data || [])) : []
    };
};

export const isDummyUnitRecordList = (records) => {
    if (!Array.isArray(records) || records.length === 0) return true;
    return records.every(r =>
        r.id === 'unit-rec-1' || r.id === 'unit-rec-2' || r.id === 'unit-rec-3' ||
        (r.components && r.components.every(c => !c.materialId))
    );
};

export const loadInitialUnitRecords = () => {
    try {
        const saved = localStorage.getItem(RACKINGS_UNIT_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0 && !isDummyUnitRecordList(parsed)) {
                return parsed;
            }
        }
    } catch (e) {
        console.error("Failed to load unit records in Reports:", e);
    }
    return DEFAULT_UNIT_RECORDS;
};

export const syncUnitRecordsFromStorageOrBackend = async () => {
    try {
        const saved = localStorage.getItem(RACKINGS_UNIT_STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0 && !isDummyUnitRecordList(parsed)) {
                return parsed;
            }
        }

        // Try fetching from backend
        const res = await axios.get('/api/rackings-unit');
        if (res.data && res.data.success && Array.isArray(res.data.records) && res.data.records.length > 0) {
            if (!isDummyUnitRecordList(res.data.records)) {
                localStorage.setItem(RACKINGS_UNIT_STORAGE_KEY, JSON.stringify(res.data.records));
                return res.data.records;
            }
        }
    } catch (e) {
        console.error("Failed to sync unit records in Reports:", e);
    }
    return DEFAULT_UNIT_RECORDS;
};

