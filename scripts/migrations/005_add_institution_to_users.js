/**
 * Add Institution ID to Users
 *
 * Kullanıcıları kurumlara bağlamak için users tablosuna institution_id ekler.
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
        console.log('🚀 Migration başlıyor: Add Institution ID to Users');
        console.log('');

        await client.query('BEGIN');

        // institution_id kolonunu ekle
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS institution_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL
        `);
        console.log('   ✅ institution_id kolonu eklendi');

        // İndeks ekle
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_institution_id ON users(institution_id)
        `);
        console.log('   ✅ İndeks oluşturuldu');

        await client.query('COMMIT');

        console.log('');
        console.log('✅ Migration başarıyla tamamlandı!');

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

        await client.query('ALTER TABLE users DROP COLUMN IF EXISTS institution_id');

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

if (require.main === module) {
    const args = process.argv.slice(2);
    const isRollback = args.includes('--rollback');

    (isRollback ? rollback() : runMigration())
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { runMigration, rollback };
