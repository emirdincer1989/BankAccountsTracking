/**
 * Create User Institutions Table
 *
 * Kullanıcıların birden fazla kuruma yetkilendirilmesini sağlar.
 * users tablosundaki institution_id kolonu artık "varsayılan/ana kurum" olarak kullanılabilir veya kaldırılabilir.
 * Biz geriye dönük uyumluluk için users.institution_id'yi tutacağız ama asıl yetki kontrolünü user_institutions tablosundan yapacağız.
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
        console.log('🚀 Migration başlıyor: Create User Institutions Table');
        console.log('');

        await client.query('BEGIN');

        // 1. user_institutions tablosunu oluştur
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_institutions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                institution_id INTEGER NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, institution_id)
            )
        `);
        console.log('   ✅ user_institutions tablosu oluşturuldu');

        // 2. Mevcut users.institution_id verilerini bu tabloya taşı
        await client.query(`
            INSERT INTO user_institutions (user_id, institution_id)
            SELECT id, institution_id FROM users 
            WHERE institution_id IS NOT NULL
            ON CONFLICT (user_id, institution_id) DO NOTHING
        `);
        console.log('   ✅ Mevcut kullanıcı kurumları taşındı');

        // 3. İndeksler
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_institutions_user_id ON user_institutions(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_institutions_institution_id ON user_institutions(institution_id)`);
        console.log('   ✅ İndeksler oluşturuldu');

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

        await client.query('DROP TABLE IF EXISTS user_institutions CASCADE');

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
