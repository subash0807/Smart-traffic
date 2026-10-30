const Vehicle = require('../models/Vehicle');
const auditService = require('../services/auditService');

/**
 * Get all vehicles
 * GET /api/vehicles
 */
async function getVehicles(req, res, next) {
  try {
    const { type, priority, status } = req.query;
    const query = {};

    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (status) query.status = status;

    const vehicles = await Vehicle.find(query).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: vehicles
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Register a vehicle
 * POST /api/vehicles
 */
async function createVehicle(req, res, next) {
  try {
    const { vehicleId, type, location, destination, priority, status } = req.body;

    const existing = await Vehicle.findOne({ vehicleId });
    if (existing) {
      return res.status(409).json({ success: false, message: `Vehicle ID ${vehicleId} already exists.` });
    }

    const vehicle = new Vehicle({
      vehicleId,
      type: type || 'AMBULANCE',
      location,
      destination,
      priority: priority || (['AMBULANCE', 'FIRE_ENGINE', 'POLICE'].includes(type) ? 'EMERGENCY' : 'NORMAL'),
      status: status || 'IDLE',
      dataSource: 'SIMULATED'
    });

    await vehicle.save();

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'Operator',
      action: 'VEHICLE_REGISTERED',
      resourceType: 'Vehicle',
      resourceId: vehicle._id.toString(),
      newValue: vehicle.toObject(),
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle registered successfully.',
      data: vehicle
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update vehicle details
 * PUT /api/vehicles/:id
 */
async function updateVehicle(req, res, next) {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const previousValue = vehicle.toObject();
    const { location, destination, priority, status, type } = req.body;

    if (location) vehicle.location = location;
    if (destination) vehicle.destination = destination;
    if (priority) vehicle.priority = priority;
    if (status) vehicle.status = status;
    if (type) vehicle.type = type;

    await vehicle.save();

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully.',
      data: vehicle
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getVehicles,
  createVehicle,
  updateVehicle
};
