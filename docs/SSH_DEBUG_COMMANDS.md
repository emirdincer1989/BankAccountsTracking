# 🔍 SSH Debug Komutları - Uzak Sunucu

Bu dokümantasyon, uzak sunucuda (SSH terminal) çalıştırılacak debug komutlarını içerir.

## 📍 Sunucu Bilgileri
- **Sunucu:** Plesk Panel
- **SSH:** `ssh root@ecstatic-blackwell` veya Plesk terminal
- **Dizin:** `/var/www/vhosts/finans.eshot.com.tr/httpdocs`

---

## 🔧 1. Temel Kontroller

### Node.js Versiyonu Kontrolü
```bash
node --version
```
**Beklenen:** v12+ (ama v14+ önerilir)

### NPM Versiyonu
```bash
npm --version
```

### Proje Dizinine Git
```bash
cd /var/www/vhosts/finans.eshot.com.tr/httpdocs
```

---

## 🐛 2. Syntax Kontrolü

### Tüm Ana Dosyaları Kontrol Et
```bash
cd /var/www/vhosts/finans.eshot.com.tr/httpdocs

# Server.js
node -c server.js

# CronJobManager
node -c services/cron/CronJobManager.js

# Middleware
node -c middleware/auth.js

# Jobs
node -c jobs/testModalJob.js
node -c jobs/scheduleBankSync.js
```

**Eğer syntax hatası varsa:** Hata mesajını not edin ve paylaşın.

---

## 🔍 3. Server Başlatma Testi

### Manuel Server Başlatma (Test)
```bash
cd /var/www/vhosts/finans.eshot.com.tr/httpdocs

# Environment variable'ları kontrol et
cat .env | grep -E "DB_|JWT_|PORT|NODE_ENV"

# Server'ı manuel başlat (foreground'da çalışır, Ctrl+C ile durdur)
node server.js
```

**Beklenen Çıktı:**
```
✅ PostgreSQL veritabanına bağlandı
🚀 Server running on port 3000
📋 X cron job database'den yüklendi
```

**Eğer hata varsa:** Tam hata mesajını kopyalayın.

---

## 📊 4. Database Bağlantı Testi

### Database Bağlantısını Test Et
```bash
cd /var/www/vhosts/finans.eshot.com.tr/httpdocs

node -e "
require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});
pool.query('SELECT NOW()').then(r => {
    console.log('✅ Database bağlantısı başarılı:', r.rows[0].now);
    process.exit(0);
}).catch(e => {
    console.error('❌ Database hatası:', e.message);
    process.exit(1);
});
"
```

---

## 📝 5. Log Kontrolü

### Passenger Logları (Plesk)
```bash
# Passenger log dosyası genellikle şurada:
tail -f /var/www/vhosts/finans.eshot.com.tr/logs/error_log
tail -f /var/www/vhosts/finans.eshot.com.tr/logs/access_log
```

### Uygulama Logları
```bash
cd /var/www/vhosts/finans.eshot.com.tr/httpdocs

# Eğer logs klasörü varsa
tail -f logs/combined.log
tail -f logs/error.log
```

---

## 🔄 6. Git Pull ve Yeniden Başlatma

### Git Pull
```bash
cd /var/www/vhosts/finans.eshot.com.tr/httpdocs

# Değişiklikleri çek
git pull origin main

# Veya belirli branch
git pull origin <branch-name>
```

### NPM Paketlerini Güncelle
```bash
cd /var/www/vhosts/finans.eshot.com.tr/httpdocs

# Eğer package.json değiştiyse
npm install
```

### Passenger Restart (Plesk)
```bash
# Plesk panelden restart yapın veya:
touch /var/www/vhosts/finans.eshot.com.tr/httpdocs/tmp/restart.txt
```

---

## 🚨 7. Hata Durumunda Yapılacaklar

### Adım 1: Syntax Kontrolü
```bash
node -c server.js
```

### Adım 2: Manuel Başlatma
```bash
node server.js
```

### Adım 3: Hata Mesajını Kaydet
Hata mesajının tamamını kopyalayın ve paylaşın.

### Adım 4: Environment Variables Kontrolü
```bash
cat .env
```

**Önemli:** `.env` dosyasının içeriğini paylaşmayın, sadece hangi değişkenlerin tanımlı olduğunu kontrol edin.

---

## 📋 8. Hızlı Debug Checklist

- [ ] `node --version` → v12+ olmalı
- [ ] `node -c server.js` → Syntax hatası olmamalı
- [ ] `.env` dosyası mevcut ve doğru mu?
- [ ] Database bağlantısı çalışıyor mu?
- [ ] `npm install` çalıştırıldı mı?
- [ ] Git pull yapıldı mı?
- [ ] Passenger restart yapıldı mı?

---

## 💡 9. Yaygın Sorunlar ve Çözümleri

### Sorun: "Cannot find module"
**Çözüm:**
```bash
npm install
```

### Sorun: "Database connection failed"
**Kontrol:**
```bash
# .env dosyasında DB_* değişkenleri var mı?
cat .env | grep DB_
```

### Sorun: "Port already in use"
**Çözüm:**
```bash
# Hangi process portu kullanıyor?
lsof -i :3000
# Veya
netstat -tulpn | grep 3000
```

### Sorun: "Permission denied"
**Çözüm:**
```bash
# Dosya izinlerini kontrol et
ls -la
# Gerekirse düzelt
chmod 755 server.js
```

---

## 🔐 10. Güvenlik Notları

⚠️ **ÖNEMLİ:**
- `.env` dosyasının içeriğini asla paylaşmayın
- SSH komutlarının çıktılarında hassas bilgi olabilir, dikkatli olun
- Production loglarında hassas veri olabilir

---

**Son Güncelleme:** 2025-12-03

