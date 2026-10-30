const Traffic = require('../models/Traffic');
const Signal = require('../models/Signal');
const Sensor = require('../models/Sensor');
const congestionService = require('./congestionService');
const alertService = require('./alertService');
const logger = require('../utils/logger');

const JUNCTIONS = [
  { location: 'Anna Salai Junction', latitude: 13.0604, longitude: 80.2496, sensorId: 'SEN-ANN-01' },
  { location: 'T. Nagar Panagal Park', latitude: 13.0418, longitude: 80.2341, sensorId: 'SEN-TNG-02' },
  { location: 'Guindy Kathipara Junction', latitude: 13.0067, longitude: 80.2031, sensorId: 'SEN-GND-03' },
  { location: 'Velachery Vijayanagar', latitude: 12.9759, longitude: 80.2212, sensorId: 'SEN-VEL-04' },
  { location: 'Tambaram GST Junction', latitude: 12.9249, longitude: 80.1000, sensorId: 'SEN-TAM-05' },
  { location: 'OMR Tidel Park Junction', latitude: 12.9897, longitude: 80.2476, sensorId: 'SEN-OMR-06' },
  { location: 'Koyambedu Roundabout', latitude: 13.0694, longitude: 80.1948, sensorId: 'SEN-KOY-07' }
];

let simulationInterval = null;
let isRunning = false;

/**
 * Generate simulated traffic parameters with realistic variance.
 */
function generateRandomTraffic(previousCount = 28, previousSpeed = 38) {
  // Fluctuations within -8 to +10 vehicles
  const countDelta = Math.floor(Math.random() * 19) - 8;
  const newCount = Math.max(5, Math.min(95, previousCount + countDelta));

  // Inverse relationship: more vehicles typically reduce average speed
  let speedEstimate = 65 - newCount * 0.65 + (Math.random() * 8 - 4);
  const newSpeed = Math.max(5, Math.min(65, Math.round(speedEstimate)));

  return { vehicleCount: newCount, avgSpeed: newSpeed };
}

/**
 * Execute a single simulation step across all junctions.
 */
async function stepSimulation() {
  try {
    for (const junc of JUNCTIONS) {
      // Find latest record for this junction
      const latest = await Traffic.findOne({ location: junc.location }).sort({ timestamp: -1 });

      const prevCount = latest ? latest.vehicleCount : Math.floor(15 + Math.random() * 35);
      const prevSpeed = latest ? latest.avgSpeed : Math.floor(25 + Math.random() * 30);

      const { vehicleCount, avgSpeed } = generateRandomTraffic(prevCount, prevSpeed);
      const congestionLevel = congestionService.classifyCongestion(vehicleCount, avgSpeed);

      // Create new traffic snapshot
      const trafficRecord = new Traffic({
        location: junc.location,
        latitude: junc.latitude,
        longitude: junc.longitude,
        vehicleCount,
        avgSpeed,
        congestion: congestionLevel,
        sensorId: junc.sensorId,
        timestamp: new Date(),
        dataSource: 'SIMULATED'
      });
      await trafficRecord.save();

      // Process congestion event logging
      await congestionService.recordCongestionEvent(junc.location, congestionLevel, vehicleCount, avgSpeed);

      // Trigger alerts if congested
      if (congestionLevel === 'SEVERE') {
        await alertService.triggerAlert({
          type: 'SEVERE_CONGESTION',
          message: `Critical congestion at ${junc.location}: ${vehicleCount} vehicles queuing, speed dropped to ${avgSpeed} km/h.`,
          location: junc.location,
          priority: 'CRITICAL'
        });
      } else if (congestionLevel === 'HEAVY') {
        await alertService.triggerAlert({
          type: 'HEAVY_CONGESTION',
          message: `Heavy congestion building at ${junc.location}: ${vehicleCount} vehicles, avg speed ${avgSpeed} km/h.`,
          location: junc.location,
          priority: 'HIGH'
        });
      }

      // Update Sensor Heartbeat
      await Sensor.findOneAndUpdate(
        { sensorId: junc.sensorId },
        {
          location: junc.location,
          status: 'ONLINE',
          lastReceivedAt: new Date()
        },
        { upsert: true }
      );

      // Intelligent Automatic Signal Adjustment
      const signal = await Signal.findOne({ location: junc.location });
      if (signal && signal.mode === 'AUTOMATIC') {
        let recommendedDuration = 45;
        if (congestionLevel === 'SEVERE') {
          recommendedDuration = 80; // Extended green wave to flush queue
        } else if (congestionLevel === 'HEAVY') {
          recommendedDuration = 60;
        } else if (congestionLevel === 'MODERATE') {
          recommendedDuration = 45;
        } else {
          recommendedDuration = 35;
        }

        // Cycle signal status for visual realism in demo
        const nextStates = { GREEN: 'YELLOW', YELLOW: 'RED', RED: 'GREEN' };
        const newStatus = nextStates[signal.status] || 'GREEN';

        signal.status = newStatus;
        signal.duration = recommendedDuration;
        signal.lastUpdated = new Date();
        await signal.save();
      }
    }
    logger.simulation(`Simulated traffic cycle completed across ${JUNCTIONS.length} junctions.`);
    return { success: true, count: JUNCTIONS.length };
  } catch (err) {
    logger.error(`Simulation step error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

function startSimulation(intervalMs = 12000) {
  if (isRunning) return;
  isRunning = true;
  logger.info(`Starting automatic traffic simulation engine (Interval: ${intervalMs}ms)...`);
  // Run first cycle immediately
  stepSimulation();
  simulationInterval = setInterval(stepSimulation, intervalMs);
}

function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  isRunning = false;
  logger.info('Traffic simulation engine stopped.');
}

function isSimulationRunning() {
  return isRunning;
}

module.exports = {
  JUNCTIONS,
  stepSimulation,
  startSimulation,
  stopSimulation,
  isSimulationRunning
};
