const express = require('express');
const router = express.Router();
const InstitutionController = require('../controllers/InstitutionController');
const { authMiddleware, authorizeRoles } = require('../middleware/auth');

// Tüm kurumları listele (Sadece Admin ve yetkili kullanıcılar)
router.get('/', authMiddleware, InstitutionController.getAll);

// Yeni kurum ekle (Sadece Admin)
router.post('/', authMiddleware, authorizeRoles('admin', 'super_admin'), InstitutionController.create);

// Kurum güncelle (Sadece Admin)
router.put('/:id', authMiddleware, authorizeRoles('admin', 'super_admin'), InstitutionController.update);

// Kurum sil (Sadece Admin)
router.delete('/:id', authMiddleware, authorizeRoles('admin', 'super_admin'), InstitutionController.delete);

module.exports = router;
