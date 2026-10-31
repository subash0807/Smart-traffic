const db = require('../config/db');
const AuditLog = require('../models/AuditLog');
const simulationService = require('../services/simulationService');
const seedModule = require('../scripts/seed');
const { mockStore } = require('../services/mockStoreService');

/**
 * Health Check Endpoint
 * GET /api/health
 */
function getHealth(req, res) {
  const dbStatus = db.getDbStatus();

  res.status(200).json({
    success: true,
    system: 'Smart Traffic Management System (STMS)',
    version: '1.0.0',
    status: dbStatus.isConnected ? 'HEALTHY' : 'DEMO_STANDALONE',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || (process.env.VERCEL ? 'production' : 'development'),
    database: {
      status: dbStatus.state,
      connected: dbStatus.isConnected,
      type: dbStatus.connectionType,
      name: dbStatus.name
    },
    simulation: {
      active: simulationService.isSimulationRunning(),
      mode: 'DEMONSTRATION'
    }
  });
}

/**
 * Trigger manual single-step simulation
 * POST /api/simulation/step
 */
async function triggerSimulationStep(req, res, next) {
  try {
    const result = await simulationService.stepSimulation();
    res.status(200).json({
      success: true,
      message: 'Simulation step executed successfully across all junctions.',
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Toggle auto simulation on / off
 * POST /api/simulation/toggle
 */
function toggleSimulation(req, res) {
  const { enabled, intervalMs } = req.body;

  if (enabled === true || (enabled === undefined && !simulationService.isSimulationRunning())) {
    simulationService.startSimulation(intervalMs ? parseInt(intervalMs, 10) : 10000);
  } else {
    simulationService.stopSimulation();
  }

  res.status(200).json({
    success: true,
    message: `Simulation ${simulationService.isSimulationRunning() ? 'started' : 'stopped'}.`,
    isRunning: simulationService.isSimulationRunning()
  });
}

/**
 * Get audit logs (Admins & Traffic Admins)
 * GET /api/audit-logs
 */
async function getAuditLogs(req, res, next) {
  try {
    const { limit = 50 } = req.query;

    if (!db.getDbStatus().isConnected) {
      return res.status(200).json({
        success: true,
        data: [
          {
            userName: 'System Administrator',
            action: 'DEMO_MODE_ACTIVE',
            resourceType: 'System',
            timestamp: new Date()
          }
        ]
      });
    }

    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reset / Seed Database with clean demo data
 * POST /api/seed
 */
async function seedDatabaseEndpoint(req, res, next) {
  try {
    let summary = {};
    if (db.getDbStatus().isConnected) {
      summary = await seedModule.seedAllData();
    } else {
      mockStore.reset();
      summary = {
        users: 3,
        junctions: 7,
        trafficRecords: 7,
        signals: 7,
        sensors: 7,
        alerts: 2,
        emergencyRequests: 1,
        mode: 'STANDALONE_DEMO'
      };
    }

    res.status(200).json({
      success: true,
      message: 'Database seeded successfully with clean demonstration data.',
      summary
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHealth,
  triggerSimulationStep,
  toggleSimulation,
  getAuditLogs,
  seedDatabaseEndpoint
};
