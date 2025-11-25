# 🏗️ RBUMS-NodeJS Proje Çalışma Mantığı ve Akış Diyagramı

## 📋 İçindekiler
1. [Proje Genel Bakış](#proje-genel-bakış)
2. [Sistem Mimarisi](#sistem-mimarisi)
3. [Teknoloji Stack](#teknoloji-stack)
4. [Veritabanı Yapısı](#veritabanı-yapısı)
5. [Kimlik Doğrulama ve Yetkilendirme Akışı](#kimlik-doğrulama-ve-yetkilendirme-akışı)
6. [Sayfa Yükleme ve Navigasyon Akışı](#sayfa-yükleme-ve-navigasyon-akışı)
7. [API Endpoint'leri ve Veri Akışı](#api-endpointleri-ve-veri-akışı)
8. [Rol Bazlı Erişim Kontrolü (RBAC)](#rol-bazlı-erişim-kontrolü-rbac)
9. [Güvenlik Katmanları](#güvenlik-katmanları)
10. [Detaylı Akış Diyagramları](#detaylı-akış-diyagramları)

---

## 🎯 Proje Genel Bakış

### Proje Adı
**RBUMS-NodeJS** (Role Based User Management System - Borç Takip Sistemi)

### Proje Türü
Rol bazlı kullanıcı yönetim sistemi ile desteklenen **Borç Takip ve Yönetim Platformu**

### Ana Özellikler
- 🔐 JWT Tabanlı Kimlik Doğrulama
- 👥 Rol Bazlı Erişim Kontrolü (RBAC)
- 📋 Dinamik Menü Sistemi
- 🔄 Hybrid Layout (SPA + MPA) Yaklaşımı
- 📊 Dashboard ve İstatistikler
- 🛡️ Kapsamlı Güvenlik Katmanları
- 📝 Audit Logging Sistemi

---

## 🏛️ Sistem Mimarisi

### Genel Mimari Yapı

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ HTML Pages │  │ Bootstrap  │  │ JavaScript │            │
│  │ (Hybrid)   │  │    CSS     │  │   (ES6+)   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/HTTPS
                            │ REST API Calls
┌───────────────────────────▼─────────────────────────────────┐
│                    EXPRESS.JS SERVER                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              MIDDLEWARE LAYER                       │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │    │
│  │  │  Helmet  │ │   CORS   │ │   Rate   │           │    │
│  │  │ Security │ │          │ │  Limiter │           │    │
│  │  └──────────┘ └──────────┘ └──────────┘           │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │    │
│  │  │   Auth   │ │Validation│ │  Cookie  │           │    │
│  │  │   JWT    │ │   Joi    │ │  Parser  │           │    │
│  │  └──────────┘ └──────────┘ └──────────┘           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                 ROUTE HANDLERS                       │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │    │
│  │  │   Auth   │ │  Users   │ │  Roles   │           │    │
│  │  │  Routes  │ │  Routes  │ │  Routes  │           │    │
│  │  └──────────┘ └──────────┘ └──────────┘           │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │    │
│  │  │  Menus   │ │Dashboard │ │  Panel   │           │    │
│  │  │  Routes  │ │  Routes  │ │ Settings │           │    │
│  │  └──────────┘ └──────────┘ └──────────┘           │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               BUSINESS LOGIC LAYER                   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │    │
│  │  │Encryption│ │  Logger  │ │ Database │           │    │
│  │  │  Utils   │ │  Winston │ │  Query   │           │    │
│  │  └──────────┘ └──────────┘ └──────────┘           │    │
│  └─────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │ PostgreSQL Protocol
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   PostgreSQL DATABASE                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    TABLES                            │    │
│  │  • users         (Kullanıcı bilgileri)              │    │
│  │  • roles         (Rol tanımları)                    │    │
│  │  • menus         (Menü yapısı)                      │    │
│  │  • role_menus    (Rol-Menü ilişkileri)             │    │
│  │  • audit_logs    (İşlem kayıtları)                 │    │
│  │  • sessions      (Oturum bilgileri)                │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Teknoloji Stack

### Backend Stack
| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| Node.js | >=18.0.0 | JavaScript Runtime |
| Express.js | ^4.18.2 | Web Framework |
| PostgreSQL | - | İlişkisel Veritabanı |
| JWT | ^9.0.2 | Token-based Authentication |
| Bcrypt | ^5.1.1 | Şifre Hash'leme |
| Helmet | ^7.1.0 | HTTP Header Security |
| CORS | ^2.8.5 | Cross-Origin Resource Sharing |
| Joi | ^17.11.0 | Input Validation |
| Winston | ^3.11.0 | Logging |
| Morgan | ^1.10.0 | HTTP Request Logger |
| Compression | ^1.7.4 | Response Compression |

### Frontend Stack
| Teknoloji | Kullanım Amacı |
|-----------|----------------|
| Bootstrap 5 | UI Framework |
| Remix Icons | İkon Seti |
| Vanilla JavaScript | Client-side Logic |
| Hybrid Layout | SPA benzeri deneyim |

### Development Tools
- **nodemon** - Auto restart
- **jest** - Testing framework
- **supertest** - API testing

---

## 🗄️ Veritabanı Yapısı

### Ana Tablolar ve İlişkiler

```
┌────────────────────────┐
│       USERS            │
├────────────────────────┤
│ id (PK)               │
│ email (UNIQUE)        │
│ password (HASHED)     │
│ name                  │
│ role_id (FK)          │◄─────┐
│ is_active             │      │
│ last_login            │      │
│ created_at            │      │
│ updated_at            │      │
└────────────────────────┘      │
                                │
                                │
┌────────────────────────┐      │
│       ROLES            │      │
├────────────────────────┤      │
│ id (PK)               │──────┘
│ name (UNIQUE)         │
│ display_name          │
│ permissions (JSONB)   │
│ is_active             │
│ created_at            │
│ updated_at            │
└────────────────────────┘
         │
         │ 1:N
         │
         ▼
┌────────────────────────┐
│    ROLE_MENUS          │
├────────────────────────┤
│ id (PK)               │
│ role_id (FK)          │◄──────┐
│ menu_id (FK)          │       │
│ can_view              │       │
│ can_create            │       │
│ can_edit              │       │
│ can_delete            │       │
│ created_at            │       │
└────────────────────────┘       │
                                 │
                                 │
┌────────────────────────┐       │
│       MENUS            │       │
├────────────────────────┤       │
│ id (PK)               │───────┘
│ title                 │
│ url                   │
│ icon                  │
│ category              │
│ is_category           │
│ parent_id (FK)        │
│ order_index           │
│ is_active             │
│ created_at            │
│ updated_at            │
└────────────────────────┘


┌────────────────────────┐
│    AUDIT_LOGS          │
├────────────────────────┤
│ id (PK)               │
│ user_id (FK)          │
│ action                │
│ table_name            │
│ record_id             │
│ old_data (JSONB)      │
│ new_data (JSONB)      │
│ ip_address            │
│ user_agent            │
│ created_at            │
└────────────────────────┘
```

### Permissions Yapısı (JSONB)
```json
{
  "users": {
    "view": true,
    "create": true,
    "edit": true,
    "delete": false
  },
  "roles": {
    "view": true,
    "create": false,
    "edit": false,
    "delete": false
  },
  "menus": {
    "view": true,
    "create": false,
    "edit": false,
    "delete": false
  },
  "dashboard": {
    "view": true
  }
}
```

---

## 🔐 Kimlik Doğrulama ve Yetkilendirme Akışı

### 1. Kullanıcı Giriş Akışı (Login Flow)

```
┌─────────────┐
│   CLIENT    │
│ (Browser)   │
└──────┬──────┘
       │
       │ 1. POST /api/auth/login
       │    { email, password }
       ▼
┌─────────────────────────────────────────────┐
│         EXPRESS SERVER                       │
│                                              │
│  ┌────────────────────────────────────┐     │
│  │  Validation Middleware             │     │
│  │  (Joi Schema - loginSchema)        │     │
│  └───────────────┬────────────────────┘     │
│                  │                           │
│                  ▼                           │
│  ┌────────────────────────────────────┐     │
│  │  Auth Route Handler                │     │
│  │  /api/auth/login                   │     │
│  └───────────────┬────────────────────┘     │
│                  │                           │
│                  ▼                           │
│  ┌────────────────────────────────────┐     │
│  │  1. Query User by Email            │     │
│  │  2. Check if user exists           │     │
│  │  3. Check if user is active        │     │
│  │  4. Verify Password (bcrypt)       │     │
│  └───────────────┬────────────────────┘     │
│                  │                           │
│                  ▼                           │
│  ┌────────────────────────────────────┐     │
│  │  Generate JWT Token                │     │
│  │  payload: {                        │     │
│  │    userId, email, role             │     │
│  │  }                                 │     │
│  │  expiry: 24h                       │     │
│  └───────────────┬────────────────────┘     │
│                  │                           │
│                  ▼                           │
│  ┌────────────────────────────────────┐     │
│  │  Update last_login timestamp       │     │
│  │  Insert Audit Log (LOGIN action)   │     │
│  └───────────────┬────────────────────┘     │
│                  │                           │
│                  ▼                           │
│  ┌────────────────────────────────────┐     │
│  │  Set Cookie (auth_token)           │     │
│  │  - httpOnly: true                  │     │
│  │  - secure: production              │     │
│  │  - sameSite: strict                │     │
│  │  - maxAge: 24h                     │     │
│  └───────────────┬────────────────────┘     │
│                  │                           │
└──────────────────┼───────────────────────────┘
                   │
                   │ 2. Response:
                   │    { success: true,
                   │      data: { user, token } }
                   ▼
           ┌─────────────┐
           │   CLIENT    │
           │ (Browser)   │
           │             │
           │ 3. Store:   │
           │ - Cookie    │
           │ - LocalStorage│
           │             │
           │ 4. Redirect:│
           │ /dashboard  │
           └─────────────┘
```

### 2. Authenticated Request Akışı

```
┌─────────────┐
│   CLIENT    │
└──────┬──────┘
       │
       │ 1. GET /api/users
       │    Cookie: auth_token=xxx
       │    or
       │    Authorization: Bearer xxx
       ▼
┌─────────────────────────────────────────────┐
│         EXPRESS SERVER                       │
│                                              │
│  ┌────────────────────────────────────┐     │
│  │  authMiddleware                    │     │
│  │                                    │     │
│  │  1. Extract token from:            │     │
│  │     - Authorization header         │     │
│  │     - Cookie                       │     │
│  └───────────────┬────────────────────┘     │
│                  │                           │
│                  ▼                           │
│  ┌────────────────────────────────────┐     │
│  │  Verify JWT Token                  │     │
│  │  - Check signature                 │     │
│  │  - Check expiration                │     │
│  │  - Decode payload                  │     │
│  └───────────────┬────────────────────┘     │
│                  │                           │
│                  ▼                           │
│  ┌────────────────────────────────────┐     │
│  │  Query User from Database          │     │
│  │  - Get user by decoded userId      │     │
│  │  - Join with roles table           │     │
│  │  - Check is_active status          │     │
│  └───────────────┬────────────────────┘     │
│                  │                           │
│                  ▼                           │
│  ┌────────────────────────────────────┐     │
│  │  Attach user to request            │     │
│  │  req.user = {                      │     │
│  │    id, email, name,                │     │
│  │    role_id, role_name,             │     │
│  │    permissions                     │     │
│  │  }                                 │     │
│  └───────────────┬────────────────────┘     │
│                  │                           │
│                  ▼                           │
│  ┌────────────────────────────────────┐     │
│  │  authorize() Middleware            │     │
│  │  (if permission check needed)      │     │
│  │                                    │     │
│  │  1. Check if super_admin           │     │
│  │     → Allow all                    │     │
│  │  2. Check specific permissions     │     │
│  │     → Match required vs user perms │     │
│  └───────────────┬────────────────────┘     │
│                  │                           │
│                  ▼                           │
│  ┌────────────────────────────────────┐     │
│  │  Route Handler                     │     │
│  │  - Execute business logic          │     │
│  │  - Query database                  │     │
│  │  - Return response                 │     │
│  └───────────────┬────────────────────┘     │
│                  │                           │
└──────────────────┼───────────────────────────┘
                   │
                   │ Response with data
                   ▼
           ┌─────────────┐
           │   CLIENT    │
           └─────────────┘
```

---

## 🌐 Sayfa Yükleme ve Navigasyon Akışı

### Hybrid Layout Yaklaşımı

Proje **Hybrid Layout** yaklaşımını kullanır - MPA (Multi Page Application) ile SPA (Single Page Application) karışımı:

- **Sabit Yapı**: Header, Sidebar, Footer hiç yeniden yüklenmez
- **Dinamik İçerik**: Sadece `main-content` alanı değişir
- **URL Yönetimi**: `window.history.pushState` ile URL güncellenir
- **Menu Cache**: Menüler 5 dakika cache'lenir

### Sayfa Yükleme Akışı

```
┌─────────────────────────────────────────────────────────────┐
│                    İLK SAYFA YÜKLENMESİ                      │
└─────────────────────────────────────────────────────────────┘

1. Kullanıcı → GET /dashboard
       ↓
2. Server → authMiddleware kontrolü
       ↓
3. Server → hybrid-layout.html dosyasını gönder
       ↓
4. Browser → HTML parse et
       ↓
5. Browser → DOMContentLoaded event
       ↓
6. JavaScript → Çalışmaya başlar
       │
       ├─→ loadUserInfo()
       │   └─→ GET /api/auth/me
       │       └─→ Header'a kullanıcı bilgilerini yaz
       │
       ├─→ loadMenus()
       │   └─→ Cache'i kontrol et (5 dakikalık)
       │       ├─→ Cache varsa → Cache'den yükle
       │       └─→ Cache yoksa → GET /api/dashboard/user-menu
       │           └─→ Menüleri sidebar'a render et
       │
       └─→ loadPageContent(currentPage)
           └─→ URL'e göre içerik yükle
               ├─→ /dashboard → loadDashboardContent()
               ├─→ /users → loadUsersContent()
               ├─→ /roles → loadRolesContent()
               └─→ etc...

┌─────────────────────────────────────────────────────────────┐
│              MENÜ LİNKİNE TIKLAMA (Navigation)               │
└─────────────────────────────────────────────────────────────┘

1. Kullanıcı → Menü linkine tıklar
       ↓
2. Event Listener (Event Delegation)
       ↓
3. e.preventDefault() → Sayfa yenilenmesini engelle
       ↓
4. URL'yi al: const url = href
       ↓
5. URL güncelle: window.history.pushState({}, '', url)
       ↓
6. loadPageContent(url)
       │
       ├─→ showLoading() → Yükleme göster
       │
       ├─→ switch (url) {
       │       case '/dashboard': content = await loadDashboardContent()
       │       case '/users': content = await loadUsersContent()
       │       case '/roles': content = await loadRolesContent()
       │       ...
       │   }
       │
       ├─→ document.getElementById('main-content').innerHTML = content
       │
       └─→ initializePageContent()
           └─→ Event delegation setup
           └─→ Form initializations
           └─→ Table initializations

```

### Dinamik İçerik Yükleme Detayı

```javascript
// Örnek: Kullanıcı Yönetimi Sayfası Yükleme

async function loadUsersContent() {
    try {
        // 1. API'den veri çek
        const response = await fetch('/api/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        // 2. HTML şablonu oluştur
        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h4>Kullanıcı Yönetimi</h4>
                            <button id="addUserBtn">Yeni Kullanıcı</button>
                        </div>
                        <div class="card-body">
                            <table id="usersTable">
                                ${data.users.map(user => `
                                    <tr>
                                        <td>${user.name}</td>
                                        <td>${user.email}</td>
                                        <td>
                                            <button class="edit-user-btn" 
                                                    data-id="${user.id}">
                                                Düzenle
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 3. HTML'i döndür
        return html;
        
    } catch (error) {
        return '<div class="alert alert-danger">Hata oluştu</div>';
    }
}

// Event Delegation - Dinamik butonlar için
document.addEventListener('click', function(e) {
    // Yeni kullanıcı butonu
    if (e.target.id === 'addUserBtn') {
        showUserModal();
    }
    
    // Düzenle butonu
    if (e.target.classList.contains('edit-user-btn')) {
        const userId = e.target.dataset.id;
        loadUserForEdit(userId);
    }
});
```

---

## 🔌 API Endpoint'leri ve Veri Akışı

### API Endpoint Listesi

#### 🔐 Authentication Endpoints
| Method | Endpoint | Middleware | Açıklama |
|--------|----------|------------|----------|
| POST | `/api/auth/login` | validateInput(loginSchema) | Kullanıcı girişi |
| POST | `/api/auth/logout` | authMiddleware | Kullanıcı çıkışı |
| GET | `/api/auth/me` | authMiddleware | Kullanıcı bilgilerini getir |

#### 👥 User Management Endpoints
| Method | Endpoint | Middleware | Açıklama |
|--------|----------|------------|----------|
| GET | `/api/users` | authMiddleware | Tüm kullanıcıları listele |
| POST | `/api/users` | authMiddleware, authorize(['users.create']) | Yeni kullanıcı oluştur |
| PUT | `/api/users/:id` | authMiddleware, authorize(['users.edit']) | Kullanıcı güncelle |
| DELETE | `/api/users/:id` | authMiddleware, authorize(['users.delete']) | Kullanıcı sil |

#### 🔐 Role Management Endpoints
| Method | Endpoint | Middleware | Açıklama |
|--------|----------|------------|----------|
| GET | `/api/roles` | authMiddleware | Tüm rolleri listele |
| POST | `/api/roles` | authMiddleware, authorize(['roles.create']) | Yeni rol oluştur |
| PUT | `/api/roles/:id` | authMiddleware, authorize(['roles.edit']) | Rol güncelle |
| DELETE | `/api/roles/:id` | authMiddleware, authorize(['roles.delete']) | Rol sil |

#### 📋 Menu Management Endpoints
| Method | Endpoint | Middleware | Açıklama |
|--------|----------|------------|----------|
| GET | `/api/menus` | authMiddleware | Tüm menüleri listele |
| POST | `/api/menus` | authMiddleware | Yeni menü oluştur |
| PUT | `/api/menus/:id` | authMiddleware | Menü güncelle |
| DELETE | `/api/menus/:id` | authMiddleware | Menü sil |

#### 📊 Dashboard Endpoints
| Method | Endpoint | Middleware | Açıklama |
|--------|----------|------------|----------|
| GET | `/api/dashboard/stats` | authMiddleware | Dashboard istatistikleri |
| GET | `/api/dashboard/user-menu` | authMiddleware | Kullanıcı menüleri (role-based) |
| GET | `/api/dashboard/finans-stats` | authMiddleware | Finans admin stats |

#### ⚙️ Panel Settings Endpoints
| Method | Endpoint | Middleware | Açıklama |
|--------|----------|------------|----------|
| GET | `/api/panel-settings` | authMiddleware (super_admin only) | Panel ayarlarını getir |
| PUT | `/api/panel-settings` | authMiddleware (super_admin only) | Panel ayarlarını güncelle |

### Detaylı Veri Akışı Örneği: Kullanıcı Ekleme

```
┌─────────────────────────────────────────────────────────────┐
│              KULLANICI EKLEME AKIŞI                          │
└─────────────────────────────────────────────────────────────┘

1. CLIENT
   │
   ├─→ Kullanıcı "Yeni Kullanıcı" butonuna tıklar
   │
   ├─→ Modal açılır (Bootstrap Modal)
   │
   ├─→ Form doldurulur:
   │   - name: "Ahmet Yılmaz"
   │   - email: "ahmet@example.com"
   │   - password: "secure123"
   │   - role_id: 2
   │
   └─→ "Kaydet" butonuna tıklar
       │
       ▼
2. JAVASCRIPT (saveUser function)
   │
   ├─→ Form verilerini topla
   │
   ├─→ Client-side validation
   │   - Email format kontrolü
   │   - Şifre uzunluk kontrolü
   │   - Zorunlu alan kontrolü
   │
   └─→ POST /api/users
       Headers: {
         'Content-Type': 'application/json',
         'Authorization': 'Bearer eyJhbGc...'
       }
       Body: {
         name: "Ahmet Yılmaz",
         email: "ahmet@example.com",
         password: "secure123",
         role_id: 2
       }
       │
       ▼
3. SERVER - Middleware Chain
   │
   ├─→ helmet() → Security headers
   │
   ├─→ cors() → CORS policy check
   │
   ├─→ express.json() → Parse JSON body
   │
   ├─→ cookieParser() → Parse cookies
   │
   ├─→ securityCheck → Security validation
   │
   ├─→ authMiddleware
   │   ├─→ Token al ve doğrula
   │   ├─→ Kullanıcı bilgilerini DB'den çek
   │   └─→ req.user'a ekle
   │
   ├─→ authorize(['users.create'])
   │   ├─→ Super admin mı kontrol et → Allow
   │   ├─→ Permission kontrolü yap
   │   └─→ Yetki yoksa 403 Forbidden
   │
   └─→ validateInput(userSchema)
       ├─→ Joi schema ile validate
       ├─→ Email format
       ├─→ Password strength
       └─→ Required fields
       │
       ▼
4. ROUTE HANDLER (/routes/users.js)
   │
   ├─→ Email unique mı kontrol et
   │   SELECT * FROM users WHERE email = ?
   │   └─→ Varsa → 409 Conflict döndür
   │
   ├─→ Şifreyi hash'le (bcrypt)
   │   const hashedPassword = await bcrypt.hash(password, 10)
   │
   ├─→ Transaction başlat
   │   │
   │   ├─→ INSERT INTO users
   │   │   (name, email, password, role_id, is_active)
   │   │   VALUES (?, ?, ?, ?, true)
   │   │
   │   ├─→ Audit log ekle
   │   │   INSERT INTO audit_logs
   │   │   (user_id, action, table_name, new_data)
   │   │
   │   └─→ COMMIT
   │
   └─→ Response:
       {
         success: true,
         message: "Kullanıcı başarıyla oluşturuldu",
         data: { user: { id, name, email, ... } }
       }
       │
       ▼
5. CLIENT
   │
   ├─→ Response alındı
   │
   ├─→ if (response.ok && data.success)
   │   ├─→ Modal kapat
   │   ├─→ Success notification göster
   │   └─→ Kullanıcı listesini yeniden yükle
   │       └─→ loadUsers()
   │
   └─→ else
       └─→ Error notification göster
```

---

## 🛡️ Rol Bazlı Erişim Kontrolü (RBAC)

### Rol Hiyerarşisi

```
┌─────────────────────────────────────────────────────────────┐
│                      ROL HİYERARŞİSİ                         │
└─────────────────────────────────────────────────────────────┘

      ┌─────────────────┐
      │  SUPER_ADMIN    │  ← Full Access (Tüm yetkiler)
      └────────┬────────┘
               │
      ┌────────▼────────┐
      │  FINANS_ADMIN   │  ← Finans modülü full access
      └────────┬────────┘
               │
      ┌────────▼────────┐
      │      ADMIN      │  ← Sınırlı admin yetkileri
      └────────┬────────┘
               │
      ┌────────▼────────┐
      │      USER       │  ← Temel kullanıcı yetkileri
      └─────────────────┘
```

### Yetki Kontrolü Mekanizması

#### 1. **Super Admin**
- Tüm endpoint'lere erişim
- Tüm CRUD operasyonları
- Panel ayarları
- Tüm menüleri görebilir

```javascript
// Örnek: authorize middleware
if (req.user.role_name === 'super_admin') {
    return next(); // Direkt geçiş
}
```

#### 2. **Finans Admin**
- Finans modülü full access
- Finans dashboard
- Borç takip işlemleri
- Ödeme yönetimi

```javascript
// Özel finans kontrolü
if (req.user.role_name !== 'finans_admin' && 
    req.user.role_name !== 'super_admin') {
    return res.status(403).json({ 
        success: false, 
        message: 'Yetkisiz erişim' 
    });
}
```

#### 3. **Diğer Roller**
- Permission tabanlı erişim
- JSONB permissions field'ı kontrol edilir

```javascript
// Permission kontrolü
const userPermissions = req.user.permissions || {};
const hasPermission = permissions.every(permission => {
    const [module, action] = permission.split('.');
    // Örnek: 'users.create' → module='users', action='create'
    return userPermissions[module] && 
           userPermissions[module][action];
});

if (!hasPermission) {
    return res.status(403).json({ 
        success: false, 
        message: 'Bu işlem için yetkiniz yok' 
    });
}
```

### Menü Görünürlüğü Kontrolü

```
┌─────────────────────────────────────────────────────────────┐
│               MENÜ GÖRÜNÜRLÜĞÜbr AKIŞI                        │
└─────────────────────────────────────────────────────────────┘

1. Kullanıcı → GET /api/dashboard/user-menu
       ↓
2. authMiddleware → Kullanıcı bilgilerini al
       ↓
3. Dashboard Route Handler
       │
       ├─→ if (role_name === 'super_admin')
       │   └─→ SELECT * FROM menus WHERE is_active = true
       │       └─→ TÜM menüleri döndür
       │
       └─→ else
           └─→ SELECT menus.*
               FROM menus
               JOIN role_menus ON menus.id = role_menus.menu_id
               WHERE role_menus.role_id = ? 
                 AND role_menus.can_view = true
                 AND menus.is_active = true
               └─→ ROL'e özel menüleri döndür
       ↓
4. Response:
   {
     success: true,
     data: {
       menus: [
         { id: 1, title: "Dashboard", url: "/dashboard", ... },
         { id: 2, title: "Kullanıcılar", url: "/users", ... },
         ...
       ]
     }
   }
       ↓
5. Client → Menüleri sidebar'a render et
```

---

## 🔒 Güvenlik Katmanları

### 1. HTTP Header Security (Helmet)

```javascript
helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            connectSrc: ["'self'", "https://cdn.lordicon.com"],
        },
    },
})
```

**Sağladığı Koruma:**
- XSS (Cross-Site Scripting) koruması
- Clickjacking koruması
- MIME type sniffing koruması
- Güvenli header'lar

### 2. CORS (Cross-Origin Resource Sharing)

```javascript
cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
})
```

**Sağladığı Koruma:**
- Sadece belirtilen origin'lerden isteklere izin
- Credential sharing kontrolü

### 3. Rate Limiting

```javascript
// Development'ta devre dışı
// Production'da:
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 100 // 100 istek limit
});
```

**Sağladığı Koruma:**
- Brute force saldırı koruması
- DDoS koruması
- API abuse engelleme

### 4. Input Validation (Joi)

```javascript
const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});
```

**Sağladığı Koruma:**
- SQL Injection koruması
- Invalid data koruması
- Type safety

### 5. Password Hashing (Bcrypt)

```javascript
// Şifre hash'leme
const hashedPassword = await bcrypt.hash(password, 10);

// Şifre doğrulama
const isValid = await bcrypt.compare(password, hashedPassword);
```

**Sağladığı Koruma:**
- Şifreleri plain text olarak saklamama
- Rainbow table attack koruması

### 6. JWT Token Security

```javascript
const token = jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
);
```

**Sağladığı Koruma:**
- Token expiration
- Signature validation
- Payload encryption

### 7. Cookie Security

```javascript
res.cookie('auth_token', token, {
    httpOnly: true,        // JavaScript erişimi yok
    secure: true,          // Sadece HTTPS (production)
    sameSite: 'strict',    // CSRF koruması
    maxAge: 24 * 60 * 60 * 1000  // 24 saat
});
```

**Sağladığı Koruma:**
- XSS attack koruması (httpOnly)
- CSRF koruması (sameSite)
- Man-in-the-middle koruması (secure)

### 8. Audit Logging

```javascript
await query(
    `INSERT INTO audit_logs 
     (user_id, action, table_name, ip_address, user_agent) 
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, 'LOGIN', null, req.ip, req.get('User-Agent')]
);
```

**Sağladığı Fayda:**
- Tüm işlemler kaydedilir
- Security incident tracking
- Compliance requirements

---

## 📊 Detaylı Akış Diyagramları

### 1. Sistem Geneli - End-to-End Akış

```
┌──────────────────────────────────────────────────────────────┐
│                    KULLANICI JOURNEY                          │
└──────────────────────────────────────────────────────────────┘

BAŞLANGIÇ
    │
    ▼
┌─────────────────┐
│ Kullanıcı       │
│ Tarayıcıyı Açar│
└────────┬────────┘
         │
         ▼
    /dashboard URL'ine git
         │
         ▼
┌─────────────────────────┐
│  Server: authMiddleware │
│  Token var mı?          │
└────────┬────────────────┘
         │
    ┌────┴─────┐
    │          │
 Token        Token
  YOK          VAR
    │          │
    │          ▼
    │    ┌──────────────┐
    │    │ Token Geçerli│
    │    │ mi?          │
    │    └──────┬───────┘
    │           │
    │      ┌────┴─────┐
    │   Geçersiz   Geçerli
    │      │          │
    └──────┴──────────┘
         │            │
         ▼            ▼
    Redirect     hybrid-layout.html
    /signin      gönder
         │            │
         ▼            ▼
    ┌─────────┐  ┌──────────────────┐
    │ Login   │  │ DOMContentLoaded │
    │ Sayfası │  └────────┬─────────┘
    └────┬────┘           │
         │                ▼
         │        ┌───────────────────┐
         │        │ loadUserInfo()    │
         │        └────────┬──────────┘
         │                 │
         │                 ▼
         │        ┌───────────────────┐
         │        │ loadMenus()       │
         │        │ (Cache check)     │
         │        └────────┬──────────┘
         │                 │
         │                 ▼
         │        ┌───────────────────┐
         │        │ loadPageContent() │
         │        │ (Dashboard)       │
         │        └────────┬──────────┘
         │                 │
         │                 ▼
         │        ┌───────────────────┐
         │        │ Dashboard Render  │
         │        │ - Stats cards     │
         │        │ - Recent users    │
         │        │ - Audit logs      │
         │        └────────┬──────────┘
         │                 │
         │                 ▼
         │        ┌───────────────────┐
         │        │ KULLANICI         │
         │        │ SİSTEMİ           │
         │        │ KULLANIYOR        │
         │        └───────────────────┘
         │                 │
         ▼                 ▼
    ┌────────────────────────────┐
    │ Email & Password gir       │
    └──────────┬─────────────────┘
               │
               ▼
    POST /api/auth/login
               │
        ┌──────┴──────┐
        │             │
    Başarısız      Başarılı
        │             │
        ▼             ▼
   Error Msg    Token al ve
   göster       Cookie set et
        │             │
        └─────────────┘
                │
                ▼
         Redirect /dashboard
```

### 2. CRUD Operations Akışı

```
┌──────────────────────────────────────────────────────────────┐
│           CRUD OPERATIONS - GENERİK AKIŞ                      │
└──────────────────────────────────────────────────────────────┘

┌───────────────┐
│   CREATE      │
└───────┬───────┘
        │
        ├─→ Client: Form doldur
        │
        ├─→ Validation (Client-side)
        │
        ├─→ POST /api/resource
        │   └─→ Middleware: authMiddleware
        │   └─→ Middleware: authorize()
        │   └─→ Middleware: validateInput(schema)
        │
        ├─→ Route Handler:
        │   ├─→ Business logic
        │   ├─→ Unique check (if needed)
        │   ├─→ Data transformation
        │   └─→ INSERT query
        │
        ├─→ Response: { success, data }
        │
        └─→ Client: Refresh list


┌───────────────┐
│   READ        │
└───────┬───────┘
        │
        ├─→ Client: Sayfa yükle veya refresh
        │
        ├─→ GET /api/resource
        │   └─→ Middleware: authMiddleware
        │   └─→ Middleware: authorize() (optional)
        │
        ├─→ Route Handler:
        │   ├─→ Query params parse (filter, sort, page)
        │   ├─→ SELECT query with joins
        │   └─→ Pagination logic
        │
        ├─→ Response: { success, data, meta }
        │
        └─→ Client: Render table/list


┌───────────────┐
│   UPDATE      │
└───────┬───────┘
        │
        ├─→ Client: Edit butonuna tıkla
        │
        ├─→ GET /api/resource/:id (Mevcut veriyi getir)
        │   └─→ Modal'a populate et
        │
        ├─→ Client: Form düzenle
        │
        ├─→ Validation (Client-side)
        │
        ├─→ PUT /api/resource/:id
        │   └─→ Middleware: authMiddleware
        │   └─→ Middleware: authorize()
        │   └─→ Middleware: validateInput(schema)
        │
        ├─→ Route Handler:
        │   ├─→ Resource exists mi kontrol et
        │   ├─→ Unique check (email, etc.)
        │   ├─→ UPDATE query
        │   └─→ Audit log
        │
        ├─→ Response: { success, data }
        │
        └─→ Client: Refresh list, close modal


┌───────────────┐
│   DELETE      │
└───────┬───────┘
        │
        ├─→ Client: Delete butonuna tıkla
        │
        ├─→ Confirmation dialog
        │
        ├─→ DELETE /api/resource/:id
        │   └─→ Middleware: authMiddleware
        │   └─→ Middleware: authorize()
        │
        ├─→ Route Handler:
        │   ├─→ Resource exists mi kontrol et
        │   ├─→ Dependency check (cascade kontrolü)
        │   ├─→ Soft delete veya hard delete
        │   │   └─→ Soft: UPDATE is_active = false
        │   │   └─→ Hard: DELETE FROM table
        │   └─→ Audit log
        │
        ├─→ Response: { success, message }
        │
        └─→ Client: Refresh list, show notification
```

### 3. Menü Sistemi - Dinamik Yükleme

```
┌──────────────────────────────────────────────────────────────┐
│              MENÜ SİSTEMİ - DİNAMİK YÜKLEME                   │
└──────────────────────────────────────────────────────────────┘

SAYFA YÜKLENİRKEN:
    │
    ▼
loadMenus() fonksiyonu çalışır
    │
    ▼
Cache kontrolü
    │
    ├─────────────────────┬─────────────────────┐
    │                     │                     │
 Cache VAR           Cache YOK            Cache ESKİ
 (5 dk içinde)       (İlk yükleme)       (5 dk geçti)
    │                     │                     │
    ▼                     ▼                     ▼
localStorage'dan     API'ye istek         API'ye istek
yükle                     │                     │
    │                     │                     │
    │                     ▼                     ▼
    │            GET /api/dashboard/user-menu
    │                     │
    │                     ▼
    │            ┌─────────────────────────────┐
    │            │  Server: Dashboard Route    │
    │            └────────────┬────────────────┘
    │                         │
    │                    ┌────┴─────┐
    │                    │          │
    │              super_admin    Diğer
    │                    │          │
    │                    ▼          ▼
    │            SELECT * FROM   SELECT menus.*
    │            menus WHERE     FROM menus
    │            is_active=true  JOIN role_menus
    │                    │       WHERE role_id=?
    │                    │       AND can_view=true
    │                    │          │
    │                    └──────────┘
    │                         │
    │                         ▼
    │                  Response: { menus: [...] }
    │                         │
    │                         ▼
    │            Cache'e kaydet (localStorage)
    │            - menuCache (data)
    │            - menuCacheTime (timestamp)
    │                         │
    └─────────────────────────┘
                  │
                  ▼
         Menüleri kategorilere ayır
                  │
         ┌────────┴────────┐
         │                 │
    Kategoriler    Kategorisiz Menüler
         │                 │
         ▼                 ▼
    ┌─────────────────────────────┐
    │  Dashboard                  │
    │  ├─ Ana Sayfa               │
    │                             │
    │  Admin İşlemleri            │
    │  ├─ Kullanıcı Yönetimi      │
    │  ├─ Rol Yönetimi            │
    │  └─ Menü Yönetimi           │
    │                             │
    │  Finans                     │
    │  ├─ Borç Takip              │
    │  └─ Ödemeler                │
    └─────────────────────────────┘
                  │
                  ▼
         Sidebar'a render et (HTML)
```

---

## 🔄 İş Akışları (Business Flows)

### 1. Yeni Kullanıcı Ekleme İş Akışı

```
SENARYO: Admin yeni bir kullanıcı ekliyor

1. ┌──────────────────────┐
   │ Admin Dashboard'da   │
   └──────────┬───────────┘
              │
              ▼
2. "Kullanıcılar" menüsüne tıklar
              │
              ▼
3. /users sayfası yüklenir
   - loadUsersContent() çalışır
   - GET /api/users → Mevcut kullanıcılar listelenir
              │
              ▼
4. "Yeni Kullanıcı" butonuna tıklar
              │
              ▼
5. Modal açılır (Bootstrap)
   - Rol listesi yüklenir
   - GET /api/roles
              │
              ▼
6. Formu doldurur:
   ┌────────────────────────────┐
   │ Ad: Ahmet Yılmaz          │
   │ Email: ahmet@example.com  │
   │ Şifre: ********           │
   │ Rol: Admin                │
   └────────────┬───────────────┘
                │
                ▼
7. "Kaydet" butonuna tıklar
                │
                ▼
8. saveUser() fonksiyonu çalışır
   ├─→ Client-side validation
   ├─→ POST /api/users
   │   └─→ Body: { name, email, password, role_id }
                │
                ▼
9. SERVER - Middleware Chain
   ├─→ authMiddleware (Token kontrol)
   ├─→ authorize(['users.create'])
   └─→ validateInput(userSchema)
                │
                ▼
10. Route Handler (/routes/users.js)
    ├─→ Email unique mi?
    │   └─→ Değilse → 409 Conflict
    │
    ├─→ Şifreyi hash'le
    │   └─→ bcrypt.hash(password, 10)
    │
    ├─→ Transaction başlat
    │   ├─→ INSERT INTO users
    │   ├─→ INSERT INTO audit_logs
    │   └─→ COMMIT
    │
    └─→ Response: { success: true, data: user }
                │
                ▼
11. CLIENT
    ├─→ Modal kapat
    ├─→ Success notification
    │   └─→ "Kullanıcı başarıyla oluşturuldu"
    │
    └─→ Listeyi yenile
        └─→ loadUsers() tekrar çalışır
                │
                ▼
12. ┌──────────────────────────────┐
    │ Yeni kullanıcı listede       │
    │ görünür                      │
    └──────────────────────────────┘
```

### 2. Rol İzinlerini Güncelleme İş Akışı

```
SENARYO: Super Admin bir rolün izinlerini güncelliyor

1. Super Admin → Rol Yönetimi sayfası (/roles)
              │
              ▼
2. loadRolesContent() çalışır
   - GET /api/roles
   - Mevcut roller listelenir
              │
              ▼
3. Bir rolün "Düzenle" butonuna tıklar
   - Örnek: "Admin" rolü
              │
              ▼
4. loadRoleForEdit(roleId) çalışır
   - GET /api/roles/:id
   - Modal'a mevcut veriler yüklenir
              │
              ▼
5. Modal açılır:
   ┌─────────────────────────────────┐
   │ Rol Adı: Admin                 │
   │ Görünen Ad: Yönetici           │
   │                                │
   │ İzinler:                       │
   │ ┌─────────────────────────┐   │
   │ │ Users Modülü:           │   │
   │ │ [✓] Görüntüle          │   │
   │ │ [✓] Oluştur            │   │
   │ │ [✓] Düzenle            │   │
   │ │ [ ] Sil                │   │  ← Sil yetkisini ekliyor
   │ │                         │   │
   │ │ Roles Modülü:           │   │
   │ │ [✓] Görüntüle          │   │
   │ │ [ ] Oluştur            │   │
   │ └─────────────────────────┘   │
   └─────────────────────────────────┘
              │
              ▼
6. "Sil" checkbox'ına tıklar
   - Permission object güncellenir
   {
     users: {
       view: true,
       create: true,
       edit: true,
       delete: true  ← Değişti
     },
     roles: {
       view: true,
       create: false,
       edit: false,
       delete: false
     }
   }
              │
              ▼
7. "Kaydet" butonuna tıklar
              │
              ▼
8. updateRole() fonksiyonu
   - PUT /api/roles/:id
   - Body: { name, display_name, permissions }
              │
              ▼
9. SERVER
   ├─→ authMiddleware
   ├─→ authorize(['roles.edit'])
   │   └─→ Super admin kontrolü
   │
   └─→ Route Handler:
       ├─→ Rol exists mi?
       ├─→ Audit log (old_data vs new_data)
       ├─→ UPDATE roles SET permissions = ?
       └─→ Response: { success: true }
              │
              ▼
10. CLIENT
    ├─→ Modal kapat
    ├─→ Success notification
    └─→ Listeyi yenile
              │
              ▼
11. ┌─────────────────────────────────┐
    │ Artık "Admin" rolüne sahip     │
    │ kullanıcılar "users.delete"    │
    │ yetkisine sahip oldu           │
    └─────────────────────────────────┘
```

---

## 📁 Dosya Organizasyonu ve Sorumluluklar

```
RBUMS-NodeJS/
│
├── server.js                    # Ana sunucu - Route tanımları
│   └─→ Express app başlatma
│   └─→ Middleware setup
│   └─→ Static file serving
│   └─→ HTML route'ları
│
├── config/
│   └── database.js             # PostgreSQL bağlantı yönetimi
│       └─→ Connection pool
│       └─→ Query wrapper
│       └─→ Transaction support
│
├── middleware/
│   ├── auth.js                 # Kimlik doğrulama
│   │   ├─→ authMiddleware (JWT verify)
│   │   ├─→ authorize (Permission check)
│   │   └─→ checkMenuAccess (Menu access)
│   │
│   ├── validation.js           # Input validation
│   │   ├─→ Joi schemas
│   │   └─→ validateInput middleware
│   │
│   └── rateLimiter.js         # Rate limiting
│       └─→ generalLimiter
│       └─→ loginLimiter
│
├── routes/
│   ├── auth.js                # Authentication endpoints
│   │   ├─→ POST /login
│   │   ├─→ POST /logout
│   │   └─→ GET /me
│   │
│   ├── users.js               # User management
│   │   ├─→ GET, POST, PUT, DELETE /users
│   │
│   ├── roles.js               # Role management
│   │   ├─→ GET, POST, PUT, DELETE /roles
│   │
│   ├── menus.js               # Menu management
│   │   ├─→ GET, POST, PUT, DELETE /menus
│   │
│   ├── dashboard.js           # Dashboard data
│   │   ├─→ GET /stats
│   │   ├─→ GET /user-menu
│   │   └─→ GET /finans-stats
│   │
│   └── panel-settings.js     # Panel settings
│       └─→ GET, PUT /panel-settings
│
├── utils/
│   ├── encryption.js          # Crypto işlemleri
│   │   ├─→ Password hashing (bcrypt)
│   │   ├─→ JWT token generation
│   │   └─→ JWT token verification
│   │
│   └── logger.js              # Logging (Winston)
│       └─→ info, error, debug logs
│
├── scripts/
│   ├── migrate.js             # Database migrations
│   └── seed.js                # Initial data seeding
│
├── public/                    # Static files
│   └── (Frontend assets)
│
├── assets/                    # Theme assets
│   ├── css/
│   ├── js/
│   ├── images/
│   └── libs/
│
├── layouts/                   # Layout components
│   ├── header.html
│   ├── sidebar.html
│   └── footer.html
│
├── logs/                      # Log files
│   ├── app.log
│   └── error.log
│
├── hybrid-layout.html         # Ana layout (SPA-like)
├── auth-signin-basic.html     # Login sayfası
├── pages-*.html               # Diğer standalone sayfalar
│
├── package.json               # Dependencies
├── .env                       # Environment variables
└── .gitignore                 # Git ignore rules
```

---

## 🚀 Deployment ve Production Hazırlık

### Environment Variables (.env)

```bash
# Server Configuration
NODE_ENV=production
PORT=3000
BASE_PATH=

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=borc_takip_sistemi
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_SSL=true

# JWT Configuration
JWT_SECRET=your_very_secure_random_secret_key_here
JWT_EXPIRES_IN=24h

# Security
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Session
SESSION_SECRET=your_session_secret

# Logging
LOG_LEVEL=info
```

### Production Checklist

- [ ] Environment variables set
- [ ] HTTPS enabled
- [ ] Rate limiting enabled
- [ ] Database SSL enabled
- [ ] Strong JWT secret
- [ ] CSP headers configured
- [ ] CORS properly configured
- [ ] Helmet security headers
- [ ] Logging configured (Winston)
- [ ] Database backups scheduled
- [ ] Error monitoring (Sentry, etc.)
- [ ] Performance monitoring
- [ ] Load balancing (if needed)

---

## 📈 Performans Optimizasyonları

### 1. Database Query Optimization
- Connection pooling (max: 20)
- Index'ler (email, role_id, etc.)
- Query caching
- Pagination

### 2. Client-side Caching
- Menu cache (5 dakika)
- LocalStorage kullanımı
- Session storage

### 3. Response Compression
- Gzip compression middleware
- Asset minification

### 4. Lazy Loading
- Dinamik content loading
- On-demand module loading

---

## 🎓 Sonuç ve Öneriler

### Projenin Güçlü Yönleri
✅ Güçlü güvenlik katmanları (Helmet, CORS, JWT, etc.)
✅ Rol bazlı erişim kontrolü (RBAC)
✅ Hybrid layout ile hızlı sayfa geçişleri
✅ Dinamik menü sistemi
✅ Audit logging
✅ Modern JavaScript (ES6+)
✅ PostgreSQL ile güvenilir veri yönetimi

### Geliştirme Önerileri
🔸 **Testing**: Unit test ve integration test eklenebilir (Jest)
🔸 **TypeScript**: Type safety için TypeScript'e geçilebilir
🔸 **API Documentation**: Swagger/OpenAPI dokümantasyonu
🔸 **Real-time**: WebSocket ile real-time özellikler
🔸 **Caching**: Redis ile advanced caching
🔸 **Monitoring**: APM araçları (New Relic, Datadog)
🔸 **CI/CD**: GitHub Actions ile otomatik deployment
🔸 **Docker**: Containerization

---

**Dokümantasyon Versiyonu:** 1.0  
**Son Güncelleme:** 2025-01-15  
**Hazırlayan:** AI Assistant  
**Durum:** ✅ Aktif ve Güncel


