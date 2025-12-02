/**
 * Cron Job Manuel Tetikleme Test Scripti
 * 
 * Bu script cron job'ı manuel olarak tetikler (API çağrısı yapmadan).
 * Lokal test için kullanılabilir.
 */

require('dotenv').config();
const { getCronJobManager } = require('../services/cron/CronJobManager');
const { logger } = require('../utils/logger');

async function testTrigger() {
    try {
        console.log('🔧 Manuel Tetikleme Testi Başlatılıyor...\n');

        const cronManager = getCronJobManager();

        // Önce job'ları yükle ve register et
        console.log('📋 Job\'lar yükleniyor...');
        const jobs = await cronManager.loadJobsFromDB();
        
        // bankSyncJob'ı register et
        const bankSyncJobConfig = jobs.find(j => j.name === 'bankSyncJob');
        
        if (!bankSyncJobConfig) {
            console.log('❌ bankSyncJob database\'de bulunamadı!');
            console.log('💡 Önce scripts/fix_cron_job.js çalıştırın');
            process.exit(1);
        }

        // Job register edilmemişse register et
        const status = cronManager.getStatus('bankSyncJob');
        if (!status) {
            console.log('📝 Job register ediliyor...');
            const scheduleBankSync = require('../jobs/scheduleBankSync');
            cronManager.registerJob(bankSyncJobConfig, scheduleBankSync);
            console.log('✅ Job register edildi');
        } else {
            console.log('✅ Job zaten register edilmiş');
        }

        // Manuel tetikleme
        console.log('\n🚀 Job manuel olarak tetikleniyor...');
        console.log('⚠️  NOT: Bu test banka API çağrısı yapacak (uzak sunucudan erişilebilir olmalı)');
        console.log('   Lokal test için bu script çalışmayabilir!\n');

        const startTime = Date.now();
        const result = await cronManager.runNow('bankSyncJob');
        const duration = Date.now() - startTime;

        console.log('\n✅ Job başarıyla tamamlandı!');
        console.log(`⏱️  Süre: ${duration}ms`);
        console.log('\n📊 Sonuç:');
        console.log(JSON.stringify(result, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Hata:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

testTrigger();

