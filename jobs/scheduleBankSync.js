const { bankSyncQueue } = require('../services/queue/QueueManager');
const { Pool } = require('pg');
const { logger } = require('../utils/logger');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

/**
 * Tüm aktif hesapları bulur ve kuyruğa ekler.
 * Bu fonksiyon CronJobManager tarafından çağrılacak.
 */
async function scheduleBankSync() {
    logger.info('🕒 Scheduled Job: Adding bank accounts to sync queue...');

    try {
        // Aktif hesapları çek
        const result = await pool.query('SELECT id, account_name FROM bank_accounts WHERE is_active = true');
        const accounts = result.rows;

        for (const account of accounts) {
            await bankSyncQueue.add('syncAccount', { accountId: account.id }, {
                attempts: 3, // 3 kez dene
                backoff: {
                    type: 'exponential',
                    delay: 5000 // 5sn, 10sn, 20sn...
                },
                removeOnComplete: true, // Başarılı olursa sil (Redis şişmesin)
                removeOnFail: 100 // Son 100 hatayı tut
            });
        }

        logger.info(`✅ ${accounts.length} accounts added to queue.`);
        return { success: true, count: accounts.length };

    } catch (error) {
        logger.error('❌ Schedule Job Error:', error);
        throw error;
    }
}

module.exports = scheduleBankSync;
