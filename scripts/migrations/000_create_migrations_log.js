/**
 * Migration Tracker System
 *
 * Bu migration diğer tüm migration'lardan önce çalışmalı (000_)
 * Migration'ların hangi sırayla ve ne zaman çalıştığını takip eder.
 *
 * Avantajlar:
 * - Aynı migration'ı iki kez çalıştırmayı engeller
 * - Hangi migration'ların çalıştığını gösterir
 * - Otomatik migration runner mümkün olur
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'rbums',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Migration başlıyor: Create migrations_log table');

        await client.query('BEGIN');

        // migrations_log tablosunu oluştur
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations_log (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT NOW(),
                execution_time_ms INTEGER,
                status VARCHAR(20) DEFAULT 'SUCCESS',
                error_message TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        console.log('   ✅ migrations_log tablosu oluşturuldu');

        // Index ekle (performans için)
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_migrations_log_name
            ON migrations_log(migration_name)
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_migrations_log_executed_at
            ON migrations_log(executed_at DESC)
        `);

        console.log('   ✅ Indexler oluşturuldu');

        // Comment ekle
        await client.query(`
            COMMENT ON TABLE migrations_log IS
            'Migration tracking system - Stores execution history of database migrations'
        `);

        await client.query(`
            COMMENT ON COLUMN migrations_log.migration_name IS
            'Unique migration filename (e.g., 001_initial_schema.js)'
        `);

        await client.query(`
            COMMENT ON COLUMN migrations_log.execution_time_ms IS
            'How long the migration took to execute (in milliseconds)'
        `);

        await client.query(`
            COMMENT ON COLUMN migrations_log.status IS
            'SUCCESS, FAILED, or ROLLED_BACK'
        `);

        await client.query('COMMIT');

        console.log('\n✅ Migration başarıyla tamamlandı!');
        console.log('');
        console.log('📝 Artık migration sistemi aktif:');
        console.log('   - Her migration çalıştığında migrations_log\'a kaydedilir');
        console.log('   - Aynı migration iki kez çalışmaz');
        console.log('   - `npm run migrate` ile otomatik çalıştırabilirsiniz');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration hatası:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function rollback() {
    const client = await pool.connect();

    try {
        console.log('🔄 Rollback başlıyor...');

        await client.query('BEGIN');

        await client.query(`DROP TABLE IF EXISTS migrations_log CASCADE`);
        console.log('   ✅ migrations_log tablosu kaldırıldı');

        await client.query('COMMIT');

        console.log('✅ Rollback başarıyla tamamlandı!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Rollback hatası:', error);
        throw error;
    } finally {
        client.release();
    }
}

// CLI kullanımı
if (require.main === module) {
    const args = process.argv.slice(2);
    const isRollback = args.includes('--rollback');

    (isRollback ? rollback() : runMigration())
        .then(() => {
            console.log('\n👋 Migration script sonlandı');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { runMigration, rollback };
