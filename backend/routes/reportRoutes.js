const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.get('/summary', optionalAuth, reportController.getReportSummary);
router.get('/traffic', optionalAuth, reportController.getReportSummary);
router.get('/export', optionalAuth, reportController.exportReportCSV);

module.exports = router;
