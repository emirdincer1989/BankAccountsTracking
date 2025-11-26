# Halkbank Entegrasyon Analizi

Bu döküman, Halkbank Ortak Hesap Ekstre Web Servisi (WCF) üzerinde yapılan teknik analiz ve testler sonucunda oluşturulmuştur.

## 1. Servis Bilgileri
- **WSDL URL:** `https://webservice.halkbank.com.tr/HesapEkstreOrtakWS/HesapEkstreOrtak.svc?wsdl`
- **Endpoint URL:** `https://webservice.halkbank.com.tr/HesapEkstreOrtakWS/HesapEkstreOrtak.svc/Basic` (BasicHttpBinding)
- **Protokol:** SOAP 1.1
- **Güvenlik:** WS-Security (UsernameToken)
- **Erişim Yöntemi:** Raw HTTPS (Node.js `https` modülü) - SoapUI ile birebir uyumlu XML yapısı kullanılarak.

## 2. Kritik Bulgular ve Çözümler

### 2.1. Endpoint Seçimi
WSDL dosyasında birden fazla endpoint tanımlıdır. Testler sonucunda `/Basic` ile biten endpoint'in (`BasicHttpBinding_IHesapEkstreOrtak`) çalıştığı tespit edilmiştir.

### 2.2. Metot İsmi
Başlangıçta düşünülen `EkstreSorgulamaBasic` yerine, SoapUI analizleri sonucunda **`EkstreSorgulama`** metodunun kullanılması gerektiği anlaşılmıştır.

### 2.3. Namespace
Parametreler için `http://schemas.datacontract.org/2004/07/HesapEkstreOrtakWS.Request` namespace'i kullanılmalıdır.

## 3. Kritik Metodlar

### 3.1. EkstreSorgulama
Hesap hareketlerini ve bakiyelerini sorgulamak için kullanılan ana metoddur.

**Giriş Parametreleri (`HesapEkstreRequest`):**
- `BaslangicTarihi` (String: yyyy-MM-dd)
- `BitisTarihi` (String: yyyy-MM-dd)
- `HesapNo` (String, Opsiyonel) - Boş bırakılırsa tüm hesaplar gelir.
- `SubeKodu` (String, Opsiyonel) - Bilinmiyorsa `0` gönderilebilir veya tag hiç gönderilmeyebilir.

**Çıkış Yapısı (`HesapEkstreResponse`):**
- `Hesaplar` dizisi içinde `Hesap` objeleri döner.
- Her `Hesap` objesi içinde `Hareketler` dizisi bulunur.

### 3.2. Hesap Detayı (`Hesap`)
- `HesapNo`, `IbanNo`
- `Bakiye`, `KullanilabilirBakiye`
- `HesapCinsi` (Döviz Tipi)

### 3.3. Hareket Detayı (`Hareket`)
- `HareketTutari`: İşlem tutarı. (Pozitif/Negatif olabilir).
- `Bakiye`: İşlem sonrası bakiye.
- `Tarih` ve `Saat`: Ayrı alanlar olarak gelir.
- `Aciklama`, `EkstreAciklama`
- `KarsiHesapIBAN`: Karşı taraf bilgisi.

## 4. Entegrasyon Stratejisi

1.  **Kimlik Doğrulama:** Halkbank, kullanıcı adı ve şifreyi **SOAP Header (WS-Security)** içinde bekler.
2.  **Hesap Keşfi:** `EkstreSorgulama` metodu `HesapNo` parametresi boş gönderilerek çağrılır ve tüm hesaplar keşfedilir.
3.  **Veri Dönüşümü:**
    - `HareketTutari` > 0 ise `INCOMING` (Giriş/Alacak)
    - `HareketTutari` < 0 ise `OUTGOING` (Çıkış/Borç)
    - Tarih formatı `dd.MM.yyyy` veya `yyyy-MM-dd` gelebilir, kontrol edilmelidir.
