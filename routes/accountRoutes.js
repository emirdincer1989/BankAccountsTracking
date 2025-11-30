const express = require('express');
const router = express.Router();
const AccountController = require('../controllers/AccountController');
const { authMiddleware, authorizeRoles } = require('../middleware/auth');

// Yeni hesap ekle (Admin veya Kurum Yöneticisi)
router.post('/', authMiddleware, authorizeRoles('admin', 'super_admin', 'institution_manager'), AccountController.create);

// Manuel senkronizasyon tetikle
router.post('/:id/sync', authMiddleware, AccountController.sync);

// Kuruma ait hesapları getir
router.get('/institution/:institutionId', authMiddleware, AccountController.listByInstitution);

module.exports = router;
