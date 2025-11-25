# 🏗️ Menü Yapısı ve Sayfa Çalışma Mantığı

Bu dokümantasyon, borç takip sisteminin menü yapısı ve sayfa çalışma mantığını detaylı olarak açıklar.

## 🎯 Sistem Mimarisi

### **Hybrid Layout Yaklaşımı**
Sistemimiz **hybrid yaklaşım** kullanıyor - MPA'nın kararlılığı ile SPA'nın dinamikliğini birleştiriyor:

- **Sabit Yapı**: Header, sidebar, footer hiç değişmiyor
- **Dinamik İçerik**: Sadece `main-content` alanı değişiyor
- **URL Yönetimi**: `window.history.pushState` ile URL güncelleniyor
- **Cache Sistemi**: Menüler 5 dakika cache'leniyor

## 📋 Menü Kategori Sistemi

### **Mevcut Kategoriler**
```
📁 Admin İşlemleri
  ├── 👥 Kullanıcı Yönetimi (/users)
  ├── 🔐 Rol Yönetimi (/roles)  
  └── 📋 Menü Yönetimi (/menus)

📁 Dashboard
  └── 🏠 Ana Sayfa (/dashboard)
```

### **Menü Veritabanı Yapısı**
```sql
CREATE TABLE menus (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    url VARCHAR(255),
    icon VARCHAR(50),
    category VARCHAR(100),
    is_category BOOLEAN DEFAULT false,
    parent_id INTEGER REFERENCES menus(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_menu_title_url UNIQUE (title, url)
);
```

## 🔧 Teknik Yapı

### **Backend (Node.js + PostgreSQL)**
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Authorization**: Role-based access control (RBAC)
- **Security**: Helmet, CORS, Rate Limiting
- **Validation**: Joi schemas

### **Frontend (Hybrid Layout)**
- **Ana Dosya**: `hybrid-layout.html`
- **Event Management**: Event delegation
- **UI Framework**: Bootstrap 5
- **Icons**: Remix Icons
- **Caching**: Client-side menu caching

## 🚀 Sayfa Çalışma Mantığı

### **1. Sayfa Yükleme Süreci**
```javascript
// 1. Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    // 2. Kullanıcı bilgilerini yükle
    loadUserInfo();
    
    // 3. Menüleri yükle (cache'den veya API'den)
    loadMenus();
    
    // 4. Sayfa özel fonksiyonları
    initializePage();
});
```

### **2. Menü Navigasyonu**
```javascript
// Menü linkine tıklandığında
document.addEventListener('click', function(e) {
    if (e.target.closest('.menu-link')) {
        e.preventDefault();
        const url = e.target.closest('.menu-link').getAttribute('href');
        
        // URL'yi güncelle
        window.history.pushState({}, '', url);
        
        // İçeriği yükle
        loadPageContent(url);
    }
});
```

### **3. Dinamik İçerik Yükleme**
```javascript
async function loadPageContent(page) {
    try {
        // Loading state göster
        showLoading();
        
        // Sayfa içeriğini yükle
        const content = await fetchPageContent(page);
        
        // İçeriği DOM'a ekle
        document.getElementById('main-content').innerHTML = content;
        
        // Sayfa özel fonksiyonları çalıştır
        initializePageContent();
        
    } catch (error) {
        console.error('Sayfa yükleme hatası:', error);
        showError('Sayfa yüklenemedi');
    }
}
```

## 📁 Dosya Yapısı

### **Ana Dosyalar**
```
RBUMS-NodeJS/
├── hybrid-layout.html          # Ana layout dosyası
├── server.js                   # Express server
├── package.json                # Dependencies
├── .env                        # Environment variables
├── config/
│   └── database.js            # PostgreSQL config
├── middleware/
│   ├── auth.js                # JWT authentication
│   ├── validation.js          # Input validation
│   └── rateLimiter.js         # Rate limiting
├── routes/
│   ├── auth.js                # Authentication routes
│   ├── users.js               # User management
│   ├── roles.js               # Role management
│   ├── menus.js               # Menu management
│   ├── dashboard.js           # Dashboard data
│   └── panel-settings.js      # Panel settings (logo, text)
├── utils/
│   ├── encryption.js          # Data encryption
│   └── logger.js              # Logging
├── scripts/
│   ├── migrate.js             # Database migrations
│   └── seed.js                # Initial data
└── docs/                       # Dokümantasyon
    ├── PROJE-CALISMA-MANTIGI-VE-AKIS-DIYAGRAMI.md
    ├── MENU-YAPISI-VE-SAYFA-MANTIGI.md
    ├── ROL-SECIMI-SORUNU-COZUMU.md
    ├── SAYFA-SABLONU-KULLANIMI.md
    └── VAKIFBANK_ENTEGRASYON_DÖKÜMANI.md
```

### **Frontend Dosyalar**
```
assets/
├── css/                       # Stylesheets
├── js/
│   └── common.js             # Shared functions
├── images/                   # Images
└── libs/                     # Third-party libraries
```

## 🔄 API Endpoints

### **Authentication**
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/logout` - Kullanıcı çıkışı
- `GET /api/auth/me` - Kullanıcı bilgileri

### **User Management**
- `GET /api/users` - Kullanıcı listesi
- `POST /api/users` - Yeni kullanıcı
- `PUT /api/users/:id` - Kullanıcı güncelle
- `DELETE /api/users/:id` - Kullanıcı sil

### **Role Management**
- `GET /api/roles` - Rol listesi
- `POST /api/roles` - Yeni rol
- `PUT /api/roles/:id` - Rol güncelle
- `DELETE /api/roles/:id` - Rol sil

### **Menu Management**
- `GET /api/menus` - Menü listesi
- `POST /api/menus` - Yeni menü
- `PUT /api/menus/:id` - Menü güncelle
- `DELETE /api/menus/:id` - Menü sil

### **Dashboard**
- `GET /api/dashboard/stats` - İstatistikler
- `GET /api/dashboard/user-menu` - Kullanıcı menüleri

## 🎨 UI Bileşenleri

### **Header Bileşenleri**
- **Logo**: Dinamik logo değişimi
- **Search**: Arama butonu
- **Notifications**: Bildirimler
- **Fullscreen**: Tam ekran
- **Dark/Light Mode**: Tema değiştirme
- **User Menu**: Kullanıcı menüsü

### **Sidebar Bileşenleri**
- **Menu Categories**: Kategori başlıkları
- **Menu Items**: Menü öğeleri
- **Collapse**: Sidebar gizleme
- **Active State**: Aktif menü gösterimi

### **Content Area**
- **Dynamic Loading**: Dinamik içerik yükleme
- **Loading States**: Yükleme göstergeleri
- **Error Handling**: Hata yönetimi

## 🔒 Güvenlik Özellikleri

### **Authentication**
- JWT token tabanlı kimlik doğrulama
- Token expiration kontrolü
- Automatic logout on token expiry

### **Authorization**
- Role-based access control (RBAC)
- Permission-based menu visibility
- API endpoint protection

### **Input Validation**
- Joi schema validation
- SQL injection protection
- XSS protection
- CSRF protection

### **Rate Limiting**
- API endpoint rate limiting
- Login attempt limiting
- General request limiting

## 📱 Responsive Tasarım

### **Breakpoints**
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### **Responsive Features**
- Collapsible sidebar
- Mobile-friendly navigation
- Responsive tables
- Adaptive layouts

## 🚀 Yeni Sayfa Ekleme Süreci

### **1. Backend Hazırlığı**
```javascript
// routes/yeni-sayfa.js oluştur
const express = require('express');
const router = express.Router();
const { authMiddleware, authorize } = require('../middleware/auth');
const { validateInput } = require('../middleware/validation');

// GET endpoint
router.get('/', authMiddleware, authorize(['admin']), async (req, res) => {
    try {
        // Veri çekme logic'i
        const data = await getData();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST endpoint
router.post('/', authMiddleware, authorize(['admin']), validateInput(schema), async (req, res) => {
    try {
        // Veri kaydetme logic'i
        const result = await saveData(req.body);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
```

### **2. Frontend Entegrasyonu**
```javascript
// hybrid-layout.html'e ekle:

// 1. loadYeniSayfaContent() fonksiyonu
async function loadYeniSayfaContent() {
    try {
        const response = await fetch('/api/yeni-sayfa');
        const data = await response.json();
        
        if (data.success) {
            return `
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h4 class="card-title mb-0">Yeni Sayfa</h4>
                            </div>
                            <div class="card-body">
                                <!-- İçerik buraya -->
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Hata:', error);
        return '<div class="alert alert-danger">Sayfa yüklenemedi</div>';
    }
}

// 2. CRUD JavaScript fonksiyonları
function showYeniSayfaModal() {
    // Modal gösterme logic'i
}

function saveYeniSayfa() {
    // Kaydetme logic'i
}

function deleteYeniSayfa(id) {
    // Silme logic'i
}

// 3. Event delegation listeners
document.addEventListener('click', function(e) {
    if (e.target.id === 'addYeniSayfaBtn') {
        showYeniSayfaModal();
    }
    if (e.target.classList.contains('edit-yeni-sayfa-btn')) {
        const id = e.target.dataset.id;
        loadYeniSayfaForEdit(id);
    }
    if (e.target.classList.contains('delete-yeni-sayfa-btn')) {
        const id = e.target.dataset.id;
        deleteYeniSayfa(id);
    }
});
```

### **3. Menü Sistemi Entegrasyonu**
```sql
-- Veritabanına yeni menü ekle
INSERT INTO menus (name, url, icon, category, order_index, required_permissions) 
VALUES ('Yeni Sayfa', '/yeni-sayfa', 'ri-file-text-line', 'Admin İşlemleri', 4, '["admin"]');
```

### **4. URL Routing**
```javascript
// server.js'e route ekle
app.get('/yeni-sayfa', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'hybrid-layout.html'));
});
```

## ⚠️ Kritik Noktalar

### **Event Delegation**
- Tüm butonlar için `document.addEventListener` kullan
- Inline event handlers kullanma (CSP uyumluluğu için)
- Dynamic content için event delegation gerekli

### **Modal Yönetimi**
- Bootstrap modals kullan
- Modal state management
- Form validation

### **Cache Sistemi**
- Menü cache'ini güncelle
- Cache invalidation
- Performance optimization

### **URL Consistency**
- Her sayfa için tutarlı URL yapısı
- Browser history management
- Back/forward navigation

### **Error Handling**
- Try-catch blokları
- User feedback
- Graceful degradation

## 🔍 Debugging ve Troubleshooting

### **Console Logs**
```javascript
// Debug için console.log kullan
console.log('Function called:', functionName);
console.log('Data received:', data);
console.log('Error occurred:', error);
```

### **Network Monitoring**
- Browser DevTools Network sekmesi
- API response monitoring
- Request/response timing

### **Common Issues**
1. **Menü görünmüyor**: Cache temizle, API kontrol et
2. **Butonlar çalışmıyor**: Event delegation kontrol et
3. **Modal açılmıyor**: Bootstrap JS yüklü mü kontrol et
4. **API hataları**: Token geçerli mi, permissions doğru mu

## 📈 Performance Optimization

### **Caching Strategy**
- Menu caching (5 dakika)
- API response caching
- Static asset caching

### **Lazy Loading**
- Dynamic content loading
- Image lazy loading
- Component lazy loading

### **Code Splitting**
- Route-based code splitting
- Component-based splitting
- Dynamic imports

## 🚀 Gelecek Geliştirmeler

### **Planned Features**
- Real-time notifications
- Advanced search functionality
- Data export/import
- Audit logging
- Multi-language support

### **Technical Improvements**
- Service worker implementation
- Progressive Web App features
- Advanced caching strategies
- Performance monitoring

---

**Not**: Bu dokümantasyon, sistemin mevcut durumunu yansıtır ve sürekli güncellenmelidir. Yeni özellikler eklendikçe bu dokümantasyon da güncellenmelidir.




