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

    /**
     * Kuruma ait kullanıcıları ve eklenebilir diğer kullanıcıları getirir.
     */
    async getInstitutionUsers(institutionId) {
        // Kuruma atanmış kullanıcılar (user_institutions tablosundan)
        const assignedQuery = `
            SELECT u.id, u.name, u.email, u.role_id, true as is_assigned
            FROM users u
            INNER JOIN user_institutions ui ON u.id = ui.user_id
            WHERE ui.institution_id = $1 AND u.is_active = true
        `;

        // Bu kuruma atanmamış diğer aktif kullanıcılar
        const availableQuery = `
            SELECT u.id, u.name, u.email, u.role_id, false as is_assigned
            FROM users u
            WHERE u.is_active = true 
            AND NOT EXISTS (
                SELECT 1 FROM user_institutions ui 
                WHERE ui.user_id = u.id AND ui.institution_id = $1
            )
            ORDER BY u.name
        `;

        const assignedResult = await pool.query(assignedQuery, [institutionId]);
        const availableResult = await pool.query(availableQuery, [institutionId]);

        // İki listeyi birleştir
        return [...assignedResult.rows, ...availableResult.rows];
    }

    /**
     * Kurumun kullanıcı listesini günceller.
     * @param {number} institutionId 
     * @param {Array<number>} userIds - Bu kuruma atanacak kullanıcı ID'leri
     */
    async updateInstitutionUsers(institutionId, userIds) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Bu kurumdaki tüm yetkilendirmeleri sil
            await client.query('DELETE FROM user_institutions WHERE institution_id = $1', [institutionId]);

            // 2. Yeni listeyi ekle
            if (userIds && userIds.length > 0) {
                const values = userIds.map((uid, index) => `($1, $${index + 2})`).join(',');
                const params = [institutionId, ...userIds];

                await client.query(`
                    INSERT INTO user_institutions (institution_id, user_id)
                    VALUES ${values}
                `, params);
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new InstitutionService();
