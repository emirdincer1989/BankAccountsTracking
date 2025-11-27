const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

class InstitutionService {
    /**
     * Tüm kurumları (hiyerarşik yapıda) getirir.
     * @returns {Promise<Array>}
     */
    async getAllInstitutions() {
        const query = `
            WITH RECURSIVE institution_tree AS (
                SELECT id, name, parent_id, tax_number, is_active, 0 as level, 
                       name::text as path
                FROM institutions
                WHERE parent_id IS NULL
                
                UNION ALL
                
                SELECT i.id, i.name, i.parent_id, i.tax_number, i.is_active, it.level + 1,
                       (it.path || ' > ' || i.name)
                FROM institutions i
                INNER JOIN institution_tree it ON i.parent_id = it.id
            )
            SELECT * FROM institution_tree ORDER BY path;
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    /**
     * Yeni kurum ekler.
     */
    async createInstitution(data) {
        const { name, parent_id, tax_number } = data;
        const query = `
            INSERT INTO institutions (name, parent_id, tax_number)
            VALUES ($1, $2, $3)
            RETURNING *
        `;
        const result = await pool.query(query, [name, parent_id, tax_number]);
        return result.rows[0];
    }

    /**
     * Kurum günceller.
     */
    async updateInstitution(id, data) {
        const { name, parent_id, tax_number, is_active } = data;
        const query = `
            UPDATE institutions 
            SET name = COALESCE($1, name),
                parent_id = $2, -- parent_id null olabilir, o yüzden COALESCE kullanmadık
                tax_number = COALESCE($3, tax_number),
                is_active = COALESCE($4, is_active)
            WHERE id = $5
            RETURNING *
        `;
        const result = await pool.query(query, [name, parent_id, tax_number, is_active, id]);
        return result.rows[0];
    }

    /**
     * Kurum siler (Alt kurumları varsa hata verir veya cascade siler - şimdilik restrict).
     */
    async deleteInstitution(id) {
        // Alt kurum var mı kontrolü
        const checkChild = await pool.query('SELECT id FROM institutions WHERE parent_id = $1', [id]);
        if (checkChild.rows.length > 0) {
            throw new Error('Alt kurumları olan bir kurum silinemez.');
        }

        await pool.query('DELETE FROM institutions WHERE id = $1', [id]);
        return { success: true };
    }
}

module.exports = new InstitutionService();
