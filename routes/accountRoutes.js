const express = require('express');
const router = express.Router();
const AccountController = require('../controllers/AccountController');
const { authMiddleware, authorizeRoles } = require('../middleware/auth');

// Yeni hesap ekle (Admin veya Kurum Yöneticisi)
router.post('/', authMiddleware, authorizeRoles('admin', 'super_admin', 'institution_manager'), AccountController.create);

// Manuel senkronizasyon tetikle
router.post('/:id/sync', authMiddleware, AccountController.sync);

// Hesapları listele (Otomatik yetki kontrolü)
router.get('/', authMiddleware, AccountController.list);

// Kuruma ait hesapları getir (Spesifik)
router.get('/institution/:institutionId', authMiddleware, AccountController.listByInstitution);

// Hesap sil
router.delete('/:id', authMiddleware, authorizeRoles('admin', 'super_admin', 'institution_manager'), AccountController.delete);

// Tekil hesap getir
router.get('/:id', authMiddleware, AccountController.getOne);

// Hesap güncelle
router.put('/:id', authMiddleware, authorizeRoles('admin', 'super_admin', 'institution_manager'), AccountController.update);

module.exports = router;
