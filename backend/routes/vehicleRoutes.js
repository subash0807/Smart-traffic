const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', optionalAuth, vehicleController.getVehicles);

router.post(
  '/',
  authenticate,
  authorize('admin', 'traffic_admin', 'officer'),
  vehicleController.createVehicle
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'traffic_admin', 'officer'),
  vehicleController.updateVehicle
);

module.exports = router;
