import { parseRackDimension } from '../common/RackDimensionCell';
import { UNIT_COLOR_OPTIONS } from './reportsConstants';

export const formatDimensionForPdf = (dimStr) => {
    if (!dimStr || typeof dimStr !== 'string') return '—';
    const parsed = parseRackDimension(dimStr);
    if (parsed.badges && parsed.badges.length > 0) {
        const badgeText = parsed.badges.map(b => `${b.label}: ${b.value}`).join(' | ');
        return parsed.extra ? `${badgeText}\n(${parsed.extra})` : badgeText;
    }
    return dimStr || '—';
};

export const getCleanItemDescription = (desc, segment) => {
    if (!desc) return '';
    let cleaned = desc
        .replace(/\s*\((new|old)\s*stocks?\)/gi, '')
        .replace(/\s*-(new|old)\s*stocks?/gi, '')
        .replace(/\s*\(fabricated\)/gi, '')
        .replace(/\s*-fabricated/gi, '')
        .trim();
    if (segment && segment !== 'N/A') {
        const escaped = segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const stripped = cleaned
            .replace(new RegExp(`\\s*\\(${escaped}\\)`, 'gi'), '')
            .replace(new RegExp(`\\s*-\\s*${escaped}`, 'gi'), '')
            .trim();
        if (stripped) {
            cleaned = stripped;
        }
    }
    return cleaned || desc;
};

export const getItemConditions = (item) => {
    const tags = [];
    const condStr = (item?.Condition || '').toLowerCase().trim();
    const descStr = (item?.ItemDescription || '').toLowerCase();

    if (condStr && condStr !== 'good' && condStr !== 'n/a') {
        if (condStr.includes('old stocks') || condStr.includes('old stock')) tags.push('Old Stocks');
        if (condStr.includes('new stocks') || condStr.includes('new stock')) tags.push('New Stocks');
        if (condStr.includes('fabricated')) tags.push('Fabricated');

        if (tags.length === 0 && item.Condition) {
            tags.push(item.Condition);
        }
    } else {
        if (descStr.includes('(old stocks)') || descStr.includes('(old stock)') || descStr.includes('-old stocks') || descStr.includes('-old stock')) {
            tags.push('Old Stocks');
        }
        if (descStr.includes('(new stocks)') || descStr.includes('(new stock)') || descStr.includes('-new stocks') || descStr.includes('-new stock')) {
            tags.push('New Stocks');
        }
        if (descStr.includes('(fabricated)') || descStr.includes('-fabricated')) {
            tags.push('Fabricated');
        }
    }
    return tags;
};

export const getBackendBaseUrl = () => {
    if (import.meta.env.MODE === 'production') {
        return 'https://upright-inventory.onrender.com';
    }
    if (typeof window !== 'undefined') {
        return `${window.location.protocol}//${window.location.hostname || 'localhost'}:5000`;
    }
    return 'http://localhost:5000';
};

export const getImageSrc = (imageUrl) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) return imageUrl;
    const cleanPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${getBackendBaseUrl()}${cleanPath}`;
};

export const loadImageBase64 = async (url) => {
    if (!url) return null;
    const resolvedUrl = getImageSrc(url);
    if (!resolvedUrl) return null;

    // Fast path: already a data URL
    if (resolvedUrl.startsWith('data:')) {
        return { dataUrl: resolvedUrl, width: 60, height: 60 };
    }

    // Method 1: Fetch as Blob -> FileReader data URL (CORS safe, no canvas tainting)
    try {
        const response = await fetch(resolvedUrl, { mode: 'cors' });
        if (response.ok) {
            const blob = await response.blob();
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
                return { dataUrl };
            }
        }
    } catch {
        // Fallback to Image + Canvas
    }

    // Method 2: HTML Image + Canvas with cache-busting to prevent stale uncredentialed browser cache
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const cacheBuster = resolvedUrl.includes('?')
                ? `${resolvedUrl}&cb=${Date.now()}`
                : `${resolvedUrl}?cb=${Date.now()}`;
            const timer = setTimeout(() => resolve(null), 3500);

            img.onload = () => {
                clearTimeout(timer);
                try {
                    const canvas = document.createElement('canvas');
                    const maxDim = 120;
                    const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
                    canvas.width = Math.max(1, Math.round(img.width * scale));
                    canvas.height = Math.max(1, Math.round(img.height * scale));
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve({
                        dataUrl: canvas.toDataURL('image/jpeg', 0.85),
                        width: canvas.width,
                        height: canvas.height
                    });
                } catch {
                    resolve(null);
                }
            };
            img.onerror = () => {
                clearTimeout(timer);
                resolve(null);
            };
            img.src = cacheBuster;
        } catch {
            resolve(null);
        }
    });
};

export const loadBase64Image = async (url) => {
    if (!url) return null;
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const timer = setTimeout(() => resolve(null), 3000);
            img.onload = () => {
                clearTimeout(timer);
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } catch {
                    resolve(null);
                }
            };
            img.onerror = () => {
                clearTimeout(timer);
                resolve(null);
            };
            img.src = url;
        } catch {
            resolve(null);
        }
    });
};

export const loadWatermarkImage = async (url, opacity = 0.08) => {
    if (!url) return null;
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const timer = setTimeout(() => resolve(null), 3000);
            img.onload = () => {
                clearTimeout(timer);
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.globalAlpha = opacity;
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } catch {
                    resolve(null);
                }
            };
            img.onerror = () => {
                clearTimeout(timer);
                resolve(null);
            };
            img.src = url;
        } catch {
            resolve(null);
        }
    });
};

export const getUserFullName = (fallback = 'INVENTORY PERSONNEL') => {
    try {
        const directFullname = localStorage.getItem('Fullname') || localStorage.getItem('fullname');
        if (directFullname && String(directFullname).trim()) {
            return String(directFullname).trim().toUpperCase();
        }

        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            const userObj = parsed.user || parsed;
            const name = userObj.Fullname ||
                userObj.fullname ||
                userObj.fullName ||
                userObj.name ||
                (userObj.firstName ? `${userObj.firstName} ${userObj.lastName || ''}`.trim() : null) ||
                userObj.Username ||
                userObj.username;
            if (name && String(name).trim()) return String(name).trim().toUpperCase();
        }

        const directUsername = localStorage.getItem('username');
        if (directUsername && String(directUsername).trim()) {
            return String(directUsername).trim().toUpperCase();
        }
    } catch { }
    return fallback;
};

export const getUserRole = () => {
    try {
        const role = localStorage.getItem('SystemRole');
        if (role) return `${role} Personnel`;
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            const userObj = parsed.user || parsed;
            if (userObj.SystemRole || userObj.role) return `${userObj.SystemRole || userObj.role} Personnel`;
        }
    } catch { }
    return 'Inventory Personnel';
};

export const getUnitSegmentStyles = (segment, unitCategories = []) => {
    if (!segment) {
        return {
            classes: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
            prefix: "⚪"
        };
    }
    const cleaned = segment.trim().toUpperCase();
    const index = unitCategories.findIndex(seg => (seg || '').trim().toUpperCase() === cleaned);
    return UNIT_COLOR_OPTIONS[(index !== -1 ? index : 0) % UNIT_COLOR_OPTIONS.length];
};

