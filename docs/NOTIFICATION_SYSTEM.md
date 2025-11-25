# 🔔 Bildirim Sistemi Dokümantasyonu

Bu dokümantasyon, RBUMS-NodeJS projesindeki kullanıcı bildirim sistemi hakkında detaylı bilgi sağlar.

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Sistem Mimarisi](#sistem-mimarisi)
3. [Veritabanı Yapısı](#veritabanı-yapısı)
4. [API Endpoints](#api-endpoints)
5. [Kullanım Örnekleri](#kullanım-örnekleri)
6. [Real-time Bildirimler](#real-time-bildirimler)
7. [Frontend Entegrasyonu](#frontend-entegrasyonu)

---

## 🎯 Genel Bakış

Bildirim sistemi, admin kullanıcıların diğer kullanıcılara bildirim göndermesini ve bu bildirimlerin okunma durumunu takip etmesini sağlar.

### Özellikler

- ✅ Toplu bildirim gönderme
- ✅ Okunma durumu takibi
- ✅ Real-time bildirimler (Socket.io)
- ✅ Bildirim istatistikleri (admin)
- ✅ Filtreleme ve pagination
- ✅ Header'da bildirim ikonu ve dropdown

---

## 🏗️ Sistem Mimarisi

### Backend

```
services/
  notification/
    NotificationService.js    # Ana bildirim servisi

routes/
  notification-management.js   # API endpoints

scripts/migrations/
  006_notification_system.js  # Veritabanı migration
```

### Frontend

```
assets/
  pages/
    notification-send.js      # Admin bildirim gönderme sayfası
    notifications.js          # Kullanıcı bildirimler sayfası
  js/
    header-notifications.js  # Header bildirim yönetimi
```

---

## 🗄️ Veritabanı Yapısı

### notifications Tablosu

```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    
    -- Bildirim içeriği
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error
    
    -- Durum
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    
    -- Gönderen bilgisi (admin)
    sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Link (opsiyonel)
    link VARCHAR(500),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### notification_logs Tablosu

```sql
CREATE TABLE notification_logs (
    id SERIAL PRIMARY KEY,
    
    -- Gönderim bilgisi
    sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sent_by_name VARCHAR(255),
    
    -- Bildirim içeriği (snapshot)
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    
    -- Alıcı bilgileri
    recipient_count INTEGER DEFAULT 0,
    recipient_user_ids INTEGER[],
    
    -- İstatistikler
    sent_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API Endpoints

### Admin Endpoints (Super Admin)

#### Bildirim Gönder

```http
POST /api/notification-management/send
Content-Type: application/json

{
  "user_ids": [1, 2, 3],
  "title": "Yeni Duyuru",
  "message": "Sistem bakımı yapılacaktır.",
  "type": "info",
  "link": "/dashboard"
}
```

#### Bildirim İstatistikleri

```http
GET /api/notification-management/stats?limit=50&offset=0
```

#### Log Okunma Durumu

```http
GET /api/notification-management/logs/:logId/read-status
```

### Kullanıcı Endpoints

#### Bildirimleri Getir

```http
GET /api/notification-management/my-notifications?limit=50&offset=0&is_read=false
```

#### Bildirimi Okundu İşaretle

```http
POST /api/notification-management/mark-read/:notificationId
```

#### Tümünü Okundu İşaretle

```http
POST /api/notification-management/mark-all-read
```

#### Okunmamış Sayısı

```http
GET /api/notification-management/unread-count
```

---

## 💻 Kullanım Örnekleri

### Backend: Bildirim Gönderme

```javascript
const { getNotificationService } = require('./services/notification/NotificationService');

// Tek kullanıcıya bildirim gönder
const notificationService = getNotificationService();
await notificationService.send({
    user_id: 1,
    title: 'Hoş Geldiniz',
    message: 'Sisteme hoş geldiniz!',
    type: 'success',
    link: '/dashboard',
    sent_by: req.user.id
});

// Toplu bildirim gönder
await notificationService.sendBulk({
    user_ids: [1, 2, 3, 4, 5],
    title: 'Sistem Bakımı',
    message: 'Sistem bakımı yapılacaktır.',
    type: 'warning',
    sent_by: req.user.id
});
```

### Frontend: Bildirim Gönderme (Admin)

```javascript
// assets/pages/notification-send.js
const response = await fetch('/api/notification-management/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
        user_ids: [1, 2, 3],
        title: 'Yeni Duyuru',
        message: 'Sistem bakımı yapılacaktır.',
        type: 'info',
        link: '/dashboard'
    })
});
```

### Frontend: Bildirimleri Görüntüleme

```javascript
// assets/pages/notifications.js
const response = await fetch('/api/notification-management/my-notifications?limit=20&offset=0', {
    credentials: 'include'
});

const result = await response.json();
if (result.success) {
    const notifications = result.data.notifications;
    const unreadCount = result.data.unreadCount;
    // Bildirimleri göster
}
```

---

## 🔴 Real-time Bildirimler

Sistem Socket.io kullanarak real-time bildirim desteği sağlar.

### Socket.io Yapılandırması

**Server-side (server.js):**
```javascript
// Socket.io authentication middleware
io.use(async (socket, next) => {
    // Token doğrulama
    // Kullanıcı room'una katılma
});

io.on('connection', (socket) => {
    const userRoom = `user_${socket.userId}`;
    socket.join(userRoom);
});
```

**Client-side (header-notifications.js):**
```javascript
const notificationSocket = io({
    auth: { token: getCookie('auth_token') },
    withCredentials: true
});

notificationSocket.on('notification', (notification) => {
    // Yeni bildirim geldiğinde
    loadHeaderNotifications();
    updateUnreadCount();
    showInfo(notification.message, notification.title);
});
```

### Bildirim Gönderme (Real-time)

```javascript
// NotificationService.js içinde
if (this.io) {
    this.io.to(`user_${user_id}`).emit('notification', {
        id: notification.id,
        title,
        message,
        type,
        link,
        created_at: notification.created_at
    });
}
```

---

## 🎨 Frontend Entegrasyonu

### Header Bildirim Dropdown

Header'daki bildirim ikonu otomatik olarak okunmamış bildirim sayısını gösterir:

```html
<!-- hybrid-layout.html -->
<button id="page-header-notifications-dropdown">
    <i class='bx bx-bell fs-22'></i>
    <span class="topbar-badge badge bg-danger">3</span>
</button>
```

**JavaScript (header-notifications.js):**
- Sayfa yüklendiğinde bildirimleri yükler
- Socket.io ile real-time güncelleme yapar
- Her 30 saniyede bir okunmamış sayısını günceller

### Bildirimler Sayfası

`/notifications` sayfasında kullanıcılar:
- Tüm bildirimlerini görüntüleyebilir
- Filtreleme yapabilir (tümü/okunmamış/okunmuş)
- Bildirimleri okundu olarak işaretleyebilir
- Tümünü okundu olarak işaretleyebilir

---

## 📊 Bildirim Tipleri

| Tip | Renk | İkon | Kullanım |
|-----|------|------|----------|
| `info` | Mavi | `ri-information-line` | Genel bilgilendirme |
| `success` | Yeşil | `ri-checkbox-circle-line` | Başarılı işlemler |
| `warning` | Sarı | `ri-alert-line` | Uyarılar |
| `error` | Kırmızı | `ri-error-warning-line` | Hatalar |

---

## 🔒 Güvenlik

### Authorization

- **Bildirim Gönderme**: Sadece `super_admin` rolü
- **Bildirim Görüntüleme**: Tüm authenticated kullanıcılar
- **Okunma İşaretleme**: Sadece bildirimin sahibi

### Input Validation

```javascript
const schema = Joi.object({
    user_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
    title: Joi.string().max(500).required(),
    message: Joi.string().required(),
    type: Joi.string().valid('info', 'success', 'warning', 'error').default('info'),
    link: Joi.string().max(500).allow(null).optional()
});
```

---

## 📈 İstatistikler

Admin bildirim istatistiklerini görüntüleyebilir:

```javascript
GET /api/notification-management/stats

Response:
{
    "success": true,
    "data": {
        "logs": [...],
        "pagination": { limit, offset, total },
        "stats": {
            "total_notifications": 150,
            "total_users": 25,
            "unread_count": 45,
            "read_count": 105
        }
    }
}
```

---

## 🚀 Kullanım Senaryoları

### Senaryo 1: Sistem Bakımı Duyurusu

```javascript
// Admin tüm kullanıcılara bildirim gönderir
await notificationService.sendBulk({
    user_ids: allUserIds,
    title: 'Sistem Bakımı',
    message: 'Sistem 15 Ocak 2025 saat 02:00-04:00 arası bakımda olacaktır.',
    type: 'warning',
    link: '/announcements'
});
```

### Senaryo 2: Kullanıcıya Özel Bildirim

```javascript
// Belirli bir kullanıcıya bildirim gönder
await notificationService.send({
    user_id: userId,
    title: 'Hesap Onaylandı',
    message: 'Hesabınız başarıyla onaylandı. Artık sistemi kullanabilirsiniz.',
    type: 'success',
    link: '/dashboard'
});
```

---

## 📝 Best Practices

### 1. Bildirim Mesajları

- ✅ Kısa ve öz olun
- ✅ Net bir çağrı eylemi ekleyin (link ile)
- ✅ Uygun tip seçin (info, success, warning, error)

### 2. Toplu Gönderim

- ✅ Büyük kullanıcı gruplarına gönderim yaparken `sendBulk()` kullanın
- ✅ İstatistikleri takip edin

### 3. Real-time Bildirimler

- ✅ Socket.io bağlantısını kontrol edin
- ✅ Hata durumunda fallback mekanizması kullanın

---

## 🔗 İlgili Dosyalar

- `services/notification/NotificationService.js` - Bildirim servisi
- `routes/notification-management.js` - API routes
- `assets/pages/notification-send.js` - Admin sayfası
- `assets/pages/notifications.js` - Kullanıcı sayfası
- `assets/js/header-notifications.js` - Header yönetimi
- `scripts/migrations/006_notification_system.js` - Migration

---

**Son Güncelleme:** 2025-01-15

