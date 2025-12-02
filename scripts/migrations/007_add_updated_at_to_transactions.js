/**
 * Add updated_at column to transactions table
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
        console.log('🚀 Migration başlıyor: Add updated_at to transactions (007)');
        console.log('');

        await client.query('BEGIN');

        // 1. Add updated_at column
        console.log('1️⃣ updated_at kolonu ekleniyor...');
        await client.query(`
            ALTER TABLE transactions 
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        `);
        console.log('   ✅ updated_at kolonu eklendi');

        // 2. Add trigger for auto-update
        console.log('2️⃣ Trigger ekleniyor...');

        // Check if update_timestamp function exists (it should from 002)
        // If not, create it
        await client.query(`
            CREATE OR REPLACE FUNCTION update_timestamp()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        // Drop trigger if exists to avoid errors
        await client.query(`
            DROP TRIGGER IF EXISTS trigger_update_transactions_timestamp ON transactions
        `);

        await client.query(`
            CREATE TRIGGER trigger_update_transactions_timestamp
            BEFORE UPDATE ON transactions
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp();
        `);
        console.log('   ✅ Trigger eklendi');

        await client.query('COMMIT');

        console.log('╔════════════════════════════════════════════════╗');
        console.log('║  ✅ Migration (007) başarıyla tamamlandı!     ║');
        console.log('╚════════════════════════════════════════════════╝');

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
        console.log('🔄 Rollback başlıyor (007)...');
        await client.query('BEGIN');

        await client.query('DROP TRIGGER IF EXISTS trigger_update_transactions_timestamp ON transactions');
        await client.query('ALTER TABLE transactions DROP COLUMN IF EXISTS updated_at');

        await client.query('COMMIT');
        console.log('✅ Rollback tamamlandı');

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
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { runMigration, rollback };
