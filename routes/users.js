const express = require('express');
const { query } = require('../config/database');
const { validateInput, userSchema, userUpdateSchema } = require('../middleware/validation');
const { authMiddleware, authorize } = require('../middleware/auth');
const DataEncryption = require('../utils/encryption');
const { logger } = require('../utils/logger');

const router = express.Router();

// Tüm route'lar authentication gerektirir
router.use(authMiddleware);

// Kullanıcı listesi - sadece admin ve finans admin
router.get('/', authorize(['users.view']), async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE u.is_active = true';
        let queryParams = [];
        
        if (search) {
            whereClause += ' AND (u.name ILIKE $3 OR u.email ILIKE $3)';
            queryParams = [limit, offset, `%${search}%`];
        } else {
            queryParams = [limit, offset];
        }
        
        const usersResult = await query(
            `SELECT u.id, u.email, u.name, u.role_id, u.is_active, u.last_login, u.created_at,
                    r.name as role_name, r.description as role_description
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             ${whereClause}
             ORDER BY u.created_at DESC 
             LIMIT $1 OFFSET $2`,
            queryParams
        );
        
        // Toplam kullanıcı sayısı
        const countResult = await query(
            `SELECT COUNT(*) as total 
             FROM users u 
             ${whereClause}`,
            search ? [`%${search}%`] : []
        );
        
        res.json({
            success: true,
            data: {
                users: usersResult.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(countResult.rows[0].total),
                    pages: Math.ceil(countResult.rows[0].total / limit)
                }
            }
        });
        
    } catch (error) {
        logger.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Kullanıcı detayı
router.get('/:id', authorize(['users.view']), async (req, res) => {
    try {
        const { id } = req.params;
        
        const userResult = await query(
            `SELECT u.id, u.email, u.name, u.role_id, u.is_active, u.last_login, u.created_at, u.updated_at,
                    r.name as role_name, r.description as role_description, r.permissions
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             WHERE u.id = $1 AND u.is_active = true`,
            [id]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }
        
        const user = userResult.rows[0];
        user.permissions = typeof user.permissions === 'string' ? 
            JSON.parse(user.permissions) : user.permissions;
        
        res.json({
            success: true,
            data: { user }
        });
        
    } catch (error) {
        logger.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Yeni kullanıcı oluştur - sadece admin
router.post('/', authorize(['users.create']), validateInput(userSchema), async (req, res) => {
    try {
        const { email, password, name, role_id } = req.body;
        
        // Email zaten var mı kontrol et (sadece aktif kullanıcılar)
        const existingUser = await query(
            'SELECT id FROM users WHERE email = $1 AND is_active = true',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Bu email adresi zaten kullanılıyor'
            });
        }
        
        // Rol var mı kontrol et
        const roleResult = await query(
            'SELECT id FROM roles WHERE id = $1 AND is_active = true',
            [role_id]
        );
        
        if (roleResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz rol'
            });
        }
        
        // Şifreyi hashle
        const hashedPassword = await DataEncryption.hashPassword(password);
        
        // Kullanıcıyı oluştur
        const newUserResult = await query(
            'INSERT INTO users (email, password, name, role_id) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role_id, is_active, created_at',
            [email, hashedPassword, name, role_id]
        );
        
        // Audit log
        await query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [req.user.id, 'CREATE', 'users', newUserResult.rows[0].id, JSON.stringify(newUserResult.rows[0]), req.ip, req.get('User-Agent')]
        );
        
        logger.info(`User created: ${email}`, { 
            createdBy: req.user.id, 
            newUserId: newUserResult.rows[0].id,
            ip: req.ip 
        });
        
        res.status(201).json({
            success: true,
            message: 'Kullanıcı başarıyla oluşturuldu',
            data: { user: newUserResult.rows[0] }
        });
        
    } catch (error) {
        logger.error('Create user error:', error);

        // PostgreSQL unique constraint hatası
        if (error.code === '23505' && error.constraint === 'users_email_key') {
            return res.status(400).json({
                success: false,
                message: 'Bu email adresi zaten kullanılıyor'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Sunucu hatası',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Kullanıcı güncelle - sadece admin
router.put('/:id', authorize(['users.edit']), validateInput(userUpdateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { email, name, role_id, is_active } = req.body;
        
        // Kullanıcı var mı kontrol et
        const existingUser = await query(
            'SELECT * FROM users WHERE id = $1 AND is_active = true',
            [id]
        );
        
        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }
        
        // Email değişiyorsa, yeni email zaten var mı kontrol et (sadece aktif kullanıcılar)
        if (email && email !== existingUser.rows[0].email) {
            const emailCheck = await query(
                'SELECT id FROM users WHERE email = $1 AND id != $2 AND is_active = true',
                [email, id]
            );
            
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu email adresi zaten kullanılıyor'
                });
            }
        }
        
        // Rol değişiyorsa, rol var mı kontrol et
        if (role_id) {
            const roleResult = await query(
                'SELECT id FROM roles WHERE id = $1 AND is_active = true',
                [role_id]
            );
            
            if (roleResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Geçersiz rol'
                });
            }
        }
        
        // Güncelleme yap
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;
        
        if (email) {
            updateFields.push(`email = $${paramCount++}`);
            updateValues.push(email);
        }
        if (name) {
            updateFields.push(`name = $${paramCount++}`);
            updateValues.push(name);
        }
        if (role_id) {
            updateFields.push(`role_id = $${paramCount++}`);
            updateValues.push(role_id);
        }
        if (typeof is_active === 'boolean') {
            updateFields.push(`is_active = $${paramCount++}`);
            updateValues.push(is_active);
        }
        
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(id);
        
        const updateResult = await query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
            updateValues
        );
        
        // Audit log
        await query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [req.user.id, 'UPDATE', 'users', id, JSON.stringify(existingUser.rows[0]), JSON.stringify(updateResult.rows[0]), req.ip, req.get('User-Agent')]
        );
        
        logger.info(`User updated: ${id}`, { 
            updatedBy: req.user.id, 
            userId: id,
            ip: req.ip 
        });
        
        res.json({
            success: true,
            message: 'Kullanıcı başarıyla güncellendi',
            data: { user: updateResult.rows[0] }
        });
        
    } catch (error) {
        logger.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Kullanıcı sil - sadece admin
router.delete('/:id', authorize(['users.delete']), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kendini silmeye çalışıyor mu kontrol et
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Kendi hesabınızı silemezsiniz'
            });
        }
        
        // Kullanıcı var mı kontrol et
        const existingUser = await query(
            'SELECT * FROM users WHERE id = $1',
            [id]
        );

        if (existingUser.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }

        // Kullanıcıyı hard delete yap (veritabanından tamamen sil)
        await query('DELETE FROM users WHERE id = $1', [id]);
        
        // Audit log
        await query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [req.user.id, 'DELETE', 'users', id, JSON.stringify(existingUser.rows[0]), req.ip, req.get('User-Agent')]
        );
        
        logger.info(`User deleted: ${id}`, {
            deletedBy: req.user.id,
            userId: id,
            ip: req.ip
        });
        
        res.json({
            success: true,
            message: 'Kullanıcı başarıyla silindi'
        });
        
    } catch (error) {
        logger.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

module.exports = router;






