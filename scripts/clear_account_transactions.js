const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function clearTransactions() {
    const accountId = process.argv[2];

    if (!accountId) {
        console.error('Lütfen bir hesap ID\'si belirtin. Örn: node scripts/clear_account_transactions.js 5');
        process.exit(1);
    }

    try {
        console.log(`Hesap ID: ${accountId} için tüm hareketler siliniyor...`);

        const res = await pool.query('DELETE FROM transactions WHERE account_id = $1', [accountId]);

        console.log(`İşlem tamamlandı. ${res.rowCount} adet hareket silindi.`);

        // Bakiyeyi de sıfırla veya güncelle
        await pool.query('UPDATE bank_accounts SET last_balance = 0, last_balance_update = NULL WHERE id = $1', [accountId]);
        console.log('Hesap bakiyesi sıfırlandı.');

    } catch (err) {
        console.error('Hata:', err);
    } finally {
        await pool.end();
    }
}

clearTransactions();
