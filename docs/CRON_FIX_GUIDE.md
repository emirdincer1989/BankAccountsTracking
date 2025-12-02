# 🔧 Cron Sistemi Düzeltme Rehberi

Bu dokümantasyon, cron sisteminin çalışmaması durumunda yapılacak adımları açıklar.

## 🚨 Sorun Tespiti

### Debug Scripti Çalıştırın

```bash
node scripts/debug_cron.js
```

Bu script şunları kontrol eder:
- ✅ Database'de job kaydı var mı?
- ✅ Redis bağlantısı çalışıyor mu?
- ✅ CronJobManager'da job register edilmiş mi?
- ✅ QueueManager çalışıyor mu?
- ✅ ScheduleBankSync fonksiyonu mevcut mu?

### Manuel Tetikleme Testi (Opsiyonel)

```bash
node scripts/debug_cron.js --test-trigger
```

## 🔧 Düzeltme Adımları

### 1. Job'ı Aktif Hale Getirin

```bash
node scripts/fix_cron_job.js
```

Bu script:
- Database'de `bankSyncJob` kaydını kontrol eder
- Yoksa oluşturur
- Pasifse aktif eder
- Durumu gösterir

### 2. Server'ı Yeniden Başlatın

```bash
npm start
# veya
node server.js
```

Server başlatılırken şu logları görmelisiniz:
```
✅ 3 cron job database'den yüklendi
✅ bankSyncJob kaydedildi (Schedule: */5 * * * *, Enabled: true)
✅ Cron job başlatma tamamlandı: 3 başarılı, 0 hata
▶️  3 aktif job çalışıyor
```

### 3. Manuel Tetikleme Testi

#### API ile (Frontend'den veya Postman):

```bash
POST /api/cron-management/jobs/bankSyncJob/trigger
Authorization: Bearer <token>
```

#### Script ile:

```bash
node scripts/test_cron_trigger.js
```

**NOT:** Bu script lokal bilgisayardan çalıştırıldığında banka API'lerine erişemeyebilir. Uzak sunucuda çalıştırın.

## 📊 Durum Kontrolü

### Job Listesi

```bash
GET /api/cron-management/jobs
```

### Job Logları

```bash
GET /api/cron-management/logs?jobName=bankSyncJob&limit=10
```

### İstatistikler

```bash
GET /api/cron-management/stats
```

## ⚠️ Yaygın Sorunlar ve Çözümleri

### Sorun 1: Job Database'de Yok

**Belirti:**
```
❌ bankSyncJob database'de bulunamadı!
```

**Çözüm:**
```bash
node scripts/fix_cron_job.js
```

### Sorun 2: Job Pasif Durumda

**Belirti:**
```
Enabled: false
```

**Çözüm:**
```bash
node scripts/fix_cron_job.js
```

Veya manuel olarak:
```sql
UPDATE cron_jobs SET is_enabled = true WHERE name = 'bankSyncJob';
```

### Sorun 3: Redis Bağlantı Hatası

**Belirti:**
```
❌ Redis bağlantı hatası: ...
```

**Çözüm:**
- Redis yüklü ve çalışıyor mu kontrol edin
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` environment variable'larını kontrol edin
- Redis yoksa sorun değil! Sistem fallback modda çalışır (direkt çalıştırma)

### Sorun 4: Job Register Edilmemiş

**Belirti:**
```
❌ bankSyncJob CronJobManager'da register edilmemiş!
```

**Çözüm:**
1. `server.js` dosyasında `initCronJobs()` fonksiyonunu kontrol edin
2. `bankSyncJob` için `registerJob` çağrısı olmalı
3. Server'ı yeniden başlatın

### Sorun 5: Manuel Tetikleme Çalışmıyor

**Belirti:**
```
Job bulunamadı: bankSyncJob
```

**Çözüm:**
1. Server'ın çalıştığından emin olun
2. Job'ın register edildiğini kontrol edin: `node scripts/debug_cron.js`
3. Super admin yetkisiyle giriş yaptığınızdan emin olun

## 🔍 Log Kontrolü

### Server Logları

Server başlatılırken şu logları kontrol edin:

```javascript
// Başarılı durum:
✅ 3 cron job database'den yüklendi
✅ bankSyncJob kaydedildi (Schedule: */5 * * * *, Enabled: true)
✅ Cron job başlatma tamamlandı: 3 başarılı, 0 hata
▶️  3 aktif job çalışıyor

// Hata durumu:
❌ Cron job başlatma hatası: ...
```

### Job Çalışma Logları

Job çalıştığında şu logları görmelisiniz:

```javascript
🕒 Scheduled Job: Adding bank accounts to sync queue...
📋 3 aktif hesap bulundu
✅ Sync job finished. Total: 3, Queued: 3, Direct: 0, Errors: 0
```

## 📝 Database Kontrolü

### Job Durumunu Kontrol Et

```sql
SELECT 
    name,
    schedule,
    is_enabled,
    last_run_at,
    last_run_status,
    run_count,
    success_count,
    error_count
FROM cron_jobs
WHERE name = 'bankSyncJob';
```

### Son Çalışma Loglarını Kontrol Et

```sql
SELECT 
    job_name,
    status,
    started_at,
    completed_at,
    duration,
    error_message
FROM cron_job_logs
WHERE job_name = 'bankSyncJob'
ORDER BY started_at DESC
LIMIT 10;
```

## 🚀 Production'a Deploy

### 1. Lokal Geliştirme

1. Değişiklikleri yapın
2. Test edin: `node scripts/debug_cron.js`
3. Commit edin: `git add . && git commit -m "Cron sistemi düzeltmeleri"`

### 2. Uzak Sunucuya Deploy

```bash
# Uzak sunucuda
git pull origin main
npm install  # Gerekirse
node scripts/fix_cron_job.js  # Job'ı aktif et
pm2 restart all  # veya server'ı yeniden başlat
```

### 3. Kontrol

```bash
# Logları kontrol et
pm2 logs

# Veya
tail -f logs/combined.log
```

## 📞 Yardım

Sorun devam ederse:

1. `scripts/debug_cron.js` çalıştırın ve çıktıyı kaydedin
2. Server loglarını kontrol edin
3. Database'deki job kaydını kontrol edin
4. Redis durumunu kontrol edin (varsa)

---

**Son Güncelleme:** 2025-12-03

