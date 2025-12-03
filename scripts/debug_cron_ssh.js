/**
 * SSH Terminalden Cron Job Debug Scripti
 * 
 * Kullanım: node scripts/debug_cron_ssh.js
 */

require('dotenv').config();
const { query } = require('../config/database');

async function debugCron() {
    try {
        console.log('\n========================================');
        console.log('🔍 CRON JOB DEBUG KONTROLÜ');
        console.log('========================================\n');

        // 1. Job Durumu
        console.log('📋 1. JOB DURUMU:');
        console.log('----------------------------------------');
        const jobResult = await query(`
            SELECT name, schedule, is_enabled, last_run_at, last_run_status, 
                   last_run_duration, run_count, success_count, error_count
            FROM cron_jobs 
            WHERE name = $1
        `, ['bankSyncJob']);

        if (jobResult.rows.length === 0) {
            console.log('❌ bankSyncJob bulunamadı!\n');
            return;
        }

        const job = jobResult.rows[0];
        console.log(`Job Adı: ${job.name}`);
        console.log(`Schedule: ${job.schedule}`);
        console.log(`Aktif: ${job.is_enabled ? 'EVET ✅' : 'HAYIR ❌'}`);
        console.log(`Son Çalışma: ${job.last_run_at ? new Date(job.last_run_at).toLocaleString('tr-TR') : 'Henüz çalışmadı'}`);
        console.log(`Son Durum: ${job.last_run_status || 'N/A'}`);
        console.log(`Son Süre: ${job.last_run_duration || 0}ms`);
        console.log(`Toplam Çalışma: ${job.run_count || 0}`);
        console.log(`Başarılı: ${job.success_count || 0}`);
        console.log(`Hatalı: ${job.error_count || 0}`);
        console.log('');

        // 2. Son Log Kayıtları
        console.log('📝 2. SON LOG KAYITLARI (Son 10):');
        console.log('----------------------------------------');
        const logsResult = await query(`
            SELECT id, job_name, status, started_at, completed_at, duration, error_message, result
            FROM cron_job_logs 
            WHERE job_name = $1 
            ORDER BY started_at DESC 
            LIMIT 10
        `, ['bankSyncJob']);

        if (logsResult.rows.length === 0) {
            console.log('❌ Hiç log kaydı bulunamadı!');
            console.log('⚠️  Bu, job\'ın hiç çalışmadığı anlamına gelebilir.\n');
        } else {
            logsResult.rows.forEach((log, index) => {
                const statusIcon = log.status === 'SUCCESS' ? '✅' : log.status === 'FAILED' ? '❌' : '⏳';
                const startTime = log.started_at ? new Date(log.started_at).toLocaleString('tr-TR') : 'N/A';
                const endTime = log.completed_at ? new Date(log.completed_at).toLocaleString('tr-TR') : 'N/A';
                
                console.log(`\n${index + 1}. ${statusIcon} ${log.status}`);
                console.log(`   ID: ${log.id}`);
                console.log(`   Başlangıç: ${startTime}`);
                console.log(`   Bitiş: ${endTime}`);
                console.log(`   Süre: ${log.duration || 0}ms`);
                
                if (log.error_message) {
                    console.log(`   Hata: ${log.error_message.substring(0, 150)}`);
                }
                
                if (log.result) {
                    try {
                        const result = JSON.parse(log.result);
                        if (result.newTransactions !== undefined) {
                            console.log(`   Yeni Hareket: ${result.newTransactions}`);
                        }
                    } catch (e) {
                        // JSON parse hatası, görmezden gel
                    }
                }
            });
            console.log('');
        }

        // 3. Takılı Kalmış Job'lar
        console.log('⚠️  3. TAKILI KALMIŞ JOB KONTROLÜ:');
        console.log('----------------------------------------');
        const stuckResult = await query(`
            SELECT id, job_name, started_at, 
                   EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER as seconds_ago
            FROM cron_job_logs
            WHERE job_name = $1 AND status = 'RUNNING'
            ORDER BY started_at ASC
        `, ['bankSyncJob']);

        if (stuckResult.rows.length > 0) {
            console.log('⚠️  Takılı kalmış job bulundu:');
            stuckResult.rows.forEach(log => {
                const minutes = Math.floor(log.seconds_ago / 60);
                const hours = Math.floor(minutes / 60);
                console.log(`   ID: ${log.id} | ${hours} saat ${minutes % 60} dakika önce başladı`);
            });
            console.log('   💡 Bu job\'lar temizlenmeli!\n');
        } else {
            console.log('✅ Takılı kalmış job yok\n');
        }

        // 4. Son 24 Saatteki Çalışmalar
        console.log('📊 4. SON 24 SAATTEKİ ÇALIŞMALAR:');
        console.log('----------------------------------------');
        const last24hResult = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'SUCCESS') as success,
                COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
                COUNT(*) FILTER (WHERE status = 'RUNNING') as running
            FROM cron_job_logs
            WHERE job_name = $1 
            AND started_at >= NOW() - INTERVAL '24 hours'
        `, ['bankSyncJob']);

        const stats = last24hResult.rows[0];
        console.log(`Toplam: ${stats.total}`);
        console.log(`Başarılı: ${stats.success}`);
        console.log(`Başarısız: ${stats.failed}`);
        console.log(`Çalışıyor: ${stats.running}`);
        console.log('');

        // 5. Schedule Analizi
        console.log('⏰ 5. SCHEDULE ANALİZİ:');
        console.log('----------------------------------------');
        const schedule = job.schedule;
        const scheduleMap = {
            '* * * * *': 'Her dakika',
            '*/2 * * * *': 'Her 2 dakikada',
            '*/5 * * * *': 'Her 5 dakikada',
            '*/10 * * * *': 'Her 10 dakikada',
            '*/15 * * * *': 'Her 15 dakikada',
            '*/30 * * * *': 'Her 30 dakikada',
            '0 * * * *': 'Her saat başı',
            '0 */2 * * *': 'Her 2 saatte',
            '0 0 * * *': 'Her gün gece yarısı'
        };
        
        const scheduleText = scheduleMap[schedule] || schedule;
        console.log(`Schedule: ${schedule}`);
        console.log(`Açıklama: ${scheduleText}`);
        console.log(`Aktif: ${job.is_enabled ? 'EVET' : 'HAYIR'}`);
        
        if (!job.is_enabled) {
            console.log('\n⚠️  UYARI: Job pasif durumda! Aktif etmek için cron yönetimi sayfasını kullanın.');
        }
        
        if (logsResult.rows.length === 0 && job.is_enabled) {
            console.log('\n⚠️  UYARI: Job aktif ama hiç log kaydı yok!');
            console.log('   Olası nedenler:');
            console.log('   1. Node.js process çalışmıyor olabilir');
            console.log('   2. CronJobManager job\'ı kaydetmemiş olabilir');
            console.log('   3. Schedule yanlış olabilir');
            console.log('   💡 Node.js process\'ini kontrol edin: ps aux | grep node');
        }

        console.log('\n========================================');
        console.log('✅ Kontrol tamamlandı\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Hata:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

debugCron();

