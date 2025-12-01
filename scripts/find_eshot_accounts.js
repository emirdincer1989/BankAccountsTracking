const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function findAccounts() {
    try {
        const res = await pool.query(`
            SELECT i.id as institution_id, i.name as institution_name, ba.id as account_id, ba.bank_name, ba.account_name 
            FROM institutions i 
            JOIN bank_accounts ba ON i.id = ba.institution_id 
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findAccounts();
