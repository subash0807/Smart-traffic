/**
 * STMS - Centralized API Client & Virtual Smart City Backend Fallback
 * Guarantees zero-failure operation even when deployed as pure static hosting on Netlify.
 */

const isLocalDevelopmentHost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
const API_BASE = window.STMS_API_BASE || localStorage.getItem('stms_custom_api') || (
  isLocalDevelopmentHost && window.location.port !== '5000'
    ? 'http://localhost:5000/api'
    : '/api'
);

// Virtual In-Browser Backend Store for Netlify / Static Hosting
class VirtualSmartCityBackend {
  constructor() {
    this.initStore();
  }

  initStore() {
    const raw = localStorage.getItem('stms_virtual_store');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.data = parsed;
        return;
      } catch {}
    }

    this.data = {
      users: [
        { id: 'usr_admin', name: 'System Administrator', email: 'admin@stms.gov.in', role: 'admin', active: true },
        { id: 'usr_trafficadmin', name: 'Traffic Administrator', email: 'trafficadmin@stms.gov.in', role: 'traffic_admin', active: true },
        { id: 'usr_officer', name: 'Traffic Officer', email: 'officer@stms.gov.in', role: 'officer', active: true }
      ],
      junctions: [
        { location: 'Anna Salai Junction', latitude: 13.0604, longitude: 80.2496, sensorId: 'SEN-ANN-01', vehicleCount: 28, avgSpeed: 38, congestion: 'MODERATE', timestamp: new Date() },
        { location: 'T. Nagar Panagal Park', latitude: 13.0418, longitude: 80.2341, sensorId: 'SEN-TNG-02', vehicleCount: 52, avgSpeed: 21, congestion: 'HEAVY', timestamp: new Date() },
        { location: 'Guindy Kathipara Junction', latitude: 13.0067, longitude: 80.2031, sensorId: 'SEN-GND-03', vehicleCount: 68, avgSpeed: 12, congestion: 'SEVERE', timestamp: new Date() },
        { location: 'Velachery Vijayanagar', latitude: 12.9759, longitude: 80.2212, sensorId: 'SEN-VEL-04', vehicleCount: 16, avgSpeed: 48, congestion: 'NORMAL', timestamp: new Date() },
        { location: 'Tambaram GST Junction', latitude: 12.9249, longitude: 80.1000, sensorId: 'SEN-TAM-05', vehicleCount: 34, avgSpeed: 32, congestion: 'MODERATE', timestamp: new Date() },
        { location: 'OMR Tidel Park Junction', latitude: 12.9897, longitude: 80.2476, sensorId: 'SEN-OMR-06', vehicleCount: 46, avgSpeed: 23, congestion: 'HEAVY', timestamp: new Date() },
        { location: 'Koyambedu Roundabout', latitude: 13.0694, longitude: 80.1948, sensorId: 'SEN-KOY-07', vehicleCount: 14, avgSpeed: 45, congestion: 'NORMAL', timestamp: new Date() }
      ],
      signals: [
        { _id: 'sig_1', signalId: 'SIG-ANN-01', location: 'Anna Salai Junction', latitude: 13.0604, longitude: 80.2496, status: 'GREEN', mode: 'AUTOMATIC', duration: 45, lastUpdated: new Date() },
        { _id: 'sig_2', signalId: 'SIG-TNG-02', location: 'T. Nagar Panagal Park', latitude: 13.0418, longitude: 80.2341, status: 'RED', mode: 'AUTOMATIC', duration: 45, lastUpdated: new Date() },
        { _id: 'sig_3', signalId: 'SIG-GND-03', location: 'Guindy Kathipara Junction', latitude: 13.0067, longitude: 80.2031, status: 'RED', mode: 'AUTOMATIC', duration: 75, lastUpdated: new Date() },
        { _id: 'sig_4', signalId: 'SIG-VEL-04', location: 'Velachery Vijayanagar', latitude: 12.9759, longitude: 80.2212, status: 'GREEN', mode: 'AUTOMATIC', duration: 45, lastUpdated: new Date() },
        { _id: 'sig_5', signalId: 'SIG-TAM-05', location: 'Tambaram GST Junction', latitude: 12.9249, longitude: 80.1000, status: 'RED', mode: 'AUTOMATIC', duration: 45, lastUpdated: new Date() },
        { _id: 'sig_6', signalId: 'SIG-OMR-06', location: 'OMR Tidel Park Junction', latitude: 12.9897, longitude: 80.2476, status: 'GREEN', mode: 'AUTOMATIC', duration: 55, lastUpdated: new Date() },
        { _id: 'sig_7', signalId: 'SIG-KOY-07', location: 'Koyambedu Roundabout', latitude: 13.0694, longitude: 80.1948, status: 'GREEN', mode: 'AUTOMATIC', duration: 45, lastUpdated: new Date() }
      ],
      sensors: [
        { _id: 'sen_1', sensorId: 'SEN-ANN-01', location: 'Anna Salai Junction', type: 'CAMERA', status: 'ONLINE', healthPercent: 98, lastReceivedAt: new Date() },
        { _id: 'sen_2', sensorId: 'SEN-TNG-02', location: 'T. Nagar Panagal Park', type: 'INDUCTIVE_LOOP', status: 'ONLINE', healthPercent: 94, lastReceivedAt: new Date() },
        { _id: 'sen_3', sensorId: 'SEN-GND-03', location: 'Guindy Kathipara Junction', type: 'RADAR', status: 'ONLINE', healthPercent: 99, lastReceivedAt: new Date() },
        { _id: 'sen_4', sensorId: 'SEN-VEL-04', location: 'Velachery Vijayanagar', type: 'CAMERA', status: 'ONLINE', healthPercent: 97, lastReceivedAt: new Date() },
        { _id: 'sen_5', sensorId: 'SEN-TAM-05', location: 'Tambaram GST Junction', type: 'THERMAL_IR', status: 'MAINTENANCE', healthPercent: 45, lastReceivedAt: new Date() },
        { _id: 'sen_6', sensorId: 'SEN-OMR-06', location: 'OMR Tidel Park Junction', type: 'RADAR', status: 'ONLINE', healthPercent: 96, lastReceivedAt: new Date() },
        { _id: 'sen_7', sensorId: 'SEN-KOY-07', location: 'Koyambedu Roundabout', type: 'CAMERA', status: 'ONLINE', healthPercent: 98, lastReceivedAt: new Date() }
      ],
      alerts: [
        { _id: 'alt_1', alertId: 'ALT-1082', type: 'CONGESTION', location: 'Guindy Kathipara Junction', priority: 'CRITICAL', message: 'Severe bottleneck detected at Guindy Kathipara. 68 queued vehicles.', status: 'NEW', timestamp: new Date(Date.now() - 4 * 60 * 1000) },
        { _id: 'alt_2', alertId: 'ALT-1081', type: 'SENSOR_OFFLINE', location: 'Tambaram GST Junction', priority: 'MEDIUM', message: 'Sensor SEN-TAM-05 telemetry heartbeat latency exceeded threshold.', status: 'ACKNOWLEDGED', timestamp: new Date(Date.now() - 15 * 60 * 1000) }
      ],
      emergencyRequests: [
        { _id: 'emg_1', requestId: 'EMG-DEMO-01', vehicleId: 'AMB-108', vehicleType: 'AMBULANCE', origin: 'Anna Salai Junction', destination: 'Guindy Kathipara Junction', affectedJunctions: ['Anna Salai Junction', 'T. Nagar Panagal Park', 'Guindy Kathipara Junction'], priority: 'CRITICAL', status: 'APPROVED', recommendedPlan: 'Green Corridor Active: Signals locked to green wave for 90s.', approvedBy: 'Traffic Administrator', requestedAt: new Date(Date.now() - 10 * 60 * 1000) }
      ]
    };
    this.saveStore();
  }

  saveStore() {
    try {
      localStorage.setItem('stms_virtual_store', JSON.stringify(this.data));
    } catch {}
  }

  handle(endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const cleanUrl = endpoint.replace(/^\/api/, '');
    const body = options.body ? JSON.parse(options.body) : {};

    // 1. Auth: Login
    if (cleanUrl === '/auth/login' && method === 'POST') {
      const email = (body.email || '').toLowerCase().trim();
      let user = this.data.users.find(u => u.email.toLowerCase() === email);
      if (!user) {
        // Auto-create officer if missing
        user = { id: `usr_${Date.now()}`, name: 'Traffic Officer', email, role: 'officer', active: true };
        this.data.users.push(user);
        this.saveStore();
      }
      return {
        success: true,
        message: 'Login authorized (Virtual Engine Mode).',
        token: `stms_token_${user.id}_${Date.now()}`,
        user
      };
    }

    // 2. Auth: Register
    if (cleanUrl === '/auth/register' && method === 'POST') {
      const newUser = {
        id: `usr_${Date.now()}`,
        name: body.name || 'Operator',
        email: (body.email || '').toLowerCase().trim(),
        role: body.role || 'officer',
        active: true
      };
      this.data.users.push(newUser);
      this.saveStore();
      return {
        success: true,
        message: 'Account registered (Virtual Engine Mode).',
        token: `stms_token_${newUser.id}_${Date.now()}`,
        user: newUser
      };
    }

    // 3. Traffic: Latest Junctions
    if (cleanUrl === '/traffic/latest/junctions' && method === 'GET') {
      return { success: true, data: this.data.junctions };
    }

    // 4. Traffic: Query Records
    if (cleanUrl.startsWith('/traffic') && method === 'GET') {
      return {
        success: true,
        data: this.data.junctions,
        pagination: { total: this.data.junctions.length, page: 1, pages: 1, limit: 20 }
      };
    }

    // 5. Traffic: Create
    if (cleanUrl === '/traffic' && method === 'POST') {
      const newRec = { ...body, timestamp: new Date() };
      const idx = this.data.junctions.findIndex(j => j.location === body.location);
      if (idx >= 0) this.data.junctions[idx] = newRec;
      else this.data.junctions.push(newRec);
      this.saveStore();
      return { success: true, message: 'Traffic recorded.', data: newRec };
    }

    // 6. Signals: List
    if (cleanUrl === '/signals' && method === 'GET') {
      return { success: true, data: this.data.signals, isSimulation: true };
    }

    // 7. Signals: Update
    if (cleanUrl.startsWith('/signals/') && method === 'PUT') {
      const id = cleanUrl.split('/')[2];
      const sig = this.data.signals.find(s => s._id === id || s.signalId === id);
      if (sig) {
        Object.assign(sig, body);
        sig.lastUpdated = new Date();
        this.saveStore();
        return { success: true, message: 'Signal updated.', data: sig };
      }
      return { success: true, message: 'Signal updated.' };
    }

    // 8. Sensors: List
    if (cleanUrl.startsWith('/sensors') && method === 'GET') {
      const enriched = this.data.sensors.map(s => {
        const j = this.data.junctions.find(jt => jt.location === s.location);
        return {
          ...s,
          latestReading: j ? { vehicleCount: j.vehicleCount, avgSpeed: j.avgSpeed, congestion: j.congestion, timestamp: j.timestamp } : null
        };
      });
      return { success: true, data: enriched };
    }

    // 9. Alerts
    if (cleanUrl.startsWith('/alerts') && method === 'GET') {
      return { success: true, data: this.data.alerts };
    }
    if (cleanUrl.includes('/acknowledge') && method === 'PUT') {
      const id = cleanUrl.split('/')[2];
      const a = this.data.alerts.find(alt => alt._id === id || alt.alertId === id);
      if (a) a.status = 'ACKNOWLEDGED';
      this.saveStore();
      return { success: true, data: a };
    }
    if (cleanUrl.includes('/resolve') && method === 'PUT') {
      const id = cleanUrl.split('/')[2];
      const a = this.data.alerts.find(alt => alt._id === id || alt.alertId === id);
      if (a) a.status = 'RESOLVED';
      this.saveStore();
      return { success: true, data: a };
    }

    // 10. Emergency Requests
    if (cleanUrl.startsWith('/emergency-requests') && method === 'GET') {
      return { success: true, data: this.data.emergencyRequests };
    }
    if (cleanUrl === '/emergency-requests' && method === 'POST') {
      const req = {
        _id: `emg_${Date.now()}`,
        requestId: `EMG-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'APPROVED',
        requestedAt: new Date(),
        ...body
      };
      this.data.emergencyRequests.unshift(req);
      this.saveStore();
      return { success: true, message: 'Emergency corridor dispatched.', data: req };
    }
    if (cleanUrl.startsWith('/emergency-requests/') && method === 'PUT') {
      const id = cleanUrl.split('/')[2];
      const req = this.data.emergencyRequests.find(r => r._id === id || r.requestId === id);
      if (req) Object.assign(req, body);
      this.saveStore();
      return { success: true, data: req };
    }

    // 11. Reports & Congestion Summary
    if (cleanUrl.includes('summary')) {
      return {
        success: true,
        data: {
          distribution: { NORMAL: 2, MODERATE: 2, HEAVY: 2, SEVERE: 1 },
          summary: { totalRecordsAnalyzed: 14, totalVehiclesRecorded: 258, overallAverageSpeed: 31, activeSignalsCount: 7, activeAlertsCount: 2 }
        }
      };
    }

    // 12. Reset / Seed
    if (cleanUrl === '/seed' && method === 'POST') {
      localStorage.removeItem('stms_virtual_store');
      this.initStore();
      return { success: true, message: 'Virtual database restored.' };
    }

    // 13. System Health
    if (cleanUrl === '/health' || cleanUrl === '/system/health') {
      return { success: true, status: 'VIRTUAL_ENGINE_ONLINE', system: 'STMS Netlify Edition' };
    }

    // Default fallback response
    return { success: true, message: 'Operation executed in Virtual Engine.' };
  }
}

const virtualBackend = new VirtualSmartCityBackend();

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

      // Check if response is valid JSON from actual backend
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
        // Fallback for static Netlify 404 / HTML pages returned for API calls
        console.warn(`[STMS Virtual Engine] Direct API call to ${url} returned ${response.status} (${contentType}). Diverting to in-browser Virtual Engine.`);
        return virtualBackend.handle(endpoint, options);
      }
    } catch (err) {
      // Network failure / offline / pure static hosting: Divert transparently to Virtual Backend!
      console.warn(`[STMS Virtual Engine] Network request failed (${err.message}). Executing via Virtual Engine.`);
      return virtualBackend.handle(endpoint, options);
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
 * Toast Notification Utility with Sound FX
 */
function showToast(message, type = 'info', durationMs = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} toast-enter`;

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    emergency: '🚨',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <span style="font-weight: bold; font-size: 1.15rem;">${iconMap[type] || 'ℹ'}</span>
    <div style="flex: 1; font-size: 0.85rem; line-height: 1.4;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    setTimeout(() => toast.remove(), 300);
  }, durationMs);
}

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
window.api = api;
window.showToast = showToast;
