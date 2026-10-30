const EmergencyRequest = require('../models/EmergencyRequest');
const Signal = require('../models/Signal');
const Vehicle = require('../models/Vehicle');
const alertService = require('../services/alertService');
const auditService = require('../services/auditService');

function generateRequestId() {
  return `EMG-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
}

/**
 * Get all emergency priority requests
 * GET /api/emergency-requests
 */
async function getEmergencyRequests(req, res, next) {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const requests = await EmergencyRequest.find(query).sort({ requestedAt: -1 });

    res.status(200).json({
      success: true,
      data: requests,
      simulationNotice: 'Simulated emergency response corridor demonstration.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new emergency priority request
 * POST /api/emergency-requests
 */
async function createEmergencyRequest(req, res, next) {
  try {
    const { vehicleId, vehicleType, origin, destination, affectedJunctions, priority } = req.body;

    const junctions = affectedJunctions && Array.isArray(affectedJunctions) && affectedJunctions.length > 0
      ? affectedJunctions
      : [origin, destination];

    const recommendedPlan = `Simulated Green Corridor: Preemptively lock signals at [${junctions.join(' -> ')}] to GREEN for 90 seconds to allow rapid passage of emergency vehicle.`;

    const emergencyReq = new EmergencyRequest({
      requestId: generateRequestId(),
      vehicleId,
      vehicleType: vehicleType || 'AMBULANCE',
      origin,
      destination,
      affectedJunctions: junctions,
      priority: priority || 'CRITICAL',
      status: 'PENDING',
      recommendedPlan,
      requestedAt: new Date()
    });

    await emergencyReq.save();

    // Trigger high-priority alert
    await alertService.triggerAlert({
      type: 'EMERGENCY_REQUEST',
      message: `Emergency priority request for ${vehicleType || 'vehicle'} (${vehicleId}) from ${origin} to ${destination}.`,
      location: origin,
      priority: 'CRITICAL'
    });

    // Update vehicle status
    await Vehicle.findOneAndUpdate(
      { vehicleId },
      { status: 'EN_ROUTE', priority: 'EMERGENCY', location: origin, destination },
      { upsert: false }
    );

    // Audit log
    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'Dispatcher',
      action: 'EMERGENCY_REQUEST_SUBMITTED',
      resourceType: 'EmergencyRequest',
      resourceId: emergencyReq.requestId,
      newValue: emergencyReq.toObject(),
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Emergency priority request submitted.',
      data: emergencyReq
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update emergency request status (Approve, Reject, Complete)
 * PUT /api/emergency-requests/:id
 */
async function updateEmergencyRequest(req, res, next) {
  try {
    const { status } = req.body;
    const emergencyReq = await EmergencyRequest.findById(req.params.id);

    if (!emergencyReq) {
      return res.status(404).json({ success: false, message: 'Emergency request not found.' });
    }

    const previousValue = emergencyReq.toObject();

    if (status) {
      emergencyReq.status = status;
      if (status === 'APPROVED') {
        emergencyReq.approvedBy = req.user ? req.user.name : 'Traffic Controller';

        // Apply Green Corridor: Switch affected signals to GREEN with extended duration
        if (emergencyReq.affectedJunctions && emergencyReq.affectedJunctions.length > 0) {
          await Signal.updateMany(
            { location: { $in: emergencyReq.affectedJunctions } },
            {
              status: 'GREEN',
              mode: 'MANUAL',
              duration: 90,
              lastUpdated: new Date()
            }
          );
        }
      } else if (status === 'COMPLETED' || status === 'REJECTED') {
        emergencyReq.completedAt = new Date();

        // Restore affected signals to AUTOMATIC
        if (emergencyReq.affectedJunctions && emergencyReq.affectedJunctions.length > 0) {
          await Signal.updateMany(
            { location: { $in: emergencyReq.affectedJunctions } },
            {
              mode: 'AUTOMATIC',
              duration: 45,
              lastUpdated: new Date()
            }
          );
        }

        // Return vehicle to IDLE
        await Vehicle.findOneAndUpdate(
          { vehicleId: emergencyReq.vehicleId },
          { status: 'IDLE', priority: 'NORMAL', location: emergencyReq.destination }
        );
      }
    }

    await emergencyReq.save();

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'Officer',
      action: `EMERGENCY_REQUEST_${emergencyReq.status}`,
      resourceType: 'EmergencyRequest',
      resourceId: emergencyReq.requestId,
      previousValue,
      newValue: emergencyReq.toObject(),
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Emergency request marked as ${emergencyReq.status}.`,
      data: emergencyReq
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEmergencyRequests,
  createEmergencyRequest,
  updateEmergencyRequest
};
