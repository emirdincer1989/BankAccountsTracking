/**
 * Takılı Kalmış Job'ları Temizleme Scripti
 * 
 * Database'de RUNNING durumunda kalmış eski job loglarını temizler.
 */

require('dotenv').config();
const { query } = require('../config/database');
const { getCronJobManager } = require('../services/cron/CronJobManager');

async function clearStuckJobs() {
    try {
        console.log('🔧 Takılı Kalmış Job'lar Temizleniyor...\n');

        const cronManager = getCronJobManager();
        const clearedCount = await cronManager.clearStuckJobs();

        console.log(`\n✅ ${clearedCount} adet takılı kalmış job temizlendi`);

        // Durumu göster
        const stuckLogs = await query(`
            SELECT COUNT(*) as count FROM cron_job_logs
            WHERE status = 'RUNNING'
            AND started_at < NOW() - INTERVAL '30 minutes'
        `);

        const remainingStuck = parseInt(stuckLogs.rows[0].count);
        
        if (remainingStuck > 0) {
            console.log(`⚠️  Hala ${remainingStuck} adet takılı kalmış log var (30 dakikadan yeni olanlar normal)`);
        } else {
            console.log('✅ Tüm takılı kalmış job'lar temizlendi');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

clearStuckJobs();

