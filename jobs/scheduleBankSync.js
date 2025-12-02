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
        
        if (accounts.length === 0) {
            logger.info('ℹ️  Aktif hesap bulunamadı, işlem atlanıyor');
            return { success: true, count: 0, queued: 0, direct: 0, message: 'Aktif hesap yok' };
        }

        logger.info(`📋 ${accounts.length} aktif hesap bulundu`);
        
        let queuedCount = 0;
        let directRunCount = 0;
        let errorCount = 0;

        // Redis/Queue kullanılabilir mi kontrol et
        const isQueueAvailable = bankSyncQueue && typeof bankSyncQueue.add === 'function' && 
                                  !bankSyncQueue.add.toString().includes('Redis unavailable');

        if (!isQueueAvailable) {
            logger.warn('⚠️  Redis/Queue kullanılamıyor, hesaplar direkt senkronize edilecek');
        }

        for (const account of accounts) {
            try {
                if (isQueueAvailable) {
                    // Queue'ya ekle
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
                } else {
                    // Redis yoksa direkt çalıştır (sequential - sırayla)
                    logger.info(`🔄 Direkt senkronizasyon: ${account.account_name} (${account.id})`);
                    try {
                        const res = await AccountService.syncAccount(account.id);
                        logger.info(`✅ Direct sync success for ${account.account_name}: ${res.newTransactions} new tx`);
                        directRunCount++;
                    } catch (syncError) {
                        logger.error(`❌ Direct sync failed for ${account.account_name} (${account.id}):`, syncError.message);
                        errorCount++;
                    }
                }
            } catch (queueError) {
                logger.warn(`⚠️ Queue add failed for account ${account.account_name} (${account.id}). Running directly. Error: ${queueError.message}`);

                // Kuyruk hatası varsa direkt çalıştır
                try {
                    const res = await AccountService.syncAccount(account.id);
                    logger.info(`✅ Direct sync success for ${account.account_name}: ${res.newTransactions} new tx`);
                    directRunCount++;
                } catch (syncError) {
                    logger.error(`❌ Direct sync failed for ${account.account_name} (${account.id}):`, syncError.message);
                    errorCount++;
                }
            }
        }

        const summary = {
            success: true,
            count: accounts.length,
            queued: queuedCount,
            direct: directRunCount,
            errors: errorCount
        };

        logger.info(`✅ Sync job finished. Total: ${accounts.length}, Queued: ${queuedCount}, Direct: ${directRunCount}, Errors: ${errorCount}`);
        return summary;

    } catch (error) {
        logger.error('❌ Schedule Job Error:', error);
        logger.error('Stack trace:', error.stack);
        throw error;
    }
}

module.exports = scheduleBankSync;
