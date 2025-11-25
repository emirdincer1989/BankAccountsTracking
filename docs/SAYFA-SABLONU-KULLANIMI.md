# 📄 Hybrid Layout ile Yeni Sayfa Oluşturma Kılavuzu

Bu kılavuz, RBUMS-NodeJS projesinde Hybrid Layout yaklaşımı ile yeni sayfa oluşturma sürecini adım adım açıklar.

## 🎯 Hybrid Layout Yaklaşımı

Projemiz **Hybrid Layout** kullanır - MPA'nın kararlılığı ile SPA'nın dinamikliğini birleştirir:

- **Sabit Yapı**: Header, sidebar, footer hiç yenilenmez
- **Dinamik İçerik**: Sadece `main-content` alanı değişir
- **URL Yönetimi**: `window.history.pushState` ile URL güncellenir
- **Cache Sistemi**: Menüler 5 dakika cache'lenir
- **Event Delegation**: Dinamik içerik için

### Ana Dosya
- **`hybrid-layout.html`** - Tüm sayfa içerikleri bu dosya üzerinden yüklenir

---

## 🚀 Yeni Sayfa Oluşturma - 4 Adım

### **Adım 1: Backend API Endpoint Oluştur**

#### 1.1. Route Dosyası Oluştur
```javascript
// routes/yeni-modul.js
const express = require('express');
const { query } = require('../config/database');
const { validateInput, yeniModulSchema } = require('../middleware/validation');
const { authMiddleware, authorize } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Tüm route'lar authentication gerektirir
router.use(authMiddleware);

// Liste - GET /api/yeni-modul
router.get('/', authorize(['yeni_modul.view']), async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM yeni_modul WHERE is_active = true ORDER BY created_at DESC'
        );
        
        res.json({
            success: true,
            data: { items: result.rows }
        });
    } catch (error) {
        logger.error('Yeni modul fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Detay - GET /api/yeni-modul/:id
router.get('/:id', authorize(['yeni_modul.view']), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(
            'SELECT * FROM yeni_modul WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kayıt bulunamadı'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        logger.error('Yeni modul detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

// Oluştur - POST /api/yeni-modul
router.post('/', 
    authorize(['yeni_modul.create']), 
    validateInput(yeniModulSchema), 
    async (req, res) => {
        try {
            const { name, description } = req.body;
            
            const result = await query(
                `INSERT INTO yeni_modul (name, description, created_by) 
                 VALUES ($1, $2, $3) RETURNING *`,
                [name, description, req.user.id]
            );
            
            // Audit log
            await query(
                `INSERT INTO audit_logs (user_id, action, table_name, record_id) 
                 VALUES ($1, $2, $3, $4)`,
                [req.user.id, 'CREATE', 'yeni_modul', result.rows[0].id]
            );
            
            logger.info(`Yeni modul created: ${result.rows[0].id}`, { userId: req.user.id });
            
            res.json({
                success: true,
                message: 'Kayıt başarıyla oluşturuldu',
                data: result.rows[0]
            });
        } catch (error) {
            logger.error('Yeni modul create error:', error);
            res.status(500).json({
                success: false,
                message: 'Sunucu hatası'
            });
        }
});

// Güncelle - PUT /api/yeni-modul/:id
router.put('/:id', 
    authorize(['yeni_modul.edit']), 
    validateInput(yeniModulSchema), 
    async (req, res) => {
        try {
            const { id } = req.params;
            const { name, description } = req.body;
            
            const result = await query(
                `UPDATE yeni_modul 
                 SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $3 
                 RETURNING *`,
                [name, description, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Kayıt bulunamadı'
                });
            }
            
            // Audit log
            await query(
                `INSERT INTO audit_logs (user_id, action, table_name, record_id) 
                 VALUES ($1, $2, $3, $4)`,
                [req.user.id, 'UPDATE', 'yeni_modul', id]
            );
            
            res.json({
                success: true,
                message: 'Kayıt başarıyla güncellendi',
                data: result.rows[0]
            });
        } catch (error) {
            logger.error('Yeni modul update error:', error);
            res.status(500).json({
                success: false,
                message: 'Sunucu hatası'
            });
        }
});

// Sil - DELETE /api/yeni-modul/:id
router.delete('/:id', authorize(['yeni_modul.delete']), async (req, res) => {
    try {
        const { id } = req.params;
        
        // Soft delete
        const result = await query(
            'UPDATE yeni_modul SET is_active = false WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Kayıt bulunamadı'
            });
        }
        
        // Audit log
        await query(
            `INSERT INTO audit_logs (user_id, action, table_name, record_id) 
             VALUES ($1, $2, $3, $4)`,
            [req.user.id, 'DELETE', 'yeni_modul', id]
        );
        
        res.json({
            success: true,
            message: 'Kayıt başarıyla silindi'
        });
    } catch (error) {
        logger.error('Yeni modul delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Sunucu hatası'
        });
    }
});

module.exports = router;
```

#### 1.2. server.js'e Route Ekle
```javascript
// server.js
const yeniModulRoutes = require('./routes/yeni-modul');

// API Routes
app.use('/api/yeni-modul', authMiddleware, yeniModulRoutes);
```

#### 1.3. Validation Schema Ekle (opsiyonel)
```javascript
// middleware/validation.js
const yeniModulSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).allow(''),
});

module.exports = { 
    // ... diğer schema'lar
    yeniModulSchema
};
```

---

### **Adım 2: Frontend Fonksiyonları Ekle**

#### 2.1. İçerik Yükleme Fonksiyonu
```javascript
// hybrid-layout.html içine ekle

// Sayfa içeriği yükleme
async function loadYeniModulContent() {
    try {
        const response = await fetch('/api/yeni-modul', {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        const data = await response.json();
        
        if (!data.success) {
            return `<div class="alert alert-danger">${data.message}</div>`;
        }
        
            return `
                <div class="row">
                    <div class="col-12">
                    <div class="page-title-box d-sm-flex align-items-center justify-content-between">
                        <h4 class="mb-sm-0">Yeni Modül</h4>
                        <div class="page-title-right">
                            <ol class="breadcrumb m-0">
                                <li class="breadcrumb-item"><a href="/dashboard">Dashboard</a></li>
                                <li class="breadcrumb-item active">Yeni Modül</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <div class="d-flex align-items-center">
                                <h5 class="card-title mb-0 flex-grow-1">Yeni Modül Listesi</h5>
                                <button class="btn btn-primary" id="addYeniModulBtn">
                                    <i class="ri-add-line align-middle me-1"></i> Yeni Ekle
                                </button>
                </div>
            </div>
                        <div class="card-body">
<div class="table-responsive">
                                <table class="table table-bordered table-hover">
        <thead>
            <tr>
                                            <th>ID</th>
                                            <th>Ad</th>
                                            <th>Açıklama</th>
                                            <th>Oluşturma Tarihi</th>
                                            <th width="150">İşlemler</th>
            </tr>
        </thead>
        <tbody>
                                        ${data.data.items.map(item => `
                                            <tr>
                                                <td>${item.id}</td>
                                                <td>${item.name}</td>
                                                <td>${item.description || '-'}</td>
                                                <td>${new Date(item.created_at).toLocaleString('tr-TR')}</td>
                                                <td>
                                                    <button class="btn btn-sm btn-warning edit-yeni-modul-btn" 
                                                            data-id="${item.id}">
                                                        <i class="ri-edit-line"></i>
                                                    </button>
                                                    <button class="btn btn-sm btn-danger delete-yeni-modul-btn" 
                                                            data-id="${item.id}">
                                                        <i class="ri-delete-bin-line"></i>
                    </button>
                </td>
            </tr>
                                        `).join('')}
        </tbody>
    </table>
</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Modal -->
            <div class="modal fade" id="yeniModulModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Yeni Modül</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="yeniModulForm">
                                <input type="hidden" id="yeniModulId">
                                <div class="mb-3">
                                    <label for="yeniModulName" class="form-label">Ad *</label>
                                    <input type="text" class="form-control" id="yeniModulName" required>
                                </div>
    <div class="mb-3">
                                    <label for="yeniModulDescription" class="form-label">Açıklama</label>
                                    <textarea class="form-control" id="yeniModulDescription" rows="3"></textarea>
    </div>
</form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                            <button type="button" class="btn btn-primary" id="saveYeniModulBtn">Kaydet</button>
                        </div>
                    </div>
                </div>
</div>
        `;
    } catch (error) {
        console.error('Yeni modul content load error:', error);
        return '<div class="alert alert-danger">Sayfa yüklenirken hata oluştu</div>';
    }
}
```

#### 2.2. loadPageContent'e Case Ekle
```javascript
// hybrid-layout.html içinde mevcut loadPageContent fonksiyonuna ekle
async function loadPageContent(page) {
    try {
        showLoading();
        
        let content = '';
        switch(page) {
            case '/dashboard':
                content = await loadDashboardContent();
                break;
            case '/users':
                content = await loadUsersContent();
                break;
            case '/yeni-modul':  // YENİ CASE
                content = await loadYeniModulContent();
                break;
            default:
                content = '<div class="alert alert-warning">Sayfa bulunamadı</div>';
        }
        
        document.getElementById('main-content').innerHTML = content;
        initializePageContent();
        
    } catch (error) {
        console.error('Sayfa yükleme hatası:', error);
        showError('Sayfa yüklenemedi');
    }
}
```

#### 2.3. CRUD Fonksiyonları Ekle
```javascript
// hybrid-layout.html içine ekle

// Modal göster (Yeni/Düzenle)
function showYeniModulModal(id = null) {
    const modal = new bootstrap.Modal(document.getElementById('yeniModulModal'));
    const form = document.getElementById('yeniModulForm');
    form.reset();
    
    if (id) {
        // Düzenleme modu - Veriyi yükle
        loadYeniModulForEdit(id);
    } else {
        // Yeni kayıt modu
        document.getElementById('yeniModulId').value = '';
    }
    
    modal.show();
}

// Düzenleme için veri yükle
async function loadYeniModulForEdit(id) {
    try {
        const response = await fetch(`/api/yeni-modul/${id}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('yeniModulId').value = data.data.id;
            document.getElementById('yeniModulName').value = data.data.name;
            document.getElementById('yeniModulDescription').value = data.data.description || '';
        }
    } catch (error) {
        console.error('Load for edit error:', error);
        showAlert('danger', 'Veri yüklenirken hata oluştu');
    }
}

// Kaydet (Yeni/Güncelle)
async function saveYeniModul() {
    try {
        const id = document.getElementById('yeniModulId').value;
        const name = document.getElementById('yeniModulName').value;
        const description = document.getElementById('yeniModulDescription').value;
        
        // Validation
        if (!name.trim()) {
            showAlert('warning', 'Ad alanı zorunludur');
            return;
        }
        
        const url = id ? `/api/yeni-modul/${id}` : '/api/yeni-modul';
        const method = id ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ name, description })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('success', data.message);
            bootstrap.Modal.getInstance(document.getElementById('yeniModulModal')).hide();
            loadPageContent('/yeni-modul'); // Listeyi yenile
        } else {
            showAlert('danger', data.message);
        }
    } catch (error) {
        console.error('Save error:', error);
        showAlert('danger', 'Kayıt sırasında hata oluştu');
    }
}

// Sil
async function deleteYeniModul(id) {
    if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/yeni-modul/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('success', data.message);
            loadPageContent('/yeni-modul'); // Listeyi yenile
        } else {
            showAlert('danger', data.message);
        }
    } catch (error) {
        console.error('Delete error:', error);
        showAlert('danger', 'Silme işlemi sırasında hata oluştu');
    }
}
```

#### 2.4. Event Delegation Ekle
```javascript
// hybrid-layout.html içindeki global event listener'a ekle
document.addEventListener('click', function(e) {
    // ... diğer event'ler
    
    // Yeni Modül - Yeni Ekle
    if (e.target.id === 'addYeniModulBtn' || e.target.closest('#addYeniModulBtn')) {
        e.preventDefault();
        showYeniModulModal();
    }
    
    // Yeni Modül - Düzenle
    if (e.target.classList.contains('edit-yeni-modul-btn') || 
        e.target.closest('.edit-yeni-modul-btn')) {
        e.preventDefault();
        const btn = e.target.closest('.edit-yeni-modul-btn');
        const id = btn.dataset.id;
        showYeniModulModal(id);
    }
    
    // Yeni Modül - Sil
    if (e.target.classList.contains('delete-yeni-modul-btn') || 
        e.target.closest('.delete-yeni-modul-btn')) {
        e.preventDefault();
        const btn = e.target.closest('.delete-yeni-modul-btn');
        const id = btn.dataset.id;
        deleteYeniModul(id);
    }
    
    // Yeni Modül - Kaydet
    if (e.target.id === 'saveYeniModulBtn') {
        e.preventDefault();
        saveYeniModul();
    }
});
```

---

### **Adım 3: URL Routing Ekle**

```javascript
// server.js
app.get('/yeni-modul', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'hybrid-layout.html'));
});
```

---

### **Adım 4: Menüye Ekle**

#### 4.1. SQL ile Menü Ekle
```sql
INSERT INTO menus (title, url, icon, category, order_index, is_category) 
VALUES ('Yeni Modül', '/yeni-modul', 'ri-file-list-3-line', 'Admin İşlemleri', 10, false);
```

#### 4.2. Veya Menü Yönetimi UI'dan
1. `/menus` sayfasına git
2. "Yeni Menü" butonuna tıkla
3. Formu doldur:
   - **Başlık**: Yeni Modül
   - **URL**: /yeni-modul
   - **İkon**: ri-file-list-3-line
   - **Kategori**: Admin İşlemleri
   - **Sıra**: 10

---

## 🎨 UI Bileşenleri

### İstatistik Kartları
```html
<div class="col-xl-3 col-md-6">
    <div class="card card-animate">
        <div class="card-body">
            <div class="d-flex align-items-center">
                <div class="flex-grow-1 overflow-hidden">
                    <p class="text-uppercase fw-medium text-muted text-truncate mb-0">Başlık</p>
                </div>
                <div class="flex-shrink-0">
                    <h5 class="text-success fs-14 mb-0">
                        <i class="ri-arrow-up-line fs-13 align-middle"></i> +12.5%
                    </h5>
                </div>
            </div>
            <div class="d-flex align-items-end justify-content-between mt-4">
                <div>
                    <h4 class="fs-22 fw-semibold ff-secondary mb-4">
                        <span class="counter-value" data-target="1250">1,250</span>
                    </h4>
                    <p class="text-muted mb-0">Toplam Kayıt</p>
                </div>
                <div class="avatar-sm flex-shrink-0">
                    <span class="avatar-title bg-success-subtle rounded fs-3">
                        <i class="bx bx-user-circle text-success"></i>
                    </span>
                               </div>
                               </div>
                           </div>
                       </div>
                   </div>
```

### Modal Şablonu
```html
<div class="modal fade" id="exampleModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
            <div class="modal-header bg-light p-3">
                <h5 class="modal-title">Modal Başlık</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="exampleForm">
                    <!-- Form fields -->
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-light" data-bs-dismiss="modal">İptal</button>
                <button type="button" class="btn btn-primary">Kaydet</button>
            </div>
        </div>
    </div>
</div>
```

### Alert Gösterme
   ```javascript
function showAlert(type, message) {
    const alertHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <strong>${message}</strong>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    // Alert göster (main-content'in başına ekle)
}
```

---

## 📋 Checklist

Yeni sayfa oluştururken kontrol edin:

- [ ] Backend route dosyası oluşturuldu (`routes/yeni-modul.js`)
- [ ] `server.js`'e API route eklendi
- [ ] `server.js`'e sayfa route'u eklendi
- [ ] Validation schema eklendi (gerekiyorsa)
- [ ] Frontend içerik yükleme fonksiyonu yazıldı
- [ ] `loadPageContent()` switch'ine case eklendi
- [ ] CRUD fonksiyonları yazıldı
- [ ] Event delegation eklendi
- [ ] Modal yapısı oluşturuldu
- [ ] Menüye eklendi (SQL veya UI)
- [ ] Authorization kontrolleri eklendi
- [ ] Audit logging eklendi
- [ ] Error handling yapıldı
- [ ] Test edildi

---

## 🔍 Gerçek Proje Örnekleri

Mevcut sayfalara bakarak örnek alabilirsiniz:

### **Kullanıcı Yönetimi** (`/users`)
- **Route**: `routes/users.js`
- **Fonksiyon**: `loadUsersContent()`
- **Özellikler**: Pagination, search, password change

### **Rol Yönetimi** (`/roles`)
- **Route**: `routes/roles.js`
- **Fonksiyon**: `loadRolesContent()`
- **Özellikler**: JSONB permissions, nested forms

### **Menü Yönetimi** (`/menus`)
- **Route**: `routes/menus.js`
- **Fonksiyon**: `loadMenusContent()`
- **Özellikler**: Category system, parent-child

---

## 🚨 Yaygın Hatalar ve Çözümleri

### 1. Event Listener Çalışmıyor
**Sorun**: Dinamik eklenen butonlara tıklama çalışmıyor
**Çözüm**: Event delegation kullan (document.addEventListener)

### 2. Modal Açılmıyor
**Sorun**: Bootstrap modal initialize edilmemiş
**Çözüm**: `new bootstrap.Modal(element)` kullan

### 3. Token Hatası
**Sorun**: API isteklerinde 401 Unauthorized
**Çözüm**: `getToken()` fonksiyonunu kullan ve Authorization header'ı ekle

### 4. Sayfa Yenilenince İçerik Kaybolıyor
**Sorun**: URL'den sayfa algılaması yapılmamış
**Çözüm**: `window.location.pathname` kontrolü ekle

---

## 📚 İlgili Dokümantasyon

- **[MENU-YAPISI-VE-SAYFA-MANTIGI.md](./MENU-YAPISI-VE-SAYFA-MANTIGI.md)** - Detaylı sistem açıklaması
- **[PROJE-CALISMA-MANTIGI-VE-AKIS-DIYAGRAMI.md](./PROJE-CALISMA-MANTIGI-VE-AKIS-DIYAGRAMI.md)** - Genel mimari
- **[.security_rules.md](./.security_rules.md)** - Güvenlik kuralları

---

**Not**: Bu rehber Hybrid Layout yaklaşımına göre hazırlanmıştır. Tüm yeni sayfalar bu yöntemle oluşturulmalıdır.