const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/ReportController');
const { authMiddleware } = require('../middleware/auth');

router.get('/dashboard', authMiddleware, ReportController.getDashboardStats);

module.exports = router;
