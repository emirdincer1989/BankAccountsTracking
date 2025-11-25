const express = require('express');
const { query } = require('../config/database');
const { validateInput, roleSchema } = require('../middleware/validation');
const { authMiddleware, authorize } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const { syncRolePermissions, buildPermissionsFromMenus } = require('../utils/roleSync');

const router = express.Router();

// Tüm route'lar authentication gerektirir
router.use(authMiddleware);

// Rol listesi - tüm authenticated kullanıcılar erişebilir (kullanıcı ekleme için)
router.get('/', authMiddleware, async (req, res) => {
    try {
        let rolesQuery = 'SELECT id, name, description, is_active, created_at FROM roles WHERE is_active = true';

        // Super admin değilse, super_admin rolünü gösterme
        if (req.user.role_name !== 'super_admin') {
            rolesQuery += " AND name != 'super_admin'";
        }

        rolesQuery += ' ORDER BY name';

        const rolesResult = await query(rolesQuery);

        res.json({
            success: true,
            data: { roles: rolesResult.rows }
        });

    } catch (error) {
        logger.error('Get roles error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Rol detayı
router.get('/:id', authorize(['roles.view']), async (req, res) => {
    try {
        const { id } = req.params;
        
        const roleResult = await query(
            'SELECT id, name, description, permissions, is_active, created_at, updated_at FROM roles WHERE id = $1',
            [id]
        );
        
        if (roleResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rol bulunamadı'
            });
        }
        
        const role = roleResult.rows[0];
        role.permissions = typeof role.permissions === 'string' ? 
            JSON.parse(role.permissions) : role.permissions;
        
        res.json({
            success: true,
            data: { role }
        });
        
    } catch (error) {
        logger.error('Get role error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Yeni rol oluştur - sadece admin
router.post('/', authorize(['roles.create']), validateInput(roleSchema), async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        
        // Rol adı zaten var mı kontrol et
        const existingRole = await query(
            'SELECT id FROM roles WHERE name = $1',
            [name]
        );
        
        if (existingRole.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Bu rol adı zaten kullanılıyor'
            });
        }
        
        // Rolü oluştur
        const newRoleResult = await query(
            'INSERT INTO roles (name, description, permissions) VALUES ($1, $2, $3) RETURNING *',
            [name, description, JSON.stringify(permissions)]
        );

        // Yetkileri senkronize et (roles.permissions → role_menus)
        await syncRolePermissions(newRoleResult.rows[0].id, permissions);

        // Audit log
        await query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [req.user.id, 'CREATE', 'roles', newRoleResult.rows[0].id, JSON.stringify(newRoleResult.rows[0]), req.ip, req.get('User-Agent')]
        );

        logger.info(`Role created and synced: ${name}`, {
            createdBy: req.user.id,
            newRoleId: newRoleResult.rows[0].id,
            ip: req.ip
        });
        
        const role = newRoleResult.rows[0];
        role.permissions = typeof role.permissions === 'string' ? 
            JSON.parse(role.permissions) : role.permissions;
        
        res.status(201).json({
            success: true,
            message: 'Rol başarıyla oluşturuldu',
            data: { role }
        });
        
    } catch (error) {
        logger.error('Create role error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Rol güncelle - sadece admin
router.put('/:id', authorize(['roles.edit']), validateInput(roleSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;
        
        // Rol var mı kontrol et
        const existingRole = await query(
            'SELECT * FROM roles WHERE id = $1',
            [id]
        );
        
        if (existingRole.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rol bulunamadı'
            });
        }
        
        // Rol adı değişiyorsa, yeni ad zaten var mı kontrol et
        if (name !== existingRole.rows[0].name) {
            const nameCheck = await query(
                'SELECT id FROM roles WHERE name = $1 AND id != $2',
                [name, id]
            );
            
            if (nameCheck.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu rol adı zaten kullanılıyor'
                });
            }
        }
        
        // Rolü güncelle
        const updateResult = await query(
            'UPDATE roles SET name = $1, description = $2, permissions = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
            [name, description, JSON.stringify(permissions), id]
        );

        // Yetkileri senkronize et (roles.permissions → role_menus)
        await syncRolePermissions(id, permissions);

        // Audit log
        await query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [req.user.id, 'UPDATE', 'roles', id, JSON.stringify(existingRole.rows[0]), JSON.stringify(updateResult.rows[0]), req.ip, req.get('User-Agent')]
        );

        logger.info(`Role updated and synced: ${id}`, {
            updatedBy: req.user.id,
            roleId: id,
            ip: req.ip
        });
        
        const role = updateResult.rows[0];
        role.permissions = typeof role.permissions === 'string' ? 
            JSON.parse(role.permissions) : role.permissions;
        
        res.json({
            success: true,
            message: 'Rol başarıyla güncellendi',
            data: { role }
        });
        
    } catch (error) {
        logger.error('Update role error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Rol sil - sadece admin
router.delete('/:id', authorize(['roles.delete']), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Rol var mı kontrol et
        const existingRole = await query(
            'SELECT * FROM roles WHERE id = $1',
            [id]
        );
        
        if (existingRole.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rol bulunamadı'
            });
        }
        
        // Bu rolü kullanan kullanıcı var mı kontrol et
        const usersWithRole = await query(
            'SELECT COUNT(*) as count FROM users WHERE role_id = $1',
            [id]
        );
        
        if (parseInt(usersWithRole.rows[0].count) > 0) {
            return res.status(400).json({
                success: false,
                message: 'Bu rolü kullanan kullanıcılar var. Önce kullanıcıların rollerini değiştirin.'
            });
        }
        
        // Rolü sil
        await query('DELETE FROM roles WHERE id = $1', [id]);
        
        // Audit log
        await query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [req.user.id, 'DELETE', 'roles', id, JSON.stringify(existingRole.rows[0]), req.ip, req.get('User-Agent')]
        );
        
        logger.info(`Role deleted: ${id}`, { 
            deletedBy: req.user.id, 
            roleId: id,
            ip: req.ip 
        });
        
        res.json({
            success: true,
            message: 'Rol başarıyla silindi'
        });
        
    } catch (error) {
        logger.error('Delete role error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Rol menü yetkilerini güncelle
router.put('/:id/menus', authorize(['roles.edit']), async (req, res) => {
    try {
        const { id } = req.params;
        const { menuPermissions } = req.body;
        
        // Rol var mı kontrol et
        const roleResult = await query(
            'SELECT id FROM roles WHERE id = $1',
            [id]
        );
        
        if (roleResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rol bulunamadı'
            });
        }
        
        // Transaction başlat
        const { transaction } = require('../config/database');

        await transaction(async (client) => {
            // Mevcut menü yetkilerini sil
            await client.query('DELETE FROM role_menus WHERE role_id = $1', [id]);

            // Yeni menü yetkilerini ekle (CRUD dahil)
            for (const permission of menuPermissions) {
                await client.query(
                    'INSERT INTO role_menus (role_id, menu_id, can_view, can_create, can_edit, can_delete) VALUES ($1, $2, $3, $4, $5, $6)',
                    [id, permission.menu_id, !!permission.can_view, !!permission.can_create, !!permission.can_edit, !!permission.can_delete]
                );
            }
        });

        // Menü yetkilerinden roles.permissions'ı oluştur ve güncelle (role_menus → roles.permissions)
        const updatedPermissions = await buildPermissionsFromMenus(menuPermissions);
        await query(
            'UPDATE roles SET permissions = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [JSON.stringify(updatedPermissions), id]
        );

        // Audit log
        await query(
            'INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [req.user.id, 'UPDATE', 'role_menus', id, JSON.stringify(menuPermissions), req.ip, req.get('User-Agent')]
        );

        logger.info(`Role menu permissions updated and synced: ${id}`, {
            updatedBy: req.user.id,
            roleId: id,
            ip: req.ip
        });
        
        res.json({
            success: true,
            message: 'Rol menü yetkileri başarıyla güncellendi'
        });
        
    } catch (error) {
        logger.error('Update role menu permissions error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Rol menü yetkilerini getir
router.get('/:id/menus', authorize(['roles.view']), async (req, res) => {
    try {
        const { id } = req.params;
        // Rol var mı kontrol et
        const roleResult = await query('SELECT id, name FROM roles WHERE id = $1', [id]);
        if (roleResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Rol bulunamadı' });
        }

        // Süper admin için tüm aktif menüleri görünür kabul et
        if (roleResult.rows[0].name === 'super_admin') {
            const allMenus = await query(
                `SELECT id as menu_id, title, category, is_category
                 FROM menus WHERE is_active = true ORDER BY order_index, title`
            );
            const perms = allMenus.rows.map(r => ({ ...r, can_view: true }));
            return res.json({ success: true, data: { menuPermissions: perms } });
        }

        const permissionsResult = await query(
            `SELECT rm.menu_id, rm.can_view, rm.can_create, rm.can_edit, rm.can_delete,
                    m.title, m.category, m.is_category
             FROM role_menus rm
             JOIN menus m ON m.id = rm.menu_id
             WHERE rm.role_id = $1
             ORDER BY m.order_index, m.title`,
            [id]
        );

        res.json({ success: true, data: { menuPermissions: permissionsResult.rows } });
    } catch (error) {
        logger.error('Get role menu permissions error:', error);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

module.exports = router;






