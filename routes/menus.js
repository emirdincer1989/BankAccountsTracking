const express = require('express');
const { query, transaction } = require('../config/database');
const { validateInput, menuSchema } = require('../middleware/validation');
const { authMiddleware, authorize } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { syncNewMenuToRoles } = require('../utils/roleSync');

const router = express.Router();

// Tüm route'lar authentication gerektirir
router.use(authMiddleware);

// Menü listesi - sadece admin
router.get('/', authorize(['menus.view']), async (req, res) => {
    try {
        const menusResult = await query(
            `SELECT m.id, m.title, m.url, m.icon, m.order_index, m.is_active, m.created_at, m.updated_at,
                    m.category, m.is_category, m.category_order_index, m.menu_order_index
             FROM menus m
             ORDER BY m.category_order_index, m.menu_order_index, m.title`
        );

        res.json({
            success: true,
            data: { menus: menusResult.rows }
        });

    } catch (error) {
        logger.error('Get menus error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Kullanıcının erişebileceği menüleri getir
router.get('/user-menus', async (req, res) => {
    try {
        // Süper admin tüm menülere erişebilir
        if (req.user.role_name === 'super_admin') {
            const allMenusResult = await query(
                `SELECT m.id, m.title, m.url, m.icon, m.order_index, m.category, m.is_category,
                        m.category_order_index, m.menu_order_index
                 FROM menus m
                 WHERE m.is_active = true
                 ORDER BY m.category_order_index, m.menu_order_index, m.title`
            );

            return res.json({
                success: true,
                data: { menus: allMenusResult.rows }
            });
        }

        // Diğer kullanıcılar için rol bazlı menüler
        const userMenusResult = await query(
            `SELECT DISTINCT m.id, m.title, m.url, m.icon, m.order_index, m.category, m.is_category,
                    m.category_order_index, m.menu_order_index
             FROM menus m
             JOIN role_menus rm ON m.id = rm.menu_id
             WHERE rm.role_id = $1 AND rm.can_view = true AND m.is_active = true
             ORDER BY m.category_order_index, m.menu_order_index, m.title`,
            [req.user.role_id]
        );

        // Kullanıcının erişebildiği kategoriler için kategori başlıklarını otomatik ekle
        const userMenus = userMenusResult.rows;
        const categoriesSet = new Set(
            userMenus
                .map(m => m.category)
                .filter(name => name && name !== '' && name !== 'null' && name !== 'undefined')
        );

        let categoryHeaders = [];
        if (categoriesSet.size > 0) {
            const placeholders = Array.from(categoriesSet).map((_, idx) => `$${idx + 1}`).join(', ');
            const headersQuery = `
                SELECT m.id, m.title, m.url, m.icon, m.order_index, m.category, m.is_category,
                       m.category_order_index, m.menu_order_index
                FROM menus m
                WHERE m.is_active = true AND m.is_category = true AND m.category IN (${placeholders})
            `;
            const headersResult = await query(headersQuery, Array.from(categoriesSet));
            categoryHeaders = headersResult.rows;
        }

        const mergedMenus = [...categoryHeaders, ...userMenus].sort((a, b) => {
            const ca = Number(a.category_order_index) || 999;
            const cb = Number(b.category_order_index) || 999;
            if (ca !== cb) return ca - cb;
            const ma = Number(a.menu_order_index) || 999;
            const mb = Number(b.menu_order_index) || 999;
            if (ma !== mb) return ma - mb;
            return String(a.title).localeCompare(String(b.title));
        });

        res.json({
            success: true,
            data: { menus: mergedMenus }
        });

    } catch (error) {
        logger.error('Get user menus error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Menü detayı
router.get('/:id', authorize(['menus.view']), async (req, res) => {
    try {
        const { id } = req.params;

        const menuResult = await query(
            `SELECT m.id, m.title, m.url, m.icon, m.order_index, m.is_active, m.created_at, m.updated_at,
                    m.category, m.is_category, m.category_order_index, m.menu_order_index
             FROM menus m
             WHERE m.id = $1`,
            [id]
        );

        if (menuResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Menü bulunamadı'
            });
        }

        res.json({
            success: true,
            data: { menu: menuResult.rows[0] }
        });

    } catch (error) {
        logger.error('Get menu error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Yeni menü oluştur - sadece admin
router.post('/', authorize(['menus.create']), validateInput(menuSchema), async (req, res) => {
    try {
        const { title, url, icon, order_index, category, is_category, is_active, category_order_index, menu_order_index } = req.body;

        // Kategori oluşturuluyorsa URL zorunlu olmasın; varsayılan '#'
        const isCategory = Boolean(is_category);
        const safeUrl = isCategory ? (url || '#') : (url || '');
        const safeOrderIndex = Number.isFinite(Number(order_index)) ? Number(order_index) : 0;
        const safeCategoryOrderIndex = Number.isFinite(Number(category_order_index)) ? Number(category_order_index) : 0;
        const safeMenuOrderIndex = Number.isFinite(Number(menu_order_index)) ? Number(menu_order_index) : 0;

        // Sıralı ekleme: yeni sıradan büyük/ eşit olanları kaydır ve ekle
        const newMenuResult = await transaction(async (client) => {
            // Eğer kategori ekleniyorsa sadece kategorilerin sırasını kaydır
            if (isCategory) {
                await client.query(
                    'UPDATE menus SET order_index = order_index + 1 WHERE is_category = true AND order_index >= $1',
                    [safeOrderIndex]
                );
            } else {
                // Normal menü için: aynı kategorideki menülerin sırasını kaydır
                if (category) {
                    await client.query(
                        'UPDATE menus SET order_index = order_index + 1 WHERE category = $1 AND order_index >= $2',
                        [category, safeOrderIndex]
                    );
                } else {
                    // Kategorisi olmayan menüler için
                    await client.query(
                        'UPDATE menus SET order_index = order_index + 1 WHERE (category IS NULL OR category = \'\') AND order_index >= $1',
                        [safeOrderIndex]
                    );
                }
            }

            const inserted = await client.query(
                'INSERT INTO menus (title, url, icon, order_index, category, is_category, is_active, category_order_index, menu_order_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
                [title, safeUrl, icon, safeOrderIndex, category, isCategory, is_active !== false, safeCategoryOrderIndex, safeMenuOrderIndex]
            );
            return inserted;
        });
        
        // Yeni menü için tüm rollerdeki yetkileri senkronize et (kategori değilse)
        if (!isCategory && safeUrl !== '#') {
            await syncNewMenuToRoles(safeUrl, newMenuResult.rows[0].id);
        }

        // Audit log
        await query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [req.user.id, 'CREATE', 'menus', newMenuResult.rows[0].id, JSON.stringify(newMenuResult.rows[0]), req.ip, req.get('User-Agent')]
        );

        logger.info(`Menu created and synced to roles: ${title}`, {
            createdBy: req.user.id,
            newMenuId: newMenuResult.rows[0].id,
            ip: req.ip
        });
        
        res.status(201).json({
            success: true,
            message: 'Menü başarıyla oluşturuldu',
            data: { menu: newMenuResult.rows[0] }
        });
        
    } catch (error) {
        logger.error('Create menu error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Menü güncelle - sadece admin
router.put('/:id', authorize(['menus.edit']), validateInput(menuSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, url, icon, order_index, category, is_category, is_active, category_order_index, menu_order_index } = req.body;
        
        // Menü var mı kontrol et
        const existingMenu = await query(
            'SELECT * FROM menus WHERE id = $1',
            [id]
        );
        
        if (existingMenu.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Menü bulunamadı'
            });
        }
        
        // Sıra değiştiyse aralıktaki öğeleri kaydır
        const oldIndex = existingMenu.rows[0].order_index;
        const newIndex = Number.isFinite(Number(order_index)) ? Number(order_index) : oldIndex;
        const isCategoryRecord = (typeof is_category === 'boolean') ? is_category : existingMenu.rows[0].is_category;

        const updateResult = await transaction(async (client) => {
            if (newIndex !== oldIndex) {
                if (isCategoryRecord) {
                    // Kategori güncelleniyorsa: sadece kategorilerin sırasını kaydır
                    if (newIndex < oldIndex) {
                        await client.query(
                            'UPDATE menus SET order_index = order_index + 1 WHERE is_category = true AND order_index >= $1 AND order_index < $2 AND id <> $3',
                            [newIndex, oldIndex, id]
                        );
                    } else if (newIndex > oldIndex) {
                        await client.query(
                            'UPDATE menus SET order_index = order_index - 1 WHERE is_category = true AND order_index <= $1 AND order_index > $2 AND id <> $3',
                            [newIndex, oldIndex, id]
                        );
                    }
                } else {
                    // Normal menü güncelleniyorsa: aynı kategorideki menülerin sırasını kaydır
                    const oldCategory = existingMenu.rows[0].category;
                    const newCategory = category;
                    
                    if (oldCategory === newCategory) {
                        // Aynı kategori içinde sıra değişikliği
                        if (newIndex < oldIndex) {
                            await client.query(
                                'UPDATE menus SET order_index = order_index + 1 WHERE category = $1 AND order_index >= $2 AND order_index < $3 AND id <> $4',
                                [oldCategory, newIndex, oldIndex, id]
                            );
                        } else if (newIndex > oldIndex) {
                            await client.query(
                                'UPDATE menus SET order_index = order_index - 1 WHERE category = $1 AND order_index <= $2 AND order_index > $3 AND id <> $4',
                                [oldCategory, newIndex, oldIndex, id]
                            );
                        }
                    } else {
                        // Farklı kategoriye taşıma
                        // Eski kategorideki menüleri kaydır
                        await client.query(
                            'UPDATE menus SET order_index = order_index - 1 WHERE category = $1 AND order_index > $2',
                            [oldCategory, oldIndex]
                        );
                        // Yeni kategorideki menüleri kaydır
                        await client.query(
                            'UPDATE menus SET order_index = order_index + 1 WHERE category = $1 AND order_index >= $2',
                            [newCategory, newIndex]
                        );
                    }
                }
            }

            const updated = await client.query(
                'UPDATE menus SET title = $1, url = $2, icon = $3, order_index = $4, category = $5, is_category = $6, is_active = $7, category_order_index = $8, menu_order_index = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 RETURNING *',
                [title, url, icon, newIndex, category, is_category || false, is_active !== false, category_order_index || 0, menu_order_index || 0, id]
            );
            return updated;
        });
        
        // Audit log
        await query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [req.user.id, 'UPDATE', 'menus', id, JSON.stringify(existingMenu.rows[0]), JSON.stringify(updateResult.rows[0]), req.ip, req.get('User-Agent')]
        );
        
        logger.info(`Menu updated: ${id}`, { 
            updatedBy: req.user.id, 
            menuId: id,
            ip: req.ip 
        });
        
        res.json({
            success: true,
            message: 'Menü başarıyla güncellendi',
            data: { menu: updateResult.rows[0] }
        });
        
    } catch (error) {
        logger.error('Update menu error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Menü sil - sadece admin
router.delete('/:id', authorize(['menus.delete']), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Menü var mı kontrol et
        const existingMenu = await query(
            'SELECT * FROM menus WHERE id = $1',
            [id]
        );
        
        if (existingMenu.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Menü bulunamadı'
            });
        }
        
        // Eğer kategori siliniyorsa alt menüleri kontrol et
        if (existingMenu.rows[0].is_category) {
            const childMenus = await query(
                'SELECT COUNT(*) as count FROM menus WHERE category = $1 AND id != $2',
                [existingMenu.rows[0].category, id]
            );
            
            if (parseInt(childMenus.rows[0].count) > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu kategorinin alt menüleri var. Önce alt menüleri silin.'
                });
            }
        }
        
        // Menüyü sil ve ardından boşluğu kapatmak için order_index değerlerini kaydır
        const deletedOrder = existingMenu.rows[0].order_index;
        const isCategory = existingMenu.rows[0].is_category;
        const category = existingMenu.rows[0].category;
        
        await transaction(async (client) => {
            await client.query('DELETE FROM menus WHERE id = $1', [id]);
            
            if (isCategory) {
                // Kategori siliniyorsa: sadece kategorilerin sırasını düzelt
                await client.query(
                    'UPDATE menus SET order_index = order_index - 1 WHERE is_category = true AND order_index > $1',
                    [deletedOrder]
                );
            } else {
                // Normal menü siliniyorsa: aynı kategorideki menülerin sırasını düzelt
                if (category) {
                    await client.query(
                        'UPDATE menus SET order_index = order_index - 1 WHERE category = $1 AND order_index > $2',
                        [category, deletedOrder]
                    );
                } else {
                    await client.query(
                        'UPDATE menus SET order_index = order_index - 1 WHERE (category IS NULL OR category = \'\') AND order_index > $1',
                        [deletedOrder]
                    );
                }
            }
        });
        
        // Audit log
        await query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [req.user.id, 'DELETE', 'menus', id, JSON.stringify(existingMenu.rows[0]), req.ip, req.get('User-Agent')]
        );
        
        logger.info(`Menu deleted: ${id}`, { 
            deletedBy: req.user.id, 
            menuId: id,
            ip: req.ip 
        });
        
        res.json({
            success: true,
            message: 'Menü başarıyla silindi'
        });
        
    } catch (error) {
        logger.error('Delete menu error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Menü sıralamasını güncelle
router.put('/reorder', authorize(['menus.edit']), async (req, res) => {
    try {
        const { menuOrders } = req.body;
        // [{id: 1, order_index: 1, category_order_index: 10, menu_order_index: 1}]

        // Transaction başlat
        const { transaction } = require('../config/database');

        await transaction(async (client) => {
            for (const menuOrder of menuOrders) {
                await client.query(
                    `UPDATE menus
                     SET order_index = $1,
                         category_order_index = $2,
                         menu_order_index = $3,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $4`,
                    [
                        menuOrder.order_index,
                        menuOrder.category_order_index || 0,
                        menuOrder.menu_order_index || 0,
                        menuOrder.id
                    ]
                );
            }
        });

        // Audit log
        await query(
            'INSERT INTO audit_logs (user_id, action, table_name, new_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6)',
            [req.user.id, 'REORDER', 'menus', JSON.stringify(menuOrders), req.ip, req.get('User-Agent')]
        );

        logger.info(`Menu order updated`, {
            updatedBy: req.user.id,
            ip: req.ip
        });

        res.json({
            success: true,
            message: 'Menü sıralaması başarıyla güncellendi'
        });

    } catch (error) {
        logger.error('Update menu order error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

module.exports = router;
