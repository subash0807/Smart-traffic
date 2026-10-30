const Alert = require('../models/Alert');
const alertService = require('../services/alertService');
const auditService = require('../services/auditService');

/**
 * Get all alerts with filtering
 * GET /api/alerts
 */
async function getAlerts(req, res, next) {
  try {
    const { priority, type, status, location, startDate, endDate, limit = 50 } = req.query;
    const query = {};

    if (priority && priority !== 'ALL') query.priority = priority;
    if (type && type !== 'ALL') query.type = type;
    if (status && status !== 'ALL') query.status = status;
    if (location) query.location = { $regex: location, $options: 'i' };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const alerts = await Alert.find(query).sort({ timestamp: -1 }).limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      data: alerts
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Acknowledge an alert
 * PUT /api/alerts/:id/acknowledge
 */
async function acknowledgeAlert(req, res, next) {
  try {
    const userName = req.user ? req.user.name : 'Officer';
    const alert = await alertService.acknowledgeAlert(req.params.id, userName);

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName,
      action: 'ALERT_ACKNOWLEDGED',
      resourceType: 'Alert',
      resourceId: alert.alertId,
      newValue: alert.toObject(),
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Alert ${alert.alertId} acknowledged.`,
      data: alert
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Resolve an alert
 * PUT /api/alerts/:id/resolve
 */
async function resolveAlert(req, res, next) {
  try {
    const userName = req.user ? req.user.name : 'Officer';
    const alert = await alertService.resolveAlert(req.params.id, userName);

    await auditService.logAction({
      userId: req.user ? req.user._id.toString() : 'SYSTEM',
      userName,
      action: 'ALERT_RESOLVED',
      resourceType: 'Alert',
      resourceId: alert.alertId,
      newValue: alert.toObject(),
      ipAddress: req.ip
    });

    res.status(200).json({
      success: true,
      message: `Alert ${alert.alertId} resolved.`,
      data: alert
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAlerts,
  acknowledgeAlert,
  resolveAlert
};
