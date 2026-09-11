import axios from 'axios';

/**
 * Detects 'sharedBy' query parameter on application load and logs the click to backend.
 * Uses sessionStorage to prevent duplicate logging on component re-renders.
 */
export const trackSharedLinkClick = () => {
  try {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const sharedBy = params.get('sharedBy');
    if (!sharedBy || !sharedBy.trim()) return;

    const pageParam = params.get('view') === 'rackings' || params.get('tab') === 'raw-materials' 
      ? 'Rackings (Records)' 
      : 'Rackings (Records)';

    // Deduplicate per browser session & URL query
    const sessionKey = `click_logged_${sharedBy.trim()}_${window.location.pathname}_${window.location.search}`;
    if (sessionStorage.getItem(sessionKey)) {
      return;
    }
    sessionStorage.setItem(sessionKey, 'true');

    // Identify current viewer: prioritize explicit 'viewer' query param, then logged-in user, otherwise 'Anonymous Viewer'
    let openedBy = params.get('viewer') || 'Anonymous Viewer';
    if (openedBy === 'Anonymous Viewer') {
      try {
        const stored = localStorage.getItem('user');
        if (stored) {
          const parsed = JSON.parse(stored);
          openedBy = parsed.Username || parsed.username || parsed.Fullname || 'Viewer';
        } else {
          const fullname = localStorage.getItem('Fullname');
          if (fullname) openedBy = fullname;
        }
      } catch (e) {
        openedBy = 'Anonymous Viewer';
      }
    }

    const API_BASE = import.meta.env.MODE === 'production'
      ? 'https://one-inventory.onrender.com/api'
      : 'http://localhost:5000/api';

    const payload = {
      openedBy: openedBy,
      sharedBy: sharedBy.trim(),
      page: pageParam,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    axios.post(`${API_BASE}/logs/click`, payload)
      .then(() => {
        // Optional dispatch for real-time listeners if any
        window.dispatchEvent(new CustomEvent('sharedLinkClickLogged', { detail: payload }));
      })
      .catch((err) => {
        console.warn('Failed to record shared link click:', err?.response?.data || err.message);
      });
  } catch (err) {
    console.warn('Error in trackSharedLinkClick:', err);
  }
};
