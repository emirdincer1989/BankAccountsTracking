/**
 * Notification Management Routes
 *
 * Bildirim gönderme ve yönetim işlemleri için API endpoints.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../config/database');
const { logger } = require('../utils/logger');
const { getNotificationService } = require('../services/notification/NotificationService');
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

// Admin route'ları (super_admin gerektirir)
router.use(authMiddleware);

/**
 * POST /api/notification-management/send
 * Bildirim gönder (kullanıcı seçimi + içerik)
 */
router.post('/send', requireSuperAdmin, async (req, res) => {
    try {
        const schema = Joi.object({
            user_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
            title: Joi.string().max(500).required(),
            message: Joi.string().required(),
            type: Joi.string().valid('info', 'success', 'warning', 'error').default('info'),
            link: Joi.string().max(500).allow(null).optional()
        });

        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz veri',
                errors: error.details.map(d => d.message)
            });
        }

        // Kullanıcıları kontrol et
        const userIds = value.user_ids;
        const usersResult = await query(`
            SELECT id, name FROM users WHERE id = ANY($1::int[])
        `, [userIds]);

        if (usersResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Seçilen kullanıcılar bulunamadı'
            });
        }

        const notificationService = getNotificationService();

        // Toplu bildirim gönder
        const result = await notificationService.sendBulk({
            user_ids: userIds,
            title: value.title,
            message: value.message,
            type: value.type,
            link: value.link || null,
            sent_by: req.user.id,
            metadata: {
                manual_send: true,
                sent_by_name: req.user.name
            }
        });

        // Audit log
        await query(`
            INSERT INTO audit_logs (user_id, action, table_name, new_values)
            VALUES ($1, $2, $3, $4)
        `, [
            req.user.id,
            'SEND_NOTIFICATION',
            'notifications',
            JSON.stringify({
                user_count: userIds.length,
                success_count: result.successCount,
                fail_count: result.failCount,
                title: value.title,
                type: value.type
            })
        ]);

        logger.info(`Bildirim gönderildi: ${result.successCount} başarılı, ${result.failCount} başarısız by user ${req.user.id}`);

        res.json({
            success: true,
            message: `${result.successCount} kullanıcıya bildirim gönderildi${result.failCount > 0 ? `, ${result.failCount} başarısız` : ''}`,
            data: result
        });

    } catch (error) {
        logger.error('Bildirim gönderme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim gönderilirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * GET /api/notification-management/stats
 * Bildirim istatistiklerini getir (admin için)
 */
router.get('/stats', requireSuperAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const sent_by = req.query.sent_by ? parseInt(req.query.sent_by) : null;

        const notificationService = getNotificationService();
        const result = await notificationService.getNotificationStats({
            limit,
            offset,
            sent_by
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Bildirim istatistikleri getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim istatistikleri alınırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * GET /api/notification-management/logs/:logId/read-status
 * Bildirim log'unun okunma durumunu güncelle ve getir
 */
router.get('/logs/:logId/read-status', requireSuperAdmin, async (req, res) => {
    try {
        const logId = parseInt(req.params.logId);

        const notificationService = getNotificationService();
        await notificationService.updateLogReadCount(logId);

        // Güncel durumu getir
        const logResult = await query(`
            SELECT 
                id,
                sent_by,
                sent_by_name,
                title,
                recipient_count,
                sent_count,
                read_count,
                created_at
            FROM notification_logs
            WHERE id = $1
        `, [logId]);

        if (logResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Log kaydı bulunamadı'
            });
        }

        res.json({
            success: true,
            data: logResult.rows[0]
        });

    } catch (error) {
        logger.error('Log okunma durumu getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Log okunma durumu alınırken hata oluştu',
            error: error.message
        });
    }
});

// Kullanıcı route'ları (tüm authenticated kullanıcılar erişebilir)

/**
 * GET /api/notification-management/my-notifications
 * Kullanıcının bildirimlerini getir
 */
router.get('/my-notifications', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const is_read = req.query.is_read === 'true' ? true : req.query.is_read === 'false' ? false : null;

        const notificationService = getNotificationService();
        const result = await notificationService.getUserNotifications(req.user.id, {
            limit,
            offset,
            is_read
        });

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        logger.error('Bildirimler getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirimler alınırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * POST /api/notification-management/mark-read/:notificationId
 * Bildirimi okundu olarak işaretle
 */
router.post('/mark-read/:notificationId', async (req, res) => {
    try {
        const notificationId = parseInt(req.params.notificationId);

        const notificationService = getNotificationService();
        const result = await notificationService.markAsRead(notificationId, req.user.id);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        logger.error('Bildirim okundu işaretleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirim okundu işaretlenirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * POST /api/notification-management/mark-all-read
 * Tüm bildirimleri okundu olarak işaretle
 */
router.post('/mark-all-read', async (req, res) => {
    try {
        const notificationService = getNotificationService();
        const result = await notificationService.markAllAsRead(req.user.id);

        res.json({
            success: true,
            message: result.message,
            data: {
                count: result.count
            }
        });

    } catch (error) {
        logger.error('Tüm bildirimleri okundu işaretleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Bildirimler okundu işaretlenirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * GET /api/notification-management/unread-count
 * Okunmamış bildirim sayısını getir
 */
router.get('/unread-count', async (req, res) => {
    try {
        const result = await query(`
            SELECT COUNT(*) as count
            FROM notifications
            WHERE user_id = $1 AND is_read = false
        `, [req.user.id]);

        res.json({
            success: true,
            data: {
                unreadCount: parseInt(result.rows[0].count)
            }
        });

    } catch (error) {
        logger.error('Okunmamış bildirim sayısı getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Okunmamış bildirim sayısı alınırken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;

