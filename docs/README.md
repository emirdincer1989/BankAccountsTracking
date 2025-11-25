# 📚 RBUMS-NodeJS Dokümantasyon

Bu klasör, RBUMS-NodeJS (Role Based User Management System) projesinin tüm dokümantasyon dosyalarını içerir.

> 💡 **Not:** Ana proje README'si için: [../README.md](../README.md)

## 📄 Dosyalar

### 🏗️ **Sistem Mimarisi ve Akış**

#### **PROJE-CALISMA-MANTIGI-VE-AKIS-DIYAGRAMI.md**
- Projenin genel çalışma mantığı
- Detaylı akış diyagramları
- Sistem mimarisi (Client → Server → Database)
- Teknoloji stack'i
- Veritabanı yapısı ve ilişkileri
- Kimlik doğrulama ve yetkilendirme akışı
- Sayfa yükleme ve navigasyon
- API endpoint'leri
- Rol bazlı erişim kontrolü (RBAC)
- Güvenlik katmanları
- İş akışları (Business flows)

#### **MENU-YAPISI-VE-SAYFA-MANTIGI.md**
- Menü kategori sistemi
- Hybrid Layout yaklaşımı
- Sayfa yükleme süreci
- Dinamik içerik yükleme
- Event delegation pattern
- API endpoints
- Cache sistemi

### 🛠️ **Geliştirme Kılavuzları**

#### **ADDING_NEW_PAGE.md**
- Modüler sayfa sistemi ile yeni sayfa ekleme
- `assets/pages/` klasörü kullanımı
- Backend route gereksinimleri
- Menü ekleme

#### **MODULAR_PAGES.md**
- Modüler sayfa sistemi mimarisi
- Page loader mekanizması
- Lazy loading ve cache sistemi
- Migration planı

#### **SAYFA-SABLONU-KULLANIMI.md**
- Yeni sayfa oluşturma adımları
- Hybrid Layout kullanımı
- Backend API oluşturma
- Frontend entegrasyonu
- CRUD operations şablonları
- Event delegation örnekleri


### 🔒 **Güvenlik**

#### **SECURITY_RULES.md**
- Cursor AI için güvenlik kuralları
- SQL Injection koruması
- XSS koruması
- Hassas veri şifreleme
- Rate limiting
- Input validation
- Authentication & Authorization
- Best practices ve şablonlar

### 📧 **Email ve Bildirim Sistemleri**

#### **EMAIL_NOTIFICATION_SYSTEM.md**
- Email sistemi mimarisi
- SMTP yapılandırması
- Email queue sistemi
- Admin sayfaları ve API kullanımı

#### **NOTIFICATION_SYSTEM.md**
- Kullanıcı bildirim sistemi
- Real-time bildirimler (Socket.io)
- Bildirim gönderme ve takip
- Frontend entegrasyonu

#### **MODALS_AND_NOTIFICATIONS.md**
- Toast bildirimleri (notification-utils.js)
- Modal sistemi kullanımı
- Best practices

---

## 📖 Nasıl Kullanılır?

### 1. **Yeni Başlayanlar İçin**
Önce şu sırayla okuyun:
1. `PROJE-CALISMA-MANTIGI-VE-AKIS-DIYAGRAMI.md` - Genel bakış
2. `MENU-YAPISI-VE-SAYFA-MANTIGI.md` - Sayfa yapısı
3. `SAYFA-SABLONU-KULLANIMI.md` - Pratik örnekler

### 2. **Yeni Özellik Geliştirmek İsterseniz**
- `SAYFA-SABLONU-KULLANIMI.md` - Şablon kullanımı
- `SECURITY_RULES.md` - Güvenlik kontrolleri
- `PROJE-CALISMA-MANTIGI-VE-AKIS-DIYAGRAMI.md` - API endpoints

### 3. **Hata Giderme**
- Browser Console ve Network tab
- Logger dosyaları (`logs/` klasörü)
- `SAYFA-SABLONU-KULLANIMI.md` - Yaygın hatalar bölümü

### 4. **Email ve Bildirim Sistemleri**
- `EMAIL_NOTIFICATION_SYSTEM.md` - Email sistemi kullanımı
- `NOTIFICATION_SYSTEM.md` - Bildirim sistemi kullanımı
- `MODALS_AND_NOTIFICATIONS.md` - Toast bildirimleri ve modaller

---

## 🔄 Güncelleme Politikası

Bu dokümantasyon dosyaları projedeki değişikliklerle birlikte güncellenmelidir:

- ✅ Yeni route eklendiğinde
- ✅ Database şeması değiştiğinde
- ✅ Yeni middleware eklendiğinde
- ✅ Güvenlik kuralları değiştiğinde
- ✅ Yeni özellik eklendiğinde

---

## 📝 Katkıda Bulunma

Dokümantasyonu güncellerken:
1. Markdown formatını koruyun
2. Kod örneklerini güncel tutun
3. Açıklayıcı başlıklar kullanın
4. Görsel diyagramlar ekleyin (ASCII art)
5. Örneklerle destekleyin

---

## 🎯 Proje Bilgileri

- **Proje Adı:** RBUMS-NodeJS
- **Versiyon:** 1.0.0
- **Teknolojiler:** Node.js, Express.js, PostgreSQL, Bootstrap 5
- **Güvenlik:** JWT, Bcrypt, Helmet, CORS, Rate Limiting
- **Mimari:** Hybrid Layout (SPA + MPA)

---

**Son Güncelleme:** 2025-01-15
**Güncelleyen:** AI Assistant

