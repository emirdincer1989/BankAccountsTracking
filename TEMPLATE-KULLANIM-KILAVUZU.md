# 🎯 RBUMS-NodeJS Template Kullanım Kılavuzu

Bu döküman, **RBUMS-NodeJS** şablon projesini kullanarak yeni bir proje nasıl başlatacağınızı ve template ile bağlantıyı nasıl sürdüreceğinizi anlatır.

---

## 📋 İçindekiler

1. [Yeni Proje Başlatma](#-yeni-proje-başlatma)
2. [Normal Geliştirme](#-normal-geliştirme)
3. [Template'den Güncelleme Alma](#-templateden-güncelleme-alma)
4. [Template'e Düzeltme Gönderme](#-templatee-düzeltme-gönderme)
5. [Versiyonlama](#-versiyonlama)
6. [Yaygın Senaryolar](#-yaygın-senaryolar)
7. [Sorun Giderme](#-sorun-giderme)

---

## 🚀 Yeni Proje Başlatma

### Adım 1: Template'i Klonlayın

```bash
# Üst klasöre çıkın (htdocs)
cd C:\xampp\htdocs

# Template'i yeni proje adıyla klonlayın
git clone https://github.com/emirdincer1989/bank_integration.git MyNewProject

# Yeni projeye girin
cd MyNewProject
```

### Adım 2: Remote Yapılandırması

```bash
# Mevcut remote'u "template" olarak yeniden adlandırın
git remote rename origin template

# Kendi yeni projeniz için origin ekleyin
git remote add origin https://github.com/emirdincer1989/MyNewProject.git

# Remote'ları kontrol edin
git remote -v
# Çıktı:
# origin    https://github.com/emirdincer1989/MyNewProject.git (fetch)
# origin    https://github.com/emirdincer1989/MyNewProject.git (push)
# template  https://github.com/emirdincer1989/bank_integration.git (fetch)
# template  https://github.com/emirdincer1989/bank_integration.git (push)
```

### Adım 3: Branch Yapılandırması

```bash
# Ana branch'i yeni origin'e bağlayın
git branch -u origin/RBUMS-NodeJS

# İlk push'u yapın
git push -u origin RBUMS-NodeJS
```

### Adım 4: Proje Özellleştirme

```bash
# .env dosyasını düzenleyin
# Veritabanı adını değiştirin
DB_NAME=mynewproject

# package.json'u düzenleyin
# Proje adını ve açıklamasını güncelleyin
```

```json
{
  "name": "mynewproject",
  "version": "1.0.0",
  "description": "MyNewProject açıklaması"
}
```

```bash
# README.md'yi projenize göre güncelleyin
```

### Adım 5: Veritabanı Kurulumu

```bash
# PostgreSQL'de yeni veritabanı oluşturun
createdb mynewproject

# veya psql ile:
psql -U postgres
CREATE DATABASE mynewproject;
\q

# Migration ve seed çalıştırın
npm run migrate
npm run seed
```

---

## 💻 Normal Geliştirme

Artık normal bir Git projesi gibi çalışabilirsiniz:

```bash
# Yeni özellik geliştirin
git checkout -b feature/my-feature

# Değişikliklerinizi commit edin
git add .
git commit -m "feat: Yeni özellik eklendi"

# Kendi projenize push edin
git push origin feature/my-feature

# Main branch'e merge edin
git checkout RBUMS-NodeJS
git merge feature/my-feature
git push origin RBUMS-NodeJS
```

---

## 📥 Template'den Güncelleme Alma

### Senaryo: Template'de bir güncelleme yapıldı ve bunu projenize almak istiyorsunuz

```bash
# Template'den son değişiklikleri çekin
git fetch template

# Template'deki değişiklikleri görün
git log template/RBUMS-NodeJS --oneline -10

# Template'deki değişiklikleri kendi branch'inize merge edin
git merge template/RBUMS-NodeJS

# Conflict varsa çözün
# ... conflict resolution ...

# Merge'ü tamamlayın
git commit

# Kendi projenize push edin
git push origin RBUMS-NodeJS
```

### Belirli Bir Versiyonu Almak

```bash
# Template'deki tüm tag'leri görün
git fetch template --tags
git tag -l

# Belirli bir versiyonu merge edin
git merge v1.1.0

# Veya sadece o versiyondaki belirli bir dosyayı alın
git checkout v1.1.0 -- middleware/rateLimiter.js
git commit -m "chore: Rate limiter template v1.1.0'dan güncellendi"
```

### Sadece Belirli Bir Commit'i Almak (Cherry-Pick)

```bash
# Template'den commit'leri görün
git log template/RBUMS-NodeJS --oneline

# Sadece istediğiniz commit'i alın
git cherry-pick <commit-hash>

# Örnek:
git cherry-pick abc1234
```

---

## 📤 Template'e Düzeltme Gönderme

### Senaryo: Projenizde template'de de olması gereken bir bug fix yaptınız

```bash
# Bug fix için branch oluşturun
git checkout -b fix/authentication-bug

# Bug'ı düzeltin
# ... kod değişiklikleri ...

# Commit edin
git add middleware/auth.js
git commit -m "fix: JWT token validation bug düzeltildi"

# Önce kendi projenize push edin
git push origin fix/authentication-bug

# Sonra template'e push edin
git push template fix/authentication-bug
```

### Template Repository'de:

1. GitHub'da `bank_integration` repository'sine gidin
2. Pull Request oluşturun: `fix/authentication-bug` → `RBUMS-NodeJS`
3. Review yapın ve merge edin
4. Tag oluşturun (eğer major fix ise):

```bash
cd C:\xampp\htdocs\RBUMS-NodeJS
git pull template RBUMS-NodeJS
git tag -a v1.0.1 -m "Bug fix: JWT token validation"
git push template v1.0.1
```

### Diğer Projelerde Bu Fix'i Almak:

```bash
cd C:\xampp\htdocs\OtherProject
git fetch template --tags
git merge v1.0.1
git push origin RBUMS-NodeJS
```

---

## 🏷️ Versiyonlama

### Template Versiyonları

Template projesinde semantic versioning kullanılır:

- **v1.0.0** - İlk stabil sürüm
- **v1.0.1** - Bug fix (backwards compatible)
- **v1.1.0** - Yeni özellik (backwards compatible)
- **v2.0.0** - Breaking change

### Versiyon Oluşturma (Sadece Template'de)

```bash
cd C:\xampp\htdocs\RBUMS-NodeJS

# Minor version (yeni özellik)
git tag -a v1.1.0 -m "feat: Yeni menü kategorisi sistemi eklendi"
git push template v1.1.0

# Patch version (bug fix)
git tag -a v1.0.2 -m "fix: Rate limiter memory leak düzeltildi"
git push template v1.0.2

# Major version (breaking change)
git tag -a v2.0.0 -m "BREAKING: PostgreSQL 14+ gerekli, eski sürümler desteklenmiyor"
git push template v2.0.0
```

### Hangi Versiyonu Kullanıyorum?

```bash
# Kendi projenizde
git describe --tags template/RBUMS-NodeJS

# Veya
git log --oneline --graph --decorate template/RBUMS-NodeJS
```

---

## 🎭 Yaygın Senaryolar

### Senaryo 1: Template'i Güncelle, Tüm Projelere Yay

```bash
# === Template Projesinde (RBUMS-NodeJS) ===
cd C:\xampp\htdocs\RBUMS-NodeJS

# Güncelleme yap
git add .
git commit -m "fix: Security patch - XSS koruması güçlendirildi"
git push template RBUMS-NodeJS

# Tag oluştur
git tag -a v1.0.3 -m "Security patch: XSS koruması"
git push template v1.0.3

# === Project1'de ===
cd C:\xampp\htdocs\Project1
git fetch template --tags
git merge v1.0.3
git push origin RBUMS-NodeJS

# === Project2'de ===
cd C:\xampp\htdocs\Project2
git fetch template --tags
git merge v1.0.3
git push origin RBUMS-NodeJS
```

### Senaryo 2: Sadece Belirli Dosyaları Template'den Al

```bash
# Template'den sadece güvenlik middleware'ini al
git fetch template
git checkout template/RBUMS-NodeJS -- middleware/auth.js middleware/validation.js

git commit -m "chore: Auth ve validation middleware'leri template'den güncellendi"
git push origin RBUMS-NodeJS
```

### Senaryo 3: Conflict Çözme

```bash
# Template'den merge ederken conflict oldu
git merge template/RBUMS-NodeJS

# Auto-merging middleware/rateLimiter.js
# CONFLICT (content): Merge conflict in middleware/rateLimiter.js

# Dosyayı düzenle ve conflict'i çöz
# <<<<<<< HEAD
# ... kendi kodunuz ...
# =======
# ... template kodu ...
# >>>>>>> template/RBUMS-NodeJS

# Çözümü işaretle
git add middleware/rateLimiter.js
git commit -m "Merge template v1.1.0 - rate limiter conflict çözüldü"
```

### Senaryo 4: Template'i Projeye Göre Özelleştir

```bash
# Template'den gelen kod var ama sizin projenize özel değişiklik gerekiyor
git merge template/RBUMS-NodeJS

# Kendi özelleştirmelerinizi yapın
# ... kod değişiklikleri ...

git commit -m "chore: Template v1.1.0 merge + proje spesifik özelleştirmeler"

# NOT: Bu değişiklikleri template'e göndermeyin!
git push origin RBUMS-NodeJS  # Sadece kendi projenize
```

---

## 🛠️ Sorun Giderme

### Problem 1: "Remote template does not appear to be a git repository"

**Çözüm:**
```bash
# Remote URL'i kontrol edin
git remote -v

# Yanlışsa düzeltin
git remote set-url template https://github.com/emirdincer1989/bank_integration.git

# Test edin
git fetch template
```

### Problem 2: Merge Conflict'i Nasıl Çözülür?

**Çözüm:**
```bash
# 1. Conflict'i görün
git status

# 2. Dosyayı açın ve conflict marker'ları bulun:
# <<<<<<< HEAD (Sizin kodunuz)
# =======
# >>>>>>> template/RBUMS-NodeJS (Template kodu)

# 3. Hangisini tutacağınıza karar verin veya ikisini birleştirin

# 4. Marker'ları silin ve dosyayı kaydedin

# 5. Çözümü işaretleyin
git add dosya.js
git commit
```

### Problem 3: Template'den Gelen Değişikliği Geri Almak

**Çözüm:**
```bash
# Son merge'ü geri al
git revert -m 1 HEAD

# Veya belirli bir dosyayı eski haline getir
git checkout HEAD~1 -- middleware/rateLimiter.js
git commit -m "revert: Rate limiter template değişikliği geri alındı"
```

### Problem 4: Template ve Proje Arasındaki Farkları Görmek

**Çözüm:**
```bash
# Template ile kendi branch'iniz arasındaki farkları görün
git diff template/RBUMS-NodeJS

# Sadece belirli bir dosya için
git diff template/RBUMS-NodeJS -- middleware/auth.js

# Sadece dosya isimlerini göster
git diff --name-only template/RBUMS-NodeJS
```

---

## 📚 Faydalı Git Komutları

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
git push template :refs/tags/v1.0.0
```

### Branch Karşılaştırma

```bash
# Template ile kendi branch'inizi karşılaştırın
git log --oneline --graph --decorate --all

# Template'de olan ama sizde olmayan commit'ler
git log HEAD..template/RBUMS-NodeJS

# Sizde olan ama template'de olmayan commit'ler
git log template/RBUMS-NodeJS..HEAD
```

---

## 🎯 Best Practices

### ✅ YAPILMASI GEREKENLER

1. **Template'i Güncel Tutun:**
   - Her 1-2 haftada bir `git fetch template` çalıştırın
   - Major bug fix'leri hemen alın

2. **Ortak Kodu Template'e Gönderin:**
   - Güvenlik fix'leri
   - Genel performans iyileştirmeleri
   - Utility fonksiyonları

3. **Semantic Commit Messages Kullanın:**
   - `feat:` - Yeni özellik
   - `fix:` - Bug fix
   - `chore:` - Template merge/güncelleme
   - `docs:` - Dokümantasyon

4. **Versiyon Tag'lerini Kullanın:**
   - Stabil noktalarda tag oluşturun
   - Template'den belirli versiyonları merge edin

### ❌ YAPILMAMASI GEREKENLER

1. **Proje-Spesifik Kodu Template'e Göndermeyin:**
   - İş mantığı
   - Özel API entegrasyonları
   - Müşteri bilgileri

2. **Template Branch'ini Direkt Değiştirmeyin:**
   - Her zaman kendi branch'inizde çalışın
   - Template'e PR gönderin

3. **Force Push Kullanmayın:**
   - `git push --force` template'i bozabilir

4. **`.env` Dosyasını Commit Etmeyin:**
   - Her zaman `.gitignore`'da olduğundan emin olun

---

## 📞 Yardım

Template kullanımı ile ilgili sorularınız için:
1. Bu dökümanı kontrol edin
2. Git log'larını inceleyin: `git log template/RBUMS-NodeJS`
3. Template repository'nin README'sini okuyun

---

## 📝 Örnek Workflow

### Günlük Geliştirme:

```bash
# 1. Sabah template'i kontrol et
git fetch template

# 2. Yeni özellik geliştir
git checkout -b feature/user-notifications
# ... kod yazma ...
git commit -m "feat: Kullanıcı bildirim sistemi eklendi"
git push origin feature/user-notifications

# 3. PR oluştur ve merge et
# ... GitHub'da PR ...

# 4. Template'den bug fix varsa al
git checkout RBUMS-NodeJS
git pull origin RBUMS-NodeJS
git merge template/RBUMS-NodeJS
git push origin RBUMS-NodeJS
```

### Haftalık Template Bakımı:

```bash
# Template projesine geç
cd C:\xampp\htdocs\RBUMS-NodeJS

# Güncelleme var mı kontrol et
git status
git log --oneline -10

# Varsa commit et ve tag oluştur
git tag -a v1.0.4 -m "Weekly update"
git push template RBUMS-NodeJS
git push template v1.0.4

# Tüm projelere duyuru:
# "v1.0.4 çıktı! Güvenlik güncellemeleri içeriyor."
```

---

**Template Version:** v1.0.0  
**Son Güncelleme:** 2025-10-09  
**Hazırlayan:** AI Assistant

---

## 🔖 Hızlı Referans

```bash
# Yeni proje başlat
git clone <template-url> MyProject && cd MyProject
git remote rename origin template
git remote add origin <my-project-url>

# Template'den güncelleme al
git fetch template && git merge template/RBUMS-NodeJS

# Template'e düzeltme gönder
git push template fix-branch

# Versiyon göster
git describe --tags template/RBUMS-NodeJS
```

