const Traffic = require('../models/Traffic');
const congestionService = require('../services/congestionService');
const alertService = require('../services/alertService');
const auditService = require('../services/auditService');
const db = require('../config/db');
const { mockStore } = require('../services/mockStoreService');

/**
 * Get paginated traffic records with filters
 * GET /api/traffic
 */
async function getTrafficRecords(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      location,
      congestion,
      startDate,
      endDate,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    const take = parseInt(limit, 10);

    if (!db.getDbStatus().isConnected) {
      let records = mockStore.getTrafficRecords(take);
      if (location) {
        records = records.filter(r => r.location.toLowerCase().includes(location.toLowerCase()));
      }
      if (congestion && congestion !== 'ALL') {
        records = records.filter(r => r.congestion === congestion);
      }
      return res.status(200).json({
        success: true,
        data: records,
        pagination: {
          total: records.length,
          page: 1,
          pages: 1,
          limit: take
        }
      });
    }

    const query = {};

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (congestion && congestion !== 'ALL') {
      query.congestion = congestion;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    const skip = (parseInt(page, 10) - 1) * take;

    const [records, total] = await Promise.all([
      Traffic.find(query).sort(sort).skip(skip).limit(take),
      Traffic.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: records,
      pagination: {
        total,
        page: parseInt(page, 10),
        pages: Math.ceil(total / take) || 1,
        limit: take
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get single traffic record by ID
 * GET /api/traffic/:id
 */
async function getTrafficById(req, res, next) {
  try {
    if (!db.getDbStatus().isConnected) {
      const records = mockStore.getTrafficRecords(50);
      const record = records.find(r => r.id === req.params.id || r._id === req.params.id);
      if (!record) {
        return res.status(404).json({ success: false, message: 'Traffic record not found.' });
      }
      return res.status(200).json({ success: true, data: record });
    }

    const record = await Traffic.findById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Traffic record not found.'
      });
    }

    res.status(200).json({
      success: true,
      data: record
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create new traffic record
 * POST /api/traffic
 */
async function createTrafficRecord(req, res, next) {
  try {
    const { location, latitude, longitude, vehicleCount, avgSpeed, sensorId, dataSource } = req.body;
    const congestionLevel = congestionService.classifyCongestion(vehicleCount, avgSpeed);

    if (!db.getDbStatus().isConnected) {
      const record = mockStore.addTrafficRecord({
        location,
        latitude: Number(latitude),
        longitude: Number(longitude),
        vehicleCount: Number(vehicleCount),
        avgSpeed: Number(avgSpeed),
        congestion: congestionLevel,
        sensorId: sensorId || 'SEN-MANUAL',
        dataSource: dataSource || 'MANUAL'
      });
      return res.status(201).json({
        success: true,
        message: 'Traffic record created successfully (Demo Mode).',
        data: record
      });
    }

    const newRecord = new Traffic({
      location,
      latitude,
      longitude,
      vehicleCount,
      avgSpeed,
      congestion: congestionLevel,
      sensorId: sensorId || 'MANUAL-INPUT',
      dataSource: dataSource || 'MANUAL',
      timestamp: new Date()
    });

    await newRecord.save();

    await congestionService.recordCongestionEvent(location, congestionLevel, vehicleCount, avgSpeed);

    if (congestionLevel === 'SEVERE' || congestionLevel === 'HEAVY') {
      await alertService.triggerAlert({
        type: 'CONGESTION',
        message: `${congestionLevel} congestion observed at ${location}: ${vehicleCount} vehicles, avg speed ${avgSpeed} km/h.`,
        location,
        priority: congestionLevel === 'SEVERE' ? 'CRITICAL' : 'HIGH'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Traffic record created successfully.',
      data: newRecord
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update traffic record
 * PUT /api/traffic/:id
 */
async function updateTrafficRecord(req, res, next) {
  try {
    if (!db.getDbStatus().isConnected) {
      return res.status(200).json({
        success: true,
        message: 'Traffic record updated (Demo Mode).'
      });
    }

    const record = await Traffic.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Traffic record not found.' });
    }

    const previousValue = record.toObject();
    const { location, latitude, longitude, vehicleCount, avgSpeed } = req.body;

    if (location) record.location = location;
    if (latitude) record.latitude = latitude;
    if (longitude) record.longitude = longitude;
    if (vehicleCount !== undefined) record.vehicleCount = vehicleCount;
    if (avgSpeed !== undefined) record.avgSpeed = avgSpeed;

    record.congestion = congestionService.classifyCongestion(record.vehicleCount, record.avgSpeed);
    record.timestamp = new Date();
    await record.save();

    res.status(200).json({
      success: true,
      message: 'Traffic record updated successfully.',
      data: record
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete traffic record
 * DELETE /api/traffic/:id
 */
async function deleteTrafficRecord(req, res, next) {
  try {
    if (!db.getDbStatus().isConnected) {
      return res.status(200).json({
        success: true,
        message: 'Traffic record deleted (Demo Mode).'
      });
    }

    const record = await Traffic.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Traffic record not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Traffic record deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get the latest traffic reading for each distinct location (for map & dashboard)
 * GET /api/traffic/latest/junctions
 */
async function getLatestJunctionTraffic(req, res, next) {
  try {
    if (!db.getDbStatus().isConnected) {
      return res.status(200).json({
        success: true,
        data: mockStore.getLatestJunctions()
      });
    }

    const junctions = await Traffic.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$location',
          doc: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { location: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: junctions
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTrafficRecords,
  getTrafficById,
  createTrafficRecord,
  updateTrafficRecord,
  deleteTrafficRecord,
  getLatestJunctionTraffic
};
