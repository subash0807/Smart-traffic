/**
 * Request validation helpers for common entity payloads
 */

function validateTrafficInput(req, res, next) {
  const { location, latitude, longitude, vehicleCount, avgSpeed } = req.body;

  if (!location || typeof location !== 'string' || location.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Valid location name is required' });
  }

  if (latitude === undefined || isNaN(latitude) || latitude < -90 || latitude > 90) {
    return res.status(400).json({ success: false, message: 'Latitude must be a valid number between -90 and 90' });
  }

  if (longitude === undefined || isNaN(longitude) || longitude < -180 || longitude > 180) {
    return res.status(400).json({ success: false, message: 'Longitude must be a valid number between -180 and 180' });
  }

  if (vehicleCount === undefined || isNaN(vehicleCount) || vehicleCount < 0) {
    return res.status(400).json({ success: false, message: 'Vehicle count must be a non-negative number' });
  }

  if (avgSpeed === undefined || isNaN(avgSpeed) || avgSpeed < 0) {
    return res.status(400).json({ success: false, message: 'Average speed must be a non-negative number' });
  }

  next();
}

function validateSignalInput(req, res, next) {
  const { signalId, location, status, mode, duration } = req.body;

  if (!signalId || typeof signalId !== 'string') {
    return res.status(400).json({ success: false, message: 'Signal ID is required' });
  }
  if (!location || typeof location !== 'string') {
    return res.status(400).json({ success: false, message: 'Location is required' });
  }
  if (status && !['RED', 'YELLOW', 'GREEN'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be RED, YELLOW, or GREEN' });
  }
  if (mode && !['AUTOMATIC', 'MANUAL'].includes(mode)) {
    return res.status(400).json({ success: false, message: 'Mode must be AUTOMATIC or MANUAL' });
  }
  if (duration !== undefined && (isNaN(duration) || duration < 5 || duration > 180)) {
    return res.status(400).json({ success: false, message: 'Duration must be between 5 and 180 seconds' });
  }

  next();
}

function validateEmergencyRequest(req, res, next) {
  const { vehicleId, origin, destination } = req.body;

  if (!vehicleId || typeof vehicleId !== 'string') {
    return res.status(400).json({ success: false, message: 'Vehicle ID is required' });
  }
  if (!origin || typeof origin !== 'string') {
    return res.status(400).json({ success: false, message: 'Origin location is required' });
  }
  if (!destination || typeof destination !== 'string') {
    return res.status(400).json({ success: false, message: 'Destination location is required' });
  }

  next();
}

module.exports = {
  validateTrafficInput,
  validateSignalInput,
  validateEmergencyRequest
};
