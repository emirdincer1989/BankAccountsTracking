const express = require('express');
const router = express.Router();
const AccountController = require('../controllers/AccountController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Yeni hesap ekle (Admin veya Kurum Yöneticisi)
router.post('/', authenticateToken, authorizeRoles('admin', 'super_admin', 'institution_manager'), AccountController.create);

// Manuel senkronizasyon tetikle
router.post('/:id/sync', authenticateToken, AccountController.sync);

// Kuruma ait hesapları getir
router.get('/institution/:institutionId', authenticateToken, AccountController.listByInstitution);

module.exports = router;
