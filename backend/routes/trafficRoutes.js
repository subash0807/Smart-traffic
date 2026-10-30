const express = require('express');
const router = express.Router();
const trafficController = require('../controllers/trafficController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateTrafficInput } = require('../middleware/validationMiddleware');

// Public/authenticated reading routes
router.get('/', optionalAuth, trafficController.getTrafficRecords);
router.get('/latest/junctions', optionalAuth, trafficController.getLatestJunctionTraffic);
router.get('/:id', optionalAuth, trafficController.getTrafficById);

// Protected modification routes
router.post(
  '/',
  authenticate,
  authorize('admin', 'traffic_admin', 'officer'),
  validateTrafficInput,
  trafficController.createTrafficRecord
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'traffic_admin', 'officer'),
  trafficController.updateTrafficRecord
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'traffic_admin'),
  trafficController.deleteTrafficRecord
);

module.exports = router;
