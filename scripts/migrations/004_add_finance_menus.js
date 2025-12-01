/**
 * Add Finance Menus
 *
 * Finans kategorisini ve ilgili menü öğelerini ekler.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'rbums',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Migration başlıyor: Add Finance Menus');
        console.log('');

        await client.query('BEGIN');

        // 1. Finans Kategorisi (Kategori olarak ekleniyor)
        // Not: Mevcut yapıda kategoriler 'category' kolonu ile gruplanıyor, 
        // ancak 'is_category' flag'i ile ana başlık olarak da eklenebilir.
        // Burada standart menü öğeleri ekleyeceğiz ve 'category' alanını 'Finans' yapacağız.

        const categoryName = 'Finans';
        const categoryOrder = 2; // Dashboard'dan sonra

        // Menü öğeleri
        const menus = [
            {
                title: 'Banka Hesaplarım',
                url: '/accounts-view',
                icon: 'ri-bank-card-line',
                order: 1
            },
            {
                title: 'Hesap Hareketleri',
                url: '/transactions',
                icon: 'ri-exchange-dollar-line',
                order: 2
            },
            {
                title: 'Finansal Raporlar',
                url: '/reports',
                icon: 'ri-pie-chart-line',
                order: 3
            },
            {
                title: 'Banka Ayarları',
                url: '/bank-settings',
                icon: 'ri-settings-3-line',
                order: 4
            }
        ];

        for (const menu of menus) {
            // Menü var mı kontrol et
            const check = await client.query('SELECT id FROM menus WHERE url = $1', [menu.url]);

            if (check.rows.length === 0) {
                // Yoksa ekle
                const result = await client.query(`
                    INSERT INTO menus (
                        title, 
                        url, 
                        icon, 
                        category, 
                        is_category, 
                        order_index, 
                        category_order_index,
                        menu_order_index
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                `, [
                    menu.title,
                    menu.url,
                    menu.icon,
                    categoryName,
                    false, // is_category
                    menu.order, // order_index (genel sıralama için kullanılabilir ama burada kategori içi sıra önemli)
                    categoryOrder,
                    menu.order
                ]);
                console.log(`   ✅ Menü eklendi: ${menu.title}`);

                // Admin rolü için yetki ver (Role ID: 1 varsayılıyor)
                const menuId = result.rows[0].id;
                await client.query(`
                    INSERT INTO role_menus (role_id, menu_id, can_view, can_create, can_edit, can_delete)
                    VALUES (1, $1, true, true, true, true)
                    ON CONFLICT (role_id, menu_id) DO NOTHING
                `, [menuId]);
                console.log(`      👤 Admin yetkisi verildi`);

            } else {
                console.log(`   ⚠️ Menü zaten var: ${menu.title}`);

                // Varsa güncelle (kategori ve ikon)
                await client.query(`
                    UPDATE menus 
                    SET category = $1, icon = $2, category_order_index = $3, menu_order_index = $4
                    WHERE url = $5
                `, [categoryName, menu.icon, categoryOrder, menu.order, menu.url]);
                console.log(`      🔄 Güncellendi`);
            }
        }

        await client.query('COMMIT');

        console.log('');
        console.log('✅ Migration başarıyla tamamlandı!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration hatası:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function rollback() {
    const client = await pool.connect();

    try {
        console.log('🔄 Rollback başlıyor...');

        await client.query('BEGIN');

        const urls = ['/accounts-view', '/transactions', '/reports', '/bank-settings'];

        for (const url of urls) {
            await client.query('DELETE FROM menus WHERE url = $1', [url]);
            console.log(`   🗑️ Menü silindi: ${url}`);
        }

        await client.query('COMMIT');
        console.log('✅ Rollback başarıyla tamamlandı!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Rollback hatası:', error);
        throw error;
    } finally {
        client.release();
    }
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const isRollback = args.includes('--rollback');

    (isRollback ? rollback() : runMigration())
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { runMigration, rollback };
