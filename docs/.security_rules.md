# Cursor AI Security Rules - Node.js/PostgreSQL Finansal Uygulama Güvenlik Kuralları

## 🔒 TEMEL GÜVENLİK PRENSİPLERİ

### ZORUNLU GÜVENLIK KONTROLLERI
- Her yeni route'da mutlaka güvenlik middleware'leri ekle
- Hiçbir zaman dinamik SQL sorgusu yazma, sadece parameterized queries kullan
- Tüm kullanıcı girişlerini validate et ve sanitize et (Joi, Yup, Zod)
- Hassas verileri mutlaka şifrele (bcrypt, crypto)
- Her route için authentication ve authorization kontrolü yap
- CORS, Helmet, Rate Limiting middleware'lerini kullan

### YASAKLI İŞLEMLER
- Direct SQL concatenation (string birleştirme ile SQL yazma)
- req.body, req.query verilerini direkt kullanma
- Şifrelenmemiş hassas veri saklama
- HTTP üzerinden veri gönderme
- Kullanıcı input'unu direkt response'a gönderme
- console.log ile hassas veri yazdırma

## 📝 ZORUNLU ŞABLONlar

### Express App Başlangıç (ZORUNLU)
```javascript
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { authMiddleware } = require('./middleware/auth');
const { validateInput } = require('./middleware/validation');

const app = express();

// ZORUNLU GÜVENLİK MIDDLEWARE'LERİ
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

// RATE LIMITING
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 100, // IP başına maksimum istek
    message: 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.'
});
app.use(limiter);

// HTTPS ZORUNLULUĞU (Production)
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

### Database İşlemleri (ZORUNLU ŞABLON)
```javascript
// ❌ ASLA BÖYLE YAPMA
const sql = `SELECT * FROM users WHERE id = ${req.params.id}`;
const result = await db.query(sql);

// ✅ MUTLAKA BÖYLE YAP
const sql = "SELECT * FROM users WHERE id = $1";
const result = await db.query(sql, [req.params.id]);
```

### Route Güvenlik Şablonu (ZORUNLU)
```javascript
// Her route için bu şablonu kullan
router.get('/users/:id', 
    authMiddleware,           // Authentication kontrolü
    validateInput(userSchema), // Input validation
    authorize(['admin', 'user']), // Authorization kontrolü
    async (req, res) => {
        try {
            const { id } = req.params;
            const sql = "SELECT * FROM users WHERE id = $1";
            const result = await db.query(sql, [id]);
            
            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            logger.error('User fetch error:', error);
            res.status(500).json({
                success: false,
                message: 'Sunucu hatası'
            });
        }
    }
);
```

### Kullanıcı Input İşleme (ZORUNLU)
```javascript
// ❌ ASLA BÖYLE YAPMA
res.json({ name: req.body.name });
const query = `SELECT * FROM table WHERE name = '${req.body.name}'`;

// ✅ MUTLAKA BÖYLE YAP
const { name } = req.body;
const sanitizedName = validator.escape(name);
res.json({ name: sanitizedName });

const sql = "SELECT * FROM table WHERE name = $1";
const result = await db.query(sql, [sanitizedName]);
```

### Hassas Veri Saklama (ZORUNLU)
```javascript
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Şifre hashleme
const hashedPassword = await bcrypt.hash(password, 12);

// Hassas veri şifreleme (AES-256-GCM)
const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv(algorithm, key, iv); // Modern method
cipher.setAAD(Buffer.from('additional data'));
let encrypted = cipher.update(sensitiveData, 'utf8', 'hex');
encrypted += cipher.final('hex');
const authTag = cipher.getAuthTag();

const sql = "INSERT INTO table (encrypted_field, auth_tag) VALUES ($1, $2)";
await db.query(sql, [encrypted, authTag.toString('hex')]);
```

## 🛡️ GÜVENLİK KİTİ DOSYALARI (OLUŞTURULMASI ZORUNLU)

### middleware/auth.js
```javascript
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

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
        const userResult = await db.query(
            "SELECT id, email, role, is_active FROM users WHERE id = $1",
            [decoded.userId]
        );
        
        if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
            return res.status(401).json({
                success: false,
                message: 'Geçersiz token veya kullanıcı aktif değil'
            });
        }

        req.user = userResult.rows[0];
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Geçersiz token'
        });
    }
};

const authorize = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication gerekli'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Bu işlem için yetkiniz yok'
            });
        }

        next();
    };
};

module.exports = { authMiddleware, authorize };
```

### middleware/validation.js
```javascript
const Joi = require('joi');
const validator = require('validator');
const { logger } = require('../utils/logger');

// Joi şemaları
const userSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
    name: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid('admin', 'user', 'manager').required()
});

const menuSchema = Joi.object({
    title: Joi.string().min(2).max(50).required(),
    url: Joi.string().uri().required(),
    icon: Joi.string().max(50),
    parent_id: Joi.number().integer().min(0).allow(null),
    order: Joi.number().integer().min(0).required(),
    roles: Joi.array().items(Joi.string()).min(1).required()
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
    menuSchema,
    detectSQLInjection,
    detectXSS
};
```

### middleware/rateLimiter.js
```javascript
const rateLimit = require('express-rate-limit');

// NOT: Redis kullanımı opsiyoneldir. Production'da Redis Store kullanılabilir.
// const RedisStore = require('rate-limit-redis');
// const Redis = require('redis');

// Genel rate limiter
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 100, // IP başına maksimum istek
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
```

### utils/encryption.js
```javascript
const crypto = require('crypto');
const bcrypt = require('bcrypt');

class DataEncryption {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
    }
    
    // Hassas veri şifreleme (Kredi kartı, TC kimlik vb. için)
    encrypt(data) {
        if (!this.key) {
            throw new Error('ENCRYPTION_KEY environment variable bulunamadı!');
        }
        
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv); // Modern method
        cipher.setAAD(Buffer.from('additional data'));
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }
    
    // Hassas veri şifre çözme
    decrypt(encryptedData) {
        if (!this.key) {
            throw new Error('ENCRYPTION_KEY environment variable bulunamadı!');
        }
        
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv); // Modern method
        decipher.setAAD(Buffer.from('additional data'));
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
    
    // Şifre hashleme
    static async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }
    
    // Şifre doğrulama
    static async verifyPassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }
    
    // JWT token oluşturma
    static generateToken(payload) {
        const jwt = require('jsonwebtoken');
        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        });
    }
    
    // JWT token doğrulama
    static verifyToken(token) {
        const jwt = require('jsonwebtoken');
        return jwt.verify(token, process.env.JWT_SECRET);
    }
}

module.exports = DataEncryption;
```

## 🚨 CURSOR AI İÇİN ÖZEL TALİMATLAR

### Kod Yazarken Mutlaka Kontrol Et:
1. **SQL Sorgusu yazıyorsan** → Parameterized query kullan ($1, $2, ...)
2. **Route oluşturuyorsan** → authMiddleware ve validateInput ekle
3. **Hassas veri saklıyorsan** → DataEncryption ile şifrele
4. **API endpoint yazıyorsan** → Rate limiting ve CORS ekle
5. **Database bağlantısı yapıyorsan** → SSL kullan

### Otomatik Güvenlik Kontrolleri:
- Her `req.body`, `req.query` kullanımında uyarı ver
- Raw SQL query tespit edersen düzelt
- Response'a kullanıcı verisi gönderiyorsan sanitize et
- Database connection'da SSL yoksa ekle
- Console.log ile hassas veri yazdırıyorsan uyar

### Finansal Veri İşleme Kuralları:
- Kredi kartı numarası → Tokenize et
- Hesap numarası → Şifrele  
- Para miktarları → Decimal/Numeric field kullan
- Transaction ID → UUID kullan
- Banka hesap bilgileri → AES-256-GCM ile şifrele

## 📊 PERFORMANS ve GÜVENLİK DENGES

### Database İndeksleme:
```sql
-- Güvenlik logları için
CREATE INDEX idx_security_logs_ip_time ON security_logs(ip_address, created_at);

-- Rate limiting için
CREATE INDEX idx_rate_limit_ip ON rate_limits(ip_address, created_at);

-- Authentication için
CREATE INDEX idx_users_email ON users(email);
```

### Cache Stratejisi:
- Rate limiting verileri → Redis (TTL ile)
- Session verileri → Redis/Memcached
- Static güvenlik kuralları → Application cache

## ⚠️ YAPILMAMASI GEREKENLER

### Asla Yapma:
```javascript
// ❌ Raw SQL
const query = `SELECT * FROM users WHERE id = ${req.params.id}`;

// ❌ Direct response
res.json({ message: req.body.message });

// ❌ Şifrelenmemiş hassas veri
await db.query("INSERT INTO users (credit_card) VALUES ($1)", [req.body.card_number]);

// ❌ HTTP bağlantı
const response = await fetch('http://api.example.com');

// ❌ Hardcoded secrets
const apiKey = "sk_live_12345";

// ❌ Console.log ile hassas veri
console.log('User password:', user.password);
```

### Mutlaka Yap:
```javascript
// ✅ Parameterized queries
const query = "SELECT * FROM users WHERE id = $1";
const result = await db.query(query, [req.params.id]);

// ✅ Sanitized output
const sanitizedMessage = validator.escape(req.body.message);
res.json({ message: sanitizedMessage });

// ✅ Encrypted sensitive data
const encrypted = encryption.encrypt(req.body.card_number);

// ✅ HTTPS connections
const response = await fetch('https://api.example.com');

// ✅ Environment variables
const apiKey = process.env.API_KEY;

// ✅ Secure logging
logger.info('User login attempt', { userId: user.id, ip: req.ip });
```

## 🔄 GÜNCELLEMELER ve MAINTENANCE

### Günlük:
- Error logları kontrol et
- Failed login attempts check
- Rate limiting stats

### Haftalık:
- Security scan çalıştır
- Dependencies güncelle
- Backup verify et

### Aylık:
- Penetration testing
- Security audit
- Performance review

---
**NOT:** Bu kurallar finansal uygulama geliştirme için minimum güvenlik gereksinimlerini karşılar. Production'a geçmeden önce profesyonel security audit yaptırılması önerilir.