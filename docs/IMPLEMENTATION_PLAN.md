# Implementation Plan

Bu plan, `MASTER_DESIGN.md` dosyasındaki mimariyi hayata geçirmek için adım adım yapılacakları içerir.

## Faz 1: Veritabanı ve Temel Varlıklar (Current Focus)
- [ ] **DB Şema Güncellemesi:**
    - [ ] `institutions` tablosu oluşturulacak.
    - [ ] `users` tablosuna `institution_id` eklenecek (Multi-tenancy için).
    - [ ] `bank_definitions` (Bankaların statik tanımları: Akbank, Garanti vb.) tablosu.
    - [ ] `bank_credentials` tablosu (Şifreli alanlar içerecek).
    - [ ] `bank_accounts` tablosu.
    - [ ] `account_transactions` tablosu.
- [ ] **Model/Repository Katmanı:**
    - [ ] `BankCredential` modeli için otomatik şifreleme/çözme (encryption) metodlarının yazılması.
    - [ ] `transaction` fonksiyonlarının `institution_id` zorunluluğu ile güncellenmesi.

## Faz 2: Queue ve Worker Altyapısı
- [ ] **Redis Entegrasyonu:**
    - [ ] `bull` veya `bullmq` kütüphanesinin projeye eklenmesi.
    - [ ] Redis bağlantı ayarlarının yapılandırılması.
- [ ] **Job Queue Oluşturma:**
    - [ ] `bankSyncQueue` tanımlanması.
    - [ ] Job Producer (İş üreten) servisinin yazılması.
    - [ ] Job Consumer (İş işleyen) worker yapısının kurulması.
- [ ] **Concurrency Control:**
    - [ ] Redis Lock mekanizmasının `utils/locker.js` olarak eklenmesi.

## Faz 3: Banka Entegrasyon Katmanı (Adapter Pattern)
- [ ] **BaseBankAdapter:** Tüm bankalar için ortak bir arayüz (Interface) tanımlanması.
    - `login()`, `getAccounts()`, `getTransactions(startDate, endDate)`
- [ ] **SOAP Client:** `soap` veya `axios` (REST ise) ile banka haberleşme modülü.
- [ ] **Mock Bank Adapter:** Geliştirme ortamı için sahte veri üreten adaptör.

## Faz 4: İş Mantığı ve Kategorizasyon
- [ ] **Transaction Service:**
    - [ ] Bankadan gelen ham veriyi `account_transactions` tablosuna "Upsert" (Varsa güncelle, yoksa ekle) yapan mantık.
    - [ ] Mükerrer kayıt önleme (Hash veya RefNo kontrolü).
- [ ] **Categorization Engine:**
    - [ ] Açıklama metnini (description) regex kuralları ile tarayıp `category_id` atayan servis.

## Faz 5: Frontend ve Dashboard
- [ ] **Kurum Yönetimi Ekranları:** (Süper Admin için)
- [ ] **Banka Hesap Tanımlama Ekranları:** (Kurum Admini için)
- [ ] **Finansal Dashboard:** Bakiye ve hareketlerin gösterimi.
