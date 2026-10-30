const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Traffic = require('../models/Traffic');
const Signal = require('../models/Signal');
const Vehicle = require('../models/Vehicle');
const Sensor = require('../models/Sensor');
const CongestionEvent = require('../models/CongestionEvent');
const Alert = require('../models/Alert');
const EmergencyRequest = require('../models/EmergencyRequest');
const TrafficReport = require('../models/TrafficReport');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const db = require('../config/db');

// Load environment variables if running directly
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

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

async function seedAllData() {
  logger.info('Commencing STMS demonstration database seed...');

  // 1. Seed Demo Users
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const usersData = [
    {
      name: 'System Administrator',
      email: 'admin@stms.gov.in',
      passwordHash,
      role: 'admin',
      active: true
    },
    {
      name: 'Traffic Administrator',
      email: 'trafficadmin@stms.gov.in',
      passwordHash,
      role: 'traffic_admin',
      active: true
    },
    {
      name: 'Traffic Officer',
      email: 'officer@stms.gov.in',
      passwordHash,
      role: 'officer',
      active: true
    }
  ];

  await User.deleteMany({});
  const createdUsers = await User.insertMany(usersData);
  logger.success(`Seeded ${createdUsers.length} role-based demo user accounts.`);

  // 2. Clear old operational collections for clean demo state
  await Promise.all([
    Traffic.deleteMany({}),
    Signal.deleteMany({}),
    Sensor.deleteMany({}),
    Vehicle.deleteMany({}),
    CongestionEvent.deleteMany({}),
    Alert.deleteMany({}),
    EmergencyRequest.deleteMany({}),
    TrafficReport.deleteMany({}),
    AuditLog.deleteMany({})
  ]);

  // 3. Seed Sensors
  const sensorsData = DEMO_JUNCTIONS.map((j, idx) => ({
    sensorId: j.sensorId,
    location: j.location,
    type: idx % 2 === 0 ? 'CAMERA' : 'INDUCTIVE_LOOP',
    status: idx === 4 ? 'MAINTENANCE' : 'ONLINE',
    lastReceivedAt: new Date()
  }));
  await Sensor.insertMany(sensorsData);

  // 4. Seed Signals
  const signalsData = DEMO_JUNCTIONS.map((j, idx) => ({
    signalId: j.signalId,
    location: j.location,
    latitude: j.latitude,
    longitude: j.longitude,
    status: j.congestion === 'SEVERE' ? 'RED' : (idx % 2 === 0 ? 'GREEN' : 'RED'),
    mode: 'AUTOMATIC',
    duration: j.congestion === 'SEVERE' ? 75 : 45,
    lastUpdated: new Date()
  }));
  await Signal.insertMany(signalsData);

  // 5. Seed Traffic Records (including historical readings over past 6 hours for charts)
  const trafficRecords = [];
  const now = Date.now();

  DEMO_JUNCTIONS.forEach((j) => {
    // Current snapshot
    trafficRecords.push({
      location: j.location,
      latitude: j.latitude,
      longitude: j.longitude,
      vehicleCount: j.vehicleCount,
      avgSpeed: j.avgSpeed,
      congestion: j.congestion,
      sensorId: j.sensorId,
      timestamp: new Date(now),
      dataSource: 'SIMULATED'
    });

    // Generate 6 historical hourly points for trend charts
    for (let h = 1; h <= 6; h++) {
      const historicalTime = new Date(now - h * 60 * 60 * 1000);
      const variance = (h % 2 === 0 ? 1 : -1) * (h * 4);
      const histCount = Math.max(5, j.vehicleCount + variance);
      const histSpeed = Math.max(8, j.avgSpeed - (variance * 0.4));
      let histCongestion = 'NORMAL';
      if (histCount >= 60 || histSpeed < 15) histCongestion = 'SEVERE';
      else if (histCount >= 40 || histSpeed < 25) histCongestion = 'HEAVY';
      else if (histCount >= 20 || histSpeed <= 40) histCongestion = 'MODERATE';

      trafficRecords.push({
        location: j.location,
        latitude: j.latitude,
        longitude: j.longitude,
        vehicleCount: Math.round(histCount),
        avgSpeed: Math.round(histSpeed),
        congestion: histCongestion,
        sensorId: j.sensorId,
        timestamp: historicalTime,
        dataSource: 'SIMULATED'
      });
    }
  });
  await Traffic.insertMany(trafficRecords);

  // 6. Seed Vehicles (including Emergency fleet)
  const vehiclesData = [
    {
      vehicleId: 'AMB-108',
      type: 'AMBULANCE',
      location: 'Anna Salai Junction',
      destination: 'Guindy Kathipara Junction',
      priority: 'EMERGENCY',
      status: 'EN_ROUTE',
      dataSource: 'SIMULATED'
    },
    {
      vehicleId: 'FIR-101',
      type: 'FIRE_ENGINE',
      location: 'T. Nagar Panagal Park',
      destination: 'Tambaram GST Junction',
      priority: 'EMERGENCY',
      status: 'IDLE',
      dataSource: 'SIMULATED'
    },
    {
      vehicleId: 'POL-100',
      type: 'POLICE',
      location: 'OMR Tidel Park Junction',
      destination: 'Velachery Vijayanagar',
      priority: 'HIGH',
      status: 'ACTIVE',
      dataSource: 'SIMULATED'
    },
    {
      vehicleId: 'BUS-TN-09-5432',
      type: 'BUS',
      location: 'Koyambedu Roundabout',
      destination: 'Tambaram GST Junction',
      priority: 'NORMAL',
      status: 'ACTIVE',
      dataSource: 'SIMULATED'
    }
  ];
  await Vehicle.insertMany(vehiclesData);

  // 7. Seed Congestion Events
  const eventsData = [
    {
      location: 'Guindy Kathipara Junction',
      congestionLevel: 'SEVERE',
      vehicleCount: 68,
      avgSpeed: 12,
      description: 'Severe congestion detected: 68 vehicles, avg speed 12 km/h near Kathipara overpass.',
      status: 'ACTIVE',
      timestamp: new Date()
    },
    {
      location: 'T. Nagar Panagal Park',
      congestionLevel: 'HEAVY',
      vehicleCount: 52,
      avgSpeed: 21,
      description: 'Heavy congestion building: 52 vehicles, avg speed 21 km/h near commercial hub.',
      status: 'ACTIVE',
      timestamp: new Date()
    }
  ];
  await CongestionEvent.insertMany(eventsData);

  // 8. Seed Alerts
  const alertsData = [
    {
      alertId: 'ALT-10001',
      type: 'SEVERE_CONGESTION',
      message: 'Severe congestion at Guindy Kathipara: 68 vehicles queuing, speed dropped to 12 km/h.',
      location: 'Guindy Kathipara Junction',
      priority: 'CRITICAL',
      status: 'NEW',
      timestamp: new Date()
    },
    {
      alertId: 'ALT-10002',
      type: 'HEAVY_CONGESTION',
      message: 'Heavy traffic volume detected around T. Nagar Panagal Park.',
      location: 'T. Nagar Panagal Park',
      priority: 'HIGH',
      status: 'ACKNOWLEDGED',
      acknowledgedBy: 'Traffic Officer',
      timestamp: new Date(Date.now() - 25 * 60 * 1000)
    },
    {
      alertId: 'ALT-10003',
      type: 'EMERGENCY_REQUEST',
      message: 'Emergency priority corridor requested for Ambulance AMB-108 towards Guindy Kathipara.',
      location: 'Anna Salai Junction',
      priority: 'CRITICAL',
      status: 'NEW',
      timestamp: new Date(Date.now() - 8 * 60 * 1000)
    }
  ];
  await Alert.insertMany(alertsData);

  // 9. Seed Emergency Request
  const emergencyReq = new EmergencyRequest({
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
  });
  await emergencyReq.save();

  // 10. Seed Initial Audit Log
  const initialAudit = new AuditLog({
    userId: createdUsers[0]._id.toString(),
    userName: createdUsers[0].name,
    action: 'SYSTEM_INITIALIZATION_AND_SEED',
    resourceType: 'System',
    resourceId: 'STMS-ROOT',
    newValue: { status: 'Database seeded with Chennai demonstration profile' },
    ipAddress: '127.0.0.1'
  });
  await initialAudit.save();

  const summary = {
    users: createdUsers.length,
    junctions: DEMO_JUNCTIONS.length,
    trafficRecords: trafficRecords.length,
    signals: signalsData.length,
    sensors: sensorsData.length,
    vehicles: vehiclesData.length,
    alerts: alertsData.length,
    emergencyRequests: 1
  };

  logger.success('Database seeded successfully!', JSON.stringify(summary));
  return summary;
}

// Standalone execution handler
if (require.main === module) {
  (async () => {
    try {
      await db.connectDB();
      await seedAllData();
      await db.disconnectDB();
      process.exit(0);
    } catch (err) {
      logger.error('Failed to seed database:', err);
      process.exit(1);
    }
  })();
}

module.exports = {
  seedAllData,
  DEMO_JUNCTIONS
};
