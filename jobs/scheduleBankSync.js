const { bankSyncQueue } = require('../services/queue/QueueManager');
const { query } = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Tüm aktif hesapları bulur ve kuyruğa ekler.
 * Bu fonksiyon CronJobManager tarafından çağrılacak.
 */
async function scheduleBankSync() {
    logger.info('🕒 Scheduled Job: Adding bank accounts to sync queue...');

    try {
        // Aktif hesapları çek
        const result = await query('SELECT id, account_name FROM bank_accounts WHERE is_active = true');
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
