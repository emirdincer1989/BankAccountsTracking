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
    try {
        await pool.query('TRUNCATE TABLE transactions RESTART IDENTITY CASCADE');
        console.log('Transactions table cleared.');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

clearTransactions();
