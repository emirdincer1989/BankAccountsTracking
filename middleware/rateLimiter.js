const rateLimit = require('express-rate-limit');

// Genel rate limiter
const generalLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 dakika
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // IP başına maksimum istek
    message: {
        success: false,
        message: 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'development' // Development'ta atla
});

// Login için özel rate limiter (Brute force koruması)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 5, // IP başına maksimum 5 login denemesi
    message: {
        success: false,
        message: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Başarılı istekleri sayma
    skip: (req) => process.env.NODE_ENV === 'development' // Development'ta atla
});

// API için rate limiter
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 dakika
    max: 60, // IP başına dakikada maksimum 60 istek
    message: {
        success: false,
        message: 'API rate limit aşıldı. Lütfen daha sonra tekrar deneyin.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => process.env.NODE_ENV === 'development' // Development'ta atla
});

module.exports = {
    generalLimiter,
    loginLimiter,
    apiLimiter
};
