# 📋 Geliştirme Checklist'i

Bu checklist, proje geliştirirken dikkat edilmesi gereken tüm hususları içerir. Her özellik eklerken veya değişiklik yaparken bu listeyi kontrol edin.

---

## 🔒 Güvenlik Kontrolleri

### Veritabanı Güvenliği
- [ ] **SQL Injection Koruması**: Tüm SQL sorgularında parameterized queries kullanıldı mı?
  ```javascript
  // ❌ YANLIŞ
  const query = `SELECT * FROM users WHERE id = ${id}`;
  
  // ✅ DOĞRU
  const query = `SELECT * FROM users WHERE id = $1`;
  await query(query, [id]);
  ```

- [ ] **Input Validation**: Tüm kullanıcı inputları validate edildi mi?
  - [ ] Joi/Yup/Zod şeması oluşturuldu mu?
  - [ ] `validateInput` middleware'i kullanıldı mı?
  - [ ] XSS koruması var mı?

- [ ] **Hassas Veri Şifreleme**: Şifreler ve hassas veriler şifrelendi mi?
  - [ ] Şifreler için `bcrypt.hash()` kullanıldı mı?
  - [ ] Hassas veriler için `DataEncryption.encrypt()` kullanıldı mı?

### API Güvenliği
- [ ] **Authentication**: Route'da `authMiddleware` eklendi mi?
- [ ] **Authorization**: Yetki kontrolü yapıldı mı? (`authorize` middleware)
- [ ] **Rate Limiting**: Rate limiting eklendi mi?
  - [ ] Login için `loginLimiter` kullanıldı mı?
  - [ ] Genel API için `apiLimiter` kullanıldı mı?
- [ ] **CORS**: CORS yapılandırması doğru mu?
- [ ] **Helmet**: Helmet middleware eklendi mi?

### Güvenlik Best Practices
- [ ] **Environment Variables**: Hardcoded secrets var mı? (ASLA OLMAMALI)
- [ ] **HTTPS**: Production'da HTTPS kullanılıyor mu?
- [ ] **Error Messages**: Hata mesajlarında hassas bilgi sızdırılıyor mu?
- [ ] **Audit Logging**: Kritik işlemler audit log'a kaydediliyor mu?

---

## 📝 Kod Kalitesi

### Kod Standartları
- [ ] **ESLint**: ESLint hataları kontrol edildi mi?
- [ ] **Prettier**: Kod formatlandı mı?
- [ ] **Kod Tekrarı**: DRY principle'a uyuldu mu?
- [ ] **Fonksiyon Sorumluluğu**: Her fonksiyon tek bir işe odaklanıyor mu? (SRP)

### Error Handling
- [ ] **Try-Catch**: Tüm async işlemler try-catch içinde mi?
- [ ] **Error Logging**: Hatalar logger ile kaydediliyor mu?
  ```javascript
  try {
    // işlem
  } catch (error) {
    logger.error('İşlem hatası', error);
    // kullanıcıya anlamlı mesaj göster
  }
  ```
- [ ] **User-Friendly Messages**: Kullanıcıya anlamlı hata mesajları gösteriliyor mu?

### Async/Await
- [ ] **Promise Chain**: Promise chain yerine async/await kullanıldı mı?
- [ ] **Paralel İşlemler**: Mümkünse `Promise.all()` kullanıldı mı?
- [ ] **Error Handling**: Async fonksiyonlarda error handling var mı?

---

## 🎨 Frontend Standartları

### Modal ve Bildirimler
- [ ] **Success Messages**: `showSuccess()` kullanıldı mı?
- [ ] **Error Messages**: `showError()` kullanıldı mı?
- [ ] **Loading States**: Loading gösterimi için `showLoading()` kullanıldı mı?
- [ ] **Confirmation**: Silme işlemleri için `showConfirmDelete()` kullanıldı mı?

### Event Listeners
- [ ] **Duplicate Prevention**: Event listener'lar tekrar ekleniyor mu? (`dataset.listenerAdded` kontrolü)
- [ ] **Event Delegation**: Mümkünse event delegation kullanıldı mı?
- [ ] **Modal Events**: Modal açıldığında event listener'lar kontrol edildi mi?

### DOM Manipülasyonu
- [ ] **XSS Protection**: `innerHTML` yerine `textContent` kullanıldı mı?
- [ ] **Input Sanitization**: Kullanıcı inputları sanitize edildi mi?
- [ ] **Bootstrap Modals**: Bootstrap modal API'si doğru kullanıldı mı?

---

## 🗄️ Veritabanı Standartları

### Migration Sistemi
- [ ] **Migration Dosyası**: Yeni tablo/kolon için migration oluşturuldu mu?
- [ ] **Migration Numarası**: Migration numarası sıralı mı? (001_, 002_, ...)
- [ ] **Up/Down**: Migration geri alınabilir mi? (up/down fonksiyonları)
- [ ] **Migration Çalıştırma**: Migration test edildi mi?

### Query Patterns
- [ ] **Parameterized Queries**: Tüm sorgular parameterized mi?
- [ ] **Transaction**: Birden fazla query için transaction kullanıldı mı?
- [ ] **Error Handling**: Query hatalarında rollback yapılıyor mu?

### Database Optimizasyonu
- [ ] **Indexes**: Gerekli index'ler eklendi mi?
- [ ] **N+1 Problem**: N+1 query problemi var mı?
- [ ] **Connection Pooling**: Connection pooling kullanılıyor mu?

---

## 📚 Dokümantasyon

### Kod Dokümantasyonu
- [ ] **JSDoc**: Fonksiyonlar için JSDoc yorumları eklendi mi?
- [ ] **Complex Logic**: Karmaşık mantık için açıklayıcı yorumlar var mı?
- [ ] **API Docs**: API endpoint'leri dokümante edildi mi?

### Proje Dokümantasyonu
- [ ] **README**: README.md güncellendi mi?
- [ ] **CHANGELOG**: CHANGELOG.md güncellendi mi?
- [ ] **Feature Docs**: Yeni özellik için `docs/` klasörüne dokümantasyon eklendi mi?

---

## 🚀 Performans

### Backend Performans
- [ ] **Database Queries**: Query'ler optimize edildi mi?
- [ ] **Caching**: Cache kullanımı uygun mu?
- [ ] **Connection Pooling**: Connection pooling yapılandırıldı mı?

### Frontend Performans
- [ ] **Lazy Loading**: Lazy loading kullanıldı mı?
- [ ] **Image Optimization**: Görseller optimize edildi mi?
- [ ] **Bundle Size**: Bundle size kontrol edildi mi?
- [ ] **Re-renders**: Gereksiz re-render'lar önlendi mi?

---

## 🧪 Test ve Doğrulama

### Fonksiyonellik Testi
- [ ] **Happy Path**: Normal akış test edildi mi?
- [ ] **Error Cases**: Hata durumları test edildi mi?
- [ ] **Edge Cases**: Sınır durumları test edildi mi?

### Güvenlik Testi
- [ ] **SQL Injection**: SQL injection test edildi mi?
- [ ] **XSS**: XSS koruması test edildi mi?
- [ ] **Authorization**: Yetki kontrolü test edildi mi?

### Kullanıcı Deneyimi
- [ ] **Loading States**: Loading durumları doğru gösteriliyor mu?
- [ ] **Error Messages**: Hata mesajları kullanıcı dostu mu?
- [ ] **Success Feedback**: Başarılı işlemler için geri bildirim var mı?

---

## 🔄 Git ve Versiyonlama

### Commit Öncesi
- [ ] **Linter**: Linter hataları düzeltildi mi?
- [ ] **Formatting**: Kod formatlandı mı?
- [ ] **Tests**: Testler çalıştırıldı mı? (varsa)
- [ ] **User Approval**: Kullanıcıdan onay alındı mı? (değişiklik işlemleri için)

### Commit Mesajları
- [ ] **Semantic Commits**: Semantic commit mesajı kullanıldı mı?
  - `feat:` - Yeni özellik
  - `fix:` - Bug fix
  - `docs:` - Dokümantasyon
  - `refactor:` - Refactoring
  - `chore:` - Genel işler

### Git Best Practices
- [ ] **.env**: .env dosyası commit edilmedi mi?
- [ ] **node_modules**: node_modules commit edilmedi mi?
- [ ] **Force Push**: Force push yapılmadı mı? (mümkünse)

---

## 📋 Özel Proje Kuralları

### Cron Job Sistemi
- [ ] **Job Dosyası**: `jobs/` klasörüne job eklendi mi?
- [ ] **Registration**: Job `server.js`'de register edildi mi?
- [ ] **Database Config**: Database'e job config'i eklendi mi?
- [ ] **Documentation**: `docs/CRON_JOB_SYSTEM.md` güncellendi mi?

### Sayfa Ekleme
- [ ] **Frontend File**: `assets/pages/` klasörüne JavaScript dosyası eklendi mi?
- [ ] **API Route**: `routes/` klasörüne API route'u eklendi mi?
- [ ] **Route Registration**: `server.js`'de route register edildi mi?
- [ ] **Menu Entry**: Menüye eklendi mi?

### Audit Logging
- [ ] **Critical Actions**: Kritik işlemler için audit log eklendi mi?
- [ ] **Log Data**: User ID, action, table_name, old_values, new_values kaydedildi mi?

---

## ⚠️ Yapılmaması Gerekenler Kontrolü

- [ ] **Raw SQL**: Raw SQL concatenation kullanılmadı mı?
- [ ] **Hardcoded Secrets**: Hardcoded secrets yok mu?
- [ ] **Console.log**: Console.log ile hassas veri yazdırılmadı mı?
- [ ] **Direct req.body**: Validation olmadan req.body kullanılmadı mı?
- [ ] **HTTP**: HTTP bağlantıları yerine HTTPS kullanıldı mı?
- [ ] **Unencrypted Data**: Şifrelenmemiş hassas veri saklanmadı mı?

---

## 📝 Son Kontroller

### Kod İnceleme
- [ ] **Code Review**: Kod başka biri tarafından incelendi mi? (mümkünse)
- [ ] **Self Review**: Kendi kodunuzu gözden geçirdiniz mi?
- [ ] **Best Practices**: Best practices'e uyuldu mu?

### Deployment Öncesi
- [ ] **Environment Variables**: Environment variables doğru ayarlandı mı?
- [ ] **Database Migration**: Migration'lar production'da çalıştırıldı mı?
- [ ] **Backup**: Backup alındı mı? (production için)
- [ ] **Rollback Plan**: Rollback planı hazır mı?

---

## 🎯 Kullanım

Bu checklist'i kullanırken:

1. **Her özellik eklerken** bu listeyi kontrol edin
2. **Her commit öncesi** kritik maddeleri kontrol edin
3. **Code review** sırasında bu listeyi referans alın
4. **Production'a geçmeden önce** tüm maddeleri kontrol edin

---

## 📞 Yardım

Checklist hakkında sorularınız için:
- `docs/SECURITY_RULES.md` dosyasını kontrol edin
- `.cursorrules` dosyasını inceleyin
- Mevcut kod örneklerini referans alın

