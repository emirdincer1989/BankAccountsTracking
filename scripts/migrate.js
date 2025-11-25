#!/usr/bin/env node
/**
 * Database Migration Runner
 *
 * Otomatik olarak çalıştırılmamış migration'ları tespit edip çalıştırır.
 *
 * Kullanım:
 *   node scripts/migrate.js              - Bekleyen migration'ları çalıştır
 *   node scripts/migrate.js --status     - Migration durumunu göster
 *   node scripts/migrate.js --force 004  - Belirli bir migration'ı tekrar çalıştır
 *   npm run migrate                      - Kısa yol
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'rbums',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Migration'ları log'a kaydet
 */
async function logMigration(client, migrationName, status, executionTime, errorMessage = null) {
    await client.query(`
        INSERT INTO migrations_log (migration_name, status, execution_time_ms, error_message)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (migration_name)
        DO UPDATE SET
            executed_at = NOW(),
            status = $2,
            execution_time_ms = $3,
            error_message = $4
    `, [migrationName, status, executionTime, errorMessage]);
}

/**
 * Çalıştırılmış migration'ları getir
 */
async function getExecutedMigrations(client) {
    try {
        const result = await client.query(`
            SELECT migration_name, executed_at, status
            FROM migrations_log
            ORDER BY migration_name
        `);
        return result.rows.map(row => row.migration_name);
    } catch (error) {
        // migrations_log tablosu yoksa, boş array döndür
        if (error.code === '42P01') { // undefined_table
            console.log('ℹ️  migrations_log tablosu bulunamadı, ilk kez çalışıyor...');
            return [];
        }
        throw error;
    }
}

/**
 * Tüm migration dosyalarını getir
 */
function getAllMigrationFiles() {
    const files = fs.readdirSync(MIGRATIONS_DIR)
        .filter(file => file.endsWith('.js'))
        .filter(file => !file.includes('.backup.'))
        .sort(); // Alfabetik sıralama (000_, 001_, 002_...)

    return files;
}

/**
 * Tek bir migration'ı çalıştır
 */
async function runSingleMigration(client, migrationFile) {
    const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📦 Migration: ${migrationFile}`);
    console.log(`${'='.repeat(70)}\n`);

    const startTime = Date.now();

    try {
        // Migration modülünü yükle
        const migration = require(migrationPath);

        if (typeof migration.runMigration !== 'function') {
            throw new Error('Migration dosyası runMigration fonksiyonu export etmiyor');
        }

        // Migration'ı çalıştır
        await migration.runMigration();

        const executionTime = Date.now() - startTime;

        // Log'a kaydet
        await logMigration(client, migrationFile, 'SUCCESS', executionTime);

        console.log(`\n✅ ${migrationFile} başarıyla tamamlandı (${executionTime}ms)`);

        return { success: true, executionTime };

    } catch (error) {
        const executionTime = Date.now() - startTime;

        // Hata log'a kaydet
        await logMigration(client, migrationFile, 'FAILED', executionTime, error.message);

        console.error(`\n❌ ${migrationFile} başarısız oldu:`, error.message);

        return { success: false, error: error.message, executionTime };
    }
}

/**
 * Migration durumunu göster
 */
async function showStatus() {
    const client = await pool.connect();

    try {
        console.log('\n📊 Migration Durumu\n');

        const allFiles = getAllMigrationFiles();
        const executed = await getExecutedMigrations(client);

        // Tablo başlığı
        console.log('┌────────────────────────────────────────────────┬──────────┬─────────────────────┐');
        console.log('│ Migration                                      │ Durum    │ Çalıştırılma Zamanı │');
        console.log('├────────────────────────────────────────────────┼──────────┼─────────────────────┤');

        for (const file of allFiles) {
            const isExecuted = executed.includes(file);
            const status = isExecuted ? '✅ Çalıştı' : '⏸️  Bekliyor';

            let executedAt = '-';
            if (isExecuted) {
                const result = await client.query(
                    'SELECT executed_at FROM migrations_log WHERE migration_name = $1',
                    [file]
                );
                if (result.rows.length > 0) {
                    const date = new Date(result.rows[0].executed_at);
                    executedAt = date.toLocaleString('tr-TR');
                }
            }

            const fileName = file.padEnd(46);
            const statusText = status.padEnd(8);
            const dateText = executedAt.padEnd(19);

            console.log(`│ ${fileName} │ ${statusText} │ ${dateText} │`);
        }

        console.log('└────────────────────────────────────────────────┴──────────┴─────────────────────┘');

        const pendingCount = allFiles.length - executed.length;
        console.log(`\n📝 Toplam: ${allFiles.length} migration, ${executed.length} çalıştırıldı, ${pendingCount} bekliyor\n`);

    } catch (error) {
        console.error('❌ Durum gösterilirken hata:', error);
    } finally {
        client.release();
    }
}

/**
 * Ana migration runner
 */
async function runMigrations(options = {}) {
    const client = await pool.connect();

    try {
        console.log('\n🚀 Migration sistemi başlatılıyor...\n');

        const allFiles = getAllMigrationFiles();
        const executed = await getExecutedMigrations(client);

        // Bekleyen migration'ları bul
        let pendingMigrations = allFiles.filter(file => !executed.includes(file));

        // Force mode: Belirli migration'ı tekrar çalıştır
        if (options.force) {
            const forcedFile = allFiles.find(f => f.includes(options.force));
            if (!forcedFile) {
                console.error(`❌ Migration bulunamadı: ${options.force}`);
                return;
            }
            pendingMigrations = [forcedFile];
            console.log(`⚠️  FORCE MODE: ${forcedFile} tekrar çalıştırılacak\n`);
        }

        if (pendingMigrations.length === 0) {
            console.log('✅ Tüm migration\'lar zaten çalıştırılmış!\n');
            console.log('💡 Durum görmek için: node scripts/migrate.js --status\n');
            return;
        }

        console.log(`📋 ${pendingMigrations.length} migration çalıştırılacak:\n`);
        pendingMigrations.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file}`);
        });
        console.log('');

        // Her migration'ı sırayla çalıştır
        const results = [];
        for (const migrationFile of pendingMigrations) {
            const result = await runSingleMigration(client, migrationFile);
            results.push({ file: migrationFile, ...result });

            // Hata olursa dur
            if (!result.success && !options.force) {
                console.error('\n❌ Migration hatası nedeniyle durduruluyor.\n');
                break;
            }
        }

        // Özet
        console.log(`\n${'='.repeat(70)}`);
        console.log('📊 ÖZET');
        console.log(`${'='.repeat(70)}\n`);

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const totalTime = results.reduce((sum, r) => sum + r.executionTime, 0);

        console.log(`✅ Başarılı: ${successful}`);
        console.log(`❌ Başarısız: ${failed}`);
        console.log(`⏱️  Toplam süre: ${totalTime}ms`);
        console.log('');

        if (failed > 0) {
            console.log('⚠️  Bazı migration\'lar başarısız oldu. Lütfen hataları kontrol edin.\n');
            process.exit(1);
        } else {
            console.log('🎉 Tüm migration\'lar başarıyla tamamlandı!\n');
            
            // Seed dosyası varsa ve --with-seed flag'i varsa çalıştır
            if (options.withSeed) {
                const seedPath = path.join(__dirname, 'seed.js');
                if (fs.existsSync(seedPath)) {
                    console.log('🌱 Seed dosyası çalıştırılıyor...\n');
                    try {
                        const { seedData } = require(seedPath);
                        await seedData();
                        console.log('✅ Seed işlemi tamamlandı!\n');
                    } catch (error) {
                        console.error('⚠️  Seed hatası (devam ediliyor):', error.message);
                    }
                }
            }
        }

    } catch (error) {
        console.error('❌ Migration runner hatası:', error);
        process.exit(1);
    } finally {
        client.release();
    }
}

// CLI
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--status')) {
        showStatus()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    } else if (args.includes('--force')) {
        const forceIndex = args.indexOf('--force');
        const migrationNumber = args[forceIndex + 1];
        if (!migrationNumber) {
            console.error('❌ --force için migration numarası gerekli (örn: --force 004)');
            process.exit(1);
        }
        const withSeed = args.includes('--with-seed');
        runMigrations({ force: migrationNumber, withSeed })
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    } else {
        const withSeed = args.includes('--with-seed');
        runMigrations({ withSeed })
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    }
}

module.exports = { runMigrations, showStatus };
