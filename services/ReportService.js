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
     * Günlük maksimum bakiyeyi gösterir (otomatik transferlerden etkilenmez)
     * 
     * @param {number} institutionId - Kurum ID
     * @param {boolean} groupByBank - Kurum bazında grupla (true) veya toplam (false)
     * @param {number} days - Kaç günlük veri (varsayılan 30)
     * @returns {Promise<Array>} Bakiye geçmişi verileri
     */
    async getBalanceHistory(institutionId, groupByBank = false, days = 30) {
        // Güvenlik: days parametresini integer olarak kontrol et
        const safeDays = parseInt(days) || 30;
        
        if (groupByBank) {
            // Banka bazında bakiye geçmişi - Günlük maksimum bakiye (forward fill ile)
            let query, params;
            
            if (institutionId === null) {
                query = `
                    WITH date_series AS (
                        SELECT generate_series(
                            CURRENT_DATE - INTERVAL '${safeDays} days',
                            CURRENT_DATE,
                            '1 day'::interval
                        )::date AS date
                    ),
                    bank_list AS (
                        SELECT DISTINCT ba.bank_name
                        FROM bank_accounts ba
                        WHERE ba.is_active = true
                    ),
                    date_bank_combinations AS (
                        SELECT ds.date, bl.bank_name
                        FROM date_series ds
                        CROSS JOIN bank_list bl
                    ),
                    daily_max_balances AS (
                        SELECT 
                            DATE(t.date) as date,
                            ba.bank_name,
                            t.account_id,
                            MAX(t.balance_after_transaction) as max_balance
                        FROM transactions t
                        JOIN bank_accounts ba ON t.account_id = ba.id
                        WHERE t.date >= CURRENT_DATE - INTERVAL '${safeDays} days'
                          AND t.balance_after_transaction IS NOT NULL
                        GROUP BY DATE(t.date), ba.bank_name, t.account_id
                    ),
                    daily_balances AS (
                        SELECT 
                            date,
                            bank_name,
                            SUM(max_balance) as total_balance
                        FROM daily_max_balances
                        GROUP BY date, bank_name
                    ),
                    filled_balances AS (
                        SELECT 
                            dbc.date,
                            dbc.bank_name,
                            (
                                SELECT db2.total_balance
                                FROM daily_balances db2
                                WHERE db2.bank_name = dbc.bank_name
                                  AND db2.date <= dbc.date
                                  AND db2.total_balance IS NOT NULL
                                ORDER BY db2.date DESC
                                LIMIT 1
                            ) as total_balance
                        FROM date_bank_combinations dbc
                    )
                    SELECT 
                        date,
                        bank_name,
                        COALESCE(total_balance, 0) as total_balance
                    FROM filled_balances
                    ORDER BY date ASC, bank_name ASC
                `;
                params = [];
            } else {
                query = `
                    WITH date_series AS (
                        SELECT generate_series(
                            CURRENT_DATE - INTERVAL '${safeDays} days',
                            CURRENT_DATE,
                            '1 day'::interval
                        )::date AS date
                    ),
                    bank_list AS (
                        SELECT DISTINCT ba.bank_name
                        FROM bank_accounts ba
                        WHERE ba.institution_id = $1 AND ba.is_active = true
                    ),
                    date_bank_combinations AS (
                        SELECT ds.date, bl.bank_name
                        FROM date_series ds
                        CROSS JOIN bank_list bl
                    ),
                    daily_max_balances AS (
                        SELECT 
                            DATE(t.date) as date,
                            ba.bank_name,
                            t.account_id,
                            MAX(t.balance_after_transaction) as max_balance
                        FROM transactions t
                        JOIN bank_accounts ba ON t.account_id = ba.id
                        WHERE ba.institution_id = $1 
                          AND t.date >= CURRENT_DATE - INTERVAL '${safeDays} days'
                          AND t.balance_after_transaction IS NOT NULL
                        GROUP BY DATE(t.date), ba.bank_name, t.account_id
                    ),
                    daily_balances AS (
                        SELECT 
                            date,
                            bank_name,
                            SUM(max_balance) as total_balance
                        FROM daily_max_balances
                        GROUP BY date, bank_name
                    ),
                    filled_balances AS (
                        SELECT 
                            dbc.date,
                            dbc.bank_name,
                            (
                                SELECT db2.total_balance
                                FROM daily_balances db2
                                WHERE db2.bank_name = dbc.bank_name
                                  AND db2.date <= dbc.date
                                  AND db2.total_balance IS NOT NULL
                                ORDER BY db2.date DESC
                                LIMIT 1
                            ) as total_balance
                        FROM date_bank_combinations dbc
                    )
                    SELECT 
                        date,
                        bank_name,
                        COALESCE(total_balance, 0) as total_balance
                    FROM filled_balances
                    ORDER BY date ASC, bank_name ASC
                `;
                params = [institutionId];
            }
            const result = await pool.query(query, params);
            return result.rows;
        } else {
            // Toplam bakiye geçmişi - Günlük maksimum bakiye (forward fill ile)
            let query, params;
            
            if (institutionId === null) {
                query = `
                    WITH date_series AS (
                        SELECT generate_series(
                            CURRENT_DATE - INTERVAL '${safeDays} days',
                            CURRENT_DATE,
                            '1 day'::interval
                        )::date AS date
                    ),
                    daily_max_balances AS (
                        SELECT 
                            DATE(t.date) as date,
                            t.account_id,
                            MAX(t.balance_after_transaction) as max_balance
                        FROM transactions t
                        JOIN bank_accounts ba ON t.account_id = ba.id
                        WHERE t.date >= CURRENT_DATE - INTERVAL '${safeDays} days'
                          AND t.balance_after_transaction IS NOT NULL
                        GROUP BY DATE(t.date), t.account_id
                    ),
                    daily_balances AS (
                        SELECT 
                            date,
                            SUM(max_balance) as total_balance
                        FROM daily_max_balances
                        GROUP BY date
                    ),
                    filled_balances AS (
                        SELECT 
                            ds.date,
                            (
                                SELECT db2.total_balance
                                FROM daily_balances db2
                                WHERE db2.date <= ds.date
                                  AND db2.total_balance IS NOT NULL
                                ORDER BY db2.date DESC
                                LIMIT 1
                            ) as total_balance
                        FROM date_series ds
                    )
                    SELECT 
                        date,
                        COALESCE(total_balance, 0) as total_balance
                    FROM filled_balances
                    ORDER BY date ASC
                `;
                params = [];
            } else {
                query = `
                    WITH date_series AS (
                        SELECT generate_series(
                            CURRENT_DATE - INTERVAL '${safeDays} days',
                            CURRENT_DATE,
                            '1 day'::interval
                        )::date AS date
                    ),
                    daily_max_balances AS (
                        SELECT 
                            DATE(t.date) as date,
                            t.account_id,
                            MAX(t.balance_after_transaction) as max_balance
                        FROM transactions t
                        JOIN bank_accounts ba ON t.account_id = ba.id
                        WHERE ba.institution_id = $1 
                          AND t.date >= CURRENT_DATE - INTERVAL '${safeDays} days'
                          AND t.balance_after_transaction IS NOT NULL
                        GROUP BY DATE(t.date), t.account_id
                    ),
                    daily_balances AS (
                        SELECT 
                            date,
                            SUM(max_balance) as total_balance
                        FROM daily_max_balances
                        GROUP BY date
                    ),
                    filled_balances AS (
                        SELECT 
                            ds.date,
                            (
                                SELECT db2.total_balance
                                FROM daily_balances db2
                                WHERE db2.date <= ds.date
                                  AND db2.total_balance IS NOT NULL
                                ORDER BY db2.date DESC
                                LIMIT 1
                            ) as total_balance
                        FROM date_series ds
                    )
                    SELECT 
                        date,
                        COALESCE(total_balance, 0) as total_balance
                    FROM filled_balances
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
