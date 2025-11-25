const { query, transaction } = require('../config/database');
const { logger } = require('./logger');

/**
 * Role Permission Synchronization Utility
 *
 * İki katmanlı yetkilendirme sistemini senkronize eder:
 * 1. roles.permissions (JSONB) - API endpoint güvenliği
 * 2. role_menus (tablo) - UI menü görünürlüğü ve CRUD buton kontrolü
 *
 * Mapping mantığı:
 * - Menu URL'leri → Permission module isimleri
 * - CRUD yetkileri her iki sistemde de tutulur
 * - roles.permissions: authorize(['users.view', 'users.create'])
 * - role_menus: can_view, can_create, can_edit, can_delete
 */

// Menü URL → Permission Module Mapping
const MENU_TO_MODULE_MAPPING = {
    '/users': 'users',
    '/roles': 'roles',
    '/menus': 'menus',
    '/dashboard': 'dashboard',
    '/settings': 'settings'
};

/**
 * Rol yetkilerini senkronize eder
 * @param {number} roleId - Rol ID
 * @param {object} permissions - JSONB permissions objesi
 * @returns {Promise<void>}
 */
async function syncRolePermissions(roleId, permissions) {
    try {
        logger.info(`🔄 Role permissions syncing started: roleId=${roleId}`);

        await transaction(async (client) => {
            // 1. roles.permissions tablosunu güncelle
            await client.query(
                `UPDATE roles SET permissions = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                [JSON.stringify(permissions), roleId]
            );

            // 2. Tüm menüleri al
            const menusResult = await client.query(
                `SELECT id, url, title FROM menus WHERE is_active = true AND is_category = false`
            );

            // 3. Mevcut role_menus kayıtlarını sil
            await client.query(`DELETE FROM role_menus WHERE role_id = $1`, [roleId]);

            // 4. Yeni role_menus kayıtlarını oluştur
            for (const menu of menusResult.rows) {
                const moduleName = MENU_TO_MODULE_MAPPING[menu.url];

                if (moduleName && permissions[moduleName]) {
                    const modulePerms = permissions[moduleName];

                    await client.query(
                        `INSERT INTO role_menus (role_id, menu_id, can_view, can_create, can_edit, can_delete)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            roleId,
                            menu.id,
                            !!modulePerms.view,
                            !!modulePerms.create,
                            !!modulePerms.edit,
                            !!modulePerms.delete
                        ]
                    );

                    logger.debug(`✅ Synced menu: ${menu.title} (${menu.url}) → ${moduleName}`);
                }
            }
        });

        logger.info(`✅ Role permissions synced successfully: roleId=${roleId}`);
    } catch (error) {
        logger.error(`❌ Role permissions sync error: roleId=${roleId}`, error);
        throw error;
    }
}

/**
 * Menü yetkilerinden permissions JSONB objesi oluşturur
 * @param {Array} menuPermissions - [{ menu_id, can_view, can_create, can_edit, can_delete }]
 * @returns {Promise<object>} - permissions JSONB objesi
 */
async function buildPermissionsFromMenus(menuPermissions) {
    try {
        const permissions = {};

        // Tüm menüleri al
        const menusResult = await query(
            `SELECT id, url FROM menus WHERE is_active = true AND is_category = false`
        );

        const menuIdToUrl = {};
        menusResult.rows.forEach(menu => {
            menuIdToUrl[menu.id] = menu.url;
        });

        // menuPermissions array'inden permissions objesi oluştur
        for (const perm of menuPermissions) {
            const menuUrl = menuIdToUrl[perm.menu_id];
            const moduleName = MENU_TO_MODULE_MAPPING[menuUrl];

            if (moduleName) {
                permissions[moduleName] = {
                    view: !!perm.can_view,
                    create: !!perm.can_create,
                    edit: !!perm.can_edit,
                    delete: !!perm.can_delete
                };
            }
        }

        return permissions;
    } catch (error) {
        logger.error('❌ Build permissions from menus error:', error);
        throw error;
    }
}

/**
 * Yeni menü eklendiğinde tüm rolleri günceller
 * @param {string} menuUrl - Yeni menünün URL'i
 * @param {number} menuId - Yeni menünün ID'si
 * @returns {Promise<void>}
 */
async function syncNewMenuToRoles(menuUrl, menuId) {
    try {
        const moduleName = MENU_TO_MODULE_MAPPING[menuUrl];

        if (!moduleName) {
            logger.debug(`ℹ️ No module mapping for menu URL: ${menuUrl}`);
            return;
        }

        logger.info(`🔄 Syncing new menu to all roles: ${menuUrl} → ${moduleName}`);

        // Tüm rolleri al
        const rolesResult = await query(`SELECT id, permissions FROM roles WHERE is_active = true`);

        for (const role of rolesResult.rows) {
            const rolePerms = typeof role.permissions === 'string'
                ? JSON.parse(role.permissions)
                : role.permissions;

            // Bu rolün bu modülde yetkisi varsa, role_menus'e ekle
            if (rolePerms[moduleName]) {
                const modulePerms = rolePerms[moduleName];

                await query(
                    `INSERT INTO role_menus (role_id, menu_id, can_view, can_create, can_edit, can_delete)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (role_id, menu_id) DO UPDATE
                     SET can_view = $3, can_create = $4, can_edit = $5, can_delete = $6`,
                    [
                        role.id,
                        menuId,
                        !!modulePerms.view,
                        !!modulePerms.create,
                        !!modulePerms.edit,
                        !!modulePerms.delete
                    ]
                );

                logger.debug(`✅ Added menu to role: roleId=${role.id}, menuId=${menuId}`);
            }
        }

        logger.info(`✅ New menu synced to all roles successfully`);
    } catch (error) {
        logger.error('❌ Sync new menu to roles error:', error);
        throw error;
    }
}

/**
 * Menü URL mapping'ini günceller (yeni proje modülleri eklemek için)
 * @param {string} menuUrl - Menü URL'i
 * @param {string} moduleName - Permission modül adı
 */
function registerMenuModule(menuUrl, moduleName) {
    MENU_TO_MODULE_MAPPING[menuUrl] = moduleName;
    logger.info(`📝 Menu module registered: ${menuUrl} → ${moduleName}`);
}

/**
 * Mevcut mapping'i döndürür
 * @returns {object}
 */
function getMenuModuleMapping() {
    return { ...MENU_TO_MODULE_MAPPING };
}

module.exports = {
    syncRolePermissions,
    buildPermissionsFromMenus,
    syncNewMenuToRoles,
    registerMenuModule,
    getMenuModuleMapping
};
