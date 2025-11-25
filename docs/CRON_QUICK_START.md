# 🚀 Cron Job Quick Start Guide

## Yeni Job Ekleme (5 Dakikada)

### 1️⃣ Job Dosyası Oluştur
`jobs/myNewJob.js`:
```javascript
const { logger } = require('../utils/logger');
const { query } = require('../config/database');

async function myNewJob() {
    const jobName = 'myNewJob';
    
    try {
        logger.info(`🚀 ${jobName} başladı`);
        
        // İŞ MANTĞINIZ BURAYA
        
        return { success: true, timestamp: new Date() };
    } catch (error) {
        logger.error(`❌ ${jobName} hatası:`, error);
        throw error;
    }
}

module.exports = myNewJob;
```

### 2️⃣ Database'e Ekle
```sql
INSERT INTO cron_jobs (name, title, description, schedule, is_enabled)
VALUES (
    'myNewJob',
    'My New Job',
    'Açıklama',
    '0 9 * * *',  -- Her gün 09:00
    true
);
```

### 3️⃣ server.js'e Ekle
```javascript
const myNewJob = require('./jobs/myNewJob');

// Register kısmında:
} else if (jobConfig.name === 'myNewJob') {
    cronManager.registerJob(jobConfig, myNewJob);
}
```

### 4️⃣ Restart & Test
```bash
npm start
```

Frontend'den "Manuel Çalıştır" ile test et!

---

## 📋 Cron Expression Şablonları

```javascript
'* * * * *'          // Her dakika
'*/5 * * * *'        // Her 5 dakika
'0 * * * *'          // Her saat başı
'0 */2 * * *'        // Her 2 saatte
'0 9 * * *'          // Her gün 09:00
'0 9,18 * * *'       // Her gün 09:00 ve 18:00
'0 9 * * 1-5'        // Hafta içi 09:00
'0 0 1 * *'          // Her ayın 1'i gece yarısı
'0 0 * * 0'          // Her Pazar gece yarısı
'*/30 9-17 * * 1-5'  // Hafta içi 09:00-17:00 her 30 dakika
```

---

## 🎛️ Frontend Yönetimi

1. **Cron Management** sayfasına git
2. **Manuel Çalıştır** → Job'ı hemen çalıştır
3. **Aktif/Pasif** → Job'ı durdur/başlat
4. **Schedule Düzenle** → Zamanlamayı değiştir
5. **Loglar** → Geçmiş çalışmaları gör

---

## 🔧 Debugging

### Console Log'ları
```javascript
logger.info(`✅ Başarılı işlem`);
logger.warn(`⚠️ Uyarı`);
logger.error(`❌ Hata`, error);
```

### Database Sorguları
```sql
-- Son çalışmalar
SELECT * FROM cron_job_logs ORDER BY started_at DESC LIMIT 10;

-- Job istatistikleri
SELECT name, run_count, success_count FROM cron_jobs;
```

---

## ✅ Checklist

- [ ] Job dosyası oluşturdum (`jobs/`)
- [ ] Database'e kayıt ekledim
- [ ] `server.js`'e register kodu ekledim
- [ ] Server'ı restart ettim
- [ ] Frontend'den test ettim
- [ ] Logları kontrol ettim

---

**Detaylı bilgi için:** `docs/CRON_JOB_SYSTEM.md`

