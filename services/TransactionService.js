const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

class TransactionService {
    async searchTransactions(filters) {
        const {
            institution_ids, // Array or null
            account_id,
            start_date,
            end_date,
            min_amount,
            max_amount,
            search_text,
            limit = 20,
            offset = 0
        } = filters;

        // 1. Base Query
        let query = `
            SELECT t.*, ba.bank_name, ba.account_name, i.name as institution_name
            FROM transactions t
            JOIN bank_accounts ba ON t.account_id = ba.id
            LEFT JOIN institutions i ON ba.institution_id = i.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 0;

        // Institution Filter
        if (institution_ids && institution_ids.length > 0) {
            paramCount++;
            query += ` AND ba.institution_id = ANY($${paramCount})`;
            params.push(institution_ids);
        }

        // 2. Filters
        if (account_id) {
            paramCount++;
            query += ` AND t.account_id = $${paramCount}`;
            params.push(account_id);
        }

        if (start_date) {
            paramCount++;
            query += ` AND t.date >= $${paramCount}`;
            params.push(start_date);
        }

        if (end_date) {
            paramCount++;
            query += ` AND t.date <= $${paramCount}`;
            let finalEndDate = end_date;
            if (/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
                finalEndDate += ' 23:59:59';
            }
            params.push(finalEndDate);
        }

        if (min_amount) {
            paramCount++;
            query += ` AND t.amount >= $${paramCount}`;
            params.push(min_amount);
        }

        if (max_amount) {
            paramCount++;
            query += ` AND t.amount <= $${paramCount}`;
            params.push(max_amount);
        }

        if (search_text) {
            paramCount++;
            query += ` AND t.description ILIKE $${paramCount}`;
            params.push(`%${search_text}%`);
        }

        if (filters.type === 'income') {
            query += ` AND t.amount > 0`;
        } else if (filters.type === 'expense') {
            query += ` AND t.amount < 0`;
        }

        // 3. Sorting & Pagination
        query += ` ORDER BY t.date DESC, t.created_at DESC`;

        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);

        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);

        // 4. Execute
        const result = await pool.query(query, params);

        // 5. Count Total (for pagination)
        let countQuery = `
            SELECT COUNT(*) as total
            FROM transactions t
            JOIN bank_accounts ba ON t.account_id = ba.id
            WHERE 1=1
        `;
        // Re-use params excluding limit/offset
        const countParams = params.slice(0, params.length - 2);

        let countParamIdx = 0;
        if (institution_ids && institution_ids.length > 0) {
            countParamIdx++;
            countQuery += ` AND ba.institution_id = ANY($${countParamIdx})`;
        }
        if (account_id) countQuery += ` AND t.account_id = $${++countParamIdx}`;
        if (start_date) countQuery += ` AND t.date >= $${++countParamIdx}`;
        if (end_date) countQuery += ` AND t.date <= $${++countParamIdx}`;
        if (min_amount) countQuery += ` AND t.amount >= $${++countParamIdx}`;
        if (max_amount) countQuery += ` AND t.amount <= $${++countParamIdx}`;
        if (search_text) countQuery += ` AND t.description ILIKE $${++countParamIdx}`;

        if (filters.type === 'income') {
            countQuery += ` AND t.amount > 0`;
        } else if (filters.type === 'expense') {
            countQuery += ` AND t.amount < 0`;
        }

        const countResult = await pool.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        return {
            data: result.rows,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                page: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = new TransactionService();
