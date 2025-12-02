const { query } = require('../config/database');
const { logger } = require('../utils/logger');
const AccountService = require('../services/AccountService');
const { withTimeout } = require('../utils/timeout');

// Konfigürasyon
const CONFIG = {
    MAX_CONCURRENT: 10, // Aynı anda maksimum 10 hesap senkronize edilebilir
    TIMEOUT_PER_ACCOUNT: 90000, // Her hesap için 90 saniye timeout
    RATE_LIMIT_DELAY: 100, // Her hesap arasında 100ms bekleme (banka API rate limit için)
    BATCH_SIZE: 50 // Her batch'te maksimum 50 hesap işle
};

/**
 * Rate limit için bekleme fonksiyonu
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Paralel senkronizasyon (concurrent)
 * 100 hesap için optimize edilmiş
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
        
        // Hesapları batch'lere böl (çok fazla hesap varsa)
        const batches = [];
        for (let i = 0; i < accounts.length; i += CONFIG.BATCH_SIZE) {
            batches.push(accounts.slice(i, i + CONFIG.BATCH_SIZE));
        }

        let totalSuccessCount = 0;
        let totalErrorCount = 0;
        let totalNewTransactions = 0;

        // Her batch'i işle
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            logger.info(`📦 Batch ${batchIndex + 1}/${batches.length} işleniyor (${batch.length} hesap)`);

            // Batch içindeki hesapları paralel olarak senkronize et
            const syncPromises = [];

            for (const account of batch) {
                // Rate limit: Her hesap arasında kısa bir bekleme
                if (syncPromises.length > 0) {
                    await delay(CONFIG.RATE_LIMIT_DELAY);
                }

                // Concurrent limit kontrolü: Eğer maksimum sayıya ulaştıysak, bir tanesi bitene kadar bekle
                if (syncPromises.length >= CONFIG.MAX_CONCURRENT) {
                    // Bir promise tamamlanana kadar bekle
                    await Promise.race(syncPromises);
                    // Basit çözüm: İlk promise'i kaldır (zaten tamamlanmış olmalı)
                    syncPromises.shift();
                }

                // Senkronizasyon promise'i oluştur
                const syncPromise = (async () => {
                    try {
                        logger.info(`🔄 Senkronizasyon başlatılıyor: ${account.account_name} (${account.id})`);
                        
                        const res = await withTimeout(
                            AccountService.syncAccount(account.id),
                            CONFIG.TIMEOUT_PER_ACCOUNT,
                            `Hesap ${account.account_name} senkronizasyonu timeout oldu (${CONFIG.TIMEOUT_PER_ACCOUNT / 1000}sn)`
                        );
                        
                        const newTxCount = res.newTransactions || 0;
                        logger.info(`✅ ${account.account_name} senkronizasyonu tamamlandı: ${newTxCount} yeni işlem`);
                        return { 
                            success: true, 
                            account: account.account_name,
                            accountId: account.id,
                            newTransactions: newTxCount
                        };
                    } catch (syncError) {
                        logger.error(`❌ ${account.account_name} (${account.id}) senkronizasyon hatası:`, syncError.message);
                        return { success: false, account: account.account_name, error: syncError.message };
                    }
                })();

                syncPromises.push(syncPromise);
            }

            // Batch'teki tüm promise'lerin tamamlanmasını bekle
            const batchResults = await Promise.allSettled(syncPromises);
            
            // Sonuçları say ve toplam yeni hareket sayısını hesapla
            const batchSuccess = batchResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const batchErrors = batchResults.length - batchSuccess;
            const batchNewTransactions = batchResults
                .filter(r => r.status === 'fulfilled' && r.value.success)
                .reduce((sum, r) => sum + (r.value.newTransactions || 0), 0);
            
            totalSuccessCount += batchSuccess;
            totalErrorCount += batchErrors;
            totalNewTransactions += batchNewTransactions;

            logger.info(`✅ Batch ${batchIndex + 1} tamamlandı: ${batchSuccess} başarılı, ${batchErrors} hatalı, ${batchNewTransactions} yeni hareket`);
        }

        const summary = {
            success: true,
            count: accounts.length,
            synced: totalSuccessCount,
            errors: totalErrorCount,
            batches: batches.length,
            newTransactions: totalNewTransactions
        };

        logger.info(`✅ Sync job tamamlandı: ${totalSuccessCount} başarılı, ${totalErrorCount} hatalı, ${totalNewTransactions} yeni hareket (${batches.length} batch)`);
        return summary;

    } catch (error) {
        logger.error('❌ Schedule Job Error:', error);
        logger.error('Stack trace:', error.stack);
        throw error;
    }
}

module.exports = scheduleBankSync;
