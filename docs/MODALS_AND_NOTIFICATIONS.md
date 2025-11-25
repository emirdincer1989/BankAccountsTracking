# 🎨 Modal ve Bildirim Kullanım Kılavuzu

Bu dokümantasyon, RBUMS-NodeJS projesinde standartlaştırılmış modal ve bildirim sistemlerinin kullanımını açıklar.

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Modal Sistemi](#modal-sistemi)
3. [Bildirim Sistemi](#bildirim-sistemi)
4. [Örnekler](#örnekler)
5. [Best Practices](#best-practices)

---

## 🎯 Genel Bakış

### Neden Standart Sistem?

Projede tüm sayfalarda tutarlı kullanıcı deneyimi sağlamak için ortak modal ve bildirim sistemi geliştirilmiştir.

### Dosyalar

- **`assets/js/modal-utils.js`** - Modal yönetim utility'si
- **`assets/js/notification-utils.js`** - Bildirim yönetim utility'si

### Otomatik Yükleme

Bu utility'ler `hybrid-layout.html` içinde otomatik olarak yüklenir:

```html
<script src="assets/js/modal-utils.js"></script>
<script src="assets/js/notification-utils.js"></script>
```

---

## 🪟 Modal Sistemi

Modal sistemi, Promise-based çalışır ve `async/await` ile kullanılabilir.

### Global Obje

```javascript
window.Modal
```

### Modal Türleri

#### 1. Onay Modalı (Confirm)

Kullanıcıdan onay almak için kullanılır.

```javascript
const confirmed = await Modal.confirm({
    title: 'Onay Gerekli',
    message: 'Bu işlemi yapmak istediğinizden emin misiniz?',
    confirmText: 'Evet',
    cancelText: 'Hayır',
    icon: 'ri-question-line',
    iconColor: 'warning',
    confirmBtnClass: 'btn-primary'
});

if (confirmed) {
    // Kullanıcı onayladı
}
```

**Kısa Yol:**
```javascript
const confirmed = await showConfirm({ message: 'Emin misiniz?' });
```

#### 2. Silme Onay Modalı (Confirm Delete)

Silme işlemleri için özelleştirilmiş onay modalı.

```javascript
const confirmed = await Modal.confirmDelete({
    message: 'Bu öğeyi silmek istediğinizden emin misiniz?',
    title: 'Silme Onayı' // opsiyonel
});

if (confirmed) {
    // Silme işlemini yap
}
```

**Kısa Yol:**
```javascript
const confirmed = await showConfirmDelete({ message: 'Silmek istediğinizden emin misiniz?' });
```

#### 3. Bilgilendirme Modalı (Alert)

Kullanıcıyı bilgilendirmek için kullanılır.

```javascript
await Modal.alert({
    title: 'Başarılı',
    message: 'İşlem tamamlandı!',
    buttonText: 'Tamam',
    icon: 'ri-check-line',
    iconColor: 'success'
});
```

**Kısa Yol:**
```javascript
await showAlert({ message: 'İşlem tamamlandı!' });
```

#### 4. Input Modalı (Prompt)

Kullanıcıdan veri almak için kullanılır.

```javascript
const value = await Modal.prompt({
    title: 'İsim Girin',
    message: 'Lütfen yeni kategori adını girin:',
    placeholder: 'Kategori adı',
    defaultValue: '',
    inputType: 'text',
    confirmText: 'Kaydet',
    cancelText: 'İptal',
    required: true
});

if (value !== null) {
    // Kullanıcı bir değer girdi
    console.log('Girilen değer:', value);
}
```

**Kısa Yol:**
```javascript
const value = await showPrompt({ message: 'İsminiz nedir?' });
```

#### 5. Özel Modal (Custom)

Tamamen özelleştirilebilir modal.

```javascript
await Modal.custom({
    title: 'Detaylı Bilgi',
    content: `
        <div class="custom-content">
            <p>Buraya HTML içerik eklenebilir.</p>
            <ul>
                <li>Öğe 1</li>
                <li>Öğe 2</li>
            </ul>
        </div>
    `,
    size: 'lg', // sm, lg, xl
    centered: true,
    scrollable: false,
    buttons: [
        {
            text: 'Kaydet',
            class: 'btn-primary',
            onClick: (modal, modalElement) => {
                console.log('Kaydet tıklandı');
                modal.hide();
            }
        },
        {
            text: 'İptal',
            class: 'btn-secondary',
            onClick: (modal) => modal.hide()
        }
    ]
});
```

**Kısa Yol:**
```javascript
await showCustomModal({ title: 'Başlık', content: '<p>İçerik</p>' });
```

### Modal Yönetimi

```javascript
// Tüm modalları kapat
Modal.closeAll();

// Belirli bir modalı kapat
Modal.close('modalId');
```

---

## 📢 Bildirim Sistemi

Projede **iki farklı bildirim sistemi** bulunmaktadır:

### 1. Toast Bildirimleri (notification-utils.js)

Toast-style bildirimler sağlar. Otomatik kapanan, stackable (üst üste gelen) bildirimler.

**Kullanım:** UI işlemleri için (başarı, hata, uyarı mesajları)

### Global Obje

```javascript
window.Notification
```

---

### 2. Kullanıcı Bildirimleri (Notification Management System)

Kullanıcılara gönderilen ve veritabanında saklanan bildirimler. Header'da görüntülenir ve okunma durumu takip edilir.

**Kullanım:** Admin'den kullanıcılara gönderilen bildirimler için

**Dosyalar:**
- `services/notification/NotificationService.js` - Bildirim servisi
- `routes/notification-management.js` - API routes
- `assets/pages/notification-send.js` - Admin bildirim gönderme sayfası
- `assets/pages/notifications.js` - Kullanıcı bildirimler sayfası
- `assets/js/header-notifications.js` - Header bildirim yönetimi

**Detaylı dokümantasyon için:** `docs/NOTIFICATION_SYSTEM.md`

---

### Bildirim Türleri

#### 1. Başarı Bildirimi (Success)

```javascript
Notification.success('İşlem başarıyla tamamlandı!');

// veya detaylı kullanım
Notification.success({
    title: 'Başarılı!',
    message: 'Kullanıcı eklendi.',
    duration: 5000, // ms (0 = otomatik kapanmaz)
    position: 'bottom-right' // top-right, top-left, bottom-right, bottom-left
});
```

**Kısa Yol:**
```javascript
showSuccess('İşlem başarılı!');
showSuccess('Kaydedildi!', 'Başarılı'); // (message, title)
```

#### 2. Hata Bildirimi (Error)

```javascript
Notification.error('İşlem sırasında hata oluştu!');

// veya detaylı kullanım
Notification.error({
    title: 'Hata!',
    message: 'Sunucuya bağlanılamadı.',
    duration: 7000
});
```

**Kısa Yol:**
```javascript
showError('Bir hata oluştu!');
showError('Bağlantı hatası!', 'Hata');
```

#### 3. Uyarı Bildirimi (Warning)

```javascript
Notification.warning('Bu işlem geri alınamaz!');

// veya detaylı kullanım
Notification.warning({
    title: 'Uyarı!',
    message: 'Lütfen dikkatli olun.',
    duration: 6000
});
```

**Kısa Yol:**
```javascript
showWarning('Uyarı mesajı!');
```

#### 4. Bilgi Bildirimi (Info)

```javascript
Notification.info('Yeni bir güncelleme mevcut.');

// veya detaylı kullanım
Notification.info({
    title: 'Bilgi',
    message: 'Sistem bakımda olacak.',
    duration: 5000
});
```

**Kısa Yol:**
```javascript
showInfo('Bilgi mesajı!');
```

#### 5. Yükleniyor Bildirimi (Loading)

Otomatik kapanmaz, manuel olarak kapatılmalıdır.

```javascript
const loadingId = Notification.loading('Veriler yükleniyor...');

// İşlem tamamlandığında kapat
setTimeout(() => {
    Notification.remove(loadingId);
    Notification.success('Yükleme tamamlandı!');
}, 3000);
```

**Kısa Yol:**
```javascript
const loadingId = showLoading('İşlem yapılıyor...');
```

#### 6. İlerleme Bildirimi (Progress)

İlerleme çubuğu ile bildirim.

```javascript
const progressId = Notification.progress('Dosya yükleniyor...', 0);

// İlerlemeyi güncelle
Notification.updateProgress(progressId, 50);
Notification.updateProgress(progressId, 75);
Notification.updateProgress(progressId, 100); // %100'de otomatik kapanır
```

### Bildirim Yönetimi

```javascript
// Belirli bir bildirimi kaldır
Notification.remove('notificationId');

// Tüm bildirimleri kaldır
Notification.removeAll();

// Pozisyon değiştir
Notification.updateContainerPosition('top-right');
```

---

## 💡 Örnekler

### Örnek 1: Kullanıcı Silme

```javascript
// Delete button event handler
document.querySelector('.delete-user-btn').addEventListener('click', async (e) => {
    const userId = e.target.dataset.userId;

    // Onay al
    const confirmed = await showConfirmDelete({
        message: 'Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'
    });

    if (confirmed) {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                showSuccess('Kullanıcı başarıyla silindi!');
                // Sayfayı yenile
                setTimeout(() => window.reloadPage(), 1500);
            } else {
                showError(data.message || 'Kullanıcı silinemedi!');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showError('Kullanıcı silinirken bir hata oluştu!');
        }
    }
});
```

### Örnek 2: Form Kaydetme

```javascript
async function saveForm() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;

    // Validasyon
    if (!name || !email) {
        showWarning('Lütfen tüm alanları doldurun!');
        return;
    }

    // Loading göster
    const loadingId = showLoading('Kaydediliyor...');

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
        });

        const data = await response.json();

        // Loading kapat
        Notification.remove(loadingId);

        if (data.success) {
            showSuccess('Kayıt başarılı!');
        } else {
            showError(data.message || 'Kayıt başarısız!');
        }
    } catch (error) {
        Notification.remove(loadingId);
        showError('Sunucu hatası!');
    }
}
```

### Örnek 3: İlerleme Çubuğu ile Dosya Yükleme

```javascript
async function uploadFile(file) {
    const progressId = Notification.progress('Dosya yükleniyor...', 0);

    // Simüle edilmiş upload
    for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        Notification.updateProgress(progressId, i, `Yükleniyor... ${i}%`);
    }

    // %100'de otomatik kapanır ve başarı mesajı göster
    setTimeout(() => {
        showSuccess('Dosya başarıyla yüklendi!');
    }, 1500);
}
```

### Örnek 4: İsim Girme Prompt

```javascript
async function createCategory() {
    const name = await showPrompt({
        title: 'Yeni Kategori',
        message: 'Kategori adını girin:',
        placeholder: 'Örn: Admin İşlemleri',
        required: true
    });

    if (name) {
        try {
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });

            const data = await response.json();

            if (data.success) {
                showSuccess('Kategori oluşturuldu!');
                window.reloadPage();
            } else {
                showError(data.message);
            }
        } catch (error) {
            showError('Kategori oluşturulamadı!');
        }
    }
}
```

---

## ✅ Best Practices

### 1. Tutarlı Mesajlar Kullanın

```javascript
// ✅ İYİ
showSuccess('Kullanıcı başarıyla silindi!');
showError('Kullanıcı silinemedi!');

// ❌ KÖTÜ
alert('Silindi');
console.log('Hata oluştu');
```

### 2. Async/Await Kullanın

```javascript
// ✅ İYİ
const confirmed = await showConfirmDelete({ message: 'Emin misiniz?' });
if (confirmed) {
    // İşlem yap
}

// ❌ KÖTÜ
showConfirmDelete({ message: 'Emin misiniz?' }).then(confirmed => {
    if (confirmed) {
        // İşlem yap
    }
});
```

### 3. Loading State'leri Yönetin

```javascript
// ✅ İYİ
const loadingId = showLoading('İşlem yapılıyor...');
try {
    await someAsyncOperation();
    Notification.remove(loadingId);
    showSuccess('Başarılı!');
} catch (error) {
    Notification.remove(loadingId);
    showError('Hata oluştu!');
}

// ❌ KÖTÜ - Loading kaldırılmıyor
const loadingId = showLoading('İşlem yapılıyor...');
await someAsyncOperation();
showSuccess('Başarılı!');
```

### 4. Hata Mesajlarını İletişimsel Tutun

```javascript
// ✅ İYİ
showError('Kullanıcı silinirken bir hata oluştu. Lütfen tekrar deneyin.');

// ❌ KÖTÜ
showError('Error: 500');
```

### 5. Timeout Kullanarak Sayfayı Yenileyin

```javascript
// ✅ İYİ
showSuccess('Kullanıcı silindi!');
setTimeout(() => window.reloadPage(), 1500);

// ❌ KÖTÜ - Kullanıcı mesajı göremez
showSuccess('Kullanıcı silindi!');
window.reloadPage();
```

### 6. Eski API Kullanmayın

```javascript
// ✅ İYİ
showSuccess('İşlem başarılı!');
const confirmed = await showConfirmDelete({ message: 'Emin misiniz?' });

// ❌ KÖTÜ
alert('İşlem başarılı!');
const confirmed = confirm('Emin misiniz?');
```

---

## 🔄 Backward Compatibility

Eski `showAlert()` ve `showDeleteConfirmation()` fonksiyonları hala çalışır (yeni API'ye yönlendirilir):

```javascript
// Eski API (hala çalışır)
showAlert('success', 'Başarılı!');
showDeleteConfirmation('Emin misiniz?', async () => {
    // Silme işlemi
});

// Yeni API (önerilen)
showSuccess('Başarılı!');
const confirmed = await showConfirmDelete({ message: 'Emin misiniz?' });
```

**Not:** Yeni sayfalarda yeni API kullanılmalıdır!

---

## 📝 Özet

### Kısa Yollar (Önerilen)

```javascript
// Modallar
showConfirm({ message: '...' })
showConfirmDelete({ message: '...' })
showAlert({ message: '...' })
showPrompt({ message: '...' })
showCustomModal({ title: '...', content: '...' })

// Bildirimler
showSuccess('...')
showError('...')
showWarning('...')
showInfo('...')
showLoading('...')
```

### Detaylı Kullanım

```javascript
// Modallar
Modal.confirm({ ... })
Modal.confirmDelete({ ... })
Modal.alert({ ... })
Modal.prompt({ ... })
Modal.custom({ ... })

// Bildirimler
Notification.success({ ... })
Notification.error({ ... })
Notification.warning({ ... })
Notification.info({ ... })
Notification.loading('...')
Notification.progress('...', 0)
```

---

## 🎉 Sonuç

Bu standart modal ve bildirim sistemini kullanarak:

- ✅ Tutarlı kullanıcı deneyimi
- ✅ Kolay bakım
- ✅ Modern ve şık görünüm
- ✅ Promise-based async/await desteği
- ✅ Tamamen özelleştirilebilir

sağlanmıştır.

**Yeni sayfa oluştururken bu dokümantasyonu referans alın!**
