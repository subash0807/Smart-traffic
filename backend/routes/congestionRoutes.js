const express = require('express');
const router = express.Router();
const congestionController = require('../controllers/congestionController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', optionalAuth, congestionController.getCongestionRecords);
router.get('/summary', optionalAuth, congestionController.getCongestionSummary);
router.get('/thresholds', optionalAuth, congestionController.getThresholds);

router.put(
  '/thresholds',
  authenticate,
  authorize('admin', 'traffic_admin'),
  congestionController.updateThresholds
);

module.exports = router;
