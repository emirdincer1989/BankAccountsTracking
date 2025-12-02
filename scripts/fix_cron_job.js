/**
 * Cron Job Düzeltme Scripti
 * 
 * bankSyncJob'ı aktif hale getirir ve gerekli kontrolleri yapar.
 */

require('dotenv').config();
const { query } = require('../config/database');

async function fixCronJob() {
    try {
        console.log('🔧 Cron Job Düzeltme Başlatılıyor...\n');

        // 1. Job'ı kontrol et
        const checkResult = await query('SELECT * FROM cron_jobs WHERE name = $1', ['bankSyncJob']);
        
        if (checkResult.rows.length === 0) {
            console.log('❌ bankSyncJob bulunuzda bulunamadı!');
            console.log('💡 Job oluşturuluyor...');
            
            // Job oluştur
            await query(`
                INSERT INTO cron_jobs (name, title, description, schedule, is_enabled)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                'bankSyncJob',
                'Banka Hesap Senkronizasyonu',
                'Tüm aktif banka hesaplarını tarar ve hareketleri günceller (Queue kullanır).',
                '*/5 * * * *', // Her 5 dakikada bir
                true // Aktif
            ]);
            
            console.log('✅ bankSyncJob oluşturuldu ve aktif edildi');
        } else {
            const job = checkResult.rows[0];
            console.log('📋 Mevcut Job Durumu:');
            console.log(`   - Name: ${job.name}`);
            console.log(`   - Schedule: ${job.schedule}`);
            console.log(`   - Enabled: ${job.is_enabled}`);
            console.log(`   - Last Run: ${job.last_run_at || 'Hiç çalışmamış'}`);
            
            if (!job.is_enabled) {
                console.log('\n⚠️  Job pasif durumda, aktif ediliyor...');
                
                await query(`
                    UPDATE cron_jobs
                    SET is_enabled = true,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE name = $1
                `, ['bankSyncJob']);
                
                console.log('✅ bankSyncJob aktif edildi');
            } else {
                console.log('\n✅ Job zaten aktif');
            }
        }

        // 2. Aktif hesap sayısını kontrol et
        const accountsResult = await query('SELECT COUNT(*) as count FROM bank_accounts WHERE is_active = true');
        const accountCount = parseInt(accountsResult.rows[0].count);
        
        console.log(`\n📊 Aktif Hesap Sayısı: ${accountCount}`);
        
        if (accountCount === 0) {
            console.log('⚠️  UYARI: Aktif hesap yok! Job çalışsa bile işlem yapmayacak.');
        }

        // 3. Son durumu göster
        const finalResult = await query('SELECT * FROM cron_jobs WHERE name = $1', ['bankSyncJob']);
        const finalJob = finalResult.rows[0];
        
        console.log('\n✅ SON DURUM:');
        console.log(`   - Name: ${finalJob.name}`);
        console.log(`   - Schedule: ${finalJob.schedule} (Her 5 dakikada bir)`);
        console.log(`   - Enabled: ${finalJob.is_enabled ? '✅ Aktif' : '❌ Pasif'}`);
        console.log(`   - Last Run: ${finalJob.last_run_at || 'Henüz çalışmamış'}`);
        console.log(`   - Last Status: ${finalJob.last_run_status || 'N/A'}`);
        
        console.log('\n💡 SONRAKI ADIMLAR:');
        console.log('   1. Server\'ı yeniden başlatın: npm start');
        console.log('   2. Manuel tetikleme için: POST /api/cron-management/jobs/bankSyncJob/trigger');
        console.log('   3. Logları kontrol edin: GET /api/cron-management/logs');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Hata:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

fixCronJob();

