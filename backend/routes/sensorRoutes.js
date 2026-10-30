const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', optionalAuth, sensorController.getSensors);

router.post(
  '/',
  authenticate,
  authorize('admin', 'traffic_admin'),
  sensorController.createSensor
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'traffic_admin'),
  sensorController.updateSensor
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'traffic_admin'),
  sensorController.deleteSensor
);

module.exports = router;
