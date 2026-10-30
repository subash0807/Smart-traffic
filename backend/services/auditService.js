const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Log an administrative or operational event to AuditLog collection.
 */
async function logAction({
  userId = 'SYSTEM',
  userName = 'System Administrator',
  action,
  resourceType,
  resourceId = '',
  previousValue = null,
  newValue = null,
  ipAddress = '127.0.0.1'
}) {
  try {
    const entry = new AuditLog({
      userId,
      userName,
      action,
      resourceType,
      resourceId,
      previousValue,
      newValue,
      ipAddress
    });
    await entry.save();
    logger.info(`[AUDIT] ${userName} performed '${action}' on ${resourceType}:${resourceId}`);
    return entry;
  } catch (err) {
    logger.error(`Failed to record audit log: ${err.message}`);
    // Non-blocking for the caller
    return null;
  }
}

module.exports = {
  logAction
};
