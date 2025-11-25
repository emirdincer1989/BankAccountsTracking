# RBUMS Authorization System

## İki Katmanlı Yetkilendirme Sistemi

RBUMS, güvenlik ve esneklik için **iki katmanlı yetkilendirme sistemi** kullanır:

### 1. API Endpoint Güvenliği: `roles.permissions` (JSONB)

**Amaç:** Backend API endpoint'lerini korumak
**Kullanım:** `authorize()` middleware ile
**Yapı:**

```json
{
  "users": {
    "view": true,
    "create": true,
    "edit": true,
    "delete": true
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
  }
}
```

**Route Örneği:**
```javascript
router.get('/', authorize(['users.view']), async (req, res) => {
  // Sadece users.view yetkisi olan kullanıcılar erişebilir
});

router.post('/', authorize(['users.create']), async (req, res) => {
  // Sadece users.create yetkisi olan kullanıcılar erişebilir
});
```

### 2. UI Menü Görünürlüğü: `role_menus` Tablosu

**Amaç:** Frontend menü görünürlüğü ve CRUD buton kontrolü
**Kullanım:** `/api/menus/user-menus` endpoint'i ile
**Yapı:**

```sql
CREATE TABLE role_menus (
    role_id INTEGER,
    menu_id INTEGER,
    can_view BOOLEAN,
    can_create BOOLEAN,
    can_edit BOOLEAN,
    can_delete BOOLEAN
)
```

**Frontend Kullanımı:**
```javascript
// Menüleri al
const { menus } = await api.get('/api/menus/user-menus');

// Menü görünürlüğü
menus.forEach(menu => {
  if (menu.can_view) {
    // Menüyü göster
  }
});

// CRUD buton kontrolü
if (menu.can_create) {
  // "Yeni Ekle" butonunu göster
}

if (menu.can_edit) {
  // "Düzenle" butonunu göster
}

if (menu.can_delete) {
  // "Sil" butonunu göster
}
```

---

## Otomatik Senkronizasyon

İki sistem **otomatik olarak senkronize** edilir. `utils/roleSync.js` utility'si bu işlemi yönetir.

### Menü URL → Permission Module Mapping

```javascript
const MENU_TO_MODULE_MAPPING = {
    '/users': 'users',
    '/roles': 'roles',
    '/menus': 'menus',
    '/dashboard': 'dashboard',
    '/settings': 'settings'
};
```

### Senkronizasyon Fonksiyonları

#### 1. `syncRolePermissions(roleId, permissions)`

Rol oluşturulduğunda veya güncellendiğinde çağrılır.
**Yön:** `roles.permissions` → `role_menus`

```javascript
const { syncRolePermissions } = require('../utils/roleSync');

// Yeni rol oluştur
const newRole = await query(
  'INSERT INTO roles (name, description, permissions) VALUES ($1, $2, $3) RETURNING *',
  [name, description, JSON.stringify(permissions)]
);

// Otomatik senkronize et
await syncRolePermissions(newRole.rows[0].id, permissions);
```

**Ne yapar:**
1. `roles.permissions` JSONB'yi günceller
2. Menü URL mapping'ini kullanarak ilgili menüleri bulur
3. `role_menus` tablosuna CRUD yetkilerini ekler/günceller

#### 2. `buildPermissionsFromMenus(menuPermissions)`

Menü yetkileri güncellendiğinde çağrılır.
**Yön:** `role_menus` → `roles.permissions`

```javascript
const { buildPermissionsFromMenus } = require('../utils/roleSync');

// Menü yetkilerini güncelle
await query('DELETE FROM role_menus WHERE role_id = $1', [roleId]);

for (const perm of menuPermissions) {
  await query(
    'INSERT INTO role_menus (role_id, menu_id, can_view, can_create, can_edit, can_delete) VALUES ($1, $2, $3, $4, $5, $6)',
    [roleId, perm.menu_id, perm.can_view, perm.can_create, perm.can_edit, perm.can_delete]
  );
}

// Tersine senkronize et
const updatedPermissions = await buildPermissionsFromMenus(menuPermissions);
await query(
  'UPDATE roles SET permissions = $1 WHERE id = $2',
  [JSON.stringify(updatedPermissions), roleId]
);
```

**Ne yapar:**
1. `role_menus` tablosundaki kayıtları okur
2. Menü URL mapping'ini kullanarak permission modül adlarını bulur
3. `roles.permissions` JSONB'yi oluşturur ve günceller

#### 3. `syncNewMenuToRoles(menuUrl, menuId)`

Yeni menü oluşturulduğunda çağrılır.
**Otomatik olarak tüm rollere yeni menü yetkilerini ekler.**

```javascript
const { syncNewMenuToRoles } = require('../utils/roleSync');

// Yeni menü oluştur
const newMenu = await query(
  'INSERT INTO menus (title, url, icon, ...) VALUES ($1, $2, $3, ...) RETURNING *',
  [title, url, icon, ...]
);

// Tüm rollerdeki bu modüle ait yetkileri yeni menüye uygula
await syncNewMenuToRoles(newMenu.rows[0].url, newMenu.rows[0].id);
```

**Ne yapar:**
1. Menü URL'inden modül adını bulur (örn: `/users` → `users`)
2. Tüm aktif rolleri tarar
3. Her rolün `permissions[moduleName]` varsa, `role_menus` tablosuna ekler

---

## Yeni Modül Ekleme

Projeye yeni bir modül eklerken (örn: Dental Lab projesi için "İş Takibi"):

### 1. Menü URL Mapping'ini Güncelle

```javascript
// utils/roleSync.js içinde
const { registerMenuModule } = require('../utils/roleSync');

// Uygulama başlatılırken (örn: server.js veya migration'da)
registerMenuModule('/jobs', 'jobs');
registerMenuModule('/invoices', 'invoices');
registerMenuModule('/payments', 'payments');
```

### 2. Rol Oluştururken Yeni Modül Ekle

```javascript
const newRolePermissions = {
  users: { view: true, create: false, edit: false, delete: false },
  roles: { view: true, create: false, edit: false, delete: false },
  jobs: { view: true, create: true, edit: true, delete: false },     // YENİ!
  invoices: { view: true, create: true, edit: false, delete: false }, // YENİ!
  payments: { view: true, create: true, edit: false, delete: false }  // YENİ!
};

await syncRolePermissions(roleId, newRolePermissions);
```

### 3. Route'larda Authorize Middleware Kullan

```javascript
const { authorize } = require('../middleware/auth');

// routes/jobs.js
router.get('/', authorize(['jobs.view']), async (req, res) => {
  // İş listesi
});

router.post('/', authorize(['jobs.create']), async (req, res) => {
  // Yeni iş oluştur
});

router.put('/:id', authorize(['jobs.edit']), async (req, res) => {
  // İş güncelle
});

router.delete('/:id', authorize(['jobs.delete']), async (req, res) => {
  // İş sil
});
```

---

## Test ve Doğrulama

Senkronizasyonu test etmek için:

```bash
node scripts/test-sync.js
```

**Çıktı:**
```
🧪 Testing role permission synchronization...

✅ SUCCESS: All roles are properly synchronized!
```

**Test edilen şeyler:**
- ✅ `roles.permissions` JSONB verisi
- ✅ `role_menus` tablosu kayıtları
- ✅ Her menü için CRUD yetkilerinin eşleşmesi
- ✅ Module mapping doğruluğu

---

## Güvenlik Notları

1. **Super Admin Her Zaman Bypass:** `authorize()` middleware, `super_admin` rolündeki kullanıcıları her zaman geçirir.

2. **Double Security:** Frontend menü gizlese bile, backend API endpoint'leri `authorize()` ile korunur.

3. **Audit Logging:** Tüm rol ve yetki değişiklikleri `audit_logs` tablosuna kaydedilir.

4. **Super Admin Koruması:** Normal kullanıcılar `super_admin` rolünü göremez ve atayamaz (routes/roles.js:18-20).

---

## İlgili Dosyalar

- `utils/roleSync.js` - Senkronizasyon utility'si
- `middleware/auth.js` - Authentication ve authorization middleware
- `routes/roles.js` - Rol yönetimi endpoint'leri
- `routes/menus.js` - Menü yönetimi endpoint'leri
- `scripts/seed.js` - İlk veri oluşturma (sync kullanımı)
- `scripts/test-sync.js` - Senkronizasyon test script'i
- `scripts/migrations/001_initial_schema.js` - Tablo yapıları

---

## Özet

| Özellik | roles.permissions | role_menus |
|---------|-------------------|------------|
| **Amaç** | API güvenliği | UI kontrolü |
| **Kullanım** | Backend authorize() | Frontend menü/buton |
| **Yapı** | JSONB (flexible) | Relational (strict) |
| **Güncelleme** | syncRolePermissions() | buildPermissionsFromMenus() |
| **Senkronizasyon** | Otomatik ✅ | Otomatik ✅ |
| **Super Admin** | Bypass ✅ | Tüm menüler görünür ✅ |

**Her iki sistem de aktif ve birbirini tamamlar. Biri değişince diğeri otomatik güncellenir.**
