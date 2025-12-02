# Banka Hesapları Senkronizasyon Sistemi

Bu doküman, banka hesaplarının otomatik senkronizasyonunu sağlayan altyapıyı, bileşenleri ve çalışma mantığını açıklar.

**Son Güncelleme:** Aralık 2025  
**Versiyon:** 2.0 (Basitleştirilmiş ve Optimize Edilmiş)

---

## 1. Genel Mimari

Sistem, **Cron Jobs** (Zamanlanmış görevler) kullanarak periyodik olarak banka hesaplarını tarar ve yeni hareketleri veritabanına kaydeder.

### Temel Bileşenler:

1. **Cron Job (`jobs/scheduleBankSync.js`):** Belirlenen aralıklarla (örn: 5 dakikada bir) çalışır ve tüm aktif hesapları paralel olarak senkronize eder.
2. **CronJobManager (`services/cron/CronJobManager.js`):** Job'ları yönetir, çalıştırır ve loglar.
3. **AccountService (`services/AccountService.js`):** İlgili bankanın adaptörünü seçer, veriyi çeker ve veritabanına kaydeder.
4. **Bank Adapters (`services/banks/adapters/`):** Her banka için özel adaptör (Ziraat, Vakıf, Halk).

---

## 2. Çalışma Akışı (Workflow)

### Otomatik Senkronizasyon:

1. **Tetikleme:**
   - `bankSyncJob` isimli Cron görevi her 5 dakikada bir çalışır (ayarlanabilir).
   - Veritabanından `is_active = true` olan tüm banka hesaplarını çeker.

2. **Paralel İşleme:**
   - Hesaplar batch'lere bölünür (varsayılan: 50 hesap/batch).
   - Her batch içinde maksimum 10 hesap aynı anda senkronize edilir (concurrent).
   - Her hesap arasında 100ms bekleme (rate limiting).

3. **Senkronizasyon:**
   - Her hesap için `AccountService.syncAccount(accountId)` çağrılır.
   - AccountService, hesabın hangi bankaya ait olduğunu belirler (Ziraat, Vakıf, Halk).
   - İlgili adaptörü başlatır ve bankanın API'sine bağlanır.
   - **Son 3 günlük** hareketleri çeker (varsayılan, ayarlanabilir).
   - Yeni hareketleri `transactions` tablosuna kaydeder (Mükerrer kayıt kontrolü yapılır).

4. **Sonuç:**
   - Her hesap için kaç yeni hareket geldiği loglanır.
   - Toplam yeni hareket sayısı hesaplanır ve kaydedilir.
   - Başarılı/hatalı hesap sayıları raporlanır.

### Manuel Senkronizasyon:

- **Endpoint:** `POST /api/accounts/:id/sync`
- Tek bir hesap için anlık senkronizasyon yapar.
- Cron job ile aynı mantıkta çalışır (son 3 günlük veri çeker).

---

## 3. Konfigürasyon ve Ayarlar

### Cron Job Ayarları (`jobs/scheduleBankSync.js`)

```javascript
const CONFIG = {
    MAX_CONCURRENT: 10,        // Aynı anda maksimum 10 hesap
    TIMEOUT_PER_ACCOUNT: 90000, // Her hesap için 90 saniye timeout
    RATE_LIMIT_DELAY: 100,     // Her hesap arasında 100ms bekleme
    BATCH_SIZE: 50             // Her batch'te maksimum 50 hesap
};
```

### Cron Schedule (`cron_jobs` tablosu)

- **Varsayılan:** `*/5 * * * *` (Her 5 dakikada bir)
- **Yönetim:** Admin panelindeki "Cron Yönetimi" sayfasından değiştirilebilir.

### Veri Çekme Aralığı (`services/AccountService.js`)

- **Varsayılan:** Son 3 gün
- **Environment Variable:** `SYNC_DAYS_BACK=7` (örn: son 7 gün için)
- **Manuel Tetiklemede:** Tarih aralığı belirtilebilir.

---

## 4. Ölçeklenebilirlik

### Mevcut Kapasite:

- **100 hesap:** ~10-15 saniye içinde tamamlanır
- **Paralel işleme:** Maksimum 10 hesap aynı anda
- **Batch processing:** 50'şerlik gruplar halinde işlenir

### Performans Optimizasyonları:

1. **Paralel Senkronizasyon:** Sequential yerine concurrent çalışır
2. **Rate Limiting:** Banka API'lerine çok fazla istek göndermez
3. **Timeout Koruması:** Takılı kalan hesaplar timeout olur
4. **Batch Processing:** Memory kullanımı kontrol altında

---

## 5. Hata Yönetimi ve İzleme

### Timeout Mekanizması:

- **Job Timeout:** 4 dakika (cron schedule'dan kısa)
- **Hesap Timeout:** 90 saniye (her hesap için)
- Timeout olduğunda job FAILED olarak işaretlenir.

### Takılı Job Temizleme:

- **Otomatik:** Server başlangıcında ve her 10 dakikada bir çalışır
- **Manuel:** Frontend'den "Takılı Job'ları Temizle" butonu ile
- **Kriter:** 2 dakikadan fazla RUNNING durumunda kalan loglar FAILED olarak işaretlenir

### Loglama:

- **Job Logları:** `cron_job_logs` tablosunda
- **Detaylı Loglar:** `logs/combined.log` dosyasında
- **Sonuç Bilgisi:** Her job için kaç yeni hareket geldiği kaydedilir

---

## 6. Monitoring ve Kontrol

### Frontend'den:

- **Cron Yönetimi Sayfası:** Job'ları görüntüleme, aktif/pasif yapma
- **Manuel Tetikleme:** "Manuel Çalıştır" butonu
- **Log Görüntüleme:** "Loglar" butonu ile son çalışmaları görme
- **Takılı Job Temizleme:** "Takılı Job'ları Temizle" butonu

### SSH'dan:

```bash
# Job durumunu kontrol et
node scripts/check_cron_status.js

# Takılı job'ları temizle
node scripts/clear_stuck_jobs.js
```

### Database'den:

```sql
-- Son job çalışmalarını görüntüle
SELECT 
    started_at,
    status,
    duration,
    result->>'newTransactions' as yeni_hareket,
    result->>'synced' as senkronize_hesap,
    result->>'count' as toplam_hesap
FROM cron_job_logs
WHERE job_name = 'bankSyncJob'
ORDER BY started_at DESC
LIMIT 10;

-- Job istatistikleri
SELECT 
    name,
    last_run_at,
    last_run_status,
    run_count,
    success_count,
    error_count
FROM cron_jobs
WHERE name = 'bankSyncJob';
```

---

## 7. Sorun Giderme

### Job Çalışmıyor:

1. Database'de `is_enabled = true` kontrolü yapın
2. `cron_job_logs` tablosunda RUNNING durumunda takılı job var mı kontrol edin
3. Logları kontrol edin: `tail -f logs/combined.log | grep bankSyncJob`

### Job Timeout Oluyor:

1. Hesap sayısını kontrol edin (çok fazla hesap varsa timeout olabilir)
2. `MAX_CONCURRENT` değerini azaltın
3. `TIMEOUT_PER_ACCOUNT` değerini artırın

### Veri Çekilmiyor:

1. Log'larda "yeni hareket çekildi" mesajını kontrol edin
2. Banka API'lerinin çalıştığını doğrulayın
3. Hesap credentials'larının doğru olduğunu kontrol edin

---

## 8. Gelecek Geliştirmeler

- [ ] Redis/Queue sistemi entegrasyonu (opsiyonel, yüksek yük için)
- [ ] Akıllı scheduling (son senkronizasyon zamanına göre)
- [ ] Circuit breaker pattern (banka API'leri için)
- [ ] Real-time monitoring dashboard
- [ ] Email bildirimleri (kritik hatalar için)

---

## 9. İlgili Dosyalar

- **Job:** `jobs/scheduleBankSync.js`
- **Manager:** `services/cron/CronJobManager.js`
- **Service:** `services/AccountService.js`
- **Routes:** `routes/cron-management.js`
- **Frontend:** `assets/pages/cron-management.js`
- **Utility Scripts:** 
  - `scripts/check_cron_status.js` - Durum kontrolü
  - `scripts/clear_stuck_jobs.js` - Takılı job temizleme

---

**Not:** Bu sistem 100 hesaba kadar ölçeklenebilir şekilde tasarlanmıştır. Daha fazla hesap için Redis/Queue sistemi entegrasyonu önerilir.
