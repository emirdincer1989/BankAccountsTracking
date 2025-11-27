const express = require('express');
const router = express.Router();
const InstitutionController = require('../controllers/InstitutionController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth'); // Varsayılan auth middleware

// Tüm kurumları listele (Sadece Admin ve yetkili kullanıcılar)
router.get('/', authenticateToken, InstitutionController.getAll);

// Yeni kurum ekle (Sadece Admin)
router.post('/', authenticateToken, authorizeRoles('admin', 'super_admin'), InstitutionController.create);

// Kurum güncelle (Sadece Admin)
router.put('/:id', authenticateToken, authorizeRoles('admin', 'super_admin'), InstitutionController.update);

// Kurum sil (Sadece Admin)
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'super_admin'), InstitutionController.delete);

module.exports = router;
