const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

function getToken() {
  return localStorage.getItem('bingo_admin_token');
}

export function setToken(token) {
  localStorage.setItem('bingo_admin_token', token);
}

export function clearToken() {
  localStorage.removeItem('bingo_admin_token');
}

export function isAdminLoggedIn() {
  return !!getToken();
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Cannot reach API at ${API_BASE}. Check VITE_API_URL and that Render is running.`);
  }

  if (res.status === 401 || res.status === 403) {
    const data = await res.json().catch(() => ({}));
    if (path.includes('/login')) {
      throw new Error(data.error || 'Invalid credentials');
    }
    clearToken();
    window.location.hash = '#/login';
    throw new Error(data.error || 'Unauthorized');
  }

  if (!res.ok) {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      throw new Error(data.error || `Request failed (${res.status})`);
    } catch (err) {
      if (err.message && !err.message.startsWith('Request failed') && err.message !== 'Unexpected token') {
        throw err;
      }
      throw new Error(
        res.status === 404
          ? `API not found (${API_BASE}). Use https://trump-bingo.onrender.com/api on Vercel.`
          : `Request failed (${res.status}). Check VITE_API_URL and Render logs.`
      );
    }
  }
  return res.json();
}

// Auth
export async function adminLogin(username, password) {
  const data = await apiFetch('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  setToken(data.token);
  return data;
}

export function adminLogout() {
  clearToken();
}

// Stats
export async function getStats() {
  return apiFetch('/admin/stats');
}

// Shops
export async function getShops() {
  return apiFetch('/admin/shops');
}

export async function toggleShop(id) {
  return apiFetch(`/admin/shops/${id}/toggle`, { method: 'PUT' });
}

export async function updateShopBalance(id, balance) {
  return apiFetch(`/admin/shops/${id}/balance`, {
    method: 'PUT',
    body: JSON.stringify({ balance })
  });
}

export async function deleteShop(id) {
  return apiFetch(`/admin/shops/${id}`, { method: 'DELETE' });
}

// Topups
export async function getTopups(status) {
  const query = status ? `?status=${status}` : '';
  return apiFetch(`/admin/topups${query}`);
}

export async function getTopupScreenshot(id) {
  return apiFetch(`/admin/topups/${id}/screenshot`);
}

export async function approveTopup(id, admin_note, credits_override) {
  return apiFetch(`/admin/topups/${id}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ admin_note, credits_override })
  });
}

export async function rejectTopup(id, admin_note) {
  return apiFetch(`/admin/topups/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ admin_note })
  });
}

// Settings
export async function getConversionRate() {
  return apiFetch('/admin/settings/conversion-rate');
}

export async function updateConversionRate(rate) {
  return apiFetch('/admin/settings/conversion-rate', {
    method: 'PUT',
    body: JSON.stringify({ rate })
  });
}
