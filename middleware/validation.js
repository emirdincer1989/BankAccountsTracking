const Joi = require('joi');
const validator = require('validator');
const { logger } = require('../utils/logger');

// Joi şemaları
const userSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
    name: Joi.string().min(2).max(50).required(),
    role_id: Joi.number().integer().min(1).required()
});

const userUpdateSchema = Joi.object({
    email: Joi.string().email(),
    name: Joi.string().min(2).max(50),
    role_id: Joi.number().integer().min(1),
    is_active: Joi.boolean()
});

const roleSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    description: Joi.string().max(255),
    permissions: Joi.object().required()
});

const menuSchema = Joi.object({
    title: Joi.string().min(2).max(100).required(),
    url: Joi.string().max(255).allow('').allow(null),
    icon: Joi.string().max(50).allow(''),
    order_index: Joi.number().integer().min(0).default(0),
    category: Joi.string().max(100).allow(null).allow(''),
    is_category: Joi.boolean().default(false),
    is_active: Joi.boolean().default(true)
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

// Input validation middleware
const validateInput = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false });
        
        if (error) {
            const errors = error.details.map(detail => detail.message);
            return res.status(400).json({
                success: false,
                message: 'Validation hatası',
                errors
            });
        }
        
        req.body = value;
        next();
    };
};

// SQL Injection tespiti
const detectSQLInjection = (input) => {
    const patterns = [
        /(\bunion\b.*\bselect\b)/i,
        /(\bselect\b.*\bfrom\b)/i,
        /(\'|\").*(\bor\b|\band\b).*(\=|\>|\<)/i,
        /(\bdrop\b|\bdelete\b|\btruncate\b)/i,
        /(\binsert\b.*\binto\b)/i,
        /(\bupdate\b.*\bset\b)/i
    ];
    
    return patterns.some(pattern => pattern.test(input));
};

// XSS tespiti
const detectXSS = (input) => {
    const patterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
        /javascript:/i,
        /<iframe/i,
        /on\w+\s*=/i,
        /<object/i,
        /<embed/i
    ];
    
    return patterns.some(pattern => pattern.test(input));
};

// Güvenlik kontrolü middleware
const securityCheck = (req, res, next) => {
    const checkInput = (obj) => {
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                if (detectSQLInjection(value)) {
                    logger.warn(`SQL Injection attempt detected: ${key}`, { 
                        ip: req.ip, 
                        userAgent: req.get('User-Agent'),
                        input: value 
                    });
                    return res.status(403).json({
                        success: false,
                        message: 'Güvenlik ihlali tespit edildi'
                    });
                }
                
                if (detectXSS(value)) {
                    logger.warn(`XSS attempt detected: ${key}`, { 
                        ip: req.ip, 
                        userAgent: req.get('User-Agent'),
                        input: value 
                    });
                    return res.status(403).json({
                        success: false,
                        message: 'Güvenlik ihlali tespit edildi'
                    });
                }
            }
        }
    };
    
    checkInput(req.body);
    checkInput(req.query);
    checkInput(req.params);
    
    next();
};

module.exports = { 
    validateInput, 
    securityCheck, 
    userSchema, 
    userUpdateSchema,
    roleSchema, 
    menuSchema,
    loginSchema,
    detectSQLInjection,
    detectXSS
};


