# 🕐 RBUMS Cron Job Sistemi Dokümantasyonu

## 📋 İçindekiler
1. [Sistem Mimarisi](#sistem-mimarisi)
2. [Çalışma Mantığı](#çalışma-mantığı)
3. [Yeni Job Ekleme](#yeni-job-ekleme)
4. [Mevcut Özellikler](#mevcut-özellikler)
5. [İleri Seviye Geliştirmeler](#ileri-seviye-geliştirmeler)

---

## 🏗️ Sistem Mimarisi

### Temel Bileşenler

```
📁 jobs/                          # Job tanımları
├── testModalJob.js              # Örnek job
└── [yeniJob].js                 # Yeni eklenecek job'lar

📁 services/cron/
└── CronJobManager.js            # Ana yönetici sınıf

📁 routes/
└── cron-management.js           # API endpoints

📁 assets/pages/
└── cron-management.js           # Frontend arayüz

🗄️ Database:
├── cron_jobs                    # Job tanımları ve config
└── cron_job_logs                # Çalışma logları
```

---

## ⚙️ Çalışma Mantığı

### 1. Sistem Başlangıcı (`server.js`)

```javascript
// 1. CronJobManager instance oluşturulur
const CronJobManager = require('./services/cron/CronJobManager');
const cronManager = new CronJobManager();

// 2. Job dosyaları require edilir
const testModalJob = require('./jobs/testModalJob');

// 3. Database'den job config'leri yüklenir
const jobConfigs = await cronManager.loadJobsFromDB();

// 4. Her job register edilir
jobConfigs.forEach(jobConfig => {
    if (jobConfig.name === 'testModalJob') {
        cronManager.registerJob(jobConfig, testModalJob);
    }
    // Diğer job'lar...
});

// 5. Aktif job'lar başlatılır
await cronManager.startAll();
```

### 2. Job Çalışma Akışı

```
┌─────────────────────────────────────────────────────────┐
│                   JOB ÇALIŞMA AKIŞI                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1️⃣ Schedule Tetiklendi (ör: Her dakika)                │
│          ↓                                                │
│  2️⃣ Kontroler:                                           │
│     • Database'de is_enabled = true mi?                  │
│     • stoppedJobs Map'inde yok mu?                       │
│     • Şu anda çalışmıyor mu? (runningExecutions)         │
│          ↓                                                │
│  3️⃣ Kontroller Geçti → Job Çalıştır                     │
│     • cron_job_logs tablosuna "RUNNING" kaydı            │
│     • runningExecutions Map'ine ekle                     │
│     • Task fonksiyonunu çalıştır                         │
│          ↓                                                │
│  4️⃣ Job Tamamlandı                                       │
│     • cron_jobs tablosuna istatistikler kaydet           │
│       - last_run_at                                      │
│       - last_run_status (SUCCESS/FAILED)                 │
│       - run_count++                                      │
│       - success_count++ (veya error_count++)             │
│     • cron_job_logs tablosunu güncelle                   │
│       - status = "SUCCESS"                               │
│       - completed_at                                     │
│       - duration                                         │
│     • runningExecutions Map'inden çıkar                  │
│          ↓                                                │
│  5️⃣ Özel İşlemler (opsiyonel)                           │
│     • Socket.io ile frontend'e bildirim                  │
│     • testModalJob → Modal göster                        │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 3. Manuel Tetikleme Akışı

```
┌─────────────────────────────────────────────────────────┐
│              MANUEL TETİKLEME AKIŞI                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  1️⃣ Frontend: "Manuel Çalıştır" butonuna tıklanır       │
│          ↓                                                │
│  2️⃣ API Request:                                         │
│     POST /api/cron-management/jobs/:name/trigger         │
│          ↓                                                │
│  3️⃣ Backend: cronManager.runNow(name)                   │
│     • forceRun = true ile executeJob çağrılır            │
│     • ⚡ Database is_enabled kontrolü BYPASS             │
│     • ⚡ stoppedJobs kontrolü BYPASS                     │
│     • ✅ "Already running" kontrolü HALA GEÇERLİ        │
│          ↓                                                │
│  4️⃣ Job çalışır ve sonuç döner                          │
│          ↓                                                │
│  5️⃣ Frontend:                                            │
│     • Başarılı mesajı gösterilir                         │
│     • result.data.message varsa → Modal açılır           │
│     • Job listesi yenilenir                              │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 4. Kontrol Mekanizmaları

| Kontrol Türü | Otomatik Çalışma | Manuel Tetikleme |
|--------------|------------------|------------------|
| **is_enabled (Database)** | ✅ Kontrol edilir | ⚡ BYPASS |
| **stoppedJobs (Memory)** | ✅ Kontrol edilir | ⚡ BYPASS |
| **Already Running** | ✅ Kontrol edilir | ✅ Kontrol edilir |

---

## 🆕 Yeni Job Ekleme Rehberi

### Adım 1: Job Dosyası Oluştur

`jobs/emailReminderJob.js`:

```javascript
/**
 * Email Reminder Job
 * 
 * Her gün sabah 9'da kullanıcılara hatırlatma emaili gönderir.
 */

const { logger } = require('../utils/logger');
const { query } = require('../config/database');
const { sendEmail } = require('../utils/email');

async function emailReminderJob() {
    const jobName = 'emailReminderJob';

    try {
        logger.info(`📧 ${jobName} başlatıldı...`);

        // İş mantığınız burada
        const users = await query(`
            SELECT email, name 
            FROM users 
            WHERE email_notifications = true
        `);

        let sentCount = 0;
        for (const user of users.rows) {
            await sendEmail({
                to: user.email,
                subject: 'Günlük Hatırlatma',
                body: `Merhaba ${user.name}, ...`
            });
            sentCount++;
        }

        logger.info(`✅ ${jobName} tamamlandı: ${sentCount} email gönderildi`);

        // Başarılı sonuç dön
        return {
            success: true,
            sentCount,
            timestamp: new Date()
        };

    } catch (error) {
        logger.error(`❌ ${jobName} hatası:`, error);
        throw error; // CronJobManager otomatik loglar
    }
}

module.exports = emailReminderJob;
```

### Adım 2: Database'e Kayıt Ekle

```sql
-- Migration dosyası veya manuel SQL
INSERT INTO cron_jobs (
    name, 
    title, 
    description, 
    schedule, 
    is_enabled, 
    config
) VALUES (
    'emailReminderJob',
    'Email Hatırlatma',
    'Her gün sabah 9:00''da kullanıcılara hatırlatma emaili gönderir',
    '0 9 * * *',  -- Her gün 09:00
    true,
    '{}'::jsonb
);
```

### Adım 3: server.js'e Ekle

```javascript
// server.js içinde

// 1. Require et
const emailReminderJob = require('./jobs/emailReminderJob');

// 2. Register et (loadJobsFromDB'den sonra)
jobConfigs.forEach(jobConfig => {
    if (jobConfig.name === 'testModalJob') {
        cronManager.registerJob(jobConfig, testModalJob);
    } else if (jobConfig.name === 'emailReminderJob') {
        cronManager.registerJob(jobConfig, emailReminderJob);
    }
});
```

### Adım 4: Server'ı Yeniden Başlat

```bash
npm start
# veya
node server.js
```

### ✅ Kontrol

1. **Cron Management** sayfasına git
2. Yeni job listede görünmeli
3. **Manuel Çalıştır** ile test et
4. **Schedule Düzenle** ile zamanlamayı ayarla
5. **Aktif/Pasif** ile durdur/başlat

---

## 🏦 bankSyncJob - Banka Senkronizasyon Job'u

### Genel Bakış

`bankSyncJob` tüm aktif banka hesaplarını periyodik olarak senkronize eder. Her 5 dakikada bir çalışır ve son 3 günlük hareketleri çeker.

### Özellikler

- ✅ **Paralel Senkronizasyon:** Aynı anda maksimum 10 hesap senkronize edilir
- ✅ **Batch Processing:** Hesaplar 50'şerlik gruplar halinde işlenir
- ✅ **Rate Limiting:** Banka API'lerine çok fazla istek göndermez
- ✅ **Timeout Koruması:** Her hesap için 90 saniye timeout
- ✅ **Detaylı Loglama:** Her hesap için kaç yeni hareket geldiği kaydedilir
- ✅ **Otomatik Temizleme:** Takılı kalan job'lar otomatik temizlenir

### Konfigürasyon

**Dosya:** `jobs/scheduleBankSync.js`

```javascript
const CONFIG = {
    MAX_CONCURRENT: 10,        // Aynı anda maksimum 10 hesap
    TIMEOUT_PER_ACCOUNT: 90000, // Her hesap için 90 saniye
    RATE_LIMIT_DELAY: 100,     // Her hesap arasında 100ms
    BATCH_SIZE: 50             // Her batch'te 50 hesap
};
```

### Veri Çekme

- **Varsayılan:** Son 3 günlük hareketler
- **Environment Variable:** `SYNC_DAYS_BACK=7` (son 7 gün için)
- **Manuel Tetiklemede:** Tarih aralığı belirtilebilir

### Sonuç Takibi

Job başarılı olduğunda:
- **Log'da:** Kaç yeni hareket çekildiği gösterilir
- **Database'de:** `cron_job_logs.result` kolonunda JSON olarak kaydedilir
- **Frontend'de:** Log tablosunda "Detay" kolonunda gösterilir

**Örnek Sonuç:**
```json
{
  "success": true,
  "newTransactions": 15,
  "count": 3,
  "synced": 3,
  "errors": 0,
  "batches": 1
}
```

### Performans

- **3 hesap:** ~1-2 saniye
- **100 hesap:** ~10-15 saniye
- **Ölçeklenebilirlik:** 100 hesaba kadar optimize edilmiştir

### İlgili Dokümantasyon

- Detaylı sistem dokümantasyonu: [`docs/bank_sync_system.md`](./bank_sync_system.md)
- Durum kontrolü: [`docs/HOW_TO_CHECK_CRON_STATUS.md`](./HOW_TO_CHECK_CRON_STATUS.md)

---

## 🎯 Mevcut Özellikler

### ✅ Şu An Yapabilecekleriniz

#### 1. **Zamanlama (Cron Expression)**

Mevcut sistemde **tam esneklik** var! Tüm cron expression formatları destekleniyor:

| Format | Açıklama | Örnek |
|--------|----------|-------|
| `* * * * *` | Her dakika | `* * * * *` |
| `*/N * * * *` | Her N dakikada | `*/5 * * * *` (Her 5 dakika) |
| `0 * * * *` | Her saat başı | `0 * * * *` |
| `0 */N * * *` | Her N saatte | `0 */6 * * *` (Her 6 saatte) |
| `0 H * * *` | Her gün belirli saat | `0 9 * * *` (Her gün 09:00) |
| `0 H * * D` | Belirli gün/saat | `0 9 * * 1` (Her Pazartesi 09:00) |
| `0 H D * *` | Ayın belirli günü | `0 0 1 * *` (Her ayın 1'i gece yarısı) |

**Cron Expression Formatı:**
```
┌───────────── Dakika (0 - 59)
│ ┌───────────── Saat (0 - 23)
│ │ ┌───────────── Ayın günü (1 - 31)
│ │ │ ┌───────────── Ay (1 - 12)
│ │ │ │ ┌───────────── Haftanın günü (0 - 6) (Pazar = 0)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Örnekler:**

```javascript
'0 9 * * *'        // Her gün sabah 09:00
'0 9,18 * * *'     // Her gün 09:00 ve 18:00
'0 9-17 * * *'     // Her gün 09:00'dan 17:00'ye kadar her saat
'0 9 * * 1-5'      // Hafta içi her gün 09:00
'0 0 1,15 * *'     // Ayda iki kez (1'i ve 15'i gece yarısı)
'*/30 9-17 * * 1-5' // Hafta içi 09:00-17:00 arası her 30 dakika
```

#### 2. **Frontend Özellikleri**

- ✅ Job listesini görüntüleme
- ✅ İstatistikler (toplam çalışma, başarı oranı, vs.)
- ✅ Aktif/Pasif yapma
- ✅ Manuel tetikleme (disabled olsa bile)
- ✅ Schedule düzenleme (dropdown'dan seçim)
- ✅ Log görüntüleme
- ✅ Gerçek zamanlı durum güncellemeleri

#### 3. **Veritabanı Takibi**

- ✅ Her çalışma loglanır (`cron_job_logs`)
- ✅ Başarı/hata sayıları tutulur
- ✅ Çalışma süreleri kaydedilir
- ✅ Son çalışma durumu saklanır

#### 4. **Güvenlik ve Kontrol**

- ✅ Super admin yetkisi gerekir
- ✅ Her işlem audit log'a kaydedilir
- ✅ Aynı anda çalışma engellenir
- ✅ Database ve memory kontrolü

---

## 🚀 İleri Seviye Geliştirmeler

Şimdi önerdiğiniz özellikleri nasıl ekleyebileceğinizi göstereyim:

### 1️⃣ **Günlük Çalışma Limiti**

#### Database Şeması Güncellemesi

```sql
ALTER TABLE cron_jobs 
ADD COLUMN daily_run_limit INTEGER DEFAULT NULL,
ADD COLUMN daily_run_count INTEGER DEFAULT 0,
ADD COLUMN last_daily_reset DATE DEFAULT CURRENT_DATE;
```

#### CronJobManager.js Güncelleme

```javascript
async executeJob(name, taskFunction, config, forceRun = false) {
    // Günlük limit kontrolü (manuel tetiklemede de geçerli)
    const limitCheck = await query(`
        SELECT daily_run_limit, daily_run_count, last_daily_reset
        FROM cron_jobs
        WHERE name = $1
    `, [name]);
    
    const jobLimit = limitCheck.rows[0];
    const today = new Date().toISOString().split('T')[0];
    
    // Eğer gün değiştiyse sayacı sıfırla
    if (jobLimit.last_daily_reset !== today) {
        await query(`
            UPDATE cron_jobs
            SET daily_run_count = 0, last_daily_reset = $1
            WHERE name = $2
        `, [today, name]);
        jobLimit.daily_run_count = 0;
    }
    
    // Limit kontrolü
    if (jobLimit.daily_run_limit && 
        jobLimit.daily_run_count >= jobLimit.daily_run_limit) {
        logger.warn(`⚠️ ${name} günlük limitine ulaştı (${jobLimit.daily_run_limit})`);
        return { 
            skipped: true, 
            reason: `Daily limit reached (${jobLimit.daily_run_limit})` 
        };
    }
    
    // Mevcut kod devam eder...
    // ...
    
    // Başarılı çalışmadan sonra sayacı artır
    await query(`
        UPDATE cron_jobs
        SET daily_run_count = daily_run_count + 1
        WHERE name = $1
    `, [name]);
}
```

### 2️⃣ **Minimum Tekrar Çalışma Limiti (Cooldown)**

#### Database Şeması

```sql
ALTER TABLE cron_jobs 
ADD COLUMN min_interval_seconds INTEGER DEFAULT NULL;
```

#### CronJobManager.js Güncelleme

```javascript
async executeJob(name, taskFunction, config, forceRun = false) {
    // Minimum interval kontrolü
    const cooldownCheck = await query(`
        SELECT min_interval_seconds, last_run_at
        FROM cron_jobs
        WHERE name = $1
    `, [name]);
    
    const jobCooldown = cooldownCheck.rows[0];
    
    if (jobCooldown.min_interval_seconds && jobCooldown.last_run_at) {
        const lastRunTime = new Date(jobCooldown.last_run_at).getTime();
        const now = Date.now();
        const elapsedSeconds = (now - lastRunTime) / 1000;
        
        if (elapsedSeconds < jobCooldown.min_interval_seconds) {
            const remainingSeconds = jobCooldown.min_interval_seconds - elapsedSeconds;
            logger.warn(`⏱️ ${name} cooldown'da: ${Math.ceil(remainingSeconds)}s kaldı`);
            return { 
                skipped: true, 
                reason: `Cooldown (${Math.ceil(remainingSeconds)}s remaining)` 
            };
        }
    }
    
    // Mevcut kod devam eder...
}
```

### 3️⃣ **Zaman Pencereleri (Time Windows)**

Sadece belirli saatler arasında çalışsın:

#### Database Şeması

```sql
ALTER TABLE cron_jobs 
ADD COLUMN time_window_start TIME DEFAULT NULL,
ADD COLUMN time_window_end TIME DEFAULT NULL;
```

#### CronJobManager.js

```javascript
async executeJob(name, taskFunction, config, forceRun = false) {
    // Zaman penceresi kontrolü
    const timeCheck = await query(`
        SELECT time_window_start, time_window_end
        FROM cron_jobs
        WHERE name = $1
    `, [name]);
    
    const jobTime = timeCheck.rows[0];
    
    if (jobTime.time_window_start && jobTime.time_window_end) {
        const now = new Date();
        const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
        
        if (currentTime < jobTime.time_window_start || 
            currentTime > jobTime.time_window_end) {
            logger.warn(`⏰ ${name} zaman penceresi dışında: ${currentTime}`);
            return { 
                skipped: true, 
                reason: `Outside time window (${jobTime.time_window_start}-${jobTime.time_window_end})` 
            };
        }
    }
    
    // Mevcut kod devam eder...
}
```

### 4️⃣ **Retry Mekanizması**

Hata durumunda otomatik yeniden deneme:

#### Database Şeması

```sql
ALTER TABLE cron_jobs 
ADD COLUMN max_retries INTEGER DEFAULT 0,
ADD COLUMN retry_delay_seconds INTEGER DEFAULT 60;

ALTER TABLE cron_job_logs
ADD COLUMN retry_count INTEGER DEFAULT 0;
```

#### CronJobManager.js

```javascript
async executeJobWithRetry(name, taskFunction, config, forceRun = false, retryCount = 0) {
    try {
        const result = await this.executeJob(name, taskFunction, config, forceRun);
        return result;
    } catch (error) {
        // Retry ayarlarını al
        const retrySettings = await query(`
            SELECT max_retries, retry_delay_seconds
            FROM cron_jobs
            WHERE name = $1
        `, [name]);
        
        const maxRetries = retrySettings.rows[0].max_retries;
        const retryDelay = retrySettings.rows[0].retry_delay_seconds;
        
        if (retryCount < maxRetries) {
            logger.warn(`🔄 ${name} retry ${retryCount + 1}/${maxRetries} (${retryDelay}s sonra)`);
            
            // Bekle
            await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
            
            // Yeniden dene
            return await this.executeJobWithRetry(
                name, 
                taskFunction, 
                config, 
                forceRun, 
                retryCount + 1
            );
        }
        
        // Max retry aşıldı
        logger.error(`❌ ${name} max retry aşıldı`);
        throw error;
    }
}
```

### 5️⃣ **Dependency (Bağımlılık) Yönetimi**

Bir job başka bir job'ın tamamlanmasını beklesin:

#### Database Şeması

```sql
CREATE TABLE cron_job_dependencies (
    id SERIAL PRIMARY KEY,
    job_name VARCHAR(100) REFERENCES cron_jobs(name),
    depends_on VARCHAR(100) REFERENCES cron_jobs(name),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Örnek Kullanım

```sql
-- backupJob, dataCleanupJob'ın tamamlanmasını bekler
INSERT INTO cron_job_dependencies (job_name, depends_on)
VALUES ('backupJob', 'dataCleanupJob');
```

### 6️⃣ **Priority (Öncelik) Sistemi**

#### Database Şeması

```sql
ALTER TABLE cron_jobs 
ADD COLUMN priority INTEGER DEFAULT 5; -- 1 (en düşük) - 10 (en yüksek)
```

Aynı anda birden fazla job çalışacaksa, önce yüksek priority'liler çalışsın.

### 7️⃣ **Webhook Entegrasyonu**

Job tamamlandığında webhook çağır:

#### Database Şeması

```sql
ALTER TABLE cron_jobs 
ADD COLUMN webhook_url TEXT DEFAULT NULL,
ADD COLUMN webhook_on_success BOOLEAN DEFAULT false,
ADD COLUMN webhook_on_failure BOOLEAN DEFAULT true;
```

#### CronJobManager.js

```javascript
async executeJob(name, taskFunction, config, forceRun = false) {
    try {
        // Job çalıştır
        const result = await taskFunction();
        
        // Webhook çağır (başarı durumunda)
        await this.callWebhook(name, 'success', result);
        
        return result;
    } catch (error) {
        // Webhook çağır (hata durumunda)
        await this.callWebhook(name, 'failure', { error: error.message });
        
        throw error;
    }
}

async callWebhook(jobName, status, data) {
    const webhookSettings = await query(`
        SELECT webhook_url, webhook_on_success, webhook_on_failure
        FROM cron_jobs
        WHERE name = $1
    `, [jobName]);
    
    const settings = webhookSettings.rows[0];
    
    if (settings.webhook_url) {
        if ((status === 'success' && settings.webhook_on_success) ||
            (status === 'failure' && settings.webhook_on_failure)) {
            
            try {
                await fetch(settings.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jobName,
                        status,
                        data,
                        timestamp: new Date()
                    })
                });
                logger.info(`📡 Webhook çağrıldı: ${settings.webhook_url}`);
            } catch (err) {
                logger.error(`❌ Webhook hatası: ${err.message}`);
            }
        }
    }
}
```

### 8️⃣ **Paralel Çalışma Limiti**

Aynı anda maksimum kaç job çalışabilir:

```javascript
class CronJobManager {
    constructor() {
        this.maxParallelJobs = 5; // Aynı anda max 5 job
        this.runningExecutions = new Map();
    }
    
    async executeJob(name, taskFunction, config, forceRun = false) {
        // Paralel limit kontrolü
        if (this.runningExecutions.size >= this.maxParallelJobs) {
            logger.warn(`⚠️ Max paralel job limitine ulaşıldı (${this.maxParallelJobs})`);
            return { skipped: true, reason: 'Parallel job limit reached' };
        }
        
        // Mevcut kod...
    }
}
```

---

## 📝 Gelişmiş Frontend Özellikleri

### Schedule Editör Geliştirmeleri

`assets/pages/cron-management.js` içinde schedule modal'ı genişlet:

```html
<div class="modal-body">
    <!-- Mevcut dropdown -->
    <div class="mb-3">
        <label class="form-label">Schedule Tipi</label>
        <select class="form-select" id="schedule-type">
            <option value="preset">Hazır Şablon</option>
            <option value="custom">Özel Cron Expression</option>
            <option value="advanced">Gelişmiş Ayarlar</option>
        </select>
    </div>
    
    <!-- Hazır şablon -->
    <div id="preset-schedule" class="mb-3">
        <label class="form-label">Şablon Seç</label>
        <select class="form-select" id="schedule-preset">
            <option value="* * * * *">Her dakika</option>
            <option value="*/5 * * * *">Her 5 dakikada</option>
            <option value="0 * * * *">Her saat başı</option>
            <option value="0 9 * * *">Her gün 09:00</option>
            <option value="0 9 * * 1-5">Hafta içi 09:00</option>
        </select>
    </div>
    
    <!-- Özel cron expression -->
    <div id="custom-schedule" class="mb-3" style="display:none;">
        <label class="form-label">Cron Expression</label>
        <input type="text" class="form-control" id="schedule-custom" 
               placeholder="* * * * *">
        <small class="text-muted">Format: dakika saat gün ay haftanın_günü</small>
    </div>
    
    <!-- Gelişmiş ayarlar -->
    <div id="advanced-schedule" style="display:none;">
        <div class="mb-3">
            <label class="form-label">Günlük Çalışma Limiti</label>
            <input type="number" class="form-control" id="daily-limit" 
                   placeholder="Sınırsız">
        </div>
        
        <div class="mb-3">
            <label class="form-label">Minimum Bekleme Süresi (saniye)</label>
            <input type="number" class="form-control" id="min-interval" 
                   placeholder="0">
        </div>
        
        <div class="row">
            <div class="col-md-6 mb-3">
                <label class="form-label">Başlangıç Saati</label>
                <input type="time" class="form-control" id="time-start">
            </div>
            <div class="col-md-6 mb-3">
                <label class="form-label">Bitiş Saati</label>
                <input type="time" class="form-control" id="time-end">
            </div>
        </div>
        
        <div class="mb-3">
            <label class="form-label">Max Retry Sayısı</label>
            <input type="number" class="form-control" id="max-retries" 
                   value="0">
        </div>
    </div>
</div>
```

---

## 🗂️ Örnek Job Şablonları

### 1. Basit Veri Temizleme Job'ı

```javascript
// jobs/dataCleanupJob.js
async function dataCleanupJob() {
    const jobName = 'dataCleanupJob';
    
    try {
        // 30 günden eski logları sil
        const result = await query(`
            DELETE FROM audit_logs
            WHERE created_at < NOW() - INTERVAL '30 days'
        `);
        
        return {
            success: true,
            deletedCount: result.rowCount,
            timestamp: new Date()
        };
    } catch (error) {
        logger.error(`❌ ${jobName} hatası:`, error);
        throw error;
    }
}

module.exports = dataCleanupJob;
```

### 2. API Çağrısı Yapan Job

```javascript
// jobs/apiSyncJob.js
const fetch = require('node-fetch');

async function apiSyncJob() {
    const jobName = 'apiSyncJob';
    
    try {
        // Dış API'den veri çek
        const response = await fetch('https://api.example.com/data');
        const data = await response.json();
        
        // Database'e kaydet
        for (const item of data.items) {
            await query(`
                INSERT INTO synced_data (external_id, data)
                VALUES ($1, $2)
                ON CONFLICT (external_id) DO UPDATE
                SET data = $2, updated_at = NOW()
            `, [item.id, JSON.stringify(item)]);
        }
        
        return {
            success: true,
            syncedCount: data.items.length,
            timestamp: new Date()
        };
    } catch (error) {
        logger.error(`❌ ${jobName} hatası:`, error);
        throw error;
    }
}

module.exports = apiSyncJob;
```

### 3. Rapor Oluşturma Job'ı

```javascript
// jobs/dailyReportJob.js
const PDFDocument = require('pdfkit');
const fs = require('fs');

async function dailyReportJob() {
    const jobName = 'dailyReportJob';
    
    try {
        // İstatistikleri al
        const stats = await query(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE) as new_users_today
            FROM users
        `);
        
        // PDF oluştur
        const doc = new PDFDocument();
        const filename = `reports/daily_${new Date().toISOString().split('T')[0]}.pdf`;
        
        doc.pipe(fs.createWriteStream(filename));
        doc.fontSize(20).text('Günlük Rapor', 100, 100);
        doc.fontSize(14).text(`Toplam Kullanıcı: ${stats.rows[0].total_users}`);
        doc.fontSize(14).text(`Bugün Yeni: ${stats.rows[0].new_users_today}`);
        doc.end();
        
        logger.info(`📄 Rapor oluşturuldu: ${filename}`);
        
        return {
            success: true,
            filename,
            stats: stats.rows[0],
            timestamp: new Date()
        };
    } catch (error) {
        logger.error(`❌ ${jobName} hatası:`, error);
        throw error;
    }
}

module.exports = dailyReportJob;
```

---

## 🛠️ Uygulama Önerileri

### Öncelik Sırası (Önerilen)

1. **Hemen Yapılabilir:**
   - ✅ Yeni job'lar ekleyin (yukarıdaki rehberi takip edin)
   - ✅ Schedule'ları custom cron expression ile düzenleyin
   - ✅ Frontend'e daha fazla schedule şablonu ekleyin

2. **Kısa Vadede (1-2 hafta):**
   - 🔧 Günlük çalışma limiti
   - 🔧 Minimum tekrar çalışma limiti (cooldown)
   - 🔧 Zaman pencereleri

3. **Orta Vadede (1 ay):**
   - 🔧 Retry mekanizması
   - 🔧 Webhook entegrasyonu
   - 🔧 Priority sistemi

4. **Uzun Vadede (2+ ay):**
   - 🔧 Dependency yönetimi
   - 🔧 Paralel çalışma limiti
   - 🔧 Job chaining (sıralı job'lar)

---

## 📊 Monitoring ve Debugging

### Log İzleme

```javascript
// utils/logger.js kullanımı
logger.info(`✅ Job başarılı`);
logger.warn(`⚠️ Uyarı mesajı`);
logger.error(`❌ Hata mesajı`, error);
```

### Database Sorguları

```sql
-- Son 24 saatteki tüm job çalışmaları
SELECT * FROM cron_job_logs
WHERE started_at >= NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC;

-- Job başarı oranları
SELECT 
    name,
    run_count,
    success_count,
    ROUND(success_count::decimal / NULLIF(run_count, 0) * 100, 2) as success_rate
FROM cron_jobs
ORDER BY run_count DESC;

-- En uzun süren job'lar
SELECT 
    job_name,
    AVG(duration) as avg_duration,
    MAX(duration) as max_duration
FROM cron_job_logs
WHERE status = 'SUCCESS'
GROUP BY job_name
ORDER BY avg_duration DESC;
```

---

## 🎓 Özet

### Sistem Hakkında
- ✅ Esnek ve modüler yapı
- ✅ Database + memory cache hybrid
- ✅ Frontend yönetim arayüzü
- ✅ Kapsamlı loglama
- ✅ Manuel tetikleme desteği

### Yapabilecekleriniz
- ✅ İstediğiniz kadar job ekleyebilirsiniz
- ✅ Cron expression ile tam esneklik
- ✅ Frontend'den yönetim (aktif/pasif, manuel çalıştır)
- ✅ İleri seviye özellikler eklenebilir

### Gelecek Geliştirmeler
- 🚀 Günlük limit
- 🚀 Cooldown
- 🚀 Retry mekanizması
- 🚀 Webhook
- 🚀 Dependency yönetimi

---

**Not:** Bu dokümantasyonu `docs/` klasöründe saklayın ve ihtiyaç duyduğunuzda referans olarak kullanın!

