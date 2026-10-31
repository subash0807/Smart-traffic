const CongestionEvent = require('../models/CongestionEvent');
const Traffic = require('../models/Traffic');
const congestionService = require('../services/congestionService');
const auditService = require('../services/auditService');
const db = require('../config/db');
const { mockStore } = require('../services/mockStoreService');

/**
 * Get congestion events
 * GET /api/congestion
 */
async function getCongestionRecords(req, res, next) {
  try {
    const { status, level, limit = 50 } = req.query;

    if (!db.getDbStatus().isConnected) {
      return res.status(200).json({
        success: true,
        data: [
          {
            congestionLevel: 'SEVERE',
            location: 'Guindy Kathipara Junction',
            vehicleCount: 68,
            avgSpeed: 12,
            timestamp: new Date()
          }
        ]
      });
    }

    const query = {};

    if (status) query.status = status;
    if (level && level !== 'ALL') query.congestionLevel = level;

    const events = await CongestionEvent.find(query).sort({ timestamp: -1 }).limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: events
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get congestion summary statistics
 * GET /api/congestion/summary
 */
async function getCongestionSummary(req, res, next) {
  try {
    if (!db.getDbStatus().isConnected) {
      const junctions = mockStore.getLatestJunctions();
      const distribution = { NORMAL: 2, MODERATE: 2, HEAVY: 2, SEVERE: 1 };
      let totalSpeed = 0;
      let totalVehicles = 0;
      junctions.forEach(j => {
        totalSpeed += j.avgSpeed || 0;
        totalVehicles += j.vehicleCount || 0;
      });

      return res.status(200).json({
        success: true,
        data: {
          totalMonitoredLocations: junctions.length,
          totalVehiclesDetected: totalVehicles,
          averageSystemSpeed: junctions.length ? Math.round(totalSpeed / junctions.length) : 31,
          distribution,
          activeSevereEvents: 1,
          thresholds: congestionService.getThresholds()
        }
      });
    }

    // Current latest reading per junction
    const latestReadings = await Traffic.aggregate([
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$location', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } }
    ]);

    const distribution = {
      NORMAL: 0,
      MODERATE: 0,
      HEAVY: 0,
      SEVERE: 0
    };

    let totalSpeed = 0;
    let totalVehicles = 0;

    latestReadings.forEach((item) => {
      if (distribution[item.congestion] !== undefined) {
        distribution[item.congestion] += 1;
      }
      totalSpeed += item.avgSpeed || 0;
      totalVehicles += item.vehicleCount || 0;
    });

    const activeSevereEvents = await CongestionEvent.countDocuments({
      congestionLevel: 'SEVERE',
      status: 'ACTIVE'
    });

    res.status(200).json({
      success: true,
      data: {
        totalMonitoredLocations: latestReadings.length,
        totalVehiclesDetected: totalVehicles,
        averageSystemSpeed: latestReadings.length > 0 ? Math.round(totalSpeed / latestReadings.length) : 0,
        distribution,
        activeSevereEvents,
        thresholds: congestionService.getThresholds()
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get current congestion thresholds
 * GET /api/congestion/thresholds
 */
function getThresholds(req, res) {
  res.status(200).json({
    success: true,
    data: congestionService.getThresholds()
  });
}

/**
 * Update system congestion thresholds
 * PUT /api/congestion/thresholds
 */
async function updateThresholds(req, res, next) {
  try {
    const updated = congestionService.updateThresholds(req.body);

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'System Admin',
      action: 'CONGESTION_THRESHOLDS_UPDATED',
      resourceType: 'SystemConfig',
      resourceId: 'CongestionThresholds',
      newValue: updated,
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Congestion thresholds updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCongestionRecords,
  getCongestionSummary,
  getThresholds,
  updateThresholds
};
