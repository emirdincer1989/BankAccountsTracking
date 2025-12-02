# Node.js Versiyon Uyumluluğu

## 🔍 Sorun

Sunucudaki Node.js versiyonu eski ve modern JavaScript özelliklerini (optional chaining `?.`) desteklemiyor.

## 📋 Paket Versiyonları ve Node.js Uyumluluğu

### node-cron
- **v4.x**: Node.js 14+ gerektirir (optional chaining kullanır)
- **v3.0.3**: Node.js 12+ ile uyumlu (optional chaining kullanmaz) ✅

### Diğer Paketler
- **bullmq**: Node.js 14+ gerektirir (ama fallback var)
- **express**: Node.js 12+ ile uyumlu ✅
- **pg**: Node.js 12+ ile uyumlu ✅

## 🔧 Çözüm

### Seçenek 1: node-cron Versiyonunu Düşür (Önerilen - Hızlı)

```bash
# SSH'da
cd /var/www/vhosts/finans.eshot.com.tr/httpdocs
npm install node-cron@3.0.3 --save
```

### Seçenek 2: Node.js Versiyonunu Yükselt (Uzun Vadeli)

```bash
# Node.js versiyonunu kontrol et
node --version

# Node.js 14+ yükle (Plesk panelden veya nvm ile)
# Plesk panelde: Node.js versiyonunu güncelle
```

## 📊 Node.js Versiyon Kontrolü

### SSH'da Çalıştır:
```bash
node --version
npm --version
```

### Beklenen Versiyonlar:
- **Minimum:** Node.js v12.0.0
- **Önerilen:** Node.js v14.0.0+
- **İdeal:** Node.js v16.0.0+ veya v18.0.0+

## ⚠️ Önemli Notlar

1. **node-cron 3.0.3** kullanıldığında tüm özellikler çalışır
2. **bullmq** Redis yoksa fallback modda çalışır (sorun değil)
3. Diğer paketler Node.js 12+ ile uyumlu

## 🚀 Hızlı Düzeltme

```bash
# SSH'da
cd /var/www/vhosts/finans.eshot.com.tr/httpdocs
npm install node-cron@3.0.3 --save
npm install
node server.js
```

---

**Son Güncelleme:** 2025-12-03

