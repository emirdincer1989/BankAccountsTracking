/**
 * Job Timeout Test Scripti
 * 
 * Job'un timeout mekanizmasını test eder.
 * Frontend'den manuel tetikleme yapıldığında job'un düzgün çalışıp çalışmadığını kontrol eder.
 */

require('dotenv').config();
const { query } = require('../config/database');
const { getCronJobManager } = require('../services/cron/CronJobManager');

// Job'ları yükle (script çalıştırıldığında yeni instance oluşuyor)
async function initCronManager() {
    const cronManager = getCronJobManager();
    try {
        await cronManager.loadJobsFromDB();
        console.log('✅ Job\'lar yüklendi\n');
    } catch (error) {
        console.log('⚠️  Job\'lar yüklenemedi:', error.message);
    }
    return cronManager;
}

async function testJobTimeout() {
    try {
        console.log('🧪 Job Timeout Test Başlatılıyor...\n');
        console.log('='.repeat(60));

        // 1. Son 5 dakikadaki log kayıtlarını kontrol et
        console.log('\n📝 SON 5 DAKİKADAKİ LOG KAYITLARI');
        console.log('-'.repeat(60));

        const recentLogs = await query(`
            SELECT 
                id,
                job_name,
                status,
                started_at,
                completed_at,
                duration,
                error_message
            FROM cron_job_logs
            WHERE job_name = 'bankSyncJob'
            AND started_at >= NOW() - INTERVAL '5 minutes'
            ORDER BY started_at DESC
            LIMIT 10
        `);

        if (recentLogs.rows.length === 0) {
            console.log('⚠️  Son 5 dakikada hiç log kaydı yok');
        } else {
            recentLogs.rows.forEach((log, index) => {
                const statusIcon = log.status === 'SUCCESS' ? '✅' : 
                                 log.status === 'FAILED' ? '❌' : 
                                 log.status === 'RUNNING' ? '⏳' : '❓';
                
                console.log(`\n${index + 1}. ${statusIcon} ${log.job_name}`);
                console.log(`   Durum: ${log.status}`);
                console.log(`   Başlangıç: ${new Date(log.started_at).toLocaleString('tr-TR')}`);
                
                if (log.completed_at) {
                    console.log(`   Bitiş: ${new Date(log.completed_at).toLocaleString('tr-TR')}`);
                    console.log(`   Süre: ${log.duration || 0}ms`);
                } else {
                    const runningDuration = Date.now() - new Date(log.started_at).getTime();
                    console.log(`   ⚠️  Hala çalışıyor (${Math.round(runningDuration / 1000)}sn)`);
                }
                
                if (log.error_message) {
                    console.log(`   Hata: ${log.error_message.substring(0, 100)}...`);
                }
            });
        }

        // 2. RUNNING durumundaki job'ları kontrol et
        console.log('\n\n⏳ ŞU AN ÇALIŞAN JOB\'LAR');
        console.log('-'.repeat(60));

        const runningLogs = await query(`
            SELECT 
                id,
                job_name,
                started_at,
                EXTRACT(EPOCH FROM (NOW() - started_at)) as running_seconds
            FROM cron_job_logs
            WHERE status = 'RUNNING'
            ORDER BY started_at DESC
        `);

        if (runningLogs.rows.length === 0) {
            console.log('✅ Şu anda çalışan job yok');
        } else {
            runningLogs.rows.forEach((log, index) => {
                const runningSeconds = Math.round(log.running_seconds);
                const runningMinutes = Math.round(runningSeconds / 60);
                
                console.log(`\n${index + 1}. ⏳ ${log.job_name}`);
                console.log(`   Başlangıç: ${new Date(log.started_at).toLocaleString('tr-TR')}`);
                console.log(`   Çalışma Süresi: ${runningMinutes} dakika (${runningSeconds} saniye)`);
                
                if (runningSeconds > 300) { // 5 dakikadan fazla
                    console.log(`   ⚠️  UYARI: 5 dakikadan fazla süredir çalışıyor!`);
                }
            });
        }

        // 3. CronJobManager durumu
        console.log('\n\n🔧 CRON JOB MANAGER DURUMU');
        console.log('-'.repeat(60));

        const cronManager = await initCronManager();
        const status = cronManager.getStatus('bankSyncJob');
        
        if (status) {
            console.log(`✅ bankSyncJob durumu:`);
            console.log(`   - Running: ${status.isRunning ? '✅' : '❌'}`);
            console.log(`   - Executing: ${status.isExecuting ? '⏳ Çalışıyor' : '✅ Boşta'}`);
        } else {
            console.log('❌ bankSyncJob durumu alınamadı');
        }

        // 4. Son job istatistikleri
        console.log('\n\n📊 SON JOB İSTATİSTİKLERİ');
        console.log('-'.repeat(60));

        const jobStats = await query(`
            SELECT 
                last_run_at,
                last_run_status,
                last_run_duration,
                run_count,
                success_count,
                error_count
            FROM cron_jobs
            WHERE name = 'bankSyncJob'
        `);

        if (jobStats.rows.length > 0) {
            const stats = jobStats.rows[0];
            console.log(`Son Çalışma: ${stats.last_run_at ? new Date(stats.last_run_at).toLocaleString('tr-TR') : 'Henüz çalışmadı'}`);
            console.log(`Son Durum: ${stats.last_run_status || 'N/A'}`);
            console.log(`Son Süre: ${stats.last_run_duration || 0}ms`);
            console.log(`Toplam Çalışma: ${stats.run_count || 0}`);
            console.log(`Başarılı: ${stats.success_count || 0}`);
            console.log(`Hatalı: ${stats.error_count || 0}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Test tamamlandı\n');
        console.log('💡 ÖNERİ: Frontend\'den "Manuel Çalıştır" butonuna tıklayın ve');
        console.log('   5 saniye sonra bu script\'i tekrar çalıştırın:');
        console.log('   node scripts/test_job_timeout.js\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Hata:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

testJobTimeout();

