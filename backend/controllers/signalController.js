const Signal = require('../models/Signal');
const auditService = require('../services/auditService');

/**
 * Get all signals
 * GET /api/signals
 */
async function getSignals(req, res, next) {
  try {
    const signals = await Signal.find().sort({ location: 1 });
    res.status(200).json({
      success: true,
      data: signals,
      isSimulation: true,
      notice: 'Demonstration software simulation only. Not connected to physical traffic hardware.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get signal by ID
 * GET /api/signals/:id
 */
async function getSignalById(req, res, next) {
  try {
    const signal = await Signal.findById(req.params.id);
    if (!signal) {
      return res.status(404).json({ success: false, message: 'Signal not found.' });
    }
    res.status(200).json({ success: true, data: signal });
  } catch (err) {
    next(err);
  }
}

/**
 * Create new signal
 * POST /api/signals
 */
async function createSignal(req, res, next) {
  try {
    const { signalId, location, latitude, longitude, status, mode, duration } = req.body;

    const existing = await Signal.findOne({ signalId });
    if (existing) {
      return res.status(409).json({ success: false, message: `Signal with ID ${signalId} already exists.` });
    }

    const signal = new Signal({
      signalId,
      location,
      latitude: Number(latitude),
      longitude: Number(longitude),
      status: status || 'GREEN',
      mode: mode || 'AUTOMATIC',
      duration: duration || 45,
      lastUpdated: new Date()
    });

    await signal.save();

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'Traffic Operator',
      action: 'SIGNAL_CREATED',
      resourceType: 'Signal',
      resourceId: signal._id.toString(),
      newValue: signal.toObject(),
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Signal created successfully.',
      data: signal
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update signal state or configuration
 * PUT /api/signals/:id
 */
async function updateSignal(req, res, next) {
  try {
    const signal = await Signal.findById(req.params.id);
    if (!signal) {
      return res.status(404).json({ success: false, message: 'Signal not found.' });
    }

    const previousValue = signal.toObject();
    const { status, mode, duration, location, latitude, longitude } = req.body;

    // Validate state transition if status changes
    if (status && status !== signal.status) {
      signal.stateHistory.push({
        previousStatus: signal.status,
        newStatus: status,
        changedBy: req.user ? req.user.name : 'Operator',
        mode: mode || signal.mode,
        timestamp: new Date()
      });
      signal.status = status;
    }

    if (mode) signal.mode = mode;
    if (duration !== undefined) signal.duration = Number(duration);
    if (location) signal.location = location;
    if (latitude !== undefined) signal.latitude = Number(latitude);
    if (longitude !== undefined) signal.longitude = Number(longitude);

    signal.lastUpdated = new Date();
    await signal.save();

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'Operator',
      action: 'SIGNAL_STATE_MODIFIED',
      resourceType: 'Signal',
      resourceId: signal._id.toString(),
      previousValue,
      newValue: signal.toObject(),
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Signal updated successfully in simulation.',
      data: signal
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete signal
 * DELETE /api/signals/:id
 */
async function deleteSignal(req, res, next) {
  try {
    const signal = await Signal.findByIdAndDelete(req.params.id);
    if (!signal) {
      return res.status(404).json({ success: false, message: 'Signal not found.' });
    }

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName: req.user ? req.user.name : 'Admin',
      action: 'SIGNAL_DELETED',
      resourceType: 'Signal',
      resourceId: req.params.id,
      previousValue: signal.toObject(),
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: 'Signal removed successfully.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSignals,
  getSignalById,
  createSignal,
  updateSignal,
  deleteSignal
};
