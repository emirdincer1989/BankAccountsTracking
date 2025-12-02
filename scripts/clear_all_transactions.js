const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function clearAll() {
    try {
        console.log('DİKKAT: Tüm banka hareketleri siliniyor...');

        const res = await pool.query('DELETE FROM transactions');
        console.log(`${res.rowCount} adet hareket silindi.`);

        console.log('Hesap bakiyeleri sıfırlanıyor...');
        await pool.query('UPDATE bank_accounts SET last_balance = 0, last_balance_update = NULL');

        console.log('İşlem başarıyla tamamlandı.');
    } catch (err) {
        console.error('Hata:', err);
    } finally {
        await pool.end();
    }
}

clearAll();
