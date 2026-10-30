const Sensor = require('../models/Sensor');
const Traffic = require('../models/Traffic');
const alertService = require('../services/alertService');
const auditService = require('../services/auditService');

/**
 * Get all sensors
 * GET /api/sensors
 */
async function getSensors(req, res, next) {
  try {
    const { status, type } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const sensors = await Sensor.find(query).sort({ location: 1 });

    // Attach latest traffic record reading for each sensor
    const sensorsWithReadings = await Promise.all(
      sensors.map(async (sensor) => {
        const latestTraffic = await Traffic.findOne({
          $or: [{ sensorId: sensor.sensorId }, { location: sensor.location }]
        }).sort({ timestamp: -1 });

        return {
          ...sensor.toObject(),
          latestReading: latestTraffic ? {
            vehicleCount: latestTraffic.vehicleCount,
            avgSpeed: latestTraffic.avgSpeed,
            congestion: latestTraffic.congestion,
            timestamp: latestTraffic.timestamp
          } : null
        };
      })
    );

    res.status(200).json({
      success: true,
      data: sensorsWithReadings,
      simulationNotice: 'Simulated road sensor fleet.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Register a new sensor
 * POST /api/sensors
 */
async function createSensor(req, res, next) {
  try {
    const { sensorId, location, type, status } = req.body;

    const existing = await Sensor.findOne({ sensorId });
    if (existing) {
      return res.status(409).json({ success: false, message: `Sensor with ID ${sensorId} already exists.` });
    }

    const sensor = new Sensor({
      sensorId,
      location,
      type: type || 'CAMERA',
      status: status || 'ONLINE',
      lastReceivedAt: new Date()
    });

    await sensor.save();

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'Operator',
      action: 'SENSOR_REGISTERED',
      resourceType: 'Sensor',
      resourceId: sensor.sensorId,
      newValue: sensor.toObject(),
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Sensor registered successfully.',
      data: sensor
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update sensor details or status (e.g., simulate failure)
 * PUT /api/sensors/:id
 */
async function updateSensor(req, res, next) {
  try {
    const sensor = await Sensor.findById(req.params.id);
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found.' });
    }

    const previousValue = sensor.toObject();
    const { status, type, location } = req.body;

    if (location) sensor.location = location;
    if (type) sensor.type = type;

    if (status && status !== sensor.status) {
      sensor.status = status;

      // If simulated failure triggered: raise SENSOR_OFFLINE alert
      if (status === 'OFFLINE') {
        await alertService.triggerAlert({
          type: 'SENSOR_OFFLINE',
          message: `Simulated Sensor Failure: ${sensor.sensorId} at ${sensor.location} is offline.`,
          location: sensor.location,
          priority: 'HIGH'
        });
      }
    }

    await sensor.save();

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'Operator',
      action: 'SENSOR_STATUS_UPDATED',
      resourceType: 'Sensor',
      resourceId: sensor.sensorId,
      previousValue,
      newValue: sensor.toObject(),
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Sensor updated to status ${sensor.status}.`,
      data: sensor
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete sensor
 * DELETE /api/sensors/:id
 */
async function deleteSensor(req, res, next) {
  try {
    const sensor = await Sensor.findByIdAndDelete(req.params.id);
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found.' });
    }

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'Admin',
      action: 'SENSOR_DELETED',
      resourceType: 'Sensor',
      resourceId: req.params.id,
      previousValue: sensor.toObject(),
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Sensor deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSensors,
  createSensor,
  updateSensor,
  deleteSensor
};
