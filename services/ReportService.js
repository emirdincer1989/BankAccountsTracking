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
        let balanceQuery, balanceParams;
        if (institutionId === null) {
            balanceQuery = `
                SELECT SUM(last_balance) as total_balance, COUNT(*) as total_accounts
                FROM bank_accounts
                WHERE is_active = true
            `;
            balanceParams = [];
        } else {
            balanceQuery = `
                SELECT SUM(last_balance) as total_balance, COUNT(*) as total_accounts
                FROM bank_accounts
                WHERE institution_id = $1 AND is_active = true
            `;
            balanceParams = [institutionId];
        }
        const balanceResult = await pool.query(balanceQuery, balanceParams);

        // 2. Bugünün Giriş/Çıkışı
        const today = new Date().toISOString().split('T')[0];
        let flowQuery, flowParams;
        if (institutionId === null) {
            flowQuery = `
                SELECT 
                    SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as income_today,
                    SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as expense_today
                FROM transactions t
                JOIN bank_accounts ba ON t.account_id = ba.id
                WHERE t.date = $1
            `;
            flowParams = [today];
        } else {
            flowQuery = `
                SELECT 
                    SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as income_today,
                    SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as expense_today
                FROM transactions t
                JOIN bank_accounts ba ON t.account_id = ba.id
                WHERE ba.institution_id = $1 AND t.date = $2
            `;
            flowParams = [institutionId, today];
        }
        const flowResult = await pool.query(flowQuery, flowParams);

        return {
            ...balanceResult.rows[0],
            ...flowResult.rows[0]
        };
    }

    async getBalanceDistribution(institutionId) {
        let query, params;
        if (institutionId === null) {
            query = `
                SELECT bank_name, SUM(last_balance) as total
                FROM bank_accounts
                WHERE is_active = true
                GROUP BY bank_name
            `;
            params = [];
        } else {
            query = `
                SELECT bank_name, SUM(last_balance) as total
                FROM bank_accounts
                WHERE institution_id = $1 AND is_active = true
                GROUP BY bank_name
            `;
            params = [institutionId];
        }
        const result = await pool.query(query, params);
        return result.rows;
    }

    async getDailyFlow(institutionId, days = 7) {
        // Güvenlik: days parametresini integer olarak kontrol et
        const safeDays = parseInt(days) || 7;
        let query, params;
        if (institutionId === null) {
            query = `
                SELECT 
                    t.date,
                    SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as income,
                    SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as expense
                FROM transactions t
                JOIN bank_accounts ba ON t.account_id = ba.id
                WHERE t.date >= CURRENT_DATE - INTERVAL '${safeDays} days'
                GROUP BY t.date
                ORDER BY t.date ASC
            `;
            params = [];
        } else {
            query = `
                SELECT 
                    t.date,
                    SUM(CASE WHEN t.amount > 0 THEN t.amount ELSE 0 END) as income,
                    SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as expense
                FROM transactions t
                JOIN bank_accounts ba ON t.account_id = ba.id
                WHERE ba.institution_id = $1 
                  AND t.date >= CURRENT_DATE - INTERVAL '${safeDays} days'
                GROUP BY t.date
                ORDER BY t.date ASC
            `;
            params = [institutionId];
        }
        const result = await pool.query(query, params);
        return result.rows;
    }

    /**
     * Son bir aylık bakiye geçmişini getirir
     * @param {number} institutionId - Kurum ID
     * @param {boolean} groupByBank - Kurum bazında grupla (true) veya toplam (false)
     * @param {number} days - Kaç günlük veri (varsayılan 30)
     * @returns {Promise<Array>} Bakiye geçmişi verileri
     */
    async getBalanceHistory(institutionId, groupByBank = false, days = 30) {
        // Güvenlik: days parametresini integer olarak kontrol et
        const safeDays = parseInt(days) || 30;
        
        if (groupByBank) {
            // Kurum bazında bakiye geçmişi
            let query, params;
            if (institutionId === null) {
                query = `
                    WITH daily_balances AS (
                        SELECT 
                            DATE(t.date) as date,
                            ba.bank_name,
                            t.account_id,
                            t.balance_after_transaction,
                            ROW_NUMBER() OVER (
                                PARTITION BY DATE(t.date), ba.bank_name, t.account_id 
                                ORDER BY t.date DESC, t.id DESC
                            ) as rn
                        FROM transactions t
                        JOIN bank_accounts ba ON t.account_id = ba.id
                        WHERE t.date >= CURRENT_DATE - INTERVAL '${safeDays} days'
                          AND t.balance_after_transaction IS NOT NULL
                    ),
                    latest_daily_balances AS (
                        SELECT date, bank_name, account_id, balance_after_transaction
                        FROM daily_balances
                        WHERE rn = 1
                    ),
                    bank_daily_totals AS (
                        SELECT 
                            date,
                            bank_name,
                            SUM(balance_after_transaction) as total_balance
                        FROM latest_daily_balances
                        GROUP BY date, bank_name
                    )
                    SELECT 
                        date,
                        bank_name,
                        total_balance
                    FROM bank_daily_totals
                    ORDER BY date ASC, bank_name ASC
                `;
                params = [];
            } else {
                query = `
                    WITH daily_balances AS (
                        SELECT 
                            DATE(t.date) as date,
                            ba.bank_name,
                            t.account_id,
                            t.balance_after_transaction,
                            ROW_NUMBER() OVER (
                                PARTITION BY DATE(t.date), ba.bank_name, t.account_id 
                                ORDER BY t.date DESC, t.id DESC
                            ) as rn
                        FROM transactions t
                        JOIN bank_accounts ba ON t.account_id = ba.id
                        WHERE ba.institution_id = $1 
                          AND t.date >= CURRENT_DATE - INTERVAL '${safeDays} days'
                          AND t.balance_after_transaction IS NOT NULL
                    ),
                    latest_daily_balances AS (
                        SELECT date, bank_name, account_id, balance_after_transaction
                        FROM daily_balances
                        WHERE rn = 1
                    ),
                    bank_daily_totals AS (
                        SELECT 
                            date,
                            bank_name,
                            SUM(balance_after_transaction) as total_balance
                        FROM latest_daily_balances
                        GROUP BY date, bank_name
                    )
                    SELECT 
                        date,
                        bank_name,
                        total_balance
                    FROM bank_daily_totals
                    ORDER BY date ASC, bank_name ASC
                `;
                params = [institutionId];
            }
            const result = await pool.query(query, params);
            return result.rows;
        } else {
            // Toplam bakiye geçmişi
            let query, params;
            if (institutionId === null) {
                query = `
                    WITH daily_balances AS (
                        SELECT 
                            DATE(t.date) as date,
                            t.account_id,
                            t.balance_after_transaction,
                            ROW_NUMBER() OVER (
                                PARTITION BY DATE(t.date), t.account_id 
                                ORDER BY t.date DESC, t.id DESC
                            ) as rn
                        FROM transactions t
                        JOIN bank_accounts ba ON t.account_id = ba.id
                        WHERE t.date >= CURRENT_DATE - INTERVAL '${safeDays} days'
                          AND t.balance_after_transaction IS NOT NULL
                    ),
                    latest_daily_balances AS (
                        SELECT date, account_id, balance_after_transaction
                        FROM daily_balances
                        WHERE rn = 1
                    ),
                    daily_totals AS (
                        SELECT 
                            date,
                            SUM(balance_after_transaction) as total_balance
                        FROM latest_daily_balances
                        GROUP BY date
                    )
                    SELECT 
                        date,
                        total_balance
                    FROM daily_totals
                    ORDER BY date ASC
                `;
                params = [];
            } else {
                query = `
                    WITH daily_balances AS (
                        SELECT 
                            DATE(t.date) as date,
                            t.account_id,
                            t.balance_after_transaction,
                            ROW_NUMBER() OVER (
                                PARTITION BY DATE(t.date), t.account_id 
                                ORDER BY t.date DESC, t.id DESC
                            ) as rn
                        FROM transactions t
                        JOIN bank_accounts ba ON t.account_id = ba.id
                        WHERE ba.institution_id = $1 
                          AND t.date >= CURRENT_DATE - INTERVAL '${safeDays} days'
                          AND t.balance_after_transaction IS NOT NULL
                    ),
                    latest_daily_balances AS (
                        SELECT date, account_id, balance_after_transaction
                        FROM daily_balances
                        WHERE rn = 1
                    ),
                    daily_totals AS (
                        SELECT 
                            date,
                            SUM(balance_after_transaction) as total_balance
                        FROM latest_daily_balances
                        GROUP BY date
                    )
                    SELECT 
                        date,
                        total_balance
                    FROM daily_totals
                    ORDER BY date ASC
                `;
                params = [institutionId];
            }
            const result = await pool.query(query, params);
            return result.rows;
        }
    }
}

module.exports = new ReportService();
