# RBUMS - Rol Bazlı Kullanıcı Yönetim Sistemi (Node.js)

Modern, güvenli ve ölçeklenebilir **Rol Bazlı Yetkilendirme (RBAC)** sistemi ile geliştirilmiş web uygulaması şablonu.

## 🚀 Özellikler

### 🔐 Güvenlik
- **JWT Authentication** - Token bazlı kimlik doğrulama
- **Role-Based Authorization (RBAC)** - Rol bazlı yetkilendirme sistemi
- **Password Hashing** - Bcrypt ile güvenli şifre saklama
- **Rate Limiting** - Brute force saldırı koruması
- **Input Validation** - Joi ile veri doğrulama
- **SQL Injection Protection** - Parameterized queries
- **XSS Protection** - Helmet ve sanitization
- **CORS Configuration** - Cross-origin güvenlik

### 📊 Veritabanı
- **PostgreSQL** - Güçlü ve güvenilir veritabanı
- **Connection Pooling** - Performanslı bağlantı yönetimi
- **Transaction Support** - ACID uyumlu işlemler
- **Migration System** - Veritabanı şema yönetimi
- **Audit Logging** - Tüm işlemlerin kayıt altına alınması

### 🎨 Arayüz
- **Hybrid Layout** - MPA kararlılığı + SPA dinamizmi
- **Velzon Admin Template** - Modern ve responsive tasarım
- **Dynamic Menu System** - Rol bazlı dinamik menü
- **Real-time Updates** - Anında içerik güncelleme
- **Event Delegation** - Performanslı olay yönetimi

### 🛠️ Geliştirici Deneyimi
- **Modern ES6+ Syntax** - Güncel JavaScript özellikleri
- **Winston Logger** - Gelişmiş log yönetimi
- **Error Handling** - Merkezi hata yakalama
- **Environment Variables** - Güvenli yapılandırma
- **Modular Architecture** - Temiz ve sürdürülebilir kod

---

## 📋 İçindekiler

- [Kurulum](#-kurulum)
- [Yapılandırma](#-yapılandırma)
- [Veritabanı](#-veritabanı)
- [Kullanım](#-kullanım)
- [Proje Yapısı](#-proje-yapısı)
- [API Endpoints](#-api-endpoints)
- [Güvenlik](#-güvenlik)
- [Dokümantasyon](#-dokümantasyon)

---

## 🔧 Kurulum

### Gereksinimler

- **Node.js** v16+ (LTS önerilir)
- **PostgreSQL** v14+
- **npm** v8+

### Adımlar

1. **Projeyi klonlayın:**
```bash
git clone <repository-url>
cd RBUMS-NodeJS
```

2. **Bağımlılıkları yükleyin:**
```bash
npm install
```

3. **Environment dosyasını oluşturun:**
```bash
cp env.example .env
```

4. **`.env` dosyasını düzenleyin:**
```env
# Sunucu
PORT=3000
NODE_ENV=development

# Veritabanı
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rbums
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRES_IN=24h

# Şifreleme (isteğe bağlı - hassas veriler için)
ENCRYPTION_KEY=your_32_character_encryption_key

# Log
LOG_LEVEL=info
```

5. **Veritabanını oluşturun:**
```sql
CREATE DATABASE rbums;
```

6. **Migration ve Seed çalıştırın:**
```bash
npm run migrate
npm run seed
```

**💡 Mevcut Veritabanını Aktarmak İçin:**
Eğer mevcut bir veritabanınızı yeni projeye aktarmak istiyorsanız:
```bash
# 1. Mevcut projede export alın
npm run export:db

# 2. Oluşturulan dosyaları yeni projeye kopyalayın:
# - scripts/migrations/007_full_database_import.js
# - scripts/seed-full.js

# 3. Yeni projede migration + seed çalıştırın
npm run migrate -- --with-seed
```

Detaylı bilgi için: `scripts/README-DATABASE-EXPORT.md`

7. **Uygulamayı başlatın:**
```bash
npm start
```

8. **Tarayıcıda açın:**
```
http://localhost:3000
```

---

## ⚙️ Yapılandırma

### Scripts

| Script | Açıklama |
|--------|----------|
| `npm start` | Uygulamayı başlatır |
| `npm run dev` | Geliştirme modunda başlatır (nodemon ile) |
| `npm run migrate` | Veritabanı migration'larını çalıştırır |
| `npm run seed` | Başlangıç verilerini ekler |

### Varsayılan Giriş Bilgileri

**Email:** `admin@rbums.com`  
**Şifre:** `admin123!`  
**Rol:** Süper Admin

> ⚠️ **ÖNEMLİ:** Production'da şifre ve JWT secret'ı mutlaka değiştirin!

---

## 💾 Veritabanı

### Tablolar

#### 1. **users** - Kullanıcılar
```sql
- id (PK)
- email (UNIQUE)
- password (hashed)
- name
- role_id (FK → roles)
- is_active
- last_login
- created_at, updated_at
```

#### 2. **roles** - Roller
```sql
- id (PK)
- name (UNIQUE)
- description
- permissions (JSONB)
- is_active
- created_at, updated_at
```

#### 3. **menus** - Menüler
```sql
- id (PK)
- title
- url
- icon
- category
- is_category
- order_index
- is_active
- created_at, updated_at
```

#### 4. **role_menus** - Rol-Menü İlişkileri
```sql
- id (PK)
- role_id (FK → roles)
- menu_id (FK → menus)
- can_view, can_create, can_edit, can_delete
- created_at
```

#### 5. **audit_logs** - İşlem Kayıtları
```sql
- id (PK)
- user_id (FK → users)
- action
- table_name
- record_id
- old_values (JSONB)
- new_values (JSONB)
- ip_address
- user_agent
- created_at
```

### Migration Sistemi

```bash
# Yeni migration oluştur
node scripts/migrate.js

# Seed data ekle
node scripts/seed.js
```

---

## 🎯 Kullanım

### Yeni Sayfa Ekleme (Hybrid Layout)

1. **Sayfa HTML'ini oluşturun:** `public/pages/my-page.html`

```html
<div class="page-content">
    <div class="container-fluid">
        <div class="row">
            <div class="col-12">
                <div class="page-title-box">
                    <h4 class="page-title">Sayfam</h4>
                </div>
            </div>
        </div>
        
        <!-- İçerik buraya -->
    </div>
</div>
```

2. **API route'u ekleyin:** `routes/my-route.js`

```javascript
const express = require('express');
const { authMiddleware, authorize } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', authorize(['my_permission.view']), async (req, res) => {
    // İşlemler
    res.json({ success: true, data: {} });
});

module.exports = router;
```

3. **Route'u `server.js`'e ekleyin:**

```javascript
const myRoute = require('./routes/my-route');
app.use('/api/my-route', myRoute);
```

4. **Menüye ekleyin:** `/menus` sayfasından veya veritabanından

Detaylı bilgi için: [Sayfa Şablonu Kullanımı](docs/SAYFA-SABLONU-KULLANIMI.md)

---

## 📁 Proje Yapısı

```
RBUMS-NodeJS/
├── assets/                 # Statik dosyalar (CSS, JS, resimler)
│   ├── css/
│   ├── js/
│   └── images/
├── config/
│   └── database.js        # Veritabanı yapılandırması
├── docs/                  # Proje dokümantasyonu
│   ├── README.md
│   ├── PROJE-CALISMA-MANTIGI-VE-AKIS-DIYAGRAMI.md
│   ├── MENU-YAPISI-VE-SAYFA-MANTIGI.md
│   ├── SAYFA-SABLONU-KULLANIMI.md
│   └── VAKIFBANK_ENTEGRASYON_DÖKÜMANI.md
├── middleware/
│   ├── auth.js           # Authentication & Authorization
│   ├── validation.js     # Input validation (Joi)
│   └── rateLimiter.js    # Rate limiting
├── routes/               # API route'ları
│   ├── auth.js           # Kimlik doğrulama
│   ├── users.js          # Kullanıcı yönetimi
│   ├── roles.js          # Rol yönetimi
│   ├── menus.js          # Menü yönetimi
│   ├── dashboard.js      # Dashboard
│   └── panel-settings.js # Panel ayarları
├── scripts/
│   ├── migrate.js        # Veritabanı migration
│   └── seed.js           # Başlangıç verileri
├── utils/
│   ├── encryption.js     # Şifreleme ve hashing
│   └── logger.js         # Winston logger
├── public/
│   └── pages/            # Sayfa HTML dosyaları
├── theme-examples/       # Tema örnek dosyaları (git'te yok)
├── .env                  # Environment değişkenleri (git'te yok)
├── .gitignore
├── auth-signin-basic.html # Giriş sayfası
├── hybrid-layout.html    # Ana layout
├── package.json
├── server.js             # Express sunucu
└── README.md
```

---

## 🔌 API Endpoints

### Authentication

```http
POST   /api/auth/login       # Giriş yap
POST   /api/auth/logout      # Çıkış yap
GET    /api/auth/me          # Kullanıcı bilgilerini al
```

### Users

```http
GET    /api/users            # Tüm kullanıcıları listele
GET    /api/users/:id        # Kullanıcı detayı
POST   /api/users            # Yeni kullanıcı oluştur
PUT    /api/users/:id        # Kullanıcı güncelle
DELETE /api/users/:id        # Kullanıcı sil
```

### Roles

```http
GET    /api/roles            # Tüm rolleri listele
GET    /api/roles/:id        # Rol detayı
POST   /api/roles            # Yeni rol oluştur
PUT    /api/roles/:id        # Rol güncelle
DELETE /api/roles/:id        # Rol sil
```

### Menus

```http
GET    /api/menus            # Tüm menüleri listele
GET    /api/menus/user-menus # Kullanıcının menüleri
GET    /api/menus/:id        # Menü detayı
POST   /api/menus            # Yeni menü oluştur
PUT    /api/menus/:id        # Menü güncelle
DELETE /api/menus/:id        # Menü sil
PUT    /api/menus/reorder    # Menü sıralama
```

### Dashboard

```http
GET    /api/dashboard/stats  # Dashboard istatistikleri
```

### Panel Settings

```http
GET    /api/panel-settings   # Panel ayarlarını getir
POST   /api/panel-settings   # Panel ayarlarını güncelle
POST   /api/panel-settings/logo # Logo yükle
POST   /api/panel-settings/favicon # Favicon yükle
```

---

## 🔒 Güvenlik

### Uygulanan Güvenlik Önlemleri

#### 1. **Authentication & Authorization**
- JWT token bazlı kimlik doğrulama
- Rol bazlı yetkilendirme (RBAC)
- Token'ın cookie'de güvenli saklanması
- Otomatik token yenileme

#### 2. **Input Validation**
```javascript
// Joi ile şema doğrulama
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});
```

#### 3. **SQL Injection Prevention**
```javascript
// Parameterized queries
await query('SELECT * FROM users WHERE email = $1', [email]);
```

#### 4. **XSS Protection**
- Helmet middleware
- Input sanitization
- Content Security Policy

#### 5. **Rate Limiting**
```javascript
// Login: 5 deneme / 15 dakika
// API: 100 istek / 15 dakika
```

#### 6. **Password Security**
- Bcrypt hashing (10 rounds)
- Minimum 6 karakter
- Güçlü şifre önerilir

#### 7. **Audit Logging**
- Tüm kritik işlemler loglanır
- IP adresi ve User-Agent kaydı
- Old/New değer karşılaştırması

---

## 📚 Dokümantasyon

### Detaylı Dokümantasyon

- **[Proje Çalışma Mantığı ve Akış Diyagramı](docs/PROJE-CALISMA-MANTIGI-VE-AKIS-DIYAGRAMI.md)**
  - Mimari yapı
  - Akış diyagramları
  - Güvenlik katmanları
  
- **[Menü Yapısı ve Sayfa Mantığı](docs/MENU-YAPISI-VE-SAYFA-MANTIGI.md)**
  - Hybrid layout sistemi
  - Dinamik menü yönetimi
  - Rol bazlı menü görünürlüğü
  
- **[Sayfa Şablonu Kullanımı](docs/SAYFA-SABLONU-KULLANIMI.md)**
  - Yeni sayfa oluşturma
  - HTML yapısı
  - JavaScript entegrasyonu

- **[Vakıfbank Entegrasyon Dökümanı](docs/VAKIFBANK_ENTEGRASYON_DÖKÜMANI.md)**
  - Ödeme entegrasyonu örneği

### Tema Örnekleri

195 adet Velzon tema örnek dosyası `theme-examples/` klasöründe mevcuttur:
- UI Components
- Forms
- Charts
- Tables
- ve daha fazlası...

> 📁 **Not:** `theme-examples/` klasörü sadece lokal geliştirme içindir ve git'te izlenmez.

---

## 🎨 Özelleştirme

### Logo ve Favicon Değiştirme

Panel ayarları sayfasından (`/panel-settings`) logo ve favicon yükleyebilirsiniz.

### Tema Renkleri

`assets/css/app.min.css` dosyasını düzenleyerek tema renklerini değiştirebilirsiniz.

### Menü Yapısı

Menü yönetimi sayfasından (`/menus`) dinamik olarak menü ekleyip çıkarabilirsiniz.

---

## 🤝 Katkıda Bulunma

Bu proje şablon bir proje olarak geliştirilmiştir. Önerileriniz için issue açabilirsiniz.

---

## 📝 Lisans

Bu proje özel kullanım içindir.

---

## 👨‍💻 Geliştirici

**Proje:** RBUMS - Rol Bazlı Kullanıcı Yönetim Sistemi  
**Platform:** Node.js + Express + PostgreSQL  
**Tema:** Velzon Admin Template  
**Versiyon:** 1.0.0  

---

## 🆘 Sorun Giderme

### Veritabanı Bağlantı Hatası
```bash
# PostgreSQL servisinin çalıştığından emin olun
# .env dosyasındaki veritabanı bilgilerini kontrol edin
```

### Migration Hatası
```bash
# Önce veritabanını oluşturun
# Sonra migration'ları çalıştırın
npm run migrate
npm run seed
```

### Port Kullanımda Hatası
```bash
# .env dosyasında PORT değişkenini değiştirin
# Veya başka bir port kullanın
PORT=3001 npm start
```

---

## 📞 İletişim

Sorularınız için lütfen dokümantasyonu inceleyin veya issue açın.

---

**⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!**

