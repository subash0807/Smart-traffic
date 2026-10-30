const express = require('express');
const router = express.Router();
const signalController = require('../controllers/signalController');
const { authenticate, optionalAuth } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { validateSignalInput } = require('../middleware/validationMiddleware');

router.get('/', optionalAuth, signalController.getSignals);
router.get('/:id', optionalAuth, signalController.getSignalById);

router.post(
  '/',
  authenticate,
  authorize('admin', 'traffic_admin'),
  validateSignalInput,
  signalController.createSignal
);

router.put(
  '/:id',
  authenticate,
  authorize('admin', 'traffic_admin', 'officer'),
  signalController.updateSignal
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'traffic_admin'),
  signalController.deleteSignal
);

module.exports = router;
