const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/health', systemController.getHealth);

router.post('/simulation/step', optionalAuth, systemController.triggerSimulationStep);
router.post('/simulation/toggle', optionalAuth, systemController.toggleSimulation);

router.get(
  '/audit-logs',
  authenticate,
  authorize('admin', 'traffic_admin'),
  systemController.getAuditLogs
);

router.post('/seed', optionalAuth, systemController.seedDatabaseEndpoint);

module.exports = router;
