# Vakıfbank Entegrasyon Analizi (Güncel)

Bu döküman, Vakıfbank Online Ekstre Servisi (SOAP 1.2) ile yapılan başarılı canlı testler ve alınan gerçek veriler ışığında güncellenmiştir.

## 1. Servis Bilgileri
- **WSDL URL:** `https://vbservice.vakifbank.com.tr/HesapHareketleri.OnlineEkstre/SOnlineEkstreServis.svc?wsdl`
- **Endpoint URL:** `https://vbservice.vakifbank.com.tr/HesapHareketleri.OnlineEkstre/SOnlineEkstreServis.svc`
- **Protokol:** SOAP 1.2
- **Erişim Yöntemi:** Raw HTTPS (Node.js `https` modülü)
- **User-Agent:** `VakifBank-Client/1.0` (WAF engellemesini aşmak için gereklidir)

## 2. İstek Yapısı (Request)

### 2.1. Metot: `GetirHareket`
Hesap hareketlerini sorgulamak için kullanılır.

**Örnek SOAP Envelope:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:peak="Peak.Integration.ExternalInbound.Ekstre"
               xmlns:peak1="http://schemas.datacontract.org/2004/07/Peak.Integration.ExternalInbound.Ekstre.DataTransferObjects"
               xmlns:wsa="http://www.w3.org/2005/08/addressing">
  <soap:Header>
    <wsa:Action>Peak.Integration.ExternalInbound.Ekstre/ISOnlineEkstreServis/GetirHareket</wsa:Action>
    <wsa:To>https://vbservice.vakifbank.com.tr/HesapHareketleri.OnlineEkstre/SOnlineEkstreServis.svc</wsa:To>
  </soap:Header>
  <soap:Body>
    <peak:GetirHareket>
      <peak:sorgu>
        <peak1:MusteriNo>00158007298593148</peak1:MusteriNo>
        <peak1:KurumKullanici>ufukbayraktutan</peak1:KurumKullanici>
        <peak1:Sifre>***</peak1:Sifre>
        <peak1:SorguBaslangicTarihi>2025-11-20 00:00</peak1:SorguBaslangicTarihi>
        <peak1:SorguBitisTarihi>2025-11-27 23:59</peak1:SorguBitisTarihi>
        <peak1:HesapNo>00158000046781438</peak1:HesapNo>
        <!-- Diğer alanlar boş bırakılabilir -->
      </peak:sorgu>
    </peak:GetirHareket>
  </soap:Body>
</soap:Envelope>
```

## 3. Cevap Yapısı (Response)

**Başarılı Yanıt Örneği (Özet):**
```xml
<GetirHareketResponse>
  <GetirHareketResult>
    <IslemKodu>VBB0001</IslemKodu>
    <IslemAciklamasi>Başarılı</IslemAciklamasi>
    <Hesaplar>
      <DtoEkstreHesap>
        <HesapNo>00158000046781438</HesapNo>
        <CariBakiye>11088909.54</CariBakiye>
        <Hareketler>
          <DtoEkstreHareket>
            <IslemTarihi>2025-11-20 02:06:26</IslemTarihi>
            <IslemNo>2025016446945146</IslemNo>
            <Tutar>6194545.01</Tutar> <!-- Mutlak Değer -->
            <BorcAlacak>A</BorcAlacak> <!-- A: Alacak (Giriş), B: Borç (Çıkış) -->
            <Aciklama>... virman yapılmıştır.</Aciklama>
            <IslemSonrasıBakiye>6194545.01</IslemSonrasıBakiye>
          </DtoEkstreHareket>
          <!-- Diğer hareketler... -->
        </Hareketler>
      </DtoEkstreHesap>
    </Hesaplar>
  </GetirHareketResult>
</GetirHareketResponse>
```

## 4. Veri Dönüşümü (Mapping)

| XML Alanı | UnifiedTransaction Alanı | Notlar |
|-----------|--------------------------|--------|
| `IslemNo` | `bankRefNo` | Benzersiz ID |
| `IslemTarihi` | `transactionDate` | Format: `YYYY-MM-DD HH:mm:ss` |
| `Tutar` | `amount` | Mutlak değer olarak gelir. |
| `BorcAlacak` | `direction` | `A` -> `INCOMING`, `B` -> `OUTGOING` |
| `Aciklama` | `description` | |
| `IslemSonrasıBakiye` | `balanceAfter` | |

## 5. Kritik Bulgular
1.  **Müşteri No:** XML içinde `MusteriNo` alanı boş gönderilmemelidir, aksi takdirde `VBH0005` hatası alınır.
2.  **Tarih Formatı:** Sorgu parametrelerinde `YYYY-MM-DD HH:mm` formatı kullanılmalıdır.
3.  **Ondalık Ayracı:** Gelen veride tutarlar nokta (`.`) ile ayrılmıştır (Örn: `6194545.01`).
