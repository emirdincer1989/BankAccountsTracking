/**
 * Email Service
 *
 * Email gönderme servisi - Nodemailer kullanarak SMTP üzerinden email gönderir.
 * Queue sistemi ile email gönderimlerini yönetir.
 */

const nodemailer = require('nodemailer');
const { query } = require('../../config/database');
const { logger } = require('../../utils/logger');
const DataEncryption = require('../../utils/encryption');

class EmailService {
    constructor() {
        this.transporter = null;
        this.currentProvider = null;
    }

    /**
     * Aktif SMTP provider'ı yükle ve transporter oluştur
     */
    async initializeProvider() {
        try {
            // Database'den aktif ve default provider'ı al
            const result = await query(`
                SELECT 
                    id,
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
                    reply_to
                FROM email_providers
                WHERE is_active = true AND is_default = true
                LIMIT 1
            `);

            if (result.rows.length === 0) {
                logger.warn('⚠️  Aktif email provider bulunamadı');
                return false;
            }

            const provider = result.rows[0];
            this.currentProvider = provider;

            // Şifreyi çöz
            let password = null;
            if (provider.password_encrypted && provider.password_iv && provider.password_auth_tag) {
                try {
                    const encryption = new DataEncryption();
                    password = encryption.decrypt({
                        encrypted: provider.password_encrypted,
                        iv: provider.password_iv,
                        authTag: provider.password_auth_tag
                    });
                } catch (error) {
                    logger.error('Email provider şifre çözme hatası:', error);
                    return false;
                }
            }

            // Nodemailer transporter oluştur
            this.transporter = nodemailer.createTransport({
                host: provider.host,
                port: provider.port,
                secure: provider.secure, // true for 465, false for other ports
                auth: {
                    user: provider.user,
                    pass: password
                }
            });

            // Bağlantıyı test et
            await this.transporter.verify();
            logger.info('✅ Email provider başarıyla yüklendi:', provider.name);

            return true;

        } catch (error) {
            logger.error('❌ Email provider yükleme hatası:', error);
            this.transporter = null;
            return false;
        }
    }

    /**
     * Email gönder (hemen gönderir, queue'ya eklemez)
     * @param {Object} emailData - Email bilgileri
     * @returns {Promise<Object>} Gönderim sonucu
     */
    async sendDirect(emailData) {
        const { to, subject, body_html, body_text, from_email, from_name, reply_to } = emailData;

        try {
            // Provider yüklü değilse yükle
            if (!this.transporter) {
                const initialized = await this.initializeProvider();
                if (!initialized) {
                    throw new Error('Email provider yüklenemedi');
                }
            }

            // Default from bilgilerini al
            const fromEmail = from_email || this.currentProvider.from_email;
            const fromName = from_name || this.currentProvider.from_name;
            const replyTo = reply_to || this.currentProvider.reply_to || fromEmail;

            // Email gönder
            const info = await this.transporter.sendMail({
                from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
                to: to,
                replyTo: replyTo,
                subject: subject,
                html: body_html,
                text: body_text || this.htmlToText(body_html)
            });

            logger.info(`✅ Email gönderildi: ${to} - Message ID: ${info.messageId}`);

            return {
                success: true,
                messageId: info.messageId,
                response: info.response
            };

        } catch (error) {
            logger.error('❌ Email gönderme hatası:', error);
            throw error;
        }
    }

    /**
     * Email'i queue'ya ekle (asenkron gönderim)
     * @param {Object} emailData - Email bilgileri
     * @param {Object} options - Ek seçenekler (priority, scheduled_at, user_id)
     * @returns {Promise<Object>} Queue kaydı
     */
    async send(emailData, options = {}) {
        const {
            to,
            subject,
            body_html,
            body_text,
            from_email,
            from_name,
            reply_to
        } = emailData;

        const {
            priority = 5,
            scheduled_at = null,
            user_id = null,
            metadata = {}
        } = options;

        try {
            // Provider ID'yi al
            if (!this.currentProvider) {
                await this.initializeProvider();
            }

            const providerId = this.currentProvider ? this.currentProvider.id : null;

            // Default from bilgilerini al
            const fromEmail = from_email || (this.currentProvider ? this.currentProvider.from_email : null);
            const fromName = from_name || (this.currentProvider ? this.currentProvider.from_name : null);
            const replyTo = reply_to || (this.currentProvider ? this.currentProvider.reply_to : null) || fromEmail;

            // Queue'ya ekle
            const result = await query(`
                INSERT INTO email_queue (
                    user_id,
                    to_email,
                    from_email,
                    from_name,
                    reply_to,
                    subject,
                    body_html,
                    body_text,
                    priority,
                    scheduled_at,
                    provider_id,
                    metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING id
            `, [
                user_id,
                to,
                fromEmail,
                fromName,
                replyTo,
                subject,
                body_html,
                body_text,
                priority,
                scheduled_at || new Date(),
                providerId,
                JSON.stringify(metadata)
            ]);

            const queueId = result.rows[0].id;

            logger.info(`📧 Email queue'ya eklendi: ${to} (Queue ID: ${queueId})`);

            return {
                success: true,
                queueId: queueId,
                message: 'Email queue\'ya eklendi'
            };

        } catch (error) {
            logger.error('❌ Email queue\'ya ekleme hatası:', error);
            throw error;
        }
    }

    /**
     * Queue'daki pending emailleri işle
     * @param {Number} limit - İşlenecek maksimum email sayısı
     * @returns {Promise<Object>} İşlem sonucu
     */
    async processQueue(limit = 50) {
        try {
            // Provider yüklü değilse yükle
            if (!this.transporter) {
                const initialized = await this.initializeProvider();
                if (!initialized) {
                    logger.warn('⚠️  Email provider yüklenemedi, queue işlenemiyor');
                    return { success: false, processed: 0, failed: 0 };
                }
            }

            // Pending emailleri al (priority'ye göre sıralı)
            const result = await query(`
                SELECT 
                    id,
                    user_id,
                    to_email,
                    from_email,
                    from_name,
                    reply_to,
                    subject,
                    body_html,
                    body_text,
                    retry_count,
                    max_retries
                FROM email_queue
                WHERE status = 'pending'
                  AND scheduled_at <= NOW()
                ORDER BY priority DESC, scheduled_at ASC
                LIMIT $1
            `, [limit]);

            const emails = result.rows;
            let processed = 0;
            let failed = 0;

            for (const email of emails) {
                try {
                    // Status'u processing yap
                    await query(`
                        UPDATE email_queue
                        SET status = 'processing', updated_at = NOW()
                        WHERE id = $1
                    `, [email.id]);

                    // Email gönder
                    const sendResult = await this.sendDirect({
                        to: email.to_email,
                        subject: email.subject,
                        body_html: email.body_html,
                        body_text: email.body_text,
                        from_email: email.from_email,
                        from_name: email.from_name,
                        reply_to: email.reply_to
                    });

                    // Başarılı - status'u sent yap ve log'a ekle
                    await query(`
                        UPDATE email_queue
                        SET 
                            status = 'sent',
                            sent_at = NOW(),
                            provider_message_id = $1,
                            updated_at = NOW()
                        WHERE id = $2
                    `, [sendResult.messageId, email.id]);

                    // Log'a ekle
                    await query(`
                        INSERT INTO email_logs (
                            queue_id,
                            user_id,
                            to_email,
                            from_email,
                            subject,
                            status,
                            sent_at,
                            provider_id,
                            provider_message_id
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    `, [
                        email.id,
                        email.user_id,
                        email.to_email,
                        email.from_email,
                        email.subject,
                        'sent',
                        new Date(),
                        this.currentProvider.id,
                        sendResult.messageId
                    ]);

                    processed++;
                    logger.info(`✅ Email gönderildi: ${email.to_email} (Queue ID: ${email.id})`);

                } catch (error) {
                    failed++;
                    const retryCount = email.retry_count + 1;
                    const maxRetries = email.max_retries;

                    if (retryCount >= maxRetries) {
                        // Max retry aşıldı - failed olarak işaretle
                        await query(`
                            UPDATE email_queue
                            SET 
                                status = 'failed',
                                failed_at = NOW(),
                                retry_count = $1,
                                error_message = $2,
                                error_code = $3,
                                updated_at = NOW()
                            WHERE id = $4
                        `, [retryCount, error.message, 'SEND_FAILED', email.id]);

                        // Log'a ekle
                        await query(`
                            INSERT INTO email_logs (
                                queue_id,
                                user_id,
                                to_email,
                                from_email,
                                subject,
                                status,
                                failed_at,
                                provider_id,
                                error_message,
                                error_code
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        `, [
                            email.id,
                            email.user_id,
                            email.to_email,
                            email.from_email,
                            email.subject,
                            'failed',
                            new Date(),
                            this.currentProvider.id,
                            error.message,
                            'SEND_FAILED'
                        ]);

                        logger.error(`❌ Email gönderilemedi (max retry): ${email.to_email} - ${error.message}`);

                    } else {
                        // Retry yapılacak - pending'e geri al
                        await query(`
                            UPDATE email_queue
                            SET 
                                status = 'pending',
                                retry_count = $1,
                                error_message = $2,
                                error_code = $3,
                                updated_at = NOW()
                            WHERE id = $4
                        `, [retryCount, error.message, 'RETRY', email.id]);

                        logger.warn(`⚠️  Email retry yapılacak: ${email.to_email} (${retryCount}/${maxRetries})`);
                    }
                }
            }

            return {
                success: true,
                processed: processed,
                failed: failed,
                total: emails.length
            };

        } catch (error) {
            logger.error('❌ Queue işleme hatası:', error);
            throw error;
        }
    }

    /**
     * HTML'i text'e çevir (basit versiyon)
     */
    htmlToText(html) {
        if (!html) return '';
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
    }
}

// Singleton instance
let emailServiceInstance = null;

function getEmailService() {
    if (!emailServiceInstance) {
        emailServiceInstance = new EmailService();
    }
    return emailServiceInstance;
}

module.exports = {
    EmailService,
    getEmailService
};

