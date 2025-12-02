# SSH Terminal Node.js Versiyon Sorunu

## 🔍 Sorun

- **Plesk Panel:** Node.js v25.2.1 ✅
- **SSH Terminal:** Node.js v10.24.0 ❌ (çok eski)

SSH terminalde farklı bir Node.js versiyonu kullanılıyor.

## 🔧 Çözüm

### Yöntem 1: PATH'i Kontrol Et ve Düzelt

```bash
# Mevcut Node.js yolunu bul
which node

# Plesk'in Node.js'ini bul
find /opt/plesk -name node 2>/dev/null
find /usr/lib/plesk -name node 2>/dev/null

# Veya nvm kullanılıyorsa
ls -la ~/.nvm/versions/node/
```

### Yöntem 2: Plesk'in Node.js'ini Kullan

```bash
# Plesk'in Node.js path'ini bul (genellikle şurada olur)
/opt/plesk/node/25/bin/node --version

# Eğer bulursan ekle:
export PATH="/opt/plesk/node/25/bin:$PATH"
node --version  # Şimdi v25.2.1 göstermeli
```

### Yöntem 3: NVM Kullan (Önerilen)

```bash
# NVM yüklü mü kontrol et
ls -la ~/.nvm

# NVM yüklüyse
source ~/.nvm/nvm.sh
nvm use 25  # veya mevcut versiyon
node --version
```

### Yöntem 4: Doğrudan Plesk Node.js'i ile Çalıştır

```bash
# Plesk'in Node.js'i ile direkt çalıştır
/opt/plesk/node/25/bin/node server.js

# Veya bulunan path ile
/usr/lib/plesk/node/25/bin/node server.js
```

## 📋 Hızlı Test Komutları

```bash
# 1. Node.js versiyonlarını bul
which -a node
find /opt -name node 2>/dev/null | head -5
find /usr -name node 2>/dev/null | grep -E "(plesk|node)" | head -5

# 2. PATH'i kontrol et
echo $PATH

# 3. Plesk Node.js'i bul ve kullan
# (Bulunan path'i kullan)
export PATH="/bulunan/path:$PATH"
node --version
```

## 🚀 Kalıcı Çözüm (.bashrc veya .bash_profile)

```bash
# ~/.bashrc veya ~/.bash_profile dosyasına ekle
export PATH="/opt/plesk/node/25/bin:$PATH"
# veya bulunan doğru path'i ekle
```

---

**Not:** Plesk paneldeki Node.js versiyonu doğruysa, SSH'da da aynı versiyonu kullanmak için PATH'i ayarlamak gerekir.

