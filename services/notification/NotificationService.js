/**
 * Notification Service
 *
 * Bildirim gönderme servisi - Kullanıcılara bildirim gönderir ve okunma durumunu takip eder.
 * Socket.io ile real-time bildirim desteği sağlar.
 */

const { query } = require('../../config/database');
const { logger } = require('../../utils/logger');

class NotificationService {
    constructor() {
        // Socket.io instance'ı global'den al
        this.io = global.io;
    }

    /**
     * Bildirim gönder (tek kullanıcıya)
     * @param {Object} notificationData - Bildirim bilgileri
     * @param {number} notificationData.user_id - Alıcı kullanıcı ID
     * @param {string} notificationData.title - Bildirim başlığı
     * @param {string} notificationData.message - Bildirim mesajı
     * @param {string} notificationData.type - Bildirim tipi (info, success, warning, error)
     * @param {string} notificationData.link - Opsiyonel link
     * @param {number} notificationData.sent_by - Gönderen kullanıcı ID
     * @param {Object} notificationData.metadata - Ek metadata
     * @returns {Promise<Object>} Gönderim sonucu
     */
    async send(notificationData) {
        const {
            user_id,
            title,
            message,
            type = 'info',
            link = null,
            sent_by = null,
            metadata = {}
        } = notificationData;

        try {
            // Bildirimi veritabanına kaydet
            const result = await query(`
                INSERT INTO notifications (
                    user_id,
                    title,
                    message,
                    type,
                    link,
                    sent_by,
                    metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, created_at
            `, [
                user_id,
                title,
                message,
                type,
                link,
                sent_by,
                JSON.stringify(metadata)
            ]);

            const notification = result.rows[0];

            // Socket.io ile real-time bildirim gönder
            if (this.io) {
                this.io.to(`user_${user_id}`).emit('notification', {
                    id: notification.id,
                    title,
                    message,
                    type,
                    link,
                    created_at: notification.created_at
                });
            }

            logger.info(`✅ Bildirim gönderildi: User ${user_id} - ${title}`);

            return {
                success: true,
                notificationId: notification.id,
                message: 'Bildirim başarıyla gönderildi'
            };

        } catch (error) {
            logger.error('❌ Bildirim gönderme hatası:', error);
            throw error;
        }
    }

    /**
     * Toplu bildirim gönder (birden fazla kullanıcıya)
     * @param {Object} notificationData - Bildirim bilgileri
     * @param {Array<number>} notificationData.user_ids - Alıcı kullanıcı ID'leri
     * @param {string} notificationData.title - Bildirim başlığı
     * @param {string} notificationData.message - Bildirim mesajı
     * @param {string} notificationData.type - Bildirim tipi
     * @param {string} notificationData.link - Opsiyonel link
     * @param {number} notificationData.sent_by - Gönderen kullanıcı ID
     * @param {Object} notificationData.metadata - Ek metadata
     * @returns {Promise<Object>} Gönderim sonucu
     */
    async sendBulk(notificationData) {
        const {
            user_ids,
            title,
            message,
            type = 'info',
            link = null,
            sent_by = null,
            metadata = {}
        } = notificationData;

        try {
            // Gönderen bilgisini al
            let sentByName = null;
            if (sent_by) {
                const senderResult = await query(
                    'SELECT name FROM users WHERE id = $1',
                    [sent_by]
                );
                if (senderResult.rows.length > 0) {
                    sentByName = senderResult.rows[0].name;
                }
            }

            // Her kullanıcı için bildirim oluştur
            const notifications = [];
            let successCount = 0;
            let failCount = 0;

            for (const userId of user_ids) {
                try {
                    const result = await query(`
                        INSERT INTO notifications (
                            user_id,
                            title,
                            message,
                            type,
                            link,
                            sent_by,
                            metadata
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING id, created_at
                    `, [
                        userId,
                        title,
                        message,
                        type,
                        link,
                        sent_by,
                        JSON.stringify(metadata)
                    ]);

                    const notification = result.rows[0];
                    notifications.push({
                        userId,
                        notificationId: notification.id,
                        success: true
                    });

                    // Socket.io ile real-time bildirim gönder
                    if (this.io) {
                        this.io.to(`user_${userId}`).emit('notification', {
                            id: notification.id,
                            title,
                            message,
                            type,
                            link,
                            created_at: notification.created_at
                        });
                    }

                    successCount++;

                } catch (error) {
                    logger.error(`❌ Bildirim gönderme hatası (User ${userId}):`, error);
                    notifications.push({
                        userId,
                        success: false,
                        error: error.message
                    });
                    failCount++;
                }
            }

            // Log kaydı oluştur
            await query(`
                INSERT INTO notification_logs (
                    sent_by,
                    sent_by_name,
                    title,
                    message,
                    type,
                    recipient_count,
                    recipient_user_ids,
                    sent_count,
                    metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                sent_by,
                sentByName,
                title,
                message,
                type,
                user_ids.length,
                user_ids,
                successCount,
                JSON.stringify(metadata)
            ]);

            logger.info(`✅ Toplu bildirim gönderildi: ${successCount} başarılı, ${failCount} başarısız`);

            return {
                success: true,
                total: user_ids.length,
                successCount,
                failCount,
                notifications
            };

        } catch (error) {
            logger.error('❌ Toplu bildirim gönderme hatası:', error);
            throw error;
        }
    }

    /**
     * Bildirimi okundu olarak işaretle
     * @param {number} notificationId - Bildirim ID
     * @param {number} userId - Kullanıcı ID (güvenlik için)
     * @returns {Promise<Object>} Güncelleme sonucu
     */
    async markAsRead(notificationId, userId) {
        try {
            const result = await query(`
                UPDATE notifications
                SET 
                    is_read = true,
                    read_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1 AND user_id = $2 AND is_read = false
                RETURNING id
            `, [notificationId, userId]);

            if (result.rows.length === 0) {
                return {
                    success: false,
                    message: 'Bildirim bulunamadı veya zaten okunmuş'
                };
            }

            logger.info(`✅ Bildirim okundu olarak işaretlendi: ${notificationId} (User: ${userId})`);

            return {
                success: true,
                message: 'Bildirim okundu olarak işaretlendi'
            };

        } catch (error) {
            logger.error('❌ Bildirim okundu işaretleme hatası:', error);
            throw error;
        }
    }

    /**
     * Tüm bildirimleri okundu olarak işaretle
     * @param {number} userId - Kullanıcı ID
     * @returns {Promise<Object>} Güncelleme sonucu
     */
    async markAllAsRead(userId) {
        try {
            const result = await query(`
                UPDATE notifications
                SET 
                    is_read = true,
                    read_at = NOW(),
                    updated_at = NOW()
                WHERE user_id = $1 AND is_read = false
                RETURNING COUNT(*) as count
            `, [userId]);

            const count = result.rows.length > 0 ? parseInt(result.rows[0].count) : 0;

            logger.info(`✅ Tüm bildirimler okundu olarak işaretlendi: ${count} bildirim (User: ${userId})`);

            return {
                success: true,
                count,
                message: `${count} bildirim okundu olarak işaretlendi`
            };

        } catch (error) {
            logger.error('❌ Tüm bildirimleri okundu işaretleme hatası:', error);
            throw error;
        }
    }

    /**
     * Kullanıcının bildirimlerini getir
     * @param {number} userId - Kullanıcı ID
     * @param {Object} options - Seçenekler (limit, offset, is_read)
     * @returns {Promise<Object>} Bildirimler
     */
    async getUserNotifications(userId, options = {}) {
        const {
            limit = 50,
            offset = 0,
            is_read = null // null = tümü, true = sadece okunmuş, false = sadece okunmamış
        } = options;

        try {
            let whereClause = 'WHERE user_id = $1';
            const params = [userId];
            let paramIndex = 2;

            if (is_read !== null) {
                whereClause += ` AND is_read = $${paramIndex}`;
                params.push(is_read);
                paramIndex++;
            }

            // Bildirimleri getir
            const notificationsResult = await query(`
                SELECT 
                    id,
                    title,
                    message,
                    type,
                    link,
                    is_read,
                    read_at,
                    sent_by,
                    created_at,
                    metadata
                FROM notifications
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `, [...params, limit, offset]);

            // Toplam sayıyı getir
            const countResult = await query(`
                SELECT COUNT(*) as count
                FROM notifications
                ${whereClause}
            `, params);

            // Okunmamış sayısını getir
            const unreadCountResult = await query(`
                SELECT COUNT(*) as count
                FROM notifications
                WHERE user_id = $1 AND is_read = false
            `, [userId]);

            return {
                success: true,
                notifications: notificationsResult.rows,
                pagination: {
                    limit,
                    offset,
                    total: parseInt(countResult.rows[0].count)
                },
                unreadCount: parseInt(unreadCountResult.rows[0].count)
            };

        } catch (error) {
            logger.error('❌ Bildirimler getirme hatası:', error);
            throw error;
        }
    }

    /**
     * Bildirim istatistiklerini getir (admin için)
     * @param {Object} options - Seçenekler (limit, offset, sent_by)
     * @returns {Promise<Object>} İstatistikler
     */
    async getNotificationStats(options = {}) {
        const {
            limit = 50,
            offset = 0,
            sent_by = null
        } = options;

        try {
            let whereClause = '';
            const params = [];
            let paramIndex = 1;

            if (sent_by) {
                whereClause = 'WHERE sent_by = $1';
                params.push(sent_by);
                paramIndex = 2;
            }

            // Log kayıtlarını getir
            const logsResult = await query(`
                SELECT 
                    id,
                    sent_by,
                    sent_by_name,
                    title,
                    message,
                    type,
                    recipient_count,
                    recipient_user_ids,
                    sent_count,
                    read_count,
                    created_at,
                    metadata
                FROM notification_logs
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `, [...params, limit, offset]);

            // Toplam sayıyı getir
            const countResult = await query(`
                SELECT COUNT(*) as count
                FROM notification_logs
                ${whereClause}
            `, params);

            // Genel istatistikler
            const statsResult = await query(`
                SELECT 
                    COUNT(*) as total_notifications,
                    COUNT(DISTINCT user_id) as total_users,
                    SUM(CASE WHEN is_read = false THEN 1 ELSE 0 END) as unread_count,
                    SUM(CASE WHEN is_read = true THEN 1 ELSE 0 END) as read_count
                FROM notifications
            `);

            return {
                success: true,
                logs: logsResult.rows,
                pagination: {
                    limit,
                    offset,
                    total: parseInt(countResult.rows[0].count)
                },
                stats: statsResult.rows[0]
            };

        } catch (error) {
            logger.error('❌ Bildirim istatistikleri getirme hatası:', error);
            throw error;
        }
    }

    /**
     * Bildirim log kaydının okunma durumunu güncelle
     * @param {number} logId - Log ID
     * @returns {Promise<void>}
     */
    async updateLogReadCount(logId) {
        try {
            // Log kaydını bul
            const logResult = await query(`
                SELECT recipient_user_ids
                FROM notification_logs
                WHERE id = $1
            `, [logId]);

            if (logResult.rows.length === 0) {
                return;
            }

            const recipientUserIds = logResult.rows[0].recipient_user_ids;

            // Bu log'a ait bildirimlerin okunma sayısını hesapla
            const readCountResult = await query(`
                SELECT COUNT(*) as count
                FROM notifications
                WHERE sent_by = (
                    SELECT sent_by FROM notification_logs WHERE id = $1
                )
                AND title = (SELECT title FROM notification_logs WHERE id = $1)
                AND user_id = ANY($2::int[])
                AND is_read = true
            `, [logId, recipientUserIds]);

            const readCount = parseInt(readCountResult.rows[0].count);

            // Log kaydını güncelle
            await query(`
                UPDATE notification_logs
                SET read_count = $1
                WHERE id = $2
            `, [readCount, logId]);

        } catch (error) {
            logger.error('❌ Log okunma sayısı güncelleme hatası:', error);
            // Hata olsa bile devam et
        }
    }
}

// Singleton instance
let notificationServiceInstance = null;

function getNotificationService() {
    if (!notificationServiceInstance) {
        notificationServiceInstance = new NotificationService();
    }
    return notificationServiceInstance;
}

module.exports = {
    NotificationService,
    getNotificationService
};

