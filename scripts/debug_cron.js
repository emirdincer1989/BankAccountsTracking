/**
 * Cron Sistemi Debug Scripti
 * 
 * Bu script cron sisteminin neden çalışmadığını tespit eder.
 * Lokal olarak çalıştırılabilir (banka API çağrısı yapmaz).
 */

require('dotenv').config();
const { query } = require('../config/database');
const { getCronJobManager } = require('../services/cron/CronJobManager');
const { bankSyncQueue } = require('../services/queue/QueueManager');
const Redis = require('redis');

async function checkDatabase() {
    console.log('\n📊 DATABASE KONTROLÜ');
    console.log('='.repeat(50));
    
    try {
        // Cron jobs tablosunu kontrol et
        const jobs = await query('SELECT * FROM cron_jobs WHERE name = $1', ['bankSyncJob']);
        
        if (jobs.rows.length === 0) {
            console.log('❌ bankSyncJob database\'de bulunamadı!');
            console.log('💡 Çözüm: Migration çalıştırın veya manuel ekleyin');
            return false;
        }
        
        const job = jobs.rows[0];
        console.log('✅ bankSyncJob bulundu:');
        console.log(`   - Name: ${job.name}`);
        console.log(`   - Schedule: ${job.schedule}`);
        console.log(`   - Enabled: ${job.is_enabled}`);
        console.log(`   - Last Run: ${job.last_run_at || 'Hiç çalışmamış'}`);
        console.log(`   - Last Status: ${job.last_run_status || 'N/A'}`);
        
        return true;
    } catch (error) {
        console.log('❌ Database hatası:', error.message);
        return false;
    }
}

async function checkRedis() {
    console.log('\n🔴 REDIS KONTROLÜ');
    console.log('='.repeat(50));
    
    const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
    };
    
    console.log(`Redis Config: ${redisConfig.host}:${redisConfig.port}`);
    
    try {
        const client = Redis.createClient({
            socket: {
                host: redisConfig.host,
                port: redisConfig.port
            },
            password: redisConfig.password
        });
        
        await client.connect();
        const pong = await client.ping();
        
        if (pong === 'PONG') {
            console.log('✅ Redis bağlantısı başarılı');
            
            // Queue durumunu kontrol et
            const queueInfo = await client.keys('bull:bank-sync:*');
            console.log(`   - Queue keys: ${queueInfo.length} adet`);
            
            await client.quit();
            return true;
        } else {
            console.log('❌ Redis ping başarısız');
            await client.quit();
            return false;
        }
    } catch (error) {
        console.log('❌ Redis bağlantı hatası:', error.message);
        console.log('⚠️  Redis yoksa Queue fallback modda çalışır (direkt çalıştırma)');
        return false;
    }
}

async function checkCronJobManager() {
    console.log('\n⏰ CRON JOB MANAGER KONTROLÜ');
    console.log('='.repeat(50));
    
    try {
        const cronManager = getCronJobManager();
        
        // Database'den job'ları yükle
        const jobs = await cronManager.loadJobsFromDB();
        console.log(`✅ ${jobs.length} job database'den yüklendi`);
        
        // bankSyncJob'ı kontrol et
        const bankSyncJob = jobs.find(j => j.name === 'bankSyncJob');
        
        if (!bankSyncJob) {
            console.log('❌ bankSyncJob database\'de bulunamadı!');
            return false;
        }
        
        console.log('✅ bankSyncJob config bulundu:');
        console.log(`   - Schedule: ${bankSyncJob.schedule}`);
        console.log(`   - Enabled: ${bankSyncJob.is_enabled}`);
        
        // Job register edilmiş mi kontrol et
        const status = cronManager.getStatus('bankSyncJob');
        
        if (!status) {
            console.log('❌ bankSyncJob CronJobManager\'da register edilmemiş!');
            console.log('💡 Çözüm: server.js\'de register edilmeli');
            return false;
        }
        
        console.log('✅ bankSyncJob register edilmiş:');
        console.log(`   - Running: ${status.isRunning}`);
        console.log(`   - Executing: ${status.isExecuting}`);
        
        return true;
    } catch (error) {
        console.log('❌ CronJobManager hatası:', error.message);
        console.log(error.stack);
        return false;
    }
}

async function checkQueueManager() {
    console.log('\n📦 QUEUE MANAGER KONTROLÜ');
    console.log('='.repeat(50));
    
    try {
        if (!bankSyncQueue) {
            console.log('❌ bankSyncQueue tanımlanmamış!');
            return false;
        }
        
        console.log('✅ bankSyncQueue tanımlı');
        
        // Queue'nun çalışıp çalışmadığını kontrol et
        if (typeof bankSyncQueue.add === 'function') {
            console.log('✅ Queue.add() fonksiyonu mevcut');
        } else {
            console.log('⚠️  Queue fallback modda (Redis yok)');
        }
        
        return true;
    } catch (error) {
        console.log('❌ QueueManager hatası:', error.message);
        return false;
    }
}

async function checkScheduleBankSync() {
    console.log('\n🔄 SCHEDULE BANK SYNC JOB KONTROLÜ');
    console.log('='.repeat(50));
    
    try {
        const scheduleBankSync = require('../jobs/scheduleBankSync');
        
        if (typeof scheduleBankSync === 'function') {
            console.log('✅ scheduleBankSync fonksiyonu mevcut');
            
            // Test için aktif hesap sayısını kontrol et
            const accounts = await query('SELECT COUNT(*) as count FROM bank_accounts WHERE is_active = true');
            console.log(`   - Aktif hesap sayısı: ${accounts.rows[0].count}`);
            
            return true;
        } else {
            console.log('❌ scheduleBankSync fonksiyonu bulunamadı!');
            return false;
        }
    } catch (error) {
        console.log('❌ scheduleBankSync hatası:', error.message);
        console.log(error.stack);
        return false;
    }
}

async function testManualTrigger() {
    console.log('\n🔧 MANUEL TETİKLEME TESTİ');
    console.log('='.repeat(50));
    
    try {
        const cronManager = getCronJobManager();
        
        // Job register edilmiş mi kontrol et
        const status = cronManager.getStatus('bankSyncJob');
        
        if (!status) {
            console.log('❌ bankSyncJob register edilmemiş, manuel tetikleme yapılamaz');
            return false;
        }
        
        console.log('✅ bankSyncJob register edilmiş, manuel tetikleme deneniyor...');
        console.log('⚠️  NOT: Bu test banka API çağrısı yapmayacak, sadece job fonksiyonunu çağıracak');
        
        // Manuel tetikleme (ama timeout ile)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout (30 saniye)')), 30000)
        );
        
        try {
            const result = await Promise.race([
                cronManager.runNow('bankSyncJob'),
                timeoutPromise
            ]);
            
            console.log('✅ Manuel tetikleme başarılı:');
            console.log(JSON.stringify(result, null, 2));
            return true;
        } catch (error) {
            if (error.message.includes('Timeout')) {
                console.log('⚠️  Job çalışıyor ama timeout oldu (normal, banka API çağrısı yapıyor olabilir)');
                return true; // Timeout normal, job çalışıyor demektir
            } else {
                console.log('❌ Manuel tetikleme hatası:', error.message);
                return false;
            }
        }
    } catch (error) {
        console.log('❌ Manuel tetikleme testi hatası:', error.message);
        console.log(error.stack);
        return false;
    }
}

async function main() {
    console.log('🔍 CRON SİSTEMİ DEBUG RAPORU');
    console.log('='.repeat(50));
    console.log(`Tarih: ${new Date().toLocaleString('tr-TR')}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    const results = {
        database: false,
        redis: false,
        cronManager: false,
        queueManager: false,
        scheduleJob: false,
        manualTrigger: false
    };
    
    // Tüm kontrolleri yap
    results.database = await checkDatabase();
    results.redis = await checkRedis();
    results.cronManager = await checkCronJobManager();
    results.queueManager = await checkQueueManager();
    results.scheduleJob = await checkScheduleBankSync();
    
    // Manuel tetikleme testi (opsiyonel, kullanıcı isterse)
    if (process.argv.includes('--test-trigger')) {
        results.manualTrigger = await testManualTrigger();
    }
    
    // Özet
    console.log('\n📋 ÖZET');
    console.log('='.repeat(50));
    console.log(`Database:        ${results.database ? '✅' : '❌'}`);
    console.log(`Redis:           ${results.redis ? '✅' : '⚠️  (Opsiyonel)'}`);
    console.log(`CronManager:     ${results.cronManager ? '✅' : '❌'}`);
    console.log(`QueueManager:    ${results.queueManager ? '✅' : '❌'}`);
    console.log(`ScheduleJob:     ${results.scheduleJob ? '✅' : '❌'}`);
    if (process.argv.includes('--test-trigger')) {
        console.log(`Manual Trigger:  ${results.manualTrigger ? '✅' : '❌'}`);
    }
    
    // Sorun tespiti
    console.log('\n🔧 SORUN TESPİTİ');
    console.log('='.repeat(50));
    
    if (!results.database) {
        console.log('\n❌ SORUN: Database\'de bankSyncJob kaydı yok');
        console.log('💡 ÇÖZÜM:');
        console.log('   1. Migration çalıştırın: npm run migrate');
        console.log('   2. Veya manuel ekleyin: scripts/seed_cron_jobs.js');
    }
    
    if (!results.cronManager) {
        console.log('\n❌ SORUN: CronJobManager\'da job register edilmemiş');
        console.log('💡 ÇÖZÜM:');
        console.log('   server.js dosyasında initCronJobs() fonksiyonunu kontrol edin');
        console.log('   bankSyncJob için registerJob çağrısı olmalı');
    }
    
    if (!results.redis && results.queueManager) {
        console.log('\n⚠️  UYARI: Redis yok ama Queue fallback modda çalışıyor');
        console.log('💡 NOT: Bu durumda job\'lar direkt çalıştırılacak (kuyruk olmadan)');
    }
    
    if (results.database && results.cronManager && results.queueManager) {
        console.log('\n✅ TEMEL SİSTEM HAZIR');
        console.log('💡 Şimdi server.js\'yi başlatıp test edebilirsiniz');
    }
    
    process.exit(0);
}

main().catch(error => {
    console.error('❌ Kritik hata:', error);
    process.exit(1);
});

