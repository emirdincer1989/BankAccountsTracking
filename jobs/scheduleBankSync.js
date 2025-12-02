const { query } = require('../config/database');
const { logger } = require('../utils/logger');
const AccountService = require('../services/AccountService');
const { withTimeout } = require('../utils/timeout');

/**
 * Tüm aktif hesapları bulur ve kuyruğa ekler.
 * Bu fonksiyon CronJobManager tarafından çağrılacak.
 */
async function scheduleBankSync() {
    logger.info('🕒 Scheduled Job: Bank account sync başlatılıyor...');

    try {
        // Aktif hesapları çek
        const result = await query('SELECT id, account_name FROM bank_accounts WHERE is_active = true');
        const accounts = result.rows;
        
        if (accounts.length === 0) {
            logger.info('ℹ️  Aktif hesap bulunamadı');
            return { success: true, count: 0, synced: 0, errors: 0, message: 'Aktif hesap yok' };
        }

        logger.info(`📋 ${accounts.length} aktif hesap bulundu`);
        
        let successCount = 0;
        let errorCount = 0;

        // Her hesabı manuel senkronizasyon gibi bağımsız olarak çalıştır
        // Manuel senkronizasyon nasıl çalışıyorsa aynı şekilde
        for (const account of accounts) {
            try {
                logger.info(`🔄 Senkronizasyon başlatılıyor: ${account.account_name} (${account.id})`);
                
                // Manuel senkronizasyon gibi direkt AccountService.syncAccount çağır
                // Timeout: Her hesap için 90 saniye (banka API'leri yavaş olabilir)
                const res = await withTimeout(
                    AccountService.syncAccount(account.id),
                    90000, // 90 saniye
                    `Hesap ${account.account_name} senkronizasyonu timeout oldu (90sn)`
                );
                
                logger.info(`✅ ${account.account_name} senkronizasyonu tamamlandı: ${res.newTransactions || 0} yeni işlem`);
                successCount++;
                
            } catch (syncError) {
                logger.error(`❌ ${account.account_name} (${account.id}) senkronizasyon hatası:`, syncError.message);
                errorCount++;
                // Bir hesap hata verse bile diğerlerine devam et
            }
        }

        const summary = {
            success: true,
            count: accounts.length,
            synced: successCount,
            errors: errorCount
        };

        logger.info(`✅ Sync job tamamlandı: ${successCount} başarılı, ${errorCount} hatalı`);
        return summary;

    } catch (error) {
        logger.error('❌ Schedule Job Error:', error);
        logger.error('Stack trace:', error.stack);
        throw error;
    }
}

module.exports = scheduleBankSync;
