/**
 * Email Queue Processor Job
 *
 * Email queue'daki pending emailleri işler ve gönderir.
 * Her 1 dakikada bir çalışır.
 */

const { logger } = require('../utils/logger');
const { getEmailService } = require('../services/email/EmailService');

async function emailQueueProcessor() {
    const jobName = 'emailQueueProcessor';

    try {
        logger.info(`📧 ${jobName} çalışıyor...`);

        const emailService = getEmailService();
        
        // Queue'yu işle (maksimum 50 email)
        const result = await emailService.processQueue(50);

        logger.info(`✅ ${jobName} tamamlandı: ${result.processed} gönderildi, ${result.failed} başarısız`);

        return {
            success: true,
            processed: result.processed,
            failed: result.failed,
            total: result.total,
            timestamp: new Date()
        };

    } catch (error) {
        logger.error(`❌ ${jobName} hatası:`, error);
        throw error;
    }
}

module.exports = emailQueueProcessor;

