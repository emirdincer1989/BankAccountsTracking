/**
 * Bank Accounts Tracking Schema
 * 
 * Creates tables for:
 * - institutions (Kurumlar)
 * - bank_accounts (Banka Hesapları)
 * - transactions (Hesap Hareketleri)
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
        console.log('🚀 Migration başlıyor: Bank Tracking Schema (002)');
        console.log('');

        await client.query('BEGIN');

        // 1. INSTITUTIONS (Kurumlar)
        console.log('1️⃣ institutions tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE institutions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                parent_id INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
                tax_number VARCHAR(20),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ institutions tablosu oluşturuldu');

        // 2. BANK ACCOUNTS (Banka Hesapları)
        console.log('2️⃣ bank_accounts tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE bank_accounts (
                id SERIAL PRIMARY KEY,
                institution_id INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
                bank_name VARCHAR(50) NOT NULL, -- 'Ziraat', 'Vakif', 'Halk'
                account_name VARCHAR(100) NOT NULL,
                account_number VARCHAR(50),
                iban VARCHAR(34),
                currency VARCHAR(3) DEFAULT 'TRY',
                credentials JSONB DEFAULT '{}'::jsonb, -- Şifreli banka giriş bilgileri
                last_balance DECIMAL(15, 2) DEFAULT 0,
                last_balance_update TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ bank_accounts tablosu oluşturuldu');

        // 3. TRANSACTIONS (Hesap Hareketleri)
        console.log('3️⃣ transactions tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE transactions (
                id SERIAL PRIMARY KEY,
                account_id INTEGER REFERENCES bank_accounts(id) ON DELETE CASCADE,
                unique_bank_ref_id VARCHAR(100), -- Bankadan gelen benzersiz ID (varsa)
                date TIMESTAMP NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                description TEXT,
                sender_receiver VARCHAR(255),
                balance_after_transaction DECIMAL(15, 2),
                metadata JSONB DEFAULT '{}'::jsonb, -- Ham veri
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_transaction_per_account UNIQUE (account_id, unique_bank_ref_id)
            )
        `);
        console.log('   ✅ transactions tablosu oluşturuldu');

        // İNDEKSLER
        console.log('📊 İndeksler oluşturuluyor...');
        await client.query(`CREATE INDEX idx_institutions_parent ON institutions(parent_id)`);
        await client.query(`CREATE INDEX idx_bank_accounts_institution ON bank_accounts(institution_id)`);
        await client.query(`CREATE INDEX idx_bank_accounts_bank_name ON bank_accounts(bank_name)`);
        await client.query(`CREATE INDEX idx_transactions_account ON transactions(account_id)`);
        await client.query(`CREATE INDEX idx_transactions_date ON transactions(date DESC)`);
        await client.query(`CREATE INDEX idx_transactions_unique_ref ON transactions(unique_bank_ref_id)`);
        console.log('   ✅ İndeksler oluşturuldu');

        // TRIGGERLAR (updated_at için)
        console.log('⚡ Trigger\'lar oluşturuluyor...');

        // Önceki migration'da tanımlanan fonksiyonu kullanıyoruz: update_notifications_updated_at benzeri genel bir fonksiyon yoksa yenisini yazalım.
        // 001'de update_cron_jobs_updated_at vb. vardı. Genel bir tane yapalım.

        await client.query(`
            CREATE OR REPLACE FUNCTION update_timestamp()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await client.query(`
            CREATE TRIGGER trigger_update_institutions_timestamp
            BEFORE UPDATE ON institutions
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp();
        `);

        await client.query(`
            CREATE TRIGGER trigger_update_bank_accounts_timestamp
            BEFORE UPDATE ON bank_accounts
            FOR EACH ROW
            EXECUTE FUNCTION update_timestamp();
        `);
        console.log('   ✅ Trigger\'lar oluşturuldu');

        await client.query('COMMIT');

        console.log('╔════════════════════════════════════════════════╗');
        console.log('║  ✅ Migration (002) başarıyla tamamlandı!     ║');
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
        console.log('🔄 Rollback başlıyor (002)...');
        await client.query('BEGIN');

        await client.query('DROP TABLE IF EXISTS transactions CASCADE');
        await client.query('DROP TABLE IF EXISTS bank_accounts CASCADE');
        await client.query('DROP TABLE IF EXISTS institutions CASCADE');

        // Trigger fonksiyonunu silmiyoruz çünkü başka yerlerde kullanılabilir (generic ise)
        // Ama triggerları sildik (tablo silinince gider)

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
