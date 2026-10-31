const Alert = require('../models/Alert');
const alertService = require('../services/alertService');
const auditService = require('../services/auditService');
const db = require('../config/db');
const { mockStore } = require('../services/mockStoreService');

/**
 * Get all alerts with filtering
 * GET /api/alerts
 */
async function getAlerts(req, res, next) {
  try {
    const { priority, type, status, location, startDate, endDate, limit = 50 } = req.query;

    if (!db.getDbStatus().isConnected) {
      let alerts = mockStore.getAlerts();
      if (priority && priority !== 'ALL') alerts = alerts.filter(a => a.severity === priority);
      if (type && type !== 'ALL') alerts = alerts.filter(a => a.type === type);
      return res.status(200).json({
        success: true,
        data: alerts
      });
    }

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

    if (!db.getDbStatus().isConnected) {
      const alert = mockStore.acknowledgeAlert(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Alert acknowledged (Demo Mode).',
        data: alert || { id: req.params.id, acknowledged: true }
      });
    }

    const alert = await alertService.acknowledgeAlert(req.params.id, userName);

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

    if (!db.getDbStatus().isConnected) {
      const alert = mockStore.resolveAlert(req.params.id);
      return res.status(200).json({
        success: true,
        message: 'Alert resolved (Demo Mode).',
        data: alert || { id: req.params.id, resolved: true }
      });
    }

    const alert = await alertService.resolveAlert(req.params.id, userName);

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
