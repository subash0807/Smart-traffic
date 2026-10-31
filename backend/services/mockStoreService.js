const bcrypt = require('bcryptjs');

/**
 * In-Memory Mock Store for Zero-Setup Deployments & Serverless Fallback
 * Provides pre-seeded realistic Chennai traffic telemetry, signals, sensors, and users
 * when MongoDB Atlas is not yet configured.
 */

const DEMO_JUNCTIONS = [
  {
    location: 'Anna Salai Junction',
    latitude: 13.0604,
    longitude: 80.2496,
    sensorId: 'SEN-ANN-01',
    signalId: 'SIG-ANN-01',
    vehicleCount: 28,
    avgSpeed: 38,
    congestion: 'MODERATE'
  },
  {
    location: 'T. Nagar Panagal Park',
    latitude: 13.0418,
    longitude: 80.2341,
    sensorId: 'SEN-TNG-02',
    signalId: 'SIG-TNG-02',
    vehicleCount: 52,
    avgSpeed: 21,
    congestion: 'HEAVY'
  },
  {
    location: 'Guindy Kathipara Junction',
    latitude: 13.0067,
    longitude: 80.2031,
    sensorId: 'SEN-GND-03',
    signalId: 'SIG-GND-03',
    vehicleCount: 68,
    avgSpeed: 12,
    congestion: 'SEVERE'
  },
  {
    location: 'Velachery Vijayanagar',
    latitude: 12.9759,
    longitude: 80.2212,
    sensorId: 'SEN-VEL-04',
    signalId: 'SIG-VEL-04',
    vehicleCount: 16,
    avgSpeed: 48,
    congestion: 'NORMAL'
  },
  {
    location: 'Tambaram GST Junction',
    latitude: 12.9249,
    longitude: 80.1000,
    sensorId: 'SEN-TAM-05',
    signalId: 'SIG-TAM-05',
    vehicleCount: 34,
    avgSpeed: 32,
    congestion: 'MODERATE'
  },
  {
    location: 'OMR Tidel Park Junction',
    latitude: 12.9897,
    longitude: 80.2476,
    sensorId: 'SEN-OMR-06',
    signalId: 'SIG-OMR-06',
    vehicleCount: 46,
    avgSpeed: 23,
    congestion: 'HEAVY'
  },
  {
    location: 'Koyambedu Roundabout',
    latitude: 13.0694,
    longitude: 80.1948,
    sensorId: 'SEN-KOY-07',
    signalId: 'SIG-KOY-07',
    vehicleCount: 14,
    avgSpeed: 45,
    congestion: 'NORMAL'
  }
];

class MockStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.users = [
      {
        id: 'mock_admin',
        _id: 'mock_admin',
        name: 'System Administrator',
        email: 'admin@stms.gov.in',
        passwordHash: '$2a$10$v0B/0rE3R0wFjZ0gO9mHheZkP97Y3C0k0jU45i678901234567890', // Password123!
        role: 'admin',
        active: true,
        createdAt: new Date()
      },
      {
        id: 'mock_trafficadmin',
        _id: 'mock_trafficadmin',
        name: 'Traffic Administrator',
        email: 'trafficadmin@stms.gov.in',
        passwordHash: '$2a$10$v0B/0rE3R0wFjZ0gO9mHheZkP97Y3C0k0jU45i678901234567890',
        role: 'traffic_admin',
        active: true,
        createdAt: new Date()
      },
      {
        id: 'mock_officer',
        _id: 'mock_officer',
        name: 'Traffic Officer',
        email: 'officer@stms.gov.in',
        passwordHash: '$2a$10$v0B/0rE3R0wFjZ0gO9mHheZkP97Y3C0k0jU45i678901234567890',
        role: 'officer',
        active: true,
        createdAt: new Date()
      }
    ];

    this.signals = DEMO_JUNCTIONS.map((j, idx) => ({
      id: `sig_${idx + 1}`,
      _id: `sig_${idx + 1}`,
      signalId: j.signalId,
      location: j.location,
      latitude: j.latitude,
      longitude: j.longitude,
      status: j.congestion === 'SEVERE' ? 'RED' : (idx % 2 === 0 ? 'GREEN' : 'RED'),
      mode: 'AUTOMATIC',
      duration: j.congestion === 'SEVERE' ? 75 : 45,
      stateHistory: [],
      lastUpdated: new Date()
    }));

    this.sensors = DEMO_JUNCTIONS.map((j, idx) => ({
      id: `sen_${idx + 1}`,
      _id: `sen_${idx + 1}`,
      sensorId: j.sensorId,
      location: j.location,
      type: idx % 2 === 0 ? 'CAMERA' : 'INDUCTIVE_LOOP',
      status: idx === 4 ? 'MAINTENANCE' : 'ONLINE',
      healthPercent: idx === 4 ? 40 : 98,
      lastReceivedAt: new Date()
    }));

    this.traffic = DEMO_JUNCTIONS.map((j, idx) => ({
      id: `tra_${idx + 1}`,
      _id: `tra_${idx + 1}`,
      location: j.location,
      latitude: j.latitude,
      longitude: j.longitude,
      vehicleCount: j.vehicleCount,
      avgSpeed: j.avgSpeed,
      congestion: j.congestion,
      sensorId: j.sensorId,
      timestamp: new Date(),
      dataSource: 'SIMULATED'
    }));

    this.alerts = [
      {
        id: 'alt_1',
        _id: 'alt_1',
        alertId: 'ALT-MOCK-01',
        location: 'Guindy Kathipara Junction',
        type: 'CONGESTION',
        severity: 'CRITICAL',
        message: 'Severe congestion bottleneck detected at Guindy Kathipara Junction. 68 vehicles queued.',
        resolved: false,
        timestamp: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        id: 'alt_2',
        _id: 'alt_2',
        alertId: 'ALT-MOCK-02',
        location: 'Tambaram GST Junction',
        type: 'SENSOR_OFFLINE',
        severity: 'MEDIUM',
        message: 'Sensor SEN-TAM-05 scheduled calibration heartbeat active.',
        resolved: false,
        timestamp: new Date(Date.now() - 20 * 60 * 1000)
      }
    ];

    this.emergencyRequests = [
      {
        id: 'emg_1',
        _id: 'emg_1',
        requestId: 'EMG-DEMO-01',
        vehicleId: 'AMB-108',
        vehicleType: 'AMBULANCE',
        origin: 'Anna Salai Junction',
        destination: 'Guindy Kathipara Junction',
        affectedJunctions: ['Anna Salai Junction', 'T. Nagar Panagal Park', 'Guindy Kathipara Junction'],
        priority: 'CRITICAL',
        status: 'APPROVED',
        recommendedPlan: 'Green Corridor Active: Signals on Anna Salai -> T. Nagar -> Guindy locked to green wave for 90s.',
        approvedBy: 'Traffic Administrator',
        requestedAt: new Date(Date.now() - 15 * 60 * 1000)
      }
    ];

    this.auditLogs = [
      {
        id: 'aud_1',
        _id: 'aud_1',
        userName: 'System Administrator',
        action: 'SYSTEM_STANDALONE_BOOT',
        resourceType: 'System',
        timestamp: new Date()
      }
    ];
  }

  // --- Users ---
  findUserByEmail(email) {
    if (!email) return null;
    const norm = email.toLowerCase().trim();
    return this.users.find(u => u.email.toLowerCase() === norm) || null;
  }

  findUserById(id) {
    return this.users.find(u => u.id === id || u._id === id) || null;
  }

  addUser(userData) {
    const newUser = {
      id: `usr_${Date.now()}`,
      _id: `usr_${Date.now()}`,
      active: true,
      createdAt: new Date(),
      ...userData
    };
    this.users.push(newUser);
    return newUser;
  }

  // --- Traffic ---
  getLatestJunctions() {
    return this.traffic;
  }

  getTrafficRecords(limit = 20) {
    return this.traffic.slice(0, limit);
  }

  addTrafficRecord(record) {
    const newRecord = {
      id: `tra_${Date.now()}`,
      _id: `tra_${Date.now()}`,
      timestamp: new Date(),
      ...record
    };
    this.traffic.unshift(newRecord);

    // Update corresponding junction snapshot
    const junctionIdx = this.traffic.findIndex(t => t.location === record.location);
    if (junctionIdx >= 0) {
      this.traffic[junctionIdx] = newRecord;
    }
    return newRecord;
  }

  // --- Signals ---
  getSignals() {
    return this.signals;
  }

  getSignalById(id) {
    return this.signals.find(s => s.id === id || s._id === id || s.signalId === id) || null;
  }

  updateSignal(id, updates, changedBy = 'Operator') {
    const signal = this.getSignalById(id);
    if (!signal) return null;

    if (updates.status && updates.status !== signal.status) {
      signal.stateHistory.push({
        previousStatus: signal.status,
        newStatus: updates.status,
        changedBy,
        timestamp: new Date()
      });
      signal.status = updates.status;
    }

    if (updates.mode) signal.mode = updates.mode;
    if (updates.duration) signal.duration = Number(updates.duration);
    signal.lastUpdated = new Date();
    return signal;
  }

  // --- Sensors ---
  getSensors() {
    return this.sensors;
  }

  getSensorById(id) {
    return this.sensors.find(s => s.id === id || s._id === id || s.sensorId === id) || null;
  }

  updateSensor(id, updates) {
    const sensor = this.getSensorById(id);
    if (!sensor) return null;
    Object.assign(sensor, updates);
    sensor.lastReceivedAt = new Date();
    return sensor;
  }

  // --- Alerts ---
  getAlerts() {
    return this.alerts;
  }

  acknowledgeAlert(id) {
    const alert = this.alerts.find(a => a.id === id || a._id === id || a.alertId === id);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date();
    }
    return alert;
  }

  resolveAlert(id) {
    const alert = this.alerts.find(a => a.id === id || a._id === id || a.alertId === id);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
    }
    return alert;
  }

  // --- Emergency ---
  getEmergencyRequests() {
    return this.emergencyRequests;
  }

  addEmergencyRequest(reqData) {
    const newReq = {
      id: `emg_${Date.now()}`,
      _id: `emg_${Date.now()}`,
      requestId: `EMG-${Math.floor(1000 + Math.random() * 9000)}`,
      requestedAt: new Date(),
      status: 'APPROVED',
      ...reqData
    };
    this.emergencyRequests.unshift(newReq);
    return newReq;
  }

  updateEmergencyRequest(id, updates) {
    const req = this.emergencyRequests.find(r => r.id === id || r._id === id || r.requestId === id);
    if (req) {
      Object.assign(req, updates);
    }
    return req;
  }
}

const mockStore = new MockStore();

module.exports = {
  mockStore,
  DEMO_JUNCTIONS
};

