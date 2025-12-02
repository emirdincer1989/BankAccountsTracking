/**
 * Cron Job Durum Kontrol Scripti
 * 
 * SSH terminalden çalıştırılabilir.
 * Job'ların durumunu, son çalışma zamanlarını ve loglarını gösterir.
 */

require('dotenv').config();
const { query } = require('../config/database');

async function checkCronStatus() {
    try {
        console.log('🔍 Cron Job Durum Kontrolü\n');
        console.log('='.repeat(60));

        // 1. Job Listesi
        console.log('\n📋 JOB LİSTESİ');
        console.log('-'.repeat(60));
        
        const jobs = await query(`
            SELECT 
                name,
                title,
                schedule,
                is_enabled,
                last_run_at,
                last_run_status,
                last_run_duration,
                run_count,
                success_count,
                error_count
            FROM cron_jobs
            ORDER BY name
        `);

        if (jobs.rows.length === 0) {
            console.log('❌ Hiç job bulunamadı!');
            return;
        }

        jobs.rows.forEach(job => {
            const status = job.is_enabled ? '✅ Aktif' : '⏸️  Pasif';
            const lastRun = job.last_run_at 
                ? new Date(job.last_run_at).toLocaleString('tr-TR')
                : 'Henüz çalışmadı';
            
            const successRate = job.run_count > 0
                ? Math.round((job.success_count / job.run_count) * 100)
                : 0;

            console.log(`\n📌 ${job.title} (${job.name})`);
            console.log(`   Durum: ${status}`);
            console.log(`   Schedule: ${job.schedule}`);
            console.log(`   Son Çalışma: ${lastRun}`);
            console.log(`   Son Durum: ${job.last_run_status || 'N/A'}`);
            console.log(`   Süre: ${job.last_run_duration || 0}ms`);
            console.log(`   Toplam Çalışma: ${job.run_count || 0}`);
            console.log(`   Başarılı: ${job.success_count || 0}`);
            console.log(`   Hatalı: ${job.error_count || 0}`);
            console.log(`   Başarı Oranı: %${successRate}`);
        });

        // 2. Son Loglar
        console.log('\n\n📝 SON 10 LOG KAYDI');
        console.log('-'.repeat(60));

        const logs = await query(`
            SELECT 
                job_name,
                status,
                started_at,
                completed_at,
                duration,
                error_message
            FROM cron_job_logs
            ORDER BY started_at DESC
            LIMIT 10
        `);

        if (logs.rows.length === 0) {
            console.log('ℹ️  Henüz log kaydı yok');
        } else {
            logs.rows.forEach((log, index) => {
                const statusIcon = log.status === 'SUCCESS' ? '✅' : '❌';
                const startTime = new Date(log.started_at).toLocaleString('tr-TR');
                
                console.log(`\n${index + 1}. ${statusIcon} ${log.job_name}`);
                console.log(`   Başlangıç: ${startTime}`);
                console.log(`   Durum: ${log.status}`);
                console.log(`   Süre: ${log.duration || 0}ms`);
                if (log.error_message) {
                    console.log(`   Hata: ${log.error_message.substring(0, 100)}...`);
                }
            });
        }

        // 3. İstatistikler
        console.log('\n\n📊 İSTATİSTİKLER');
        console.log('-'.repeat(60));

        const stats = await query(`
            SELECT 
                COUNT(*) as total_jobs,
                COUNT(*) FILTER (WHERE is_enabled = true) as enabled_jobs,
                COUNT(*) FILTER (WHERE is_enabled = false) as disabled_jobs,
                SUM(run_count) as total_runs,
                SUM(success_count) as total_success,
                SUM(error_count) as total_errors
            FROM cron_jobs
        `);

        const stat = stats.rows[0];
        const overallSuccessRate = stat.total_runs > 0
            ? Math.round((stat.total_success / stat.total_runs) * 100)
            : 0;

        console.log(`Toplam Job: ${stat.total_jobs}`);
        console.log(`Aktif: ${stat.enabled_jobs}`);
        console.log(`Pasif: ${stat.disabled_jobs}`);
        console.log(`Toplam Çalışma: ${stat.total_runs || 0}`);
        console.log(`Başarılı: ${stat.total_success || 0}`);
        console.log(`Hatalı: ${stat.total_errors || 0}`);
        console.log(`Genel Başarı Oranı: %${overallSuccessRate}`);

        // 4. bankSyncJob Özel Kontrol
        console.log('\n\n🏦 BANK SYNC JOB DETAYLARI');
        console.log('-'.repeat(60));

        const bankSyncJob = jobs.rows.find(j => j.name === 'bankSyncJob');
        
        if (bankSyncJob) {
            console.log(`Durum: ${bankSyncJob.is_enabled ? '✅ Aktif' : '⏸️  Pasif'}`);
            console.log(`Schedule: ${bankSyncJob.schedule} (Her 5 dakikada bir)`);
            console.log(`Son Çalışma: ${bankSyncJob.last_run_at ? new Date(bankSyncJob.last_run_at).toLocaleString('tr-TR') : 'Henüz çalışmadı'}`);
            console.log(`Son Durum: ${bankSyncJob.last_run_status || 'N/A'}`);
            
            // Aktif hesap sayısı
            const accounts = await query('SELECT COUNT(*) as count FROM bank_accounts WHERE is_active = true');
            console.log(`Aktif Hesap Sayısı: ${accounts.rows[0].count}`);
            
            // Son 24 saatteki çalışmalar
            const last24h = await query(`
                SELECT COUNT(*) as count
                FROM cron_job_logs
                WHERE job_name = 'bankSyncJob'
                AND started_at >= NOW() - INTERVAL '24 hours'
            `);
            console.log(`Son 24 Saatte Çalışma: ${last24h.rows[0].count} kez`);
        } else {
            console.log('❌ bankSyncJob bulunamadı!');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Kontrol tamamlandı\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Hata:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

checkCronStatus();

