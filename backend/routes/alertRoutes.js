const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', optionalAuth, alertController.getAlerts);

router.put(
  '/:id/acknowledge',
  authenticate,
  authorize('admin', 'traffic_admin', 'officer'),
  alertController.acknowledgeAlert
);

router.put(
  '/:id/resolve',
  authenticate,
  authorize('admin', 'traffic_admin', 'officer'),
  alertController.resolveAlert
);

module.exports = router;
