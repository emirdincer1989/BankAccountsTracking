const express = require('express');
const router = express.Router();
const TransactionController = require('../controllers/TransactionController');
const { authMiddleware } = require('../middleware/auth');

// Hareketleri listele
router.get('/', authMiddleware, TransactionController.list);

module.exports = router;
