const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/ReportController');
const { authMiddleware } = require('../middleware/auth');

router.get('/dashboard', authMiddleware, ReportController.getDashboardStats);
router.get('/balance-history', authMiddleware, ReportController.getBalanceHistory);

module.exports = router;
