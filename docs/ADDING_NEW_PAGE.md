# Yeni Sayfa Ekleme Rehberi

RBUMS-NodeJS **modüler sayfa sistemi** ve **catch-all routing** kullandığı için yeni sayfa eklemek son derece basit!

**Backend'de hiçbir değişiklik gerekmez.** Sadece `assets/pages/` klasörüne yeni bir modül ekleyin.

## 🚀 Hızlı Başlangıç (2 Adım)

### 1. Sayfa Modülünü Oluştur

`assets/pages/` klasöründe yeni bir `.js` dosyası oluşturun:

```javascript
// assets/pages/customers.js
/**
 * Müşteri Yönetimi Sayfası
 */

export async function loadContent() {
    try {
        // API'den veri çek (opsiyonel)
        const response = await fetch('/api/customers', {
            credentials: 'include'
        });
        const data = await response.json();

        const customers = data.success ? data.data.customers : [];

        // HTML içeriği oluştur
        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <h4 class="card-title mb-0">
                                    <i class="ri-user-3-line me-2"></i>
                                    Müşteri Yönetimi
                                </h4>
                                <button class="btn btn-primary" id="addCustomerBtn">
                                    <i class="ri-add-line me-1"></i>
                                    Yeni Müşteri
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div id="customersTable">
                                ${customers.length === 0 ? 
                                    '<p class="text-muted text-center">Henüz müşteri bulunmamaktadır</p>' :
                                    customers.map(customer => `
                                        <div class="border-bottom p-3">
                                            <h6>${customer.name}</h6>
                                            <p class="text-muted mb-0">${customer.email}</p>
                                        </div>
                                    `).join('')
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return {
            html: html,
            title: 'Müşteri Yönetimi'
        };

    } catch (error) {
        console.error('Sayfa yükleme hatası:', error);
        return {
            html: '<div class="alert alert-danger">Sayfa yüklenirken hata oluştu!</div>',
            title: 'Hata'
        };
    }
}

// Opsiyonel: Sayfa yüklendikten sonra çalışacak kod
export function init() {
    // Event listener'ları ekle
    const addBtn = document.getElementById('addCustomerBtn');
    if (addBtn && !addBtn.dataset.listenerAdded) {
        addBtn.dataset.listenerAdded = 'true';
        addBtn.addEventListener('click', () => {
            // Modal aç veya işlem yap
            console.log('Yeni müşteri ekle');
        });
    }
}
```

### 2. Menüye Ekle (Opsiyonel)

Eğer sayfa menüde görünecekse veritabanına menü ekleyin:

```sql
INSERT INTO menus (title, url, icon, category, is_category, order_index)
VALUES ('Müşteri Yönetimi', '/customers', 'ri-user-3-line', 'Yönetim', false, 10);
```

**VEYA** Frontend'den menü yönetimi sayfasından (`/menus`) ekleyin.

**TAMAMDIR!** 🎉

Artık:
- ✅ `/customers` URL'i çalışıyor
- ✅ F5 refresh çalışıyor
- ✅ Menüde görünüyor (eklediyseniz)
- ✅ Sayfa otomatik yükleniyor

---

## 🎯 Önemli Noktalar

### ✅ Backend Route Eklemek GEREKMEZ

**ESKİ YOL (Artık gerekli değil!):**
```javascript
// ❌ Bunu yapmanıza gerek YOK!
app.get('/customers', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'hybrid-layout.html'));
});
```

**YENİ YOL:**
```javascript
// ✅ Catch-all route otomatik hallediyor!
// Hiçbir şey yapmanıza gerek yok!
```

### ✅ Switch-Case Eklemek GEREKMEZ

**ESKİ YOL (Artık gerekli değil!):**
```javascript
// ❌ Bunu yapmanıza gerek YOK!
switch(page) {
    case 'customers':
        content = await loadCustomersContent();
        break;
}
```

**YENİ YOL:**
```javascript
// ✅ Page loader otomatik olarak assets/pages/customers.js'i yükler!
// Hiçbir şey yapmanıza gerek yok!
```

### ✅ F5 Refresh Otomatik Çalışır

Catch-all route sayesinde:
- ✅ `/customers` URL'ine direkt erişim çalışır
- ✅ F5 ile refresh çalışır
- ✅ Browser back/forward çalışır
- ✅ Bookmark yapılabilir

---

## 📦 Örnek: Tam Bir Sayfa Eklemek

### Senaryo: "İşler" (Jobs) sayfası eklemek istiyoruz

#### 1. Sayfa modülünü oluştur:

```javascript
// assets/pages/jobs.js
export async function loadContent() {
    try {
        const response = await fetch('/api/jobs', {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.success) {
            const jobs = data.data.jobs;

            return {
                html: `
                    <div class="row">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-header">
                                    <h4 class="card-title mb-0">İş Listesi</h4>
                                </div>
                                <div class="card-body">
                                    <table class="table">
                                        <thead>
                                            <tr>
                                                <th>İş No</th>
                                                <th>Müşteri</th>
                                                <th>Tarih</th>
                                                <th>Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${jobs.map(job => `
                                                <tr>
                                                    <td>${job.job_number}</td>
                                                    <td>${job.customer_name}</td>
                                                    <td>${new Date(job.created_at).toLocaleDateString('tr-TR')}</td>
                                                    <td>
                                                        <span class="badge bg-${job.status === 'completed' ? 'success' : 'warning'}">
                                                            ${job.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                `,
                title: 'İş Takibi'
            };
        }
    } catch (error) {
        console.error('Jobs page error:', error);
        return {
            html: '<div class="alert alert-danger">İşler yüklenirken hata oluştu</div>',
            title: 'Hata'
        };
    }
}

export function init() {
    console.log('Jobs page initialized');
}
```

#### 2. Menüye ekle (SQL veya UI):

```sql
INSERT INTO menus (title, url, icon, category, is_category, order_index)
VALUES ('İş Takibi', '/jobs', 'ri-file-list-3-line', 'İşlemler', false, 20);
```

#### 3. Backend API ekle (gerekirse):

```javascript
// routes/jobs.js
const express = require('express');
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const result = await query(`
            SELECT j.*, c.name as customer_name
            FROM jobs j
            LEFT JOIN customers c ON c.id = j.customer_id
            ORDER BY j.created_at DESC
        `);

        res.json({
            success: true,
            data: { jobs: result.rows }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Sunucu hatası',
            error: error.message 
        });
    }
});

module.exports = router;
```

```javascript
// server.js'e ekle
const jobRoutes = require('./routes/jobs');
app.use('/api/jobs', authMiddleware, jobRoutes);
```

**TAMAMDIR!** 🎉

Artık:
- ✅ `/jobs` URL'i çalışıyor
- ✅ F5 refresh çalışıyor
- ✅ Menüde görünüyor
- ✅ API korumalı

---

## 🚀 Best Practices

### 1. Modül Yapısı

Her sayfa modülü şu yapıya sahip olmalı:

```javascript
/**
 * Sayfa Başlığı
 * Kısa açıklama
 */

export async function loadContent() {
    try {
        // API çağrısı veya statik içerik
        const html = `...`;
        
        return {
            html: html,
            title: 'Sayfa Başlığı'
        };
    } catch (error) {
        console.error('Load error:', error);
        return {
            html: '<div class="alert alert-danger">Hata oluştu!</div>',
            title: 'Hata'
        };
    }
}

// Opsiyonel: Event listener'lar ve init işlemleri
export function init() {
    // Sayfa yüklendikten sonra çalışacak kod
}
```

### 2. Error Handling

Her sayfa kendi hatasını handle etmeli:

```javascript
export async function loadContent() {
    try {
        // ... sayfa kodu
    } catch (error) {
        console.error('Page error:', error);
        return {
            html: '<div class="alert alert-danger">Hata: ' + escapeHtml(error.message) + '</div>',
            title: 'Hata'
        };
    }
}
```

### 3. Event Listener Yönetimi

Event listener'ları tekrar eklememek için `dataset.listenerAdded` kontrolü yapın:

```javascript
export function init() {
    const btn = document.getElementById('myButton');
    if (btn && !btn.dataset.listenerAdded) {
        btn.dataset.listenerAdded = 'true';
        btn.addEventListener('click', () => {
            // İşlem
        });
    }
}
```

### 4. API Endpoint Pattern

Her sayfa için API endpoint'inde authorization kullanın:

```javascript
router.get('/', authMiddleware, authorize(['moduleName.view']), async (req, res) => {
    // ...
});
```

---

## 📚 İlgili Dosyalar

- `assets/js/page-loader.js` - Dinamik sayfa yükleme mekanizması
- `assets/pages/template.js` - Fallback template
- `assets/pages/dashboard.js` - Örnek sayfa
- `assets/pages/users.js` - Örnek sayfa
- `server.js:113-132` - Catch-all route tanımı
- `docs/MODULAR_PAGES.md` - Modüler sayfa sistemi detayları

---

## ❓ SSS

### S: Her sayfa için backend route eklemem gerekiyor mu?
**C:** Hayır! Catch-all route sayesinde sadece frontend'de değişiklik yapmanız yeterli.

### S: Switch-case'e eklemem gerekiyor mu?
**C:** Hayır! Page loader otomatik olarak `assets/pages/{pageName}.js` dosyasını yükler.

### S: F5 çalışır mı?
**C:** Evet! Catch-all route tüm URL'leri hybrid-layout.html'e yönlendiriyor.

### S: Yeni sayfa için menü eklemek zorunlu mu?
**C:** Hayır, menüsüz sayfa da yapabilirsiniz. Örnek: `/profile`, `/settings` gibi.

### S: API endpoint'i şart mı?
**C:** Hayır, sadece statik HTML de döndürebilirsiniz.

### S: Super admin olmayan kullanıcılar erişebilir mi?
**C:** Bu `authorize()` middleware'ine bağlı. Rol yetkilerini ayarlayın.

---

## 📝 Özet

**Yeni sayfa eklemek için sadece 2 şey yapıyorsunuz:**
1. ✅ `assets/pages/{pageName}.js` dosyası oluştur
2. ✅ Menüye ekle (opsiyonel)

**Backend route tanımına gerek YOK!** ✅  
**Switch-case eklemeye gerek YOK!** ✅
