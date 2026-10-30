const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateEmergencyRequest } = require('../middleware/validationMiddleware');

router.get('/', optionalAuth, emergencyController.getEmergencyRequests);

router.post(
  '/',
  authenticate,
  authorize('admin', 'traffic_admin', 'officer'),
  validateEmergencyRequest,
  emergencyController.createEmergencyRequest
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'traffic_admin'),
  emergencyController.updateEmergencyRequest
);

module.exports = router;
