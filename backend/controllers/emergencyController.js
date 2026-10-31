const EmergencyRequest = require('../models/EmergencyRequest');
const Signal = require('../models/Signal');
const Vehicle = require('../models/Vehicle');
const alertService = require('../services/alertService');
const auditService = require('../services/auditService');
const db = require('../config/db');
const { mockStore } = require('../services/mockStoreService');

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

    if (!db.getDbStatus().isConnected) {
      let requests = mockStore.getEmergencyRequests();
      if (status) requests = requests.filter(r => r.status === status);
      return res.status(200).json({
        success: true,
        data: requests,
        simulationNotice: 'Simulated emergency response corridor demonstration (Demo Mode).'
      });
    }

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

    if (!db.getDbStatus().isConnected) {
      const newReq = mockStore.addEmergencyRequest({
        vehicleId,
        vehicleType: vehicleType || 'AMBULANCE',
        origin,
        destination,
        affectedJunctions: junctions,
        priority: priority || 'CRITICAL',
        recommendedPlan
      });
      return res.status(201).json({
        success: true,
        message: 'Emergency priority request submitted (Demo Mode).',
        data: newReq
      });
    }

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

    if (!db.getDbStatus().isConnected) {
      const updated = mockStore.updateEmergencyRequest(req.params.id, {
        status,
        approvedBy: req.user ? req.user.name : 'Traffic Controller'
      });
      return res.status(200).json({
        success: true,
        message: `Emergency request marked as ${status} (Demo Mode).`,
        data: updated
      });
    }

    const emergencyReq = await EmergencyRequest.findById(req.params.id);
    if (!emergencyReq) {
      return res.status(404).json({ success: false, message: 'Emergency request not found.' });
    }

    if (status) {
      emergencyReq.status = status;
      if (status === 'APPROVED') {
        emergencyReq.approvedBy = req.user ? req.user.name : 'Traffic Controller';

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
      }
    }

    await emergencyReq.save();

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
