const express = require('express');
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { logger } = require('../utils/logger');
// query zaten üstte require edilmiş olabilir; tekrar deklarasyona gerek yok

const router = express.Router();

// Tüm route'lar authentication gerektirir
router.use(authMiddleware);
// Finans dashboard istatistikleri
router.get('/finans-stats', async (req, res) => {
    try {
        if (req.user.role_name !== 'finans_admin' && req.user.role_name !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Yetkisiz erişim' });
        }
        const data = { toplamHesap: 0, bugunIslem: 0, bakiye: 0 };
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// Dashboard istatistikleri
router.get('/stats', async (req, res) => {
    try {
        // Kullanıcı sayısı
        const userCountResult = await query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
        const userCount = parseInt(userCountResult.rows[0].count);
        
        // Rol sayısı
        const roleCountResult = await query('SELECT COUNT(*) as count FROM roles WHERE is_active = true');
        const roleCount = parseInt(roleCountResult.rows[0].count);
        
        // Menü sayısı
        const menuCountResult = await query('SELECT COUNT(*) as count FROM menus WHERE is_active = true');
        const menuCount = parseInt(menuCountResult.rows[0].count);
        
        // Son giriş yapan kullanıcılar
        const recentUsersResult = await query(
            `SELECT u.name, u.email, u.last_login, r.name as role_name
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             WHERE u.is_active = true AND u.last_login IS NOT NULL 
             ORDER BY u.last_login DESC 
             LIMIT 5`
        );
        
        // Son audit loglar
        const recentLogsResult = await query(
            `SELECT al.action, al.table_name, al.created_at, u.name as user_name
             FROM audit_logs al 
             LEFT JOIN users u ON al.user_id = u.id 
             ORDER BY al.created_at DESC 
             LIMIT 10`
        );
        
        res.json({
            success: true,
            data: {
                totalUsers: userCount,
                totalRoles: roleCount,
                totalMenus: menuCount,
                activeUsers: userCount,
                recentUsers: recentUsersResult.rows,
                recentLogs: recentLogsResult.rows
            }
        });
        
    } catch (error) {
        logger.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Kullanıcı menülerini getir
router.get('/user-menu', async (req, res) => {
    try {
        console.log('Menü isteği - Kullanıcı:', {
            id: req.user.id,
            email: req.user.email,
            role_id: req.user.role_id,
            role_name: req.user.role_name
        });
        
        // Süper admin tüm menülere erişebilir
        if (req.user.role_name === 'super_admin') {
            console.log('Süper admin menüleri yükleniyor...');
            const allMenusResult = await query(
                `SELECT m.id, m.title, m.url, m.icon, m.order_index, m.category, m.is_category
                 FROM menus m 
                 WHERE m.is_active = true 
                 ORDER BY m.order_index, m.title`
            );
            
            console.log('Süper admin menü sayısı:', allMenusResult.rows.length);
            
            return res.json({
                success: true,
                data: { menus: allMenusResult.rows }
            });
        }
        
        // Diğer kullanıcılar için rol bazlı menüler
        console.log('Rol bazlı menüler yükleniyor...');
        const userMenusResult = await query(
            `SELECT DISTINCT m.id, m.title, m.url, m.icon, m.order_index, m.category, m.is_category
             FROM menus m 
             JOIN role_menus rm ON m.id = rm.menu_id 
             WHERE rm.role_id = $1 AND rm.can_view = true AND m.is_active = true 
             ORDER BY m.order_index, m.title`,
            [req.user.role_id]
        );
        
        console.log('Kullanıcı menü sayısı:', userMenusResult.rows.length);
        
        // Eğer kullanıcının hiç menü yetkisi yoksa
        if (userMenusResult.rows.length === 0) {
            console.log('Kullanıcının hiç menü yetkisi yok');
            return res.json({
                success: true,
                data: { 
                    menus: [],
                    message: 'Bu kullanıcının erişebileceği menü bulunmuyor'
                }
            });
        }
        
        res.json({
            success: true,
            data: { menus: userMenusResult.rows }
        });
        
    } catch (error) {
        logger.error('Get user menu error:', error);
        console.error('Menü yükleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Menü yükleme hatası: ' + error.message
        });
    }
});

module.exports = router;
