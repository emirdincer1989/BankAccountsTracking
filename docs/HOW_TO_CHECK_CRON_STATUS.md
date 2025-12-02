# 🔍 Cron Job Durumunu Kontrol Etme Rehberi

## 🎯 Hızlı Kontrol Yöntemleri

### 1. Frontend'den Kontrol (Önerilen)

1. **Panel'e giriş yapın**
2. **"Cron Yönetimi"** sayfasına gidin
3. **"Loglar"** butonuna tıklayın
4. Job listesinde şunları kontrol edin:
   - ✅ **Durum:** Aktif/Pasif
   - ⏰ **Son Çalışma:** En son ne zaman çalıştı
   - 📊 **Başarı Oranı:** %100 başarılı mı?
   - 🔢 **Çalışma Sayısı:** Kaç kez çalıştı

### 2. SSH Terminalden Kontrol

#### Hızlı Kontrol Scripti:
```bash
cd /var/www/vhosts/finans.eshot.com.tr/httpdocs
node scripts/check_cron_status.js
```

Bu script şunları gösterir:
- ✅ Tüm job'ların durumu
- 📝 Son 10 log kaydı
- 📊 İstatistikler
- 🏦 bankSyncJob detayları

#### Manuel Database Kontrolü:
```bash
# SSH'da PostgreSQL'e bağlan
psql -U postgres -d <database_name>

# Job durumunu kontrol et
SELECT name, is_enabled, last_run_at, last_run_status, run_count 
FROM cron_jobs 
WHERE name = 'bankSyncJob';

# Son logları kontrol et
SELECT job_name, status, started_at, duration, error_message
FROM cron_job_logs
WHERE job_name = 'bankSyncJob'
ORDER BY started_at DESC
LIMIT 10;
```

### 3. API'den Kontrol

#### Job Listesi:
```bash
curl -H "Authorization: Bearer <token>" \
  https://finans.eshot.com.tr/api/cron-management/jobs
```

#### Loglar:
```bash
curl -H "Authorization: Bearer <token>" \
  https://finans.eshot.com.tr/api/cron-management/logs?jobName=bankSyncJob&limit=10
```

---

## 📊 Ne Kontrol Edilmeli?

### ✅ Job Aktif mi?
- Frontend'de: Durum sütununda "Aktif" görünmeli
- SSH'da: `is_enabled = true` olmalı

### ⏰ Son Ne Zaman Çalıştı?
- Frontend'de: "Son Çalışma" sütununda tarih görünmeli
- SSH'da: `last_run_at` NULL olmamalı ve yakın zamanda olmalı

### 📈 Başarılı mı?
- Frontend'de: "Başarı Oranı" %100 olmalı
- SSH'da: `last_run_status = 'SUCCESS'` olmalı
- Loglarda: Son loglar "Başarılı" durumunda olmalı

### 🔢 Kaç Kez Çalıştı?
- Frontend'de: "Çalışma Sayısı" artıyor mu?
- SSH'da: `run_count` artıyor mu?

---

## 🚨 Sorun Tespiti

### Sorun: Job Hiç Çalışmamış
**Kontrol:**
```sql
SELECT last_run_at FROM cron_jobs WHERE name = 'bankSyncJob';
-- NULL ise hiç çalışmamış
```

**Çözüm:**
1. Job aktif mi kontrol et
2. Schedule doğru mu kontrol et (`*/5 * * * *` = Her 5 dakika)
3. Manuel tetikleme yap

### Sorun: Job Sürekli Hata Veriyor
**Kontrol:**
```sql
SELECT error_message, error_stack 
FROM cron_job_logs 
WHERE job_name = 'bankSyncJob' 
AND status = 'FAILED'
ORDER BY started_at DESC
LIMIT 5;
```

**Çözüm:**
- Hata mesajını kontrol et
- Database bağlantısı çalışıyor mu?
- Redis bağlantısı çalışıyor mu? (Opsiyonel)
- Banka API'leri erişilebilir mi?

### Sorun: Job Çalışıyor Ama İşlem Yapmıyor
**Kontrol:**
```sql
-- Aktif hesap var mı?
SELECT COUNT(*) FROM bank_accounts WHERE is_active = true;

-- Son senkronizasyon zamanları
SELECT account_name, last_balance_update 
FROM bank_accounts 
WHERE is_active = true;
```

**Çözüm:**
- Aktif hesap yoksa job çalışır ama işlem yapmaz (normal)
- Hesapların `is_active = true` olduğundan emin ol

---

## 📝 Log Kontrolü

### Frontend'den:
1. Cron Yönetimi sayfasına git
2. "Loglar" butonuna tıkla
3. Son logları kontrol et

### SSH'da:
```bash
# Son 20 log kaydı
node -e "
require('dotenv').config();
const { query } = require('./config/database');
query(\`
    SELECT job_name, status, started_at, duration, error_message
    FROM cron_job_logs
    WHERE job_name = 'bankSyncJob'
    ORDER BY started_at DESC
    LIMIT 20
\`).then(r => {
    r.rows.forEach(log => {
        console.log(\`\${log.started_at} | \${log.status} | \${log.duration}ms\`);
        if (log.error_message) console.log(\`  Hata: \${log.error_message}\`);
    });
    process.exit(0);
});
"
```

---

## 🎯 bankSyncJob İçin Özel Kontroller

### 1. Job Aktif mi?
```sql
SELECT is_enabled FROM cron_jobs WHERE name = 'bankSyncJob';
-- true olmalı
```

### 2. Son Çalışma Ne Zaman?
```sql
SELECT last_run_at, last_run_status 
FROM cron_jobs 
WHERE name = 'bankSyncJob';
-- last_run_at yakın zamanda olmalı (5 dakika içinde)
-- last_run_status = 'SUCCESS' olmalı
```

### 3. Aktif Hesap Var mı?
```sql
SELECT COUNT(*) as count FROM bank_accounts WHERE is_active = true;
-- 0'dan büyük olmalı
```

### 4. Son Senkronizasyonlar
```sql
SELECT account_name, last_balance_update, last_balance
FROM bank_accounts
WHERE is_active = true
ORDER BY last_balance_update DESC;
-- last_balance_update yakın zamanda güncellenmiş olmalı
```

### 5. Yeni Transaction'lar Ekleniyor mu?
```sql
SELECT COUNT(*) as count, MAX(created_at) as last_transaction
FROM transactions
WHERE created_at >= NOW() - INTERVAL '1 hour';
-- Son 1 saatte transaction eklenmiş olmalı
```

### 6. Job Sonuçlarını Kontrol Et (Yeni Hareket Sayısı)
```sql
SELECT 
    started_at,
    status,
    result->>'newTransactions' as yeni_hareket,
    result->>'synced' as senkronize_hesap,
    result->>'count' as toplam_hesap,
    result->>'errors' as hatali_hesap
FROM cron_job_logs
WHERE job_name = 'bankSyncJob'
ORDER BY started_at DESC
LIMIT 10;
-- result kolonunda JSON formatında detaylı bilgi var
```

---

## 🔧 Hızlı Test Komutları

### Job'ı Manuel Tetikle (Frontend):
1. Cron Yönetimi sayfasına git
2. bankSyncJob'ın yanındaki "Manuel Çalıştır" butonuna tıkla
3. Sonucu kontrol et

### Job'ı Manuel Tetikle (SSH):
```bash
# API ile (token gerekir)
curl -X POST \
  -H "Authorization: Bearer <token>" \
  https://finans.eshot.com.tr/api/cron-management/jobs/bankSyncJob/trigger
```

---

## 📞 Yardım

Sorun devam ederse:

1. **check_cron_status.js** scriptini çalıştırın
2. Çıktıyı kaydedin
3. Frontend'den logları kontrol edin
4. Hata mesajlarını paylaşın

---

**Son Güncelleme:** 2025-12-03

