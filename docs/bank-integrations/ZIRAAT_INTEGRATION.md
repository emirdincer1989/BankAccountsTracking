# Ziraat Bankası Entegrasyon Analizi

Bu döküman, Ziraat Bankası Hesap Hareketleri Web Servisi üzerinde yapılan teknik analiz ve testler sonucunda oluşturulmuştur.

## 1. Servis Bilgileri
- **WSDL URL:** `https://hesap.ziraatbank.com.tr/HEK_NKYWS/HesapHareketleri.asmx?wsdl`
- **Endpoint URL:** `https://hesap.ziraatbank.com.tr/HEK_NKYWS/HesapHareketleri.asmx/SorgulaDetayWS`
- **Protokol:** HTTP POST (`application/x-www-form-urlencoded`)
- **Servis Tipi:** .NET ASMX Web Service
- **Erişim Yöntemi:** Raw HTTPS (Node.js `https` modülü) - SOAP yerine HTTP POST yöntemi tercih edilmiştir.

## 2. Kritik Bulgular ve Çözümler

### 2.1. Protokol Seçimi (HTTP POST)
SOAP entegrasyonunda yaşanan `500 Internal Server Error` ve `IncidentId` hataları nedeniyle, WSDL tarafından desteklenen **HTTP POST** yöntemine geçilmiştir. Bu yöntem daha basit ve hatasız çalışmaktadır.

### 2.2. VKN Yetki Sorunu
`HareketSorgulaVknIle` metodu kullanıldığında "Yetkiniz olmayan VKN" hatası alınmıştır. Bu nedenle hesap keşfi yerine **IBAN bazlı sorgulama** stratejisi benimsenmiştir.

### 2.3. Tarih Formatı
Ziraat Bankası HTTP POST servisi tarihleri **`dd.MM.yyyy`** (Gün.Ay.Yıl) formatında beklemektedir. (Örn: `26.11.2025`)

## 3. Kritik Metodlar

### 3.1. SorgulaDetayWS (Hareketler İçin)
Belirli bir IBAN için tarih aralığındaki hareketleri getirir.

**Giriş Parametreleri (Form Data):**
- `kullaniciKod`
- `sifre`
- `ibanNo` (Zorunlu)
- `baslangicTarihi` (String: dd.MM.yyyy)
- `bitisTarihi` (String: dd.MM.yyyy)

**Çıkış (XML):**
- `islemTarihi`: String (dd/MM/yyyy)
- `aciklama`: String
- `tutar`: Decimal (Virgül ayracı kullanılabilir)
- `borcAlacakBilgisi`: `A` (Alacak/Giriş) veya `B` (Borç/Çıkış)
- `kalanBakiye`: Decimal
- `muhasebeReferansi`: Unique ID olarak kullanılabilir.

## 4. Entegrasyon Stratejisi

1.  **Hesap Tanımlama:** Kullanıcı sisteme Ziraat Bankası hesaplarını eklerken **IBAN** bilgisini girmek zorundadır. Otomatik hesap keşfi (VKN ile) şu an için yetki sorunları nedeniyle kullanılamamaktadır.
2.  **Hareket Senkronizasyonu:** Her IBAN için `SorgulaDetayWS` metodu HTTP POST ile çağrılır.
3.  **Veri Dönüşümü:**
    - `borcAlacakBilgisi == 'A'` veya `'ALACAK'` -> `Direction: INCOMING`
    - `borcAlacakBilgisi == 'B'` veya `'BORC'` -> `Direction: OUTGOING`
    - Tarih ve Tutar formatları parse edilirken yerel formatlara (dd.MM.yyyy, virgül ayraç) dikkat edilmelidir.
