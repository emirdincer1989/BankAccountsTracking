# Bank Accounts Tracking - Master Design Document (MDD)

## 1. Proje Özeti ve Mimari Kararlar
Bu proje, birden fazla kurumun (Tenant) farklı bankalardaki hesap hareketlerini tek bir panelden izlemesini, verilerin güvenli bir şekilde saklanmasını ve otomatik kategorize edilmesini sağlayan bir SaaS çözümüdür.

### 1.1. Mimari Yaklaşım: Modular Monolith
- **Single Database, Multi-Tenant:** Tüm veriler tek bir PostgreSQL veritabanında tutulacak. Veri izolasyonu `institution_id` (kurum_id) kolonu ile sağlanacak.
- **Asenkron Mimari (Producer-Consumer):** Banka sorguları asla son kullanıcı isteği (HTTP Request) anında yapılmayacak.
  - **Producer:** Cron Job veya Admin Tetikleyici -> Redis Kuyruğuna iş atar.
  - **Consumer (Worker):** Kuyruktan işi alır -> Banka API'sine gider -> Veriyi şifreler -> DB'ye yazar.
- **Frontend-Backend İzolasyonu:** Frontend sadece kendi veritabanımızdaki veriyi bilir. Banka API'sinin çökmesi, yavaşlaması arayüzü etkilemez.

## 2. Veritabanı Tasarımı ve Güvenlik

### 2.1. Varlık İlişkileri (ERD Özeti)
1.  **Institutions (Kurumlar):** Sisteme üye firmalar.
2.  **BankCredentials:** Kurumların banka giriş bilgileri.
    - *Kritik:* `api_password`, `client_id` gibi alanlar **AES-256** ile şifrelenerek saklanacak.
3.  **BankAccounts:** Hesap tanımları (IBAN, Para Birimi).
4.  **Transactions:** Hesap hareketleri.
    - *Performans:* `institution_id` ve `transaction_date` bazlı partition veya index stratejisi uygulanacak.
5.  **TransactionCategories & Rules:** "Soft" kategorilendirme için Regex kuralları.

### 2.2. Veri Güvenliği (Encryption at Rest)
- **Hassas Veriler:** Veritabanında asla düz metin (plain-text) tutulmayacak alanlar:
  - Banka Şifreleri / API Keyleri
  - Müşteri Vergi Numaraları (Gerekirse)
  - IBAN (Maskelenmiş hali açık, tam hali şifreli olabilir)
- **Mekanizma:** Projedeki `utils/encryption.js` modülü, veritabanı hook'ları (Sequelize/TypeORM hooks benzeri, manuel repository katmanında) ile entegre edilecek. Okurken decrypt, yazarken encrypt yapılacak.

## 3. Entegrasyon ve Senkronizasyon Stratejisi

### 3.1. Queue (Kuyruk) Yapısı
- **Teknoloji:** Redis + BullMQ (veya benzeri sağlam bir kütüphane).
- **Akış:**
  1.  Cron her 5 dakikada bir çalışır.
  2.  Aktif kurumların aktif hesaplarını bulur.
  3.  Her hesap için kuyruğa bir `syncBankData` job'ı atar.
  4.  Worker job'ı alır, bankaya SOAP isteği atar.
  5.  Gelen veri parse edilir, mükerrer kayıt kontrolü (Unique ID: Banka Ref No) yapılır.
  6.  Yeni kayıtlar DB'ye eklenir.

### 3.2. Concurrency (Eşzamanlılık) ve Kilitleme
- **Sorun:** 5 dakikalık cron çalıştı, banka yavaş olduğu için işlem 7 dakika sürdü. 2. cron tetiklendiğinde aynı hesabı tekrar çekmeye çalışmamalı.
- **Çözüm (Distributed Lock):** Redis üzerinde `lock:sync:account:{id}` anahtarı kullanılacak. Kilit varsa işlem pas geçilecek.

### 3.3. Hata Yönetimi (Circuit Breaker)
- Bir banka servisi üst üste 5 kez hata verirse (Timeout/500), o banka için kuyruk geçici olarak durdurulacak (Cool-down period). Böylece sistem kaynakları boşa harcanmaz.

## 4. Loglama ve İzlenebilirlik (Audit)

### 4.1. Audit Logs
- **Kapsam:** Kim, Hangi IP, Hangi Kaynak, Ne Zaman, Eski Değer, Yeni Değer.
- **Özellikle:** Manuel tetikleme yapan adminler ve hassas veri görüntüleyen kullanıcılar loglanacak.

### 4.2. System Logs
- Banka API istekleri ve cevapları (Hassas veriler maskelenerek) log dosyalarına veya ELK stack'e basılacak. Hata ayıklama için "Request ID" kullanılacak.

## 5. Geliştirme Fazları
1.  **Faz 1: Temel Şema ve Güvenlik:** Kurum yapısı, şifreli credential saklama.
2.  **Faz 2: Queue Altyapısı:** Redis entegrasyonu, Worker servisi kurulumu.
3.  **Faz 3: Banka Entegrasyonu (Mock):** Gerçek banka yerine Mock servis ile akışın testi.
4.  **Faz 4: Kategorizasyon Motoru:** Gelen veriyi kurallara göre etiketleme.
5.  **Faz 5: Dashboard ve Raporlama:** Son kullanıcı ekranları.
