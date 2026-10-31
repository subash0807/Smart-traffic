const Sensor = require('../models/Sensor');
const Traffic = require('../models/Traffic');
const alertService = require('../services/alertService');
const auditService = require('../services/auditService');
const db = require('../config/db');
const { mockStore } = require('../services/mockStoreService');

/**
 * Get all sensors
 * GET /api/sensors
 */
async function getSensors(req, res, next) {
  try {
    const { status, type } = req.query;

    if (!db.getDbStatus().isConnected) {
      let sensors = mockStore.getSensors();
      if (status) sensors = sensors.filter(s => s.status === status);
      if (type) sensors = sensors.filter(s => s.type === type);

      const junctions = mockStore.getLatestJunctions();
      const enriched = sensors.map(sensor => {
        const j = junctions.find(jt => jt.location === sensor.location || jt.sensorId === sensor.sensorId);
        return {
          ...sensor,
          latestReading: j ? {
            vehicleCount: j.vehicleCount,
            avgSpeed: j.avgSpeed,
            congestion: j.congestion,
            timestamp: j.timestamp
          } : null
        };
      });

      return res.status(200).json({
        success: true,
        data: enriched,
        simulationNotice: 'Simulated road sensor fleet (Demo Mode).'
      });
    }

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const sensors = await Sensor.find(query).sort({ location: 1 });

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

    if (!db.getDbStatus().isConnected) {
      return res.status(201).json({
        success: true,
        message: 'Sensor registered successfully (Demo Mode).',
        data: { sensorId, location, type: type || 'CAMERA', status: status || 'ONLINE' }
      });
    }

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
    const { status, type, location } = req.body;

    if (!db.getDbStatus().isConnected) {
      const updated = mockStore.updateSensor(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Sensor not found.' });
      }
      return res.status(200).json({
        success: true,
        message: `Sensor updated to status ${updated.status} (Demo Mode).`,
        data: updated
      });
    }

    const sensor = await Sensor.findById(req.params.id);
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found.' });
    }

    if (location) sensor.location = location;
    if (type) sensor.type = type;

    if (status && status !== sensor.status) {
      sensor.status = status;

      if (status === 'OFFLINE') {
        try {
          await alertService.triggerAlert({
            type: 'SENSOR_OFFLINE',
            message: `Simulated Sensor Failure: ${sensor.sensorId} at ${sensor.location} is offline.`,
            location: sensor.location,
            priority: 'HIGH'
          });
        } catch {}
      }
    }

    await sensor.save();

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
    if (!db.getDbStatus().isConnected) {
      return res.status(200).json({
        success: true,
        message: 'Sensor deleted (Demo Mode).'
      });
    }

    const sensor = await Sensor.findByIdAndDelete(req.params.id);
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found.' });
    }

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
