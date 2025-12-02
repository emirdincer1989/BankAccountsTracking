const { bankSyncQueue } = require('../services/queue/QueueManager');
const { query } = require('../config/database');
const { logger } = require('../utils/logger');
const AccountService = require('../services/AccountService');

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
        let queuedCount = 0;
        let directRunCount = 0;

        for (const account of accounts) {
            try {
                await bankSyncQueue.add('syncAccount', { accountId: account.id }, {
                    attempts: 3, // 3 kez dene
                    backoff: {
                        type: 'exponential',
                        delay: 5000 // 5sn, 10sn, 20sn...
                    },
                    removeOnComplete: true, // Başarılı olursa sil (Redis şişmesin)
                    removeOnFail: 100 // Son 100 hatayı tut
                });
                queuedCount++;
            } catch (queueError) {
                logger.warn(`⚠️ Queue add failed for account ${account.account_name} (${account.id}). Running directly. Error: ${queueError.message}`);

                // Kuyruk hatası varsa direkt çalıştır (Fire and forget)
                AccountService.syncAccount(account.id)
                    .then(res => logger.info(`✅ Direct sync success for ${account.account_name}: ${res.newTransactions} new tx`))
                    .catch(err => logger.error(`❌ Direct sync failed for ${account.account_name}`, err));

                directRunCount++;
            }
        }

        logger.info(`✅ Sync job finished. Queued: ${queuedCount}, Direct: ${directRunCount}`);
        return { success: true, count: accounts.length, queued: queuedCount, direct: directRunCount };

    } catch (error) {
        logger.error('❌ Schedule Job Error:', error);
        throw error;
    }
}

module.exports = scheduleBankSync;
