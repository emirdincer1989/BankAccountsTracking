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
        console.log('🔧 Takılı Kalmış Job\'lar Temizleniyor...\n');

        const cronManager = getCronJobManager();
        const result = await cronManager.clearStuckJobs();

        console.log(`\n✅ ${result.cleared || 0} adet takılı kalmış job temizlendi`);

        // Durumu göster - 2 dakikadan eski RUNNING job'ları göster
        const remainingStuckLogs = await query(`
            SELECT 
                id, 
                job_name, 
                started_at,
                EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER as seconds_ago
            FROM cron_job_logs
            WHERE status = 'RUNNING'
            AND EXTRACT(EPOCH FROM (NOW() - started_at)) > 120
            ORDER BY started_at ASC
        `);
        
        if (remainingStuckLogs.rows.length > 0) {
            console.log(`\n⚠️  Hala ${remainingStuckLogs.rows.length} adet takılı kalmış job var:`);
            remainingStuckLogs.rows.forEach((log, index) => {
                const minutesAgo = Math.round(log.seconds_ago / 60);
                console.log(`   ${index + 1}. ${log.job_name} - ${minutesAgo} dakika önce başladı`);
            });
            console.log('\n💡 Bu job\'lar muhtemelen takılı kalmış. Tekrar temizlemeyi deneyin.');
        } else {
            console.log('✅ Tüm takılı kalmış job\'lar temizlendi');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

clearStuckJobs();

