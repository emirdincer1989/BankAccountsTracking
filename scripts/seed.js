/**
 * Database Seed - RBUMS Template Project
 * 
 * Şablon proje için temel verileri ekler:
 * - super_admin rolü
 * - admin@rbums.com kullanıcısı (şifre: admin123!)
 * - Temel menüler (Dashboard, Kullanıcı Yönetimi, Rol Yönetimi, Menü Yönetimi, Panel Ayarları, Cron Yönetimi, Mail Yönetimi, Mail Gönder, Bildirimler, Bildirim Gönder)
 * - Rol-Menü ilişkileri
 * - Cron job'ları (testModalJob, emailQueueProcessor) - disabled olarak
 */

const { query, testConnection } = require('../config/database');
const { logger } = require('../utils/logger');
const DataEncryption = require('../utils/encryption');
const { syncRolePermissions } = require('../utils/roleSync');

// Seed data
const seedData = async () => {
    try {
        logger.info('🌱 Veritabanı seed işlemi başlatılıyor...');

        // Bağlantı testi
        await testConnection();

        // 1. Rolleri oluştur
        logger.info('📊 Roller oluşturuluyor...');

        const roles = [
            {
                name: 'super_admin',
                description: 'Sistemin tüm yetkilerine sahip süper yönetici',
                permissions: {
                    users: { view: true, create: true, edit: true, delete: true },
                    roles: { view: true, create: true, edit: true, delete: true },
                    menus: { view: true, create: true, edit: true, delete: true },
                    dashboard: { view: true },
                    settings: { view: true, create: true, edit: true, delete: true }
                }
            }
        ];

        const roleIds = {};
        for (const role of roles) {
            const result = await query(
                'INSERT INTO roles (name, description, permissions) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING RETURNING id',
                [role.name, role.description, JSON.stringify(role.permissions)]
            );

            if (result.rows.length > 0) {
                roleIds[role.name] = result.rows[0].id;
                logger.info(`✅ Rol oluşturuldu: ${role.name}`);
            } else {
                // Mevcut rolü al
                const existingRole = await query('SELECT id FROM roles WHERE name = $1', [role.name]);
                if (existingRole.rows.length > 0) {
                    roleIds[role.name] = existingRole.rows[0].id;
                    logger.info(`ℹ️ Rol zaten mevcut: ${role.name}`);
                }
            }
        }

        // 2. Süper admin kullanıcısı oluştur
        logger.info('👤 Süper admin kullanıcısı oluşturuluyor...');

        const superAdminPassword = await DataEncryption.hashPassword('admin123!');
        const superAdminResult = await query(
            'INSERT INTO users (email, password, name, role_id) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id',
            ['admin@rbums.com', superAdminPassword, 'Süper Admin', roleIds.super_admin]
        );

        if (superAdminResult.rows.length > 0) {
            logger.info('✅ Süper admin kullanıcısı oluşturuldu: admin@rbums.com / admin123!');
        } else {
            logger.info('ℹ️ Süper admin kullanıcısı zaten mevcut');
        }

        // 3. Menüleri oluştur
        logger.info('📋 Menüler oluşturuluyor...');

        const menus = [
            // Ana Menü (category)
            { title: 'Ana Menü', url: '#', icon: null, category: 'Ana Menü', is_category: true, order_index: 1, category_order_index: 0, menu_order_index: 0 },
            // Dashboard (Ana Menü altında)
            { title: 'Dashboard', url: '/dashboard', icon: 'ri-dashboard-line', category: 'Ana Menü', is_category: false, order_index: 1, category_order_index: 0, menu_order_index: 0 },
            // Admin İşlemleri (category)
            { title: 'Admin İşlemleri', url: null, icon: null, category: 'Admin İşlemleri', is_category: true, order_index: 3, category_order_index: 0, menu_order_index: 0 },
            // Admin İşlemleri altındaki menüler
            { title: 'Kullanıcı Yönetimi', url: '/users', icon: 'ri-user-settings-line', category: 'Admin İşlemleri', is_category: false, order_index: 3, category_order_index: 10, menu_order_index: 3 },
            { title: 'Rol Yönetimi', url: '/roles', icon: 'ri-shield-user-line', category: 'Admin İşlemleri', is_category: false, order_index: 4, category_order_index: 10, menu_order_index: 4 },
            { title: 'Menü Yönetimi', url: '/menus', icon: 'ri-menu-line', category: 'Admin İşlemleri', is_category: false, order_index: 5, category_order_index: 10, menu_order_index: 5 },
            { title: 'Panel Ayarları', url: '/panel-settings', icon: 'ri-user-settings-line', category: 'Admin İşlemleri', is_category: false, order_index: 10, category_order_index: 0, menu_order_index: 0 },
            { title: 'Cron Yönetimi', url: '/cron-management', icon: 'ri-time-line', category: 'Admin İşlemleri', is_category: false, order_index: 44, category_order_index: 0, menu_order_index: 0 },
            { title: 'Mail Yönetimi', url: '/email-settings', icon: 'ri-mail-settings-line', category: 'Admin İşlemleri', is_category: false, order_index: 6, category_order_index: 0, menu_order_index: 0 },
            { title: 'Mail Gönder', url: '/email-send', icon: 'ri-mail-send-line', category: 'Admin İşlemleri', is_category: false, order_index: 7, category_order_index: 0, menu_order_index: 0 },
            { title: 'Bildirimler', url: '/notifications', icon: 'ri-notification-2-line', category: 'Admin İşlemleri', is_category: false, order_index: 8, category_order_index: 0, menu_order_index: 0 },
            { title: 'Bildirim Gönder', url: '/notification-send', icon: 'ri-notification-2-fill', category: 'Admin İşlemleri', is_category: false, order_index: 9, category_order_index: 0, menu_order_index: 0 },

            // Finans Menüleri
            { title: 'Finans', url: '#', icon: null, category: 'Finans', is_category: true, order_index: 2, category_order_index: 0, menu_order_index: 0 },
            { title: 'Banka Hesaplarım', url: '/accounts-view', icon: 'ri-bank-card-line', category: 'Finans', is_category: false, order_index: 1, category_order_index: 2, menu_order_index: 1 },
            { title: 'Hesap Hareketleri', url: '/transactions', icon: 'ri-exchange-dollar-line', category: 'Finans', is_category: false, order_index: 2, category_order_index: 2, menu_order_index: 2 },
            { title: 'Finansal Raporlar', url: '/reports', icon: 'ri-pie-chart-line', category: 'Finans', is_category: false, order_index: 3, category_order_index: 2, menu_order_index: 3 },
            { title: 'Banka Ayarları', url: '/bank-settings', icon: 'ri-settings-3-line', category: 'Finans', is_category: false, order_index: 4, category_order_index: 2, menu_order_index: 4 }
        ];

        const menuIds = {};
        for (const menu of menus) {
            const result = await query(
                'INSERT INTO menus (title, url, icon, category, is_category, order_index, category_order_index, menu_order_index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (title, url) DO NOTHING RETURNING id',
                [menu.title, menu.url, menu.icon, menu.category, menu.is_category, menu.order_index, menu.category_order_index, menu.menu_order_index]
            );

            if (result.rows.length > 0) {
                menuIds[menu.title] = result.rows[0].id;
                logger.info(`✅ Menü oluşturuldu: ${menu.title}`);
            } else {
                // Mevcut menüyü al
                const existingMenu = await query('SELECT id FROM menus WHERE title = $1 AND url = $2', [menu.title, menu.url]);
                if (existingMenu.rows.length > 0) {
                    menuIds[menu.title] = existingMenu.rows[0].id;
                    logger.info(`ℹ️ Menü zaten mevcut: ${menu.title}`);
                }
            }
        }

        // 4. Rol-Menü ilişkilerini oluştur
        logger.info('🔗 Rol-Menü ilişkileri oluşturuluyor...');

        // Super admin için tüm menülere tam yetki ver (category menüleri hariç)
        const menuPermissions = [
            { title: 'Dashboard', can_view: true, can_create: false, can_edit: false, can_delete: false },
            { title: 'Kullanıcı Yönetimi', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { title: 'Rol Yönetimi', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { title: 'Menü Yönetimi', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { title: 'Panel Ayarları', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { title: 'Cron Yönetimi', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { title: 'Mail Yönetimi', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { title: 'Mail Gönder', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { title: 'Bildirimler', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { title: 'Bildirim Gönder', can_view: true, can_create: true, can_edit: true, can_delete: true },
            // Finans Yetkileri
            { title: 'Banka Hesaplarım', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { title: 'Hesap Hareketleri', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { title: 'Finansal Raporlar', can_view: true, can_create: true, can_edit: true, can_delete: true },
            { title: 'Banka Ayarları', can_view: true, can_create: true, can_edit: true, can_delete: true }
        ];

        for (const perm of menuPermissions) {
            const menuId = menuIds[perm.title];
            if (menuId) {
                await query(
                    'INSERT INTO role_menus (role_id, menu_id, can_view, can_create, can_edit, can_delete) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (role_id, menu_id) DO UPDATE SET can_view = $3, can_create = $4, can_edit = $5, can_delete = $6',
                    [roleIds.super_admin, menuId, perm.can_view, perm.can_create, perm.can_edit, perm.can_delete]
                );
                logger.info(`   ✅ ${perm.title} yetkileri eklendi`);
            }
        }

        logger.info('✅ Rol-Menü ilişkileri oluşturuldu');

        // 5. Cron job'ları oluştur
        logger.info('⏰ Cron job\'lar oluşturuluyor...');

        const cronJobs = [
            {
                name: 'testModalJob',
                title: 'Test Modal Job',
                description: 'Her dakika modal açar ve çalışma sayısını gösterir (test amaçlı)',
                schedule: '* * * * *',
                is_enabled: false,
                config: {}
            },
            {
                name: 'emailQueueProcessor',
                title: 'Email Queue Processor',
                description: 'Email queue pending emailleri işler ve gönderir (Her 1 dakikada bir çalışır)',
                schedule: '* * * * *',
                is_enabled: false,
                config: {}
            },
            {
                name: 'bankSyncJob',
                title: 'Banka Hesap Senkronizasyonu',
                description: 'Tüm aktif banka hesaplarını tarar ve hareketleri günceller (Queue kullanır).',
                schedule: '*/30 * * * *',
                is_enabled: true,
                config: {}
            }
        ];

        for (const job of cronJobs) {
            const result = await query(
                'INSERT INTO cron_jobs (name, title, description, schedule, is_enabled, config) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (name) DO NOTHING RETURNING id',
                [job.name, job.title, job.description, job.schedule, job.is_enabled, JSON.stringify(job.config)]
            );

            if (result.rows.length > 0) {
                logger.info(`✅ Cron job oluşturuldu: ${job.name} (disabled)`);
            } else {
                logger.info(`ℹ️ Cron job zaten mevcut: ${job.name}`);
            }
        }

        logger.info('✅ Tüm seed işlemleri başarıyla tamamlandı!');
        logger.info('');
        logger.info('🎯 Varsayılan Giriş Bilgileri:');
        logger.info('   📧 Email: admin@rbums.com');
        logger.info('   🔑 Şifre: admin123!');
        logger.info('   👤 Rol: Süper Admin');
        logger.info('');
        logger.info('📝 Oluşturulan Veriler:');
        logger.info('   ✅ 1 rol (super_admin)');
        logger.info('   ✅ 1 kullanıcı (admin@rbums.com)');
        logger.info('   ✅ 12 menü (2 kategori, 10 menü öğesi)');
        logger.info('   ✅ 10 rol-menü ilişkisi');
        logger.info('   ✅ 2 cron job (testModalJob, emailQueueProcessor) - disabled');
        logger.info('');

    } catch (error) {
        logger.error('❌ Seed hatası:', error);
        process.exit(1);
    }
};

// Script doğrudan çalıştırılırsa seed işlemini başlat
if (require.main === module) {
    seedData()
        .then(() => {
            console.log('\n✅ Seed işlemi tamamlandı!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Seed hatası:', error);
            process.exit(1);
        });
}

module.exports = { seedData };
