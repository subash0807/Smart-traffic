const Alert = require('../models/Alert');
const logger = require('../utils/logger');

/**
 * Generate a unique Alert ID with human-readable prefix.
 */
function generateAlertId() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ALT-${Date.now().toString().slice(-6)}-${rand}`;
}

/**
 * Create or refresh an alert while preventing spamming of duplicate active alerts.
 */
async function triggerAlert({ type, message, location, priority = 'MEDIUM' }) {
  try {
    // Check if an un-resolved alert already exists for the same type & location
    const existing = await Alert.findOne({
      type,
      location,
      status: { $in: ['NEW', 'ACKNOWLEDGED'] }
    });

    if (existing) {
      // Update existing alert timestamp and message rather than creating duplicate
      existing.message = message;
      existing.priority = priority;
      existing.timestamp = new Date();
      await existing.save();
      return { alert: existing, isNew: false };
    }

    const newAlert = new Alert({
      alertId: generateAlertId(),
      type,
      message,
      location,
      priority,
      status: 'NEW',
      timestamp: new Date()
    });

    await newAlert.save();
    logger.warn(`[ALERT RAISED] [${priority}] ${type} at ${location}: ${message}`);
    return { alert: newAlert, isNew: true };
  } catch (err) {
    logger.error(`Failed to trigger alert: ${err.message}`);
    return { error: err.message };
  }
}

/**
 * Acknowledge an alert by ID.
 */
async function acknowledgeAlert(alertId, acknowledgedBy) {
  const alert = await Alert.findOne({ alertId });
  if (!alert) {
    throw new Error('Alert not found');
  }
  alert.status = 'ACKNOWLEDGED';
  alert.acknowledgedBy = acknowledgedBy || 'Operator';
  await alert.save();
  logger.info(`Alert ${alertId} acknowledged by ${acknowledgedBy}`);
  return alert;
}

/**
 * Resolve an alert by ID.
 */
async function resolveAlert(alertId, resolvedBy) {
  const alert = await Alert.findOne({ alertId });
  if (!alert) {
    throw new Error('Alert not found');
  }
  alert.status = 'RESOLVED';
  alert.resolvedAt = new Date();
  await alert.save();
  logger.info(`Alert ${alertId} resolved.`);
  return alert;
}

module.exports = {
  triggerAlert,
  acknowledgeAlert,
  resolveAlert
};
