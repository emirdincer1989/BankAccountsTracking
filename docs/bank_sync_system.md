# Banka Hesapları Senkronizasyon Sistemi

Bu döküman, banka hesaplarının otomatik senkronizasyonunu sağlayan altyapıyı, bileşenleri ve çalışma mantığını açıklar.

## 1. Genel Mimari

Sistem, **BullMQ** (Redis tabanlı kuyruk sistemi) ve **Cron Jobs** (Zamanlanmış görevler) kullanarak periyodik olarak banka hesaplarını tarar ve yeni hareketleri veritabanına kaydeder.

### Temel Bileşenler:

1.  **Cron Job (`jobs/scheduleBankSync.js`):** Belirlenen aralıklarla (örn: 5 dakikada bir) çalışır ve aktif banka hesaplarını kuyruğa ekler.
2.  **Queue Manager (`services/queue/QueueManager.js`):** Kuyruğu yönetir ve Worker'ları (İşçileri) başlatır.
3.  **Worker:** Kuyruktan işleri alır ve `AccountService` üzerinden banka adaptörlerini tetikler.
4.  **AccountService (`services/AccountService.js`):** İlgili bankanın adaptörünü seçer, veriyi çeker ve veritabanına kaydeder.

---

## 2. Çalışma Akışı (Workflow)

1.  **Tetikleme:**
    *   `bankSyncJob` isimli Cron görevi her 5 dakikada bir çalışır.
    *   Veritabanından `is_active = true` olan tüm banka hesaplarını çeker.
    *   Her hesap için `bank-sync` kuyruğuna bir iş (Job) ekler.

2.  **İşleme (Processing):**
    *   `QueueManager` tarafından başlatılan Worker, kuyruğu dinler.
    *   Sırası gelen işi alır (`accountId` bilgisini içerir).
    *   `AccountService.syncAccount(accountId)` metodunu çağırır.

3.  **Senkronizasyon:**
    *   `AccountService`, hesabın hangi bankaya ait olduğunu belirler (Ziraat, Vakıf, Halk).
    *   İlgili adaptörü (`ZiraatAdapter` vb.) başlatır.
    *   Bankanın API'sine bağlanarak son hareketleri çeker.
    *   Yeni hareketleri `transactions` tablosuna kaydeder (Mükerrer kayıt kontrolü yapılır).

4.  **Sonuç:**
    *   İşlem başarılıysa kuyruktan silinir.
    *   Hata oluşursa (örn: Banka API hatası), BullMQ otomatik olarak **3 kez** tekrar dener (Exponential Backoff ile).

---

## 3. Konfigürasyon ve Ayarlar

### Kuyruk Ayarları (`services/queue/QueueManager.js`)
*   **Concurrency:** 5 (Aynı anda 5 hesap taranabilir).
*   **Rate Limit:** Saniyede en fazla 10 işlem.

### Cron Ayarları (`scripts/migrations/003_add_cron_job.js`)
*   **Zamanlama:** `*/5 * * * *` (Her 5 dakikada bir).
*   **Yönetim:** Admin panelindeki "Zamanlanmış Görevler" sayfasından aktif/pasif yapılabilir veya zamanlaması değiştirilebilir.

---

## 4. Hata Yönetimi

*   **Geçici Hatalar:** Banka API'si geçici olarak yanıt vermezse, sistem 5 saniye, 10 saniye ve 20 saniye arayla 3 kez tekrar dener.
*   **Kalıcı Hatalar:** 3 deneme sonunda hala hata alınıyorsa, iş "Failed" olarak işaretlenir ve hata loglarına yazılır (`utils/logger.js`).

## 5. Manuel Tetikleme

Admin panelinden veya API üzerinden manuel senkronizasyon da tetiklenebilir:
*   **Endpoint:** `POST /api/accounts/:id/sync`
*   Bu işlem kuyruğa girmez, anlık olarak çalışır ve sonucu döner.
