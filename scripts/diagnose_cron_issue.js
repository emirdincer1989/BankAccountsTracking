/**
 * Cron Job Sorun Teşhis Scripti
 * 
 * Gece 3'ten sonra çalışmayan cron job'ları teşhis eder
 * 
 * Kullanım: node scripts/diagnose_cron_issue.js
 */

require('dotenv').config();
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function diagnoseCronIssue() {
    try {
        console.log('\n========================================');
        console.log('🔍 CRON JOB SORUN TEŞHİSİ');
        console.log('========================================\n');

        // 1. Sistem Saati Kontrolü
        console.log('⏰ 1. SİSTEM SAATİ KONTROLÜ:');
        console.log('----------------------------------------');
        const now = new Date();
        console.log(`Şu anki sistem saati: ${now.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`);
        console.log(`UTC saati: ${now.toUTCString()}`);
        console.log(`Timezone: Europe/Istanbul\n`);

        // 2. Job Durumu ve Son Çalışma
        console.log('📋 2. JOB DURUMU VE SON ÇALIŞMA:');
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
        
        const lastRun = job.last_run_at ? new Date(job.last_run_at) : null;
        if (lastRun) {
            const hoursSinceLastRun = (now - lastRun) / (1000 * 60 * 60);
            console.log(`Son Çalışma: ${lastRun.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`);
            console.log(`Son Çalışmadan Beri: ${hoursSinceLastRun.toFixed(2)} saat (${Math.floor(hoursSinceLastRun)} saat ${Math.floor((hoursSinceLastRun % 1) * 60)} dakika)`);
            
            // Eğer schedule "0 * * * *" ise (her saat başı), son çalışmadan beri kaç saat geçtiyse o kadar çalışması gerekirdi
            if (job.schedule === '0 * * * *') {
                const expectedRuns = Math.floor(hoursSinceLastRun);
                console.log(`⚠️  Beklenen çalışma sayısı: ${expectedRuns} (her saat başı)`);
            }
        } else {
            console.log('Son Çalışma: Henüz çalışmadı');
        }
        console.log('');

        // 3. Son 24 Saatteki Tüm Log Kayıtları (Detaylı)
        console.log('📝 3. SON 24 SAATTEKİ TÜM LOG KAYITLARI:');
        console.log('----------------------------------------');
        const logsResult = await query(`
            SELECT id, job_name, status, started_at, completed_at, duration, error_message
            FROM cron_job_logs 
            WHERE job_name = $1 
            AND started_at >= NOW() - INTERVAL '24 hours'
            ORDER BY started_at DESC
        `, ['bankSyncJob']);

        if (logsResult.rows.length === 0) {
            console.log('❌ Son 24 saatte hiç log kaydı bulunamadı!\n');
        } else {
            console.log(`Toplam ${logsResult.rows.length} kayıt bulundu:\n`);
            
            // Saat bazında grupla
            const hourlyGroups = {};
            logsResult.rows.forEach(log => {
                const startTime = new Date(log.started_at);
                const hour = startTime.getHours();
                if (!hourlyGroups[hour]) {
                    hourlyGroups[hour] = [];
                }
                hourlyGroups[hour].push(log);
            });

            // Son 24 saati göster
            const last24Hours = [];
            for (let i = 23; i >= 0; i--) {
                const checkHour = (now.getHours() - i + 24) % 24;
                last24Hours.push(checkHour);
            }

            console.log('Saat Bazında Özet:');
            last24Hours.forEach(hour => {
                const logs = hourlyGroups[hour] || [];
                const icon = logs.length > 0 ? '✅' : '❌';
                const count = logs.length > 0 ? logs.length : 0;
                const status = logs.length > 0 
                    ? logs.map(l => l.status).join(', ') 
                    : 'ÇALIŞMADI';
                console.log(`  ${icon} ${String(hour).padStart(2, '0')}:00 - ${count} çalışma - ${status}`);
            });
            console.log('');

            // Detaylı log listesi
            console.log('Detaylı Log Listesi:');
            logsResult.rows.forEach((log, index) => {
                const statusIcon = log.status === 'SUCCESS' ? '✅' : log.status === 'FAILED' ? '❌' : '⏳';
                const startTime = new Date(log.started_at);
                console.log(`\n${index + 1}. ${statusIcon} ${log.status}`);
                console.log(`   Saat: ${startTime.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`);
                console.log(`   Süre: ${log.duration || 0}ms`);
                if (log.error_message) {
                    console.log(`   Hata: ${log.error_message.substring(0, 100)}`);
                }
            });
            console.log('');
        }

        // 4. Eksik Çalışmaları Tespit Et
        console.log('🔍 4. EKSİK ÇALIŞMALAR TESPİTİ:');
        console.log('----------------------------------------');
        if (job.schedule === '0 * * * *' && lastRun) {
            const hoursSinceLastRun = (now - lastRun) / (1000 * 60 * 60);
            const expectedRuns = Math.floor(hoursSinceLastRun);
            
            if (expectedRuns > 0) {
                console.log(`⚠️  Son çalışmadan beri ${expectedRuns} saat geçti, ${expectedRuns} çalışma daha olması gerekirdi.`);
                console.log('\nEksik çalışma saatleri:');
                
                for (let i = 1; i <= expectedRuns; i++) {
                    const expectedHour = new Date(lastRun);
                    expectedHour.setHours(expectedHour.getHours() + i);
                    const expectedHourStr = expectedHour.getHours();
                    
                    // Bu saatte log var mı kontrol et
                    const hasLog = logsResult.rows.some(log => {
                        const logHour = new Date(log.started_at).getHours();
                        return logHour === expectedHourStr && 
                               new Date(log.started_at).getDate() === expectedHour.getDate();
                    });
                    
                    if (!hasLog) {
                        console.log(`  ❌ ${String(expectedHourStr).padStart(2, '0')}:00 - Çalışmadı`);
                    }
                }
            } else {
                console.log('✅ Son çalışmadan beri 1 saatten az geçti, normal.');
            }
        }
        console.log('');

        // 5. Process Durumu Kontrolü (SSH'da çalıştırılacak komutlar)
        console.log('💻 5. PROCESS DURUMU KONTROLÜ:');
        console.log('----------------------------------------');
        console.log('SSH terminalinde şu komutları çalıştırın:');
        console.log('');
        console.log('  # Node.js process\'lerini kontrol et:');
        console.log('  ps aux | grep "node.*server.js" | grep -v grep');
        console.log('');
        console.log('  # Process ID\'yi bul ve uptime kontrol et:');
        console.log('  ps -p $(pgrep -f "node.*server.js") -o pid,etime,cmd');
        console.log('');
        console.log('  # Eğer PM2 kullanılıyorsa:');
        console.log('  pm2 list');
        console.log('  pm2 logs --lines 100');
        console.log('');

        // 6. Log Dosyaları Kontrolü
        console.log('📄 6. LOG DOSYALARI KONTROLÜ:');
        console.log('----------------------------------------');
        const logDir = path.join(__dirname, '../logs');
        const combinedLogPath = path.join(logDir, 'combined.log');
        const errorLogPath = path.join(logDir, 'error.log');

        if (fs.existsSync(combinedLogPath)) {
            const stats = fs.statSync(combinedLogPath);
            const lastModified = new Date(stats.mtime);
            console.log(`✅ combined.log bulundu`);
            console.log(`   Son değişiklik: ${lastModified.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`);
            console.log(`   Boyut: ${(stats.size / 1024).toFixed(2)} KB`);
            
            // Son 3:00'dan sonraki log satırlarını kontrol et
            console.log('\n   Son 3:00\'dan sonraki log satırları (bankSyncJob ile ilgili):');
            console.log('   (SSH\'da çalıştır: tail -n 500 logs/combined.log | grep -i "bankSyncJob\\|schedule" | tail -n 20)');
        } else {
            console.log('❌ combined.log bulunamadı');
        }

        if (fs.existsSync(errorLogPath)) {
            const stats = fs.statSync(errorLogPath);
            const lastModified = new Date(stats.mtime);
            console.log(`\n✅ error.log bulundu`);
            console.log(`   Son değişiklik: ${lastModified.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}`);
            console.log(`   Boyut: ${(stats.size / 1024).toFixed(2)} KB`);
            
            if (stats.mtime > lastRun) {
                console.log(`   ⚠️  Son çalışmadan sonra error.log güncellenmiş - hata olabilir!`);
            }
        } else {
            console.log('\n❌ error.log bulunamadı');
        }
        console.log('');

        // 7. Olası Nedenler ve Çözümler
        console.log('💡 7. OLASI NEDENLER VE ÇÖZÜMLER:');
        console.log('----------------------------------------');
        
        if (lastRun) {
            const hoursSinceLastRun = (now - lastRun) / (1000 * 60 * 60);
            
            if (hoursSinceLastRun > 1 && job.schedule === '0 * * * *') {
                console.log('⚠️  SORUN TESPİT EDİLDİ: Job son çalışmadan beri çalışmamış.\n');
                console.log('Olası nedenler:');
                console.log('  1. ❌ Node.js process çökmüş veya durdurulmuş');
                console.log('     → Çözüm: Server\'ı yeniden başlatın');
                console.log('');
                console.log('  2. ❌ Server restart olmuş ve cron job\'lar yeniden başlatılmamış');
                console.log('     → Çözüm: server.js\'de initCronJobs() çağrısını kontrol edin');
                console.log('');
                console.log('  3. ❌ CronJobManager job\'ı durdurmuş');
                console.log('     → Çözüm: Job durumunu kontrol edin ve yeniden başlatın');
                console.log('');
                console.log('  4. ❌ Sistem saati problemi');
                console.log('     → Çözüm: Sistem saatini kontrol edin');
                console.log('');
                console.log('  5. ❌ Process kill edilmiş');
                console.log('     → Çözüm: Process manager (PM2) kullanmayı düşünün');
                console.log('');
                console.log('🔧 ÖNERİLEN ADIMLAR:');
                console.log('  1. SSH\'da process durumunu kontrol edin:');
                console.log('     ps aux | grep "node.*server.js"');
                console.log('');
                console.log('  2. Eğer process çalışmıyorsa, server\'ı yeniden başlatın:');
                console.log('     node server.js');
                console.log('     (veya PM2 kullanıyorsanız: pm2 restart all)');
                console.log('');
                console.log('  3. Log dosyalarını kontrol edin:');
                console.log('     tail -n 200 logs/combined.log | grep -i "bankSyncJob\\|cron\\|error"');
                console.log('');
                console.log('  4. Job\'ı manuel tetikleyin (test için):');
                console.log('     API: POST /api/cron-management/jobs/bankSyncJob/trigger');
            } else {
                console.log('✅ Son çalışmadan beri 1 saatten az geçti, normal görünüyor.');
            }
        } else {
            console.log('⚠️  Job hiç çalışmamış. Server başlatıldı mı kontrol edin.');
        }
        console.log('');

        // 8. Son Öneriler
        console.log('📌 8. SON ÖNERİLER:');
        console.log('----------------------------------------');
        console.log('1. ✅ Process manager (PM2) kullanmayı düşünün:');
        console.log('   - Otomatik restart');
        console.log('   - Crash recovery');
        console.log('   - Log yönetimi');
        console.log('');
        console.log('2. ✅ Health check endpoint ekleyin:');
        console.log('   - GET /api/health');
        console.log('   - Cron job durumunu kontrol eder');
        console.log('');
        console.log('3. ✅ Monitoring sistemi ekleyin:');
        console.log('   - Uptime monitoring');
        console.log('   - Alert sistemi');
        console.log('');

        console.log('========================================');
        console.log('✅ Teşhis tamamlandı\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Hata:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

diagnoseCronIssue();

