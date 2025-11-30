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
        console.log('🚀 Migration başlıyor: Add Bank Sync Cron Job (003)');
        console.log('');

        await client.query('BEGIN');

        // Cron job ekle
        // 5 dakikada bir çalışacak şekilde: */5 * * * *
        const insertQuery = `
            INSERT INTO cron_jobs (name, title, description, schedule, is_enabled)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (name) DO UPDATE SET
                schedule = $4,
                is_enabled = $5
        `;

        await client.query(insertQuery, [
            'bankSyncJob',
            'Banka Hesap Senkronizasyonu',
            'Tüm aktif banka hesaplarını tarar ve hareketleri günceller (Queue kullanır).',
            '*/5 * * * *', // Her 5 dakikada bir
            true
        ]);

        console.log('   ✅ bankSyncJob cron job tablosuna eklendi.');

        await client.query('COMMIT');
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
    // Rollback gerekirse job'ı silebiliriz veya disable edebiliriz.
    // Şimdilik boş.
}

if (require.main === module) {
    runMigration().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runMigration, rollback };
