/**
 * Email Management Routes
 *
 * Email ayarları ve gönderme işlemleri için API endpoints.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../config/database');
const { logger } = require('../utils/logger');
const { getEmailService } = require('../services/email/EmailService');
const DataEncryption = require('../utils/encryption');
const Joi = require('joi');

/**
 * Middleware: Sadece super_admin erişebilir
 */
const requireSuperAdmin = (req, res, next) => {
    if (req.user.role_name !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Bu işlem için super admin yetkisi gereklidir'
        });
    }
    next();
};

// Tüm route'lar authentication ve super admin gerektirir
router.use(authMiddleware);
router.use(requireSuperAdmin);

/**
 * GET /api/email-management/settings
 * SMTP ayarlarını getir
 */
router.get('/settings', async (req, res) => {
    try {
        // Tablo var mı kontrol et
        const tableCheck = await query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'email_providers'
            )
        `);

        if (!tableCheck.rows[0].exists) {
            logger.warn('email_providers tablosu bulunamadı - migration çalıştırılmalı');
            return res.json({
                success: true,
                data: null,
                message: 'Email ayarları henüz yapılandırılmamış. Lütfen migration çalıştırın.'
            });
        }

        const result = await query(`
            SELECT 
                id,
                name,
                is_active,
                is_default,
                host,
                port,
                secure,
                "user",
                from_email,
                from_name,
                reply_to,
                created_at,
                updated_at
            FROM email_providers
            WHERE is_default = true
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                data: null,
                message: 'Email ayarları henüz yapılandırılmamış'
            });
        }

        const settings = result.rows[0];
        // Şifreyi gösterme
        delete settings.password_encrypted;
        delete settings.password_iv;
        delete settings.password_auth_tag;

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        logger.error('Email ayarları getirme hatası:', error);
        
        // Tablo yoksa daha açıklayıcı mesaj
        if (error.code === '42P01') { // undefined_table
            return res.status(500).json({
                success: false,
                message: 'Email sistemi henüz kurulmamış. Lütfen migration çalıştırın: npm run migrate',
                error: 'email_providers tablosu bulunamadı'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Email ayarları alınırken hata oluştu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * POST /api/email-management/settings
 * SMTP ayarlarını kaydet/güncelle
 */
router.post('/settings', async (req, res) => {
    try {
        // Önce boş string'leri null'a çevir (validation'dan önce)
        if (req.body.reply_to === '') req.body.reply_to = null;
        if (req.body.from_name === '') req.body.from_name = null;

        const schema = Joi.object({
            name: Joi.string().max(100).default('default'),
            host: Joi.string().trim().required(),
            port: Joi.number().integer().min(1).max(65535).required(),
            secure: Joi.boolean().default(false),
            user: Joi.string().email().trim().required(),
            password: Joi.string().min(1).required(),
            from_email: Joi.string().email().trim().required(),
            from_name: Joi.string().max(255).allow(null).optional(),
            reply_to: Joi.string().email().trim().allow(null).optional()
        });

        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });
        
        if (error) {
            logger.error('Email settings validation error:', error.details);
            return res.status(400).json({
                success: false,
                message: 'Geçersiz veri',
                errors: error.details.map(d => d.message)
            });
        }

        // Şifreyi şifrele
        const encryption = new DataEncryption();
        const encryptedPassword = encryption.encrypt(value.password);

        // Mevcut default provider var mı kontrol et
        const existing = await query(`
            SELECT id FROM email_providers WHERE is_default = true LIMIT 1
        `);

        let result;
        if (existing.rows.length > 0) {
            // Güncelle
            result = await query(`
                UPDATE email_providers
                SET 
                    name = $1,
                    host = $2,
                    port = $3,
                    secure = $4,
                    "user" = $5,
                    password_encrypted = $6,
                    password_iv = $7,
                    password_auth_tag = $8,
                    from_email = $9,
                    from_name = $10,
                    reply_to = $11,
                    is_active = true,
                    updated_at = NOW()
                WHERE is_default = true
                RETURNING id, name, host, port, secure, "user", from_email, from_name, reply_to
            `, [
                value.name,
                value.host,
                value.port,
                value.secure,
                value.user,
                encryptedPassword.encrypted,
                encryptedPassword.iv,
                encryptedPassword.authTag,
                value.from_email,
                value.from_name || null,
                value.reply_to || null
            ]);
        } else {
            // Yeni oluştur
            result = await query(`
            INSERT INTO email_providers (
                name,
                host,
                port,
                secure,
                "user",
                password_encrypted,
                password_iv,
                password_auth_tag,
                from_email,
                from_name,
                reply_to,
                is_active,
                is_default
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, true)
                RETURNING id, name, host, port, secure, "user", from_email, from_name, reply_to
            `, [
                value.name,
                value.host,
                value.port,
                value.secure,
                value.user,
                encryptedPassword.encrypted,
                encryptedPassword.iv,
                encryptedPassword.authTag,
                value.from_email,
                value.from_name || null,
                value.reply_to || null
            ]);
        }

        // EmailService'i yeniden yükle
        const emailService = getEmailService();
        await emailService.initializeProvider();

        // Audit log
        await query(`
            INSERT INTO audit_logs (user_id, action, table_name, new_values)
            VALUES ($1, $2, $3, $4)
        `, [
            req.user.id,
            existing.rows.length > 0 ? 'UPDATE_EMAIL_SETTINGS' : 'CREATE_EMAIL_SETTINGS',
            'email_providers',
            JSON.stringify({ name: value.name, host: value.host, from_email: value.from_email })
        ]);

        logger.info(`Email ayarları ${existing.rows.length > 0 ? 'güncellendi' : 'oluşturuldu'} by user ${req.user.id}`);

        res.json({
            success: true,
            message: 'Email ayarları başarıyla kaydedildi',
            data: result.rows[0]
        });

    } catch (error) {
        logger.error('Email ayarları kaydetme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Email ayarları kaydedilirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * POST /api/email-management/test
 * Test emaili gönder
 */
router.post('/test', async (req, res) => {
    try {
        const schema = Joi.object({
            to: Joi.string().email().required()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz email adresi',
                errors: error.details.map(d => d.message)
            });
        }

        const emailService = getEmailService();
        
        // Test emaili gönder
        const result = await emailService.sendDirect({
            to: value.to,
            subject: 'Test Email - RBUMS',
            body_html: `
                <h1>Test Email</h1>
                <p>Bu bir test emailidir.</p>
                <p>Email sistemi başarıyla çalışıyor!</p>
                <p>Gönderim zamanı: ${new Date().toLocaleString('tr-TR')}</p>
            `,
            body_text: 'Bu bir test emailidir. Email sistemi başarıyla çalışıyor!'
        });

        logger.info(`Test emaili gönderildi: ${value.to} by user ${req.user.id}`);

        res.json({
            success: true,
            message: 'Test emaili başarıyla gönderildi',
            data: result
        });

    } catch (error) {
        logger.error('Test email gönderme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Test emaili gönderilirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * POST /api/email-management/send
 * Manuel email gönder (kullanıcı seçimi + içerik)
 */
router.post('/send', async (req, res) => {
    try {
        const schema = Joi.object({
            user_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
            subject: Joi.string().max(500).required(),
            body_html: Joi.string().required(),
            body_text: Joi.string().optional(),
            priority: Joi.number().integer().min(1).max(10).default(5)
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz veri',
                errors: error.details.map(d => d.message)
            });
        }

        // Kullanıcıları al
        const userIds = value.user_ids;
        const usersResult = await query(`
            SELECT id, email, name FROM users WHERE id = ANY($1::int[])
        `, [userIds]);

        if (usersResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Seçilen kullanıcılar bulunamadı'
            });
        }

        const emailService = getEmailService();
        const queueResults = [];

        // Her kullanıcı için email queue'ya ekle
        for (const user of usersResult.rows) {
            if (!user.email) {
                logger.warn(`Kullanıcı ${user.id} için email adresi yok, atlanıyor`);
                continue;
            }

            try {
                const result = await emailService.send({
                    to: user.email,
                    subject: value.subject,
                    body_html: value.body_html,
                    body_text: value.body_text || emailService.htmlToText(value.body_html)
                }, {
                    priority: value.priority,
                    user_id: user.id,
                    metadata: {
                        manual_send: true,
                        sent_by: req.user.id,
                        sent_by_name: req.user.name
                    }
                });

                queueResults.push({
                    userId: user.id,
                    email: user.email,
                    success: true,
                    queueId: result.queueId
                });

            } catch (error) {
                queueResults.push({
                    userId: user.id,
                    email: user.email,
                    success: false,
                    error: error.message
                });
            }
        }

        const successCount = queueResults.filter(r => r.success).length;
        const failCount = queueResults.filter(r => !r.success).length;

        // Audit log
        await query(`
            INSERT INTO audit_logs (user_id, action, table_name, new_values)
            VALUES ($1, $2, $3, $4)
        `, [
            req.user.id,
            'SEND_MANUAL_EMAIL',
            'email_queue',
            JSON.stringify({
                user_count: userIds.length,
                success_count: successCount,
                fail_count: failCount,
                subject: value.subject
            })
        ]);

        logger.info(`Manuel email gönderildi: ${successCount} başarılı, ${failCount} başarısız by user ${req.user.id}`);

        res.json({
            success: true,
            message: `${successCount} email queue'ya eklendi${failCount > 0 ? `, ${failCount} başarısız` : ''}`,
            data: {
                total: usersResult.rows.length,
                success: successCount,
                failed: failCount,
                results: queueResults
            }
        });

    } catch (error) {
        logger.error('Manuel email gönderme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Email gönderilirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * GET /api/email-management/logs
 * Email gönderim loglarını getir
 */
router.get('/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const status = req.query.status; // sent, failed
        const userId = req.query.user_id;

        let whereClause = '';
        const params = [limit, offset];
        let paramIndex = 3;

        if (status) {
            whereClause += `WHERE status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (userId) {
            whereClause += whereClause ? ' AND ' : 'WHERE ';
            whereClause += `user_id = $${paramIndex}`;
            params.push(userId);
            paramIndex++;
        }

        const logs = await query(`
            SELECT 
                el.id,
                el.queue_id,
                el.user_id,
                u.name as user_name,
                u.email as user_email,
                el.to_email,
                el.from_email,
                el.subject,
                el.status,
                el.sent_at,
                el.failed_at,
                el.provider_message_id,
                el.error_message,
                el.error_code,
                el.created_at
            FROM email_logs el
            LEFT JOIN users u ON el.user_id = u.id
            ${whereClause}
            ORDER BY el.created_at DESC
            LIMIT $1 OFFSET $2
        `, params);

        const totalCount = await query(`
            SELECT COUNT(*) as count
            FROM email_logs
            ${whereClause}
        `, params.slice(2));

        res.json({
            success: true,
            data: {
                logs: logs.rows,
                pagination: {
                    limit,
                    offset,
                    total: parseInt(totalCount.rows[0].count)
                }
            }
        });

    } catch (error) {
        logger.error('Email logları getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Email logları alınırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * GET /api/email-management/queue
 * Email queue durumunu getir
 */
router.get('/queue', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const status = req.query.status; // pending, processing, sent, failed

        let whereClause = '';
        const params = [limit, offset];
        let paramIndex = 3;

        if (status) {
            whereClause += `WHERE status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        const queue = await query(`
            SELECT 
                eq.id,
                eq.user_id,
                u.name as user_name,
                u.email as user_email,
                eq.to_email,
                eq.subject,
                eq.status,
                eq.priority,
                eq.retry_count,
                eq.max_retries,
                eq.scheduled_at,
                eq.sent_at,
                eq.failed_at,
                eq.error_message,
                eq.created_at,
                eq.updated_at
            FROM email_queue eq
            LEFT JOIN users u ON eq.user_id = u.id
            ${whereClause}
            ORDER BY eq.priority DESC, eq.scheduled_at ASC
            LIMIT $1 OFFSET $2
        `, params);

        const totalCount = await query(`
            SELECT COUNT(*) as count
            FROM email_queue
            ${whereClause}
        `, params.slice(2));

        // İstatistikler
        const stats = await query(`
            SELECT 
                status,
                COUNT(*) as count
            FROM email_queue
            GROUP BY status
        `);

        res.json({
            success: true,
            data: {
                queue: queue.rows,
                stats: stats.rows.reduce((acc, row) => {
                    acc[row.status] = parseInt(row.count);
                    return acc;
                }, {}),
                pagination: {
                    limit,
                    offset,
                    total: parseInt(totalCount.rows[0].count)
                }
            }
        });

    } catch (error) {
        logger.error('Email queue getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Email queue alınırken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;

