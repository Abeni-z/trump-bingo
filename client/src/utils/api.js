const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

// ===== TOKEN HELPERS =====

function getToken() {
  return localStorage.getItem('bingo_token');
}

function setToken(token) {
  localStorage.setItem('bingo_token', token);
}

function getRefreshToken() {
  return localStorage.getItem('bingo_refresh_token');
}

function setRefreshToken(token) {
  localStorage.setItem('bingo_refresh_token', token);
}

function clearTokens() {
  localStorage.removeItem('bingo_token');
  localStorage.removeItem('bingo_refresh_token');
  localStorage.removeItem('bingo_shop');
}

// ===== REFRESH LOGIC =====

let isRefreshing = false;         // prevent multiple simultaneous refresh calls
let refreshQueue = [];            // queue requests that came in while refreshing

function processQueue(error, token = null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  refreshQueue = [];
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (!res.ok) throw new Error('Refresh failed');

  const data = await res.json();
  setToken(data.token);
  setRefreshToken(data.refreshToken); // rotate refresh token
  return data.token;
}

// ===== CORE FETCH =====

async function apiFetch(path, options = {}, retry = true) {
  const token = getToken();
  const headers = { ...options.headers };

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Handle deactivated shop
  if (res.status === 403) {
    const data = await res.json();
    if (data.deactivated) {
      clearTokens();
      window.location.hash = '#/login';
      throw new Error('Shop deactivated');
    }
  }

  // Access token expired — try to refresh silently
  if (res.status === 401 && retry) {
    if (isRefreshing) {
      // Another request is already refreshing — wait in queue
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then((newToken) => {
        headers['Authorization'] = `Bearer ${newToken}`;
        return fetch(`${API_BASE}${path}`, { ...options, headers }).then(r => r.json());
      });
    }

    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      processQueue(null, newToken);
      isRefreshing = false;
      // Retry original request with new token — retry=false to avoid infinite loop
      return apiFetch(path, options, false);
    } catch (err) {
      processQueue(err);
      isRefreshing = false;
      // Refresh token also expired — force logout
      clearTokens();
      window.location.hash = '#/login';
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(data.error || 'Request failed');
  }

  return res.json();
}

// ===== AUTH =====

export async function apiLogin(username, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  setToken(data.token);
  setRefreshToken(data.refreshToken);
  localStorage.setItem('bingo_shop', JSON.stringify(data.shop));
  return data;
}

export async function apiRegister(shop_name, username, password, phone) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ shop_name, username, password, phone })
  });
}

export function apiLogout() {
  clearTokens();
}

export function isLoggedIn() {
  return !!getToken();
}

export function getShopInfo() {
  const raw = localStorage.getItem('bingo_shop');
  return raw ? JSON.parse(raw) : null;
}

// ===== SHOP =====

export async function apiGetProfile() {
  return apiFetch('/shop/me');
}

export async function apiClaimPendingCredits() {
  return apiFetch('/shop/claim-credits', { method: 'POST' });
}

// ===== TOP-UP =====

const SCREENSHOT_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;

async function fileToHex(file) {
  if (!file) return { hex: null, mime: null };

  if (!SCREENSHOT_MIMES.includes(file.type)) {
    throw new Error('Only JPG, PNG, or WebP images are allowed');
  }
  if (file.size > SCREENSHOT_MAX_BYTES) {
    throw new Error('Image must be under 5MB');
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return { hex, mime: file.type };
}

export async function apiSubmitTopup(amount, bank, screenshotFile) {
  const { hex, mime } = await fileToHex(screenshotFile);

  return apiFetch('/topup', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      bank,
      screenshot_hex: hex || undefined,
      screenshot_mime: mime || undefined
    })
  });
}

export async function apiGetMyTopups() {
  return apiFetch('/topup/my');
}

export async function apiGetConversionRate() {
  const res = await fetch(`${API_BASE}/conversion-rate`);
  if (!res.ok) throw new Error('Failed to fetch conversion rate');
  return res.json();
}

export { getToken, setToken, clearTokens as clearToken };
