/**
 * STMS - Centralized API Client & UI Notification Helpers
 */

const isLocalDevelopmentHost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
const API_BASE = window.STMS_API_BASE || localStorage.getItem('stms_custom_api') || (
  isLocalDevelopmentHost && window.location.port !== '5000'
    ? 'http://localhost:5000/api'
    : '/api'
);

const api = {
  getToken() {
    return localStorage.getItem('stms_token') || sessionStorage.getItem('stms_token') || null;
  },

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const config = {
      ...options,
      headers: this.getHeaders(options.headers)
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized
      if (response.status === 401) {
        if (!window.location.pathname.includes('login.html')) {
          localStorage.removeItem('stms_token');
          sessionStorage.removeItem('stms_token');
          localStorage.removeItem('stms_user');
          window.location.href = '/login.html';
        }
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `Request failed with status ${response.status}`);
        }
        return data;
      } else if (contentType && contentType.includes('text/csv')) {
        return await response.blob();
      } else {
        const text = await response.text();
        return { success: response.ok, data: text };
      }
    } catch (err) {
      console.error(`API Error [${options.method || 'GET'} ${url}]:`, err);
      throw err;
    }
  },

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  },

  post(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });
  },

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
};

/**
 * Toast Notification Utility
 */
function showToast(message, type = 'info', durationMs = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    emergency: '🚨',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span style="font-weight: bold; font-size: 1.1rem;">${iconMap[type] || 'ℹ'}</span>
    <div style="flex: 1;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}

/**
 * HTML Escaping Utility for XSS Prevention
 */
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
window.escapeHtml = escapeHtml;


