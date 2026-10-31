const Traffic = require('../models/Traffic');
const CongestionEvent = require('../models/CongestionEvent');
const Signal = require('../models/Signal');
const EmergencyRequest = require('../models/EmergencyRequest');
const Alert = require('../models/Alert');
const db = require('../config/db');
const { mockStore } = require('../services/mockStoreService');

/**
 * Get aggregated analytics report summary from actual database records
 * GET /api/reports/summary
 */
async function getReportSummary(req, res, next) {
  try {
    const { startDate, endDate, location, congestion } = req.query;

    if (!db.getDbStatus().isConnected) {
      const records = mockStore.getTrafficRecords(100);
      let totalVehicles = 0;
      let totalSpeed = 0;
      const congestionFreq = { NORMAL: 2, MODERATE: 2, HEAVY: 2, SEVERE: 1 };

      records.forEach(r => {
        totalVehicles += r.vehicleCount || 0;
        totalSpeed += r.avgSpeed || 0;
      });

      const locationStats = records.map(r => ({
        location: r.location,
        recordsCount: 1,
        totalVehicles: r.vehicleCount,
        avgVehicles: r.vehicleCount,
        avgSpeed: r.avgSpeed,
        severeIncidents: r.congestion === 'SEVERE' ? 1 : 0
      }));

      return res.status(200).json({
        success: true,
        data: {
          summary: {
            totalRecordsAnalyzed: records.length,
            totalVehiclesRecorded: totalVehicles,
            overallAverageSpeed: records.length ? Math.round(totalSpeed / records.length) : 32,
            congestionFrequency: congestionFreq,
            severeCongestionEvents: 1,
            activeSignalsCount: mockStore.getSignals().length,
            activeAlertsCount: mockStore.getAlerts().length,
            emergencyCorridorsHandled: mockStore.getEmergencyRequests().length
          },
          locationStats,
          period: {
            start: startDate || 'Latest Live Session',
            end: endDate || new Date().toISOString()
          }
        }
      });
    }

    const filter = {};
    if (location && location !== 'ALL') {
      filter.location = { $regex: location, $options: 'i' };
    }
    if (congestion && congestion !== 'ALL') {
      filter.congestion = congestion;
    }
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const trafficRecords = await Traffic.find(filter).sort({ timestamp: -1 });

    const totalRecords = trafficRecords.length;
    let totalVehicles = 0;
    let totalSpeed = 0;

    const congestionFrequency = {
      NORMAL: 0,
      MODERATE: 0,
      HEAVY: 0,
      SEVERE: 0
    };

    const locationAggregates = {};

    trafficRecords.forEach((r) => {
      totalVehicles += r.vehicleCount || 0;
      totalSpeed += r.avgSpeed || 0;
      if (congestionFrequency[r.congestion] !== undefined) {
        congestionFrequency[r.congestion] += 1;
      }

      if (!locationAggregates[r.location]) {
        locationAggregates[r.location] = {
          location: r.location,
          recordsCount: 0,
          totalVehicles: 0,
          totalSpeed: 0,
          severeCount: 0
        };
      }
      locationAggregates[r.location].recordsCount += 1;
      locationAggregates[r.location].totalVehicles += r.vehicleCount || 0;
      locationAggregates[r.location].totalSpeed += r.avgSpeed || 0;
      if (r.congestion === 'SEVERE') {
        locationAggregates[r.location].severeCount += 1;
      }
    });

    const locationStats = Object.values(locationAggregates).map((loc) => ({
      location: loc.location,
      recordsCount: loc.recordsCount,
      totalVehicles: loc.totalVehicles,
      avgVehicles: Math.round(loc.totalVehicles / loc.recordsCount),
      avgSpeed: Math.round(loc.totalSpeed / loc.recordsCount),
      severeIncidents: loc.severeCount
    }));

    const [severeEventsCount, totalSignals, emergencyStats, totalAlertsCount] = await Promise.all([
      CongestionEvent.countDocuments({ congestionLevel: 'SEVERE' }),
      Signal.countDocuments(),
      EmergencyRequest.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Alert.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRecordsAnalyzed: totalRecords,
          totalVehiclesRecorded: totalVehicles,
          overallAverageSpeed: totalRecords > 0 ? Math.round(totalSpeed / totalRecords) : 0,
          congestionFrequency,
          severeCongestionEvents: severeEventsCount,
          activeSignalsCount: totalSignals,
          emergencyCorridorsHandled: emergencyStats.reduce((acc, curr) => acc + curr.count, 0),
          activeAlertsCount: totalAlertsCount
        },
        locationStats,
        period: {
          start: startDate || 'All Time Available',
          end: endDate || new Date().toISOString()
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Export traffic report as streamed CSV
 * GET /api/reports/export
 */
async function exportTrafficReportCsv(req, res, next) {
  try {
    let records = [];

    if (!db.getDbStatus().isConnected) {
      records = mockStore.getTrafficRecords(100);
    } else {
      records = await Traffic.find().sort({ timestamp: -1 }).limit(1000);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="stms_traffic_report.csv"');

    let csvContent = 'ID,Location,Latitude,Longitude,VehicleCount,AvgSpeedKmH,CongestionLevel,SensorID,Timestamp\n';

    records.forEach((r) => {
      const line = [
        r._id || r.id,
        `"${r.location}"`,
        r.latitude,
        r.longitude,
        r.vehicleCount,
        r.avgSpeed,
        r.congestion,
        r.sensorId || 'N/A',
        new Date(r.timestamp).toISOString()
      ].join(',');
      csvContent += line + '\n';
    });

    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getReportSummary,
  exportTrafficReportCsv,
  exportReportCSV: exportTrafficReportCsv
};
