# 🎯 Template Repository Kurulum Rehberi

Bu dokümantasyon, **RBUMS-NodeJS** projesini şablon (template) repository olarak yapılandırma ve yeni projeler için kullanma sürecini detaylı olarak açıklar.

---

## 📋 İçindekiler

1. [GitHub Template Repository Olarak İşaretleme](#github-template-repository-olarak-işaretleme)
2. [Yeni Proje Oluşturma Yöntemleri](#yeni-proje-oluşturma-yöntemleri)
3. [Git Remote Yapılandırması](#git-remote-yapılandırması)
4. [Versiyonlama Stratejisi](#versiyonlama-stratejisi)
5. [Template'den Güncelleme Alma](#templateden-güncelleme-alma)
6. [Best Practices](#best-practices)

---

## 🌟 GitHub Template Repository Olarak İşaretleme

### Adım 1: GitHub Repository Ayarları

1. **GitHub'da repository'nize gidin:**
   ```
   https://github.com/emirdincer1989/RBUMS-NodeJS
   ```

2. **Settings** sekmesine tıklayın

3. **"Template repository"** bölümünü bulun (Settings sayfasının en altında)

4. **"Template repository"** checkbox'ını işaretleyin ✅

5. **Save** butonuna tıklayın

### Avantajları:
- ✅ GitHub'da "Use this template" butonu görünür
- ✅ Yeni proje oluştururken tüm commit geçmişi kopyalanmaz (temiz başlangıç)
- ✅ Template olarak arama sonuçlarında görünür
- ✅ Kolay ve hızlı proje başlatma

---

## 🚀 Yeni Proje Oluşturma Yöntemleri

### Yöntem 1: GitHub "Use this template" Butonu (ÖNERİLEN)

#### Avantajları:
- ✅ En kolay ve hızlı yöntem
- ✅ Commit geçmişi kopyalanmaz (temiz başlangıç)
- ✅ Otomatik olarak yeni repository oluşturur

#### Adımlar:

1. **Template repository sayfasında:**
   ```
   https://github.com/emirdincer1989/RBUMS-NodeJS
   ```

2. **"Use this template"** yeşil butonuna tıklayın

3. **"Create a new repository"** seçeneğini seçin

4. **Yeni repository bilgilerini girin:**
   - Owner: `emirdincer1989`
   - Repository name: `MyNewProject`
   - Description: `Yeni proje açıklaması`
   - Public/Private seçin

5. **"Create repository from template"** butonuna tıklayın

6. **Yeni repository'yi local'e klonlayın:**
   ```bash
   cd C:\xampp\htdocs
   git clone https://github.com/emirdincer1989/MyNewProject.git
   cd MyNewProject
   ```

7. **Template remote'unu ekleyin:**
   ```bash
   git remote add template https://github.com/emirdincer1989/RBUMS-NodeJS.git
   
   # Kontrol edin
   git remote -v
   # Çıktı:
   # origin    https://github.com/emirdincer1989/MyNewProject.git (fetch)
   # origin    https://github.com/emirdincer1989/MyNewProject.git (push)
   # template  https://github.com/emirdincer1989/RBUMS-NodeJS.git (fetch)
   # template  https://github.com/emirdincer1989/RBUMS-NodeJS.git (push)
   ```

---

### Yöntem 2: Git Clone ile Manuel Oluşturma

#### Senaryo: Template'i klonlayıp yeni bir repository olarak kullanmak

#### Adımlar:

1. **Template'i klonlayın:**
   ```bash
   cd C:\xampp\htdocs
   git clone https://github.com/emirdincer1989/RBUMS-NodeJS.git MyNewProject
   cd MyNewProject
   ```

2. **Remote yapılandırması:**
   ```bash
   # Mevcut origin'i template olarak yeniden adlandır
   git remote rename origin template
   
   # Yeni proje için origin ekle
   git remote add origin https://github.com/emirdincer1989/MyNewProject.git
   
   # Kontrol edin
   git remote -v
   ```

3. **GitHub'da yeni repository oluşturun:**
   - GitHub'da yeni bir repository oluşturun: `MyNewProject`
   - **ÖNEMLİ:** README, .gitignore veya license eklemeyin (zaten var)

4. **İlk push:**
   ```bash
   git push -u origin main
   # veya branch adınız farklıysa:
   git push -u origin master
   ```

---

### Yöntem 3: Fork Yapma (ÖNERİLMEZ)

⚠️ **Not:** Fork yapmak template için önerilmez çünkü:
- Tüm commit geçmişi kopyalanır
- Upstream ile bağlantı karmaşıklaşır
- Template güncellemelerini almak zorlaşır

---

## 🔧 Git Remote Yapılandırması

### Template Projesinde (RBUMS-NodeJS)

```bash
cd C:\xampp\htdocs\RBUMS-NodeJS

# Remote'ları kontrol edin
git remote -v
# Çıktı:
# origin    https://github.com/emirdincer1989/RBUMS-NodeJS.git (fetch)
# origin    https://github.com/emirdincer1989/RBUMS-NodeJS.git (push)
```

**Template projesinde sadece `origin` remote'u olmalı.**

---

### Yeni Projede (MyNewProject)

```bash
cd C:\xampp\htdocs\MyNewProject

# Remote'ları kontrol edin
git remote -v
# Çıktı:
# origin    https://github.com/emirdincer1989/MyNewProject.git (fetch)
# origin    https://github.com/emirdincer1989/MyNewProject.git (push)
# template  https://github.com/emirdincer1989/RBUMS-NodeJS.git (fetch)
# template  https://github.com/emirdincer1989/RBUMS-NodeJS.git (push)
```

**Yeni projede hem `origin` (kendi repo) hem de `template` (şablon repo) remote'ları olmalı.**

---

## 🏷️ Versiyonlama Stratejisi

### Template Projesinde Versiyon Oluşturma

```bash
cd C:\xampp\htdocs\RBUMS-NodeJS

# Yeni özellik eklendiğinde (minor version)
git tag -a v1.1.0 -m "feat: Bildirim sistemi eklendi"
git push origin v1.1.0

# Bug fix yapıldığında (patch version)
git tag -a v1.0.1 -m "fix: JWT token validation bug düzeltildi"
git push origin v1.0.1

# Breaking change olduğunda (major version)
git tag -a v2.0.0 -m "BREAKING: PostgreSQL 14+ gerekli"
git push origin v2.0.0
```

### Semantic Versioning Kuralları

- **v1.0.0** → İlk stabil sürüm
- **v1.0.1** → Bug fix (backwards compatible)
- **v1.1.0** → Yeni özellik (backwards compatible)
- **v2.0.0** → Breaking change (backwards incompatible)

---

## 📥 Template'den Güncelleme Alma

### Senaryo: Template'de güncelleme var, projenize almak istiyorsunuz

#### Adım 1: Template'den Güncellemeleri Çekin

```bash
cd C:\xampp\htdocs\MyNewProject

# Template'den son değişiklikleri çekin
git fetch template

# Tag'leri de çekin
git fetch template --tags
```

#### Adım 2: Güncellemeleri Görüntüleyin

```bash
# Template'deki son commit'leri görün
git log template/main --oneline -10

# Template'deki tag'leri görün
git tag -l

# Template ile projeniz arasındaki farkları görün
git log HEAD..template/main --oneline
```

#### Adım 3: Güncellemeleri Merge Edin

```bash
# Tüm güncellemeleri merge edin
git merge template/main

# Veya belirli bir versiyonu merge edin
git merge v1.1.0

# Conflict varsa çözün
# ... conflict resolution ...

# Merge'ü tamamlayın
git commit -m "chore: Template v1.1.0 merge edildi"

# Kendi projenize push edin
git push origin main
```

#### Adım 4: Sadece Belirli Dosyaları Almak

```bash
# Template'den sadece belirli dosyaları alın
git checkout template/main -- middleware/auth.js middleware/validation.js

git commit -m "chore: Auth ve validation middleware'leri template'den güncellendi"
git push origin main
```

---

## ✅ Best Practices

### Template Projesinde Yapılması Gerekenler

1. **Stabil Versiyonlar Oluşturun:**
   - Her major özellik sonrası tag oluşturun
   - Bug fix'lerden sonra patch version oluşturun

2. **README.md'yi Güncel Tutun:**
   - Kurulum talimatları
   - Özellikler listesi
   - Kullanım örnekleri

3. **CHANGELOG.md Oluşturun:**
   - Her versiyonda ne değiştiğini belgelendirin
   - Breaking changes'i açıkça belirtin

4. **Template-Specific Dosyaları İşaretleyin:**
   - `.template` uzantısı kullanın
   - Veya `TEMPLATE-` prefix'i ekleyin

### Yeni Projede Yapılması Gerekenler

1. **Proje Özelleştirmeleri:**
   ```bash
   # package.json'u güncelleyin
   {
     "name": "mynewproject",
     "description": "My New Project açıklaması"
   }
   
   # .env dosyasını güncelleyin
   DB_NAME=mynewproject
   ```

2. **Template'i Düzenli Güncelleyin:**
   - Her 1-2 haftada bir `git fetch template` çalıştırın
   - Security patch'leri hemen alın

3. **Proje-Spesifik Kodu Template'e Göndermeyin:**
   - İş mantığı
   - Müşteri bilgileri
   - Özel API entegrasyonları

---

## 🎯 Yaygın Senaryolar

### Senaryo 1: Template'den İlk Güncellemeyi Almak

```bash
cd C:\xampp\htdocs\MyNewProject

# Template'den güncellemeleri çek
git fetch template --tags

# Template'deki son versiyonu gör
git tag -l | sort -V | tail -1

# Son versiyonu merge et
git merge template/main

# Conflict varsa çöz
# ... conflict resolution ...

# Push et
git push origin main
```

### Senaryo 2: Template'deki Belirli Bir Bug Fix'i Almak

```bash
cd C:\xampp\htdocs\MyNewProject

# Template'den güncellemeleri çek
git fetch template

# Bug fix commit'ini bul
git log template/main --oneline | grep "fix:"

# Cherry-pick ile sadece o commit'i al
git cherry-pick <commit-hash>

# Push et
git push origin main
```

### Senaryo 3: Template'deki Değişikliği Geri Almak

```bash
cd C:\xampp\htdocs\MyNewProject

# Son merge'ü geri al
git revert -m 1 HEAD

# Veya belirli bir dosyayı eski haline getir
git checkout HEAD~1 -- middleware/rateLimiter.js
git commit -m "revert: Rate limiter template değişikliği geri alındı"
git push origin main
```

---

## 🛠️ Sorun Giderme

### Problem 1: "Template remote bulunamadı"

**Çözüm:**
```bash
# Template remote'unu ekleyin
git remote add template https://github.com/emirdincer1989/RBUMS-NodeJS.git

# Test edin
git fetch template
```

### Problem 2: Merge Conflict

**Çözüm:**
```bash
# Conflict'i görün
git status

# Dosyayı açın ve conflict marker'ları bulun:
# <<<<<<< HEAD (Sizin kodunuz)
# =======
# >>>>>>> template/main (Template kodu)

# Hangisini tutacağınıza karar verin veya ikisini birleştirin
# Marker'ları silin ve dosyayı kaydedin

# Çözümü işaretleyin
git add dosya.js
git commit -m "chore: Template merge conflict çözüldü"
```

### Problem 3: Template ile Proje Arasındaki Farkları Görmek

**Çözüm:**
```bash
# Tüm farkları görün
git diff template/main

# Sadece belirli bir dosya için
git diff template/main -- middleware/auth.js

# Sadece dosya isimlerini göster
git diff --name-only template/main
```

---

## 📚 Faydalı Komutlar

### Remote Yönetimi

```bash
# Tüm remote'ları göster
git remote -v

# Remote ekle
git remote add template <URL>

# Remote URL'i değiştir
git remote set-url template <NEW-URL>

# Remote sil
git remote remove template
```

### Tag Yönetimi

```bash
# Tüm tag'leri listele
git tag -l

# Belirli pattern'daki tag'leri listele
git tag -l "v1.*"

# Tag detayını göster
git show v1.0.0

# Tag sil (local)
git tag -d v1.0.0

# Tag sil (remote)
git push origin :refs/tags/v1.0.0
```

### Branch Karşılaştırma

```bash
# Template ile projeniz arasındaki farkları görün
git log --oneline --graph --decorate --all

# Template'de olan ama sizde olmayan commit'ler
git log HEAD..template/main

# Sizde olan ama template'de olmayan commit'ler
git log template/main..HEAD
```

---

## 📝 Örnek Workflow

### Günlük Geliştirme:

```bash
# 1. Sabah template'i kontrol et
cd C:\xampp\htdocs\MyNewProject
git fetch template

# 2. Yeni özellik geliştir
git checkout -b feature/user-notifications
# ... kod yazma ...
git commit -m "feat: Kullanıcı bildirim sistemi eklendi"
git push origin feature/user-notifications

# 3. PR oluştur ve merge et
# ... GitHub'da PR ...

# 4. Template'den bug fix varsa al
git checkout main
git pull origin main
git merge template/main
git push origin main
```

### Haftalık Template Bakımı:

```bash
# Template projesine geç
cd C:\xampp\htdocs\RBUMS-NodeJS

# Güncelleme var mı kontrol et
git status
git log --oneline -10

# Varsa commit et ve tag oluştur
git tag -a v1.0.4 -m "Weekly update: Security patches"
git push origin main
git push origin v1.0.4

# Tüm projelere duyuru:
# "v1.0.4 çıktı! Güvenlik güncellemeleri içeriyor."
```

---

## 🔖 Hızlı Referans

```bash
# Yeni proje başlat (GitHub Template kullanarak)
# 1. GitHub'da "Use this template" butonuna tıkla
# 2. Yeni repository oluştur
# 3. Clone et:
git clone <new-repo-url> MyProject && cd MyProject
git remote add template <template-repo-url>

# Template'den güncelleme al
git fetch template --tags && git merge template/main

# Template'e düzeltme gönder (PR ile)
git checkout -b fix/security-patch
# ... değişiklikler ...
git push origin fix/security-patch
# GitHub'da PR oluştur: origin/fix/security-patch → template/main

# Versiyon göster
git describe --tags template/main
```

---

**Son Güncelleme:** 2025-01-XX  
**Hazırlayan:** AI Assistant

