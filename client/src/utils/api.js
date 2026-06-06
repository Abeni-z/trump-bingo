const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

function getToken() {
  return localStorage.getItem('bingo_token');
}

function setToken(token) {
  localStorage.setItem('bingo_token', token);
}

function clearToken() {
  localStorage.removeItem('bingo_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    ...options.headers
  };

  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  // Handle deactivated shop
  if (res.status === 403) {
    const data = await res.json();
    if (data.deactivated) {
      clearToken();
      localStorage.removeItem('bingo_shop');
      window.location.hash = '#/login';
      throw new Error('Shop deactivated');
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
  clearToken();
  localStorage.removeItem('bingo_shop');
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
  return apiFetch('/shop/claim-credits', {
    method: 'POST'
  });
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

export { getToken, setToken, clearToken };
