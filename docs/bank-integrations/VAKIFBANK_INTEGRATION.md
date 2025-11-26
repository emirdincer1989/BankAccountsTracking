# Vakıfbank Entegrasyon Analizi

Bu döküman, Vakıfbank Online Ekstre Servisi (SOAP) üzerinde yapılan teknik analiz ve testler sonucunda oluşturulmuştur.

## 1. Servis Bilgileri
- **WSDL URL:** `https://vbservice.vakifbank.com.tr/HesapHareketleri.OnlineEkstre/SOnlineEkstreServis.svc?wsdl`
- **Protokol:** SOAP 1.2 (Zorunlu)
- **Servis Adı:** `SOnlineEkstreServis`
- **Erişim Yöntemi:** Raw HTTPS (Node.js `https` modülü) - `node-soap` kütüphanesi ile yaşanan uyumluluk ve WAF sorunları nedeniyle.

## 2. Kritik Bulgular ve Çözümler

### 2.1. WAF ve User-Agent Engellemesi
Vakıfbank güvenlik duvarı (WAF), standart Node.js veya SOAP istemcilerini engelleyerek `Request Rejected` hatası döndürmektedir.
**Çözüm:** İstek başlıklarına (Header) tarayıcı benzeri bir `User-Agent` eklenmelidir.
Örn: `User-Agent: Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)`

### 2.2. SOAP Sürümü
Servis kesinlikle **SOAP 1.2** formatında istek beklemektedir. `Content-Type: application/soap+xml; charset=utf-8` başlığı zorunludur.

## 3. Kritik Metodlar

### 3.1. GetirHareket
Hesap hareketlerini detaylı olarak çeken ana metoddur.

**Giriş Parametreleri (`DtoEkstreSorgu`):**

| Parametre | Tip | Zorunluluk | Açıklama |
|-----------|-----|------------|----------|
| `MusteriNo` | string | **Evet** | Banka müşteri numarası |
| `KurumKullanici` | string | **Evet** | API kullanıcı adı |
| `Sifre` | string | **Evet** | API şifresi |
| `SorguBaslangicTarihi` | string | **Evet** | Format: `yyyy-MM-dd` |
| `SorguBitisTarihi` | string | **Evet** | Format: `yyyy-MM-dd` |
| `HesapNo` | string | **Evet*** | Sorgulanacak hesap numarası. |

> **⚠️ Önemli Not:** WSDL şemasında `HesapNo` alanı opsiyonel görünse de, boş bırakıldığında sağlıklı veri dönmemektedir. Her hesap için ayrı sorgu atılmalıdır.

**Çıkış Yapısı (`DtoEkstreCevap`):**
Dönen cevap içinde `Hesaplar` dizisi (`ArrayOfDtoEkstreHesap`) bulunur.

### 3.2. DtoEkstreHesap (Hesap Detayı)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `HesapNo` | string | Hesap numarası |
| `HesapNoIban` | string | IBAN |
| `DovizTipi` | string | TRY, USD, EUR vb. |
| `CariBakiye` | decimal | Güncel bakiye |
| `Hareketler` | Array | Hareket listesi (`ArrayOfDtoEkstreHareket`) |

### 3.3. DtoEkstreHareket (İşlem Detayı)
| Alan | Tip | Açıklama |
|------|-----|----------|
| `IslemNo` / `Id` | string/long | Benzersiz işlem numarası (Unique Key) |
| `IslemTarihi` | string | İşlem tarihi |
| `Tutar` | decimal | İşlem tutarı (Mutlak değer) |
| `BorcAlacak` | string | `A` (Alacak/Giriş) veya `B` (Borç/Çıkış) |
| `Aciklama` | string | İşlem açıklaması |
| `IslemSonrasıBakiye` | decimal | İşlemden sonraki bakiye |

## 4. Entegrasyon Stratejisi
Vakıfbank entegrasyonunda aşağıdaki akış izlenecektir:

1.  **Raw HTTPS İstemcisi:** `node-soap` yerine, XML zarfını (Envelope) manuel oluşturan ve `https` modülü ile gönderen özel bir adaptör yapısı kullanılacaktır.
2.  **Hesap Tanımlama:** Kullanıcı sisteme Vakıfbank hesaplarını eklerken `HesapNo` bilgisini girmek zorundadır.
3.  **Transaction Mapping:**
    - `BorcAlacak == 'A'` veya `'ALACAK'` -> `Direction: INCOMING`
    - `BorcAlacak == 'B'` veya `'BORC'` -> `Direction: OUTGOING`
