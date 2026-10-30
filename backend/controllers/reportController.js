const Traffic = require('../models/Traffic');
const CongestionEvent = require('../models/CongestionEvent');
const Signal = require('../models/Signal');
const EmergencyRequest = require('../models/EmergencyRequest');
const Alert = require('../models/Alert');

/**
 * Get aggregated analytics report summary from actual database records
 * GET /api/reports/summary
 */
async function getReportSummary(req, res, next) {
  try {
    const { startDate, endDate, location, congestion } = req.query;
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

    // Other entities stats
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
          totalAlertsRecorded: totalAlertsCount,
          emergencyRequestsByStatus: emergencyStats
        },
        locationStats,
        dateRange: {
          startDate: startDate || null,
          endDate: endDate || null
        }
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Export filtered traffic records as CSV
 * GET /api/reports/export
 */
async function exportReportCSV(req, res, next) {
  try {
    const { startDate, endDate, location, congestion } = req.query;
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

    const records = await Traffic.find(filter).sort({ timestamp: -1 }).limit(1000);

    // Build CSV
    const headers = ['RecordID', 'Timestamp', 'Location', 'Latitude', 'Longitude', 'VehicleCount', 'AvgSpeed_kmh', 'CongestionLevel', 'DataSource', 'SensorID'];
    
    const rows = records.map((r) => [
      r._id.toString(),
      r.timestamp ? r.timestamp.toISOString() : '',
      `"${(r.location || '').replace(/"/g, '""')}"`,
      r.latitude,
      r.longitude,
      r.vehicleCount,
      r.avgSpeed,
      r.congestion,
      r.dataSource,
      r.sensorId || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');

    const filename = `stms_traffic_report_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getReportSummary,
  exportReportCSV
};
