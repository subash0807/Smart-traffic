const Traffic = require('../models/Traffic');
const congestionService = require('../services/congestionService');
const alertService = require('../services/alertService');
const auditService = require('../services/auditService');

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
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

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

    const newRecord = new Traffic({
      location,
      latitude,
      longitude,
      vehicleCount,
      avgSpeed,
      congestion: congestionLevel,
      sensorId: sensorId || 'SEN-MANUAL',
      dataSource: dataSource || 'MANUAL',
      timestamp: new Date()
    });

    await newRecord.save();

    // Congestion event processing
    await congestionService.recordCongestionEvent(location, congestionLevel, vehicleCount, avgSpeed);

    // Trigger alert if congested
    if (congestionLevel === 'SEVERE' || congestionLevel === 'HEAVY') {
      await alertService.triggerAlert({
        type: `${congestionLevel}_CONGESTION`,
        message: `${congestionLevel} congestion detected at ${location}: ${vehicleCount} vehicles, avg speed ${avgSpeed} km/h.`,
        location,
        priority: congestionLevel === 'SEVERE' ? 'CRITICAL' : 'HIGH'
      });
    }

    // Audit log
    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'ANONYMOUS',
      userName: req.user ? req.user.name : 'Traffic Operator',
      action: 'TRAFFIC_RECORD_CREATED',
      resourceType: 'Traffic',
      resourceId: newRecord._id.toString(),
      newValue: newRecord.toObject(),
      ipAddress: req.ip
    });

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
    const record = await Traffic.findById(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Traffic record not found.'
      });
    }

    const previousValue = record.toObject();

    if (req.body.location) record.location = req.body.location;
    if (req.body.latitude !== undefined) record.latitude = req.body.latitude;
    if (req.body.longitude !== undefined) record.longitude = req.body.longitude;
    if (req.body.vehicleCount !== undefined) record.vehicleCount = req.body.vehicleCount;
    if (req.body.avgSpeed !== undefined) record.avgSpeed = req.body.avgSpeed;
    if (req.body.sensorId) record.sensorId = req.body.sensorId;

    record.congestion = congestionService.classifyCongestion(record.vehicleCount, record.avgSpeed);
    record.timestamp = new Date();

    await record.save();

    await congestionService.recordCongestionEvent(record.location, record.congestion, record.vehicleCount, record.avgSpeed);

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'System Operator',
      action: 'TRAFFIC_RECORD_UPDATED',
      resourceType: 'Traffic',
      resourceId: record._id.toString(),
      previousValue,
      newValue: record.toObject(),
      ipAddress: req.ip
    });

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
    const record = await Traffic.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Traffic record not found.'
      });
    }

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'System Operator',
      action: 'TRAFFIC_RECORD_DELETED',
      resourceType: 'Traffic',
      resourceId: req.params.id,
      previousValue: record.toObject(),
      ipAddress: req.ip
    });

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
