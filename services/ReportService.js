const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

class ReportService {
    async getSummaryStats(institutionId) {
        // 1. Toplam Bakiye
        const balanceQuery = `
            SELECT SUM(last_balance) as total_balance, COUNT(*) as total_accounts
            FROM bank_accounts
            WHERE institution_id = $1 AND is_active = true
        `;
        const balanceResult = await pool.query(balanceQuery, [institutionId]);

        // 2. Bugünün Giriş/Çıkışı
        const today = new Date().toISOString().split('T')[0];
        const flowQuery = `
            SELECT 
                SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as income_today,
                SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as expense_today
            FROM transactions t
            JOIN bank_accounts ba ON t.account_id = ba.id
            WHERE ba.institution_id = $1 AND t.date = $2
        `;
        const flowResult = await pool.query(flowQuery, [institutionId, today]);

        return {
            ...balanceResult.rows[0],
            ...flowResult.rows[0]
        };
    }

    async getBalanceDistribution(institutionId) {
        const query = `
            SELECT bank_name, SUM(last_balance) as total
            FROM bank_accounts
            WHERE institution_id = $1 AND is_active = true
            GROUP BY bank_name
        `;
        const result = await pool.query(query, [institutionId]);
        return result.rows;
    }

    async getDailyFlow(institutionId, days = 7) {
        const query = `
            SELECT 
                t.date,
                SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as income,
                SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as expense
            FROM transactions t
            JOIN bank_accounts ba ON t.account_id = ba.id
            WHERE ba.institution_id = $1 
              AND t.date >= CURRENT_DATE - INTERVAL '${days} days'
            GROUP BY t.date
            ORDER BY t.date ASC
        `;
        const result = await pool.query(query, [institutionId]);
        return result.rows;
    }
}

module.exports = new ReportService();
