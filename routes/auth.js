const express = require('express');
const { query } = require('../config/database');
const { validateInput, loginSchema } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');
const DataEncryption = require('../utils/encryption');
const { logger } = require('../utils/logger');

const router = express.Router();

// Login
router.post('/login', validateInput(loginSchema), async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kullanıcıyı bul
        const userResult = await query(
            `SELECT u.id, u.email, u.password, u.name, u.role_id, u.is_active, r.name as role_name, r.permissions,
             ARRAY_AGG(ui.institution_id) FILTER (WHERE ui.institution_id IS NOT NULL) as institution_ids
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             LEFT JOIN user_institutions ui ON u.id = ui.user_id
             WHERE u.email = $1
             GROUP BY u.id, r.name, r.permissions`,
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz email veya şifre'
            });
        }

        const user = userResult.rows[0];

        // Kullanıcı aktif mi kontrol et
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Hesabınız deaktif durumda'
            });
        }

        // Şifre kontrolü
        const isValidPassword = await DataEncryption.verifyPassword(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz email veya şifre'
            });
        }

        // JWT token oluştur
        const token = DataEncryption.generateToken({
            userId: user.id,
            email: user.email,
            role: user.role_name
        });

        // Son giriş zamanını güncelle
        await query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Audit log
        await query(
            'INSERT INTO audit_logs (user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [user.id, 'LOGIN', req.ip, req.get('User-Agent')]
        );

        logger.info(`User login successful: ${user.email}`, { userId: user.id, ip: req.ip });

        // Token'ı cookie olarak set et
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000, // 24 saat
            path: '/' // Cookie path'i belirt
        });

        res.json({
            success: true,
            message: 'Giriş başarılı',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role_name,
                    permissions: typeof user.permissions === 'string' ?
                        JSON.parse(user.permissions) : user.permissions,
                    institution_ids: user.institution_ids || []
                },
                token
            }
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Logout
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        // Audit log
        await query(
            'INSERT INTO audit_logs (user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
            [req.user.id, 'LOGOUT', req.ip, req.get('User-Agent')]
        );

        logger.info(`User logout: ${req.user.email}`, { userId: req.user.id, ip: req.ip });

        // Cookie'yi temizle
        res.clearCookie('auth_token');

        res.json({
            success: true,
            message: 'Çıkış başarılı'
        });

    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Mevcut kullanıcı bilgilerini getir
router.get('/me', authMiddleware, async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    name: req.user.name,
                    role: req.user.role_name,
                    permissions: req.user.permissions,
                    institution_ids: req.user.institution_ids || []
                }
            }
        });
    } catch (error) {
        logger.error('Get user info error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

module.exports = router;






