/**
 * Test Modal Job
 *
 * Her dakika çalışır ve modal mesajı döndürür.
 * Frontend'de modal olarak gösterilecek.
 */

const { logger } = require('../utils/logger');
const { query } = require('../config/database');

async function testModalJob() {
    const jobName = 'testModalJob';

    try {
        logger.info(`🔔 ${jobName} çalışıyor...`);

        // Job istatistiklerini al
        const result = await query(`
            SELECT run_count, success_count
            FROM cron_jobs
            WHERE name = $1
        `, [jobName]);

        const runCount = (result.rows[0] && result.rows[0].run_count) || 0;
        const startTime = new Date();

        // Mesaj oluştur
        const message = {
            title: 'Test Cron Job Çalıştı',
            body: `${startTime.toLocaleString('tr-TR')} itibari ile çalışmaya başladım, ${runCount} kez çalışıyorum.`,
            timestamp: startTime,
            runCount: runCount
        };

        logger.info(`✅ ${jobName} mesajı oluşturuldu:`, message);

        return {
            success: true,
            message,
            runCount,
            timestamp: startTime
        };

    } catch (error) {
        logger.error(`❌ ${jobName} hatası:`, error);
        throw error;
    }
}

module.exports = testModalJob;
