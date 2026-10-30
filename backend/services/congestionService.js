const CongestionEvent = require('../models/CongestionEvent');
const logger = require('../utils/logger');

// Configurable in-memory thresholds with defaults matching specification
let thresholds = {
  normalMaxVehicles: parseInt(process.env.THRESHOLD_NORMAL_MAX_VEHICLES, 10) || 20,
  normalMinSpeed: parseInt(process.env.THRESHOLD_NORMAL_MIN_SPEED, 10) || 40,
  moderateMaxVehicles: parseInt(process.env.THRESHOLD_MODERATE_MAX_VEHICLES, 10) || 39,
  moderateMinSpeed: parseInt(process.env.THRESHOLD_MODERATE_MIN_SPEED, 10) || 25,
  heavyMaxVehicles: parseInt(process.env.THRESHOLD_HEAVY_MAX_VEHICLES, 10) || 59,
  heavyMinSpeed: parseInt(process.env.THRESHOLD_HEAVY_MIN_SPEED, 10) || 15,
  severeMinVehicles: parseInt(process.env.THRESHOLD_SEVERE_MIN_VEHICLES, 10) || 60
};

/**
 * Get current system congestion thresholds.
 */
function getThresholds() {
  return { ...thresholds };
}

/**
 * Update thresholds dynamically.
 */
function updateThresholds(newThresholds) {
  thresholds = {
    ...thresholds,
    ...newThresholds
  };
  logger.info('Congestion classification thresholds updated:', JSON.stringify(thresholds));
  return thresholds;
}

/**
 * Rule-based congestion classification.
 * Highest severity takes precedence when conditions conflict.
 * Edge cases:
 * - Speed == 0 or negative -> SEVERE (gridlock/stopped traffic)
 * - Missing values -> fallback safe default
 */
function classifyCongestion(vehicleCount, avgSpeed, customConfig = thresholds) {
  const count = Number(vehicleCount) || 0;
  const speed = Number(avgSpeed) || 0;

  // Case 1: Stopped traffic / severe gridlock
  if (speed <= 0 || speed < customConfig.heavyMinSpeed || count >= customConfig.severeMinVehicles) {
    return 'SEVERE';
  }

  // Case 2: Heavy congestion
  if (
    (count >= customConfig.moderateMaxVehicles + 1 && count <= customConfig.heavyMaxVehicles) ||
    (speed >= customConfig.heavyMinSpeed && speed < customConfig.moderateMinSpeed)
  ) {
    return 'HEAVY';
  }

  // Case 3: Moderate congestion
  if (
    (count >= customConfig.normalMaxVehicles && count <= customConfig.moderateMaxVehicles) ||
    (speed >= customConfig.moderateMinSpeed && speed <= customConfig.normalMinSpeed)
  ) {
    return 'MODERATE';
  }

  // Case 4: Normal flowing traffic
  return 'NORMAL';
}

/**
 * Process a traffic record through congestion analysis:
 * Records or resolves CongestionEvents.
 */
async function recordCongestionEvent(location, congestionLevel, vehicleCount, avgSpeed) {
  try {
    if (congestionLevel === 'HEAVY' || congestionLevel === 'SEVERE' || congestionLevel === 'MODERATE') {
      // Find recent active congestion event for this location
      const existing = await CongestionEvent.findOne({
        location,
        status: 'ACTIVE'
      }).sort({ timestamp: -1 });

      if (existing) {
        existing.congestionLevel = congestionLevel;
        existing.vehicleCount = vehicleCount;
        existing.avgSpeed = avgSpeed;
        existing.timestamp = new Date();
        existing.description = `${congestionLevel} congestion detected: ${vehicleCount} vehicles, avg speed ${avgSpeed} km/h.`;
        await existing.save();
        return existing;
      } else {
        const newEvent = new CongestionEvent({
          location,
          congestionLevel,
          vehicleCount,
          avgSpeed,
          description: `${congestionLevel} congestion detected: ${vehicleCount} vehicles, avg speed ${avgSpeed} km/h.`,
          status: 'ACTIVE',
          timestamp: new Date()
        });
        await newEvent.save();
        return newEvent;
      }
    } else {
      // Congestion back to NORMAL: Resolve any active event
      await CongestionEvent.updateMany(
        { location, status: 'ACTIVE' },
        { status: 'RESOLVED', timestamp: new Date() }
      );
      return null;
    }
  } catch (err) {
    logger.error(`Error recording congestion event for ${location}: ${err.message}`);
    return null;
  }
}

module.exports = {
  getThresholds,
  updateThresholds,
  classifyCongestion,
  recordCongestionEvent
};
