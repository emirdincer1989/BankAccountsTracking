const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { logger } = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') ||
            req.cookies?.auth_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Erişim token\'ı bulunamadı'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Kullanıcının aktif olup olmadığını kontrol et
        const userResult = await query(
            `SELECT u.id, u.email, u.name, u.role_id, u.is_active, r.name as role_name, r.permissions,
             ARRAY_AGG(ui.institution_id) FILTER (WHERE ui.institution_id IS NOT NULL) as institution_ids
             FROM users u 
             LEFT JOIN roles r ON u.role_id = r.id 
             LEFT JOIN user_institutions ui ON u.id = ui.user_id
             WHERE u.id = $1
             GROUP BY u.id, r.name, r.permissions`,
            [decoded.userId]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz token veya kullanıcı aktif değil'
            });
        }

        const user = userResult.rows[0];
        user.permissions = typeof user.permissions === 'string' ?
            JSON.parse(user.permissions) : user.permissions;

        req.user = user;
        next();
    } catch (error) {
        logger.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: 'Geçersiz token'
        });
    }
};

const authorize = (permissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication gerekli'
            });
        }

        // Süper admin her şeye erişebilir
        if (req.user.role_name === 'super_admin') {
            return next();
        }

        // İzin kontrolü
        const userPermissions = req.user.permissions || {};
        const hasPermission = permissions.every(permission => {
            const [module, action] = permission.split('.');
            return userPermissions[module] && userPermissions[module][action];
        });

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Bu işlem için yetkiniz yok'
            });
        }

        next();
    };
};

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication gerekli'
            });
        }

        if (allowedRoles.includes(req.user.role_name)) {
            return next();
        }

        return res.status(403).json({
            success: false,
            message: 'Bu işlem için yetkiniz yok'
        });
    };
};

module.exports = {
    authMiddleware,
    authorize,
    authorizeRoles
};



