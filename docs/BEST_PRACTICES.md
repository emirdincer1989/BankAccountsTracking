# 🎯 Best Practices - RBUMS-NodeJS

Bu dokümantasyon, proje geliştirirken uygulanması gereken best practices'leri içerir.

---

## 📋 İçindekiler

1. [Güvenlik Best Practices](#güvenlik-best-practices)
2. [Kod Kalitesi](#kod-kalitesi)
3. [Veritabanı Best Practices](#veritabanı-best-practices)
4. [API Design](#api-design)
5. [Frontend Best Practices](#frontend-best-practices)
6. [Error Handling](#error-handling)
7. [Logging](#logging)
8. [Performance](#performance)
9. [Testing](#testing)
10. [Dokümantasyon](#dokümantasyon)

---

## 🔒 Güvenlik Best Practices

### 1. SQL Injection Koruması

**❌ YANLIŞ:**
```javascript
const query = `SELECT * FROM users WHERE id = ${req.params.id}`;
const result = await db.query(query);
```

**✅ DOĞRU:**
```javascript
const query = `SELECT * FROM users WHERE id = $1`;
const result = await query(query, [req.params.id]);
```

### 2. Input Validation

**❌ YANLIŞ:**
```javascript
router.post('/users', async (req, res) => {
    const { email, password } = req.body;
    // Direkt kullanım - TEHLİKELİ!
    await query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, password]);
});
```

**✅ DOĞRU:**
```javascript
const userSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
});

router.post('/users', 
    authMiddleware,
    validateInput(userSchema),
    async (req, res) => {
        const { email, password } = req.body;
        // Validated ve sanitized
        const hashedPassword = await bcrypt.hash(password, 10);
        await query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, hashedPassword]);
    }
);
```

### 3. Authentication ve Authorization

**✅ DOĞRU:**
```javascript
router.get('/users/:id',
    authMiddleware,                    // Authentication kontrolü
    authorize(['admin', 'user']),      // Authorization kontrolü
    async (req, res) => {
        // İşlemler
    }
);
```

### 4. Hassas Veri Şifreleme

**✅ DOĞRU:**
```javascript
const DataEncryption = require('../utils/encryption');

// Şifre hashleme
const hashedPassword = await bcrypt.hash(password, 12);

// Hassas veri şifreleme (kredi kartı, TC kimlik vb.)
const encrypted = DataEncryption.encrypt(sensitiveData);
await query('INSERT INTO table (encrypted_field) VALUES ($1)', [encrypted.encrypted]);
```

### 5. Rate Limiting

**✅ DOĞRU:**
```javascript
const { loginLimiter, apiLimiter } = require('../middleware/rateLimiter');

// Login için özel rate limiter
router.post('/auth/login', loginLimiter, async (req, res) => {
    // Login işlemi
});

// Genel API için rate limiter
router.use('/api', apiLimiter);
```

---

## 💻 Kod Kalitesi

### 1. Error Handling

**❌ YANLIŞ:**
```javascript
async function getUser(id) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
}
```

**✅ DOĞRU:**
```javascript
async function getUser(id) {
    try {
        const result = await query('SELECT * FROM users WHERE id = $1', [id]);
        if (!result.rows[0]) {
            throw new Error('Kullanıcı bulunamadı');
        }
        return result.rows[0];
    } catch (error) {
        logger.error('getUser hatası', { id, error });
        throw error;
    }
}
```

### 2. Async/Await Kullanımı

**❌ YANLIŞ:**
```javascript
function getData() {
    return fetch('/api/data')
        .then(res => res.json())
        .then(data => {
            return fetch(`/api/details/${data.id}`)
                .then(res => res.json());
        });
}
```

**✅ DOĞRU:**
```javascript
async function getData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        const detailsResponse = await fetch(`/api/details/${data.id}`);
        return await detailsResponse.json();
    } catch (error) {
        logger.error('getData hatası', error);
        throw error;
    }
}
```

### 3. Paralel İşlemler

**❌ YANLIŞ:**
```javascript
async function loadData() {
    const users = await getUsers();
    const roles = await getRoles();
    const menus = await getMenus();
    return { users, roles, menus };
}
```

**✅ DOĞRU:**
```javascript
async function loadData() {
    const [users, roles, menus] = await Promise.all([
        getUsers(),
        getRoles(),
        getMenus()
    ]);
    return { users, roles, menus };
}
```

### 4. Fonksiyon Sorumluluğu (SRP)

**❌ YANLIŞ:**
```javascript
async function processUser(userData) {
    // Validation
    if (!userData.email) throw new Error('Email gerekli');
    
    // Database işlemi
    const result = await query('INSERT INTO users ...');
    
    // Email gönderme
    await sendEmail(userData.email);
    
    // Logging
    logger.info('User created', result.id);
    
    return result;
}
```

**✅ DOĞRU:**
```javascript
// Her fonksiyon tek bir sorumluluğa sahip
function validateUserData(userData) {
    if (!userData.email) throw new Error('Email gerekli');
    return userData;
}

async function createUser(userData) {
    const result = await query('INSERT INTO users ...', [userData]);
    return result;
}

async function notifyUser(email) {
    await sendEmail(email);
}

async function processUser(userData) {
    const validated = validateUserData(userData);
    const user = await createUser(validated);
    await notifyUser(user.email);
    logger.info('User created', user.id);
    return user;
}
```

---

## 🗄️ Veritabanı Best Practices

### 1. Transaction Kullanımı

**✅ DOĞRU:**
```javascript
async function transferMoney(fromAccount, toAccount, amount) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Para çekme
        await client.query(
            'UPDATE accounts SET balance = balance - $1 WHERE id = $2',
            [amount, fromAccount]
        );
        
        // Para yatırma
        await client.query(
            'UPDATE accounts SET balance = balance + $1 WHERE id = $2',
            [amount, toAccount]
        );
        
        // İşlem kaydı
        await client.query(
            'INSERT INTO transactions (from_account, to_account, amount) VALUES ($1, $2, $3)',
            [fromAccount, toAccount, amount]
        );
        
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
```

### 2. Index Kullanımı

**✅ DOĞRU:**
```sql
-- Sık sorgulanan kolonlar için index
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### 3. Query Optimizasyonu

**❌ YANLIŞ (N+1 Problem):**
```javascript
const users = await query('SELECT * FROM users');
for (const user of users.rows) {
    const role = await query('SELECT * FROM roles WHERE id = $1', [user.role_id]);
    user.role = role.rows[0];
}
```

**✅ DOĞRU:**
```javascript
const users = await query(`
    SELECT u.*, r.name as role_name, r.description as role_description
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.id
`);
```

---

## 🌐 API Design

### 1. RESTful API Standartları

**✅ DOĞRU:**
```javascript
// GET - Listeleme
router.get('/users', async (req, res) => {
    const users = await getUsers();
    res.json({ success: true, data: users });
});

// GET - Tekil kayıt
router.get('/users/:id', async (req, res) => {
    const user = await getUser(req.params.id);
    res.json({ success: true, data: user });
});

// POST - Yeni kayıt
router.post('/users', async (req, res) => {
    const user = await createUser(req.body);
    res.status(201).json({ success: true, data: user });
});

// PUT - Güncelleme
router.put('/users/:id', async (req, res) => {
    const user = await updateUser(req.params.id, req.body);
    res.json({ success: true, data: user });
});

// DELETE - Silme
router.delete('/users/:id', async (req, res) => {
    await deleteUser(req.params.id);
    res.json({ success: true, message: 'Kullanıcı silindi' });
});
```

### 2. Response Formatı

**✅ DOĞRU:**
```javascript
// Başarılı response
res.json({
    success: true,
    data: { /* veri */ },
    message: 'İşlem başarılı' // opsiyonel
});

// Hata response
res.status(400).json({
    success: false,
    message: 'Hata mesajı',
    error: error.message, // development'ta
    errors: [ /* validation hataları */ ] // opsiyonel
});
```

### 3. HTTP Status Kodları

**✅ DOĞRU:**
```javascript
// 200 OK - Başarılı GET, PUT, DELETE
res.status(200).json({ success: true, data });

// 201 Created - Başarılı POST
res.status(201).json({ success: true, data });

// 400 Bad Request - Validation hatası
res.status(400).json({ success: false, message: 'Validation hatası' });

// 401 Unauthorized - Authentication hatası
res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor' });

// 403 Forbidden - Authorization hatası
res.status(403).json({ success: false, message: 'Bu işlem için yetkiniz yok' });

// 404 Not Found - Kayıt bulunamadı
res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });

// 500 Internal Server Error - Sunucu hatası
res.status(500).json({ success: false, message: 'Sunucu hatası' });
```

---

## 🎨 Frontend Best Practices

### 1. Modal ve Bildirimler

**✅ DOĞRU:**
```javascript
async function deleteUser(userId) {
    try {
        // Onay al
        const confirmed = await showConfirmDelete({
            message: 'Bu kullanıcıyı silmek istediğinizden emin misiniz?'
        });
        
        if (!confirmed) return;
        
        // Loading göster
        const loadingId = showLoading('Kullanıcı siliniyor...');
        
        // API çağrısı
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        // Loading'i kaldır
        Notification.remove(loadingId);
        
        if (!response.ok) {
            throw new Error(result.message || 'Silme işlemi başarısız');
        }
        
        showSuccess('Kullanıcı başarıyla silindi');
        
        // Sayfayı yenile
        setTimeout(() => window.reloadPage(), 1500);
        
    } catch (error) {
        showError(error.message || 'Bir hata oluştu');
    }
}
```

### 2. Event Listener Yönetimi

**✅ DOĞRU:**
```javascript
function setupEventListeners() {
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn && !deleteBtn.dataset.listenerAdded) {
        deleteBtn.dataset.listenerAdded = 'true';
        deleteBtn.addEventListener('click', handleDelete);
    }
}
```

### 3. DOM Manipülasyonu

**❌ YANLIŞ (XSS Riski):**
```javascript
element.innerHTML = `<div>${userInput}</div>`;
```

**✅ DOĞRU:**
```javascript
// Güvenli - textContent kullan
element.textContent = userInput;

// Veya sanitize et
const sanitized = validator.escape(userInput);
element.innerHTML = `<div>${sanitized}</div>`;
```

---

## ⚠️ Error Handling

### 1. Merkezi Error Handler

**✅ DOĞRU:**
```javascript
// server.js
app.use((err, req, res, next) => {
    logger.error('Unhandled error', {
        error: err,
        path: req.path,
        method: req.method,
        ip: req.ip
    });
    
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? 'Sunucu hatası' 
            : err.message
    });
});
```

### 2. Async Error Handling

**✅ DOĞRU:**
```javascript
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

router.get('/users/:id', asyncHandler(async (req, res) => {
    const user = await getUser(req.params.id);
    res.json({ success: true, data: user });
}));
```

---

## 📝 Logging

### 1. Structured Logging

**✅ DOĞRU:**
```javascript
logger.info('User created', {
    userId: user.id,
    email: user.email,
    ip: req.ip,
    userAgent: req.get('User-Agent')
});

logger.error('Database error', {
    error: error.message,
    stack: error.stack,
    query: queryString,
    params: queryParams
});
```

### 2. Log Levels

- **error**: Hatalar, kritik sorunlar
- **warn**: Uyarılar, potansiyel sorunlar
- **info**: Bilgilendirme, önemli işlemler
- **debug**: Debug bilgileri (development'ta)

---

## 🚀 Performance

### 1. Database Query Optimization

**✅ DOĞRU:**
```javascript
// Sadece gerekli kolonları seç
const users = await query('SELECT id, name, email FROM users');

// Limit ve offset kullan
const users = await query('SELECT * FROM users LIMIT $1 OFFSET $2', [limit, offset]);

// Index kullanımına dikkat et
const users = await query('SELECT * FROM users WHERE email = $1', [email]);
// email kolonu için index olmalı
```

### 2. Caching

**✅ DOĞRU:**
```javascript
const cache = new Map();

async function getCachedData(key, fetchFunction) {
    if (cache.has(key)) {
        return cache.get(key);
    }
    
    const data = await fetchFunction();
    cache.set(key, data);
    
    // TTL ekle
    setTimeout(() => cache.delete(key), 5 * 60 * 1000); // 5 dakika
    
    return data;
}
```

---

## 🧪 Testing

### 1. Unit Testing

**✅ DOĞRU:**
```javascript
describe('getUser', () => {
    it('should return user when id exists', async () => {
        const user = await getUser(1);
        expect(user).toBeDefined();
        expect(user.id).toBe(1);
    });
    
    it('should throw error when user not found', async () => {
        await expect(getUser(999)).rejects.toThrow('Kullanıcı bulunamadı');
    });
});
```

### 2. Integration Testing

**✅ DOĞRU:**
```javascript
describe('POST /api/users', () => {
    it('should create user with valid data', async () => {
        const response = await request(app)
            .post('/api/users')
            .send({ email: 'test@test.com', password: 'Test123!' })
            .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.email).toBe('test@test.com');
    });
});
```

---

## 📚 Dokümantasyon

### 1. JSDoc Kullanımı

**✅ DOĞRU:**
```javascript
/**
 * Kullanıcı bilgilerini getirir
 * @param {number} id - Kullanıcı ID'si
 * @returns {Promise<Object>} Kullanıcı objesi
 * @throws {Error} Kullanıcı bulunamazsa hata fırlatır
 */
async function getUser(id) {
    // ...
}
```

### 2. API Dokümantasyonu

**✅ DOĞRU:**
```javascript
/**
 * @route POST /api/users
 * @desc Yeni kullanıcı oluşturur
 * @access Private (Admin only)
 * @body {string} email - Kullanıcı email'i
 * @body {string} password - Kullanıcı şifresi (min 8 karakter)
 * @returns {Object} Oluşturulan kullanıcı objesi
 */
router.post('/users', async (req, res) => {
    // ...
});
```

---

## 📞 Yardım

Best practices hakkında sorularınız için:
- `docs/DEVELOPMENT_CHECKLIST.md` dosyasını kontrol edin
- `.cursorrules` dosyasını inceleyin
- Mevcut kod örneklerini referans alın

