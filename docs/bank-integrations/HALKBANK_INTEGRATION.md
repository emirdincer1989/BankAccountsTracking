# Halkbank Entegrasyon Analizi (Güncel)

Bu döküman, Halkbank Ortak Hesap Ekstre Web Servisi (SOAP 1.1) ile yapılan başarılı canlı testler ve alınan gerçek veriler ışığında güncellenmiştir.

## 1. Servis Bilgileri
- **WSDL URL:** `https://webservice.halkbank.com.tr/HesapEkstreOrtakWS/HesapEkstreOrtak.svc?wsdl`
- **Endpoint URL:** `https://webservice.halkbank.com.tr/HesapEkstreOrtakWS/HesapEkstreOrtak.svc/Basic`
- **Protokol:** SOAP 1.1
- **Güvenlik:** WS-Security (UsernameToken)
- **Erişim Yöntemi:** Raw HTTPS (Node.js `https` modülü)

## 2. İstek Yapısı (Request)

### 2.1. Metot: `EkstreSorgulama`
Hesap hareketlerini sorgulamak için kullanılır.

**Örnek SOAP Envelope:**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:hes="http://schemas.datacontract.org/2004/07/HesapEkstreOrtakWS.Request">
   <soapenv:Header>
      <wsse:Security ...>
         <wsse:UsernameToken ...>
            <wsse:Username>14876182EPDUSR</wsse:Username>
            <wsse:Password ...>***</wsse:Password>
         </wsse:UsernameToken>
      </wsse:Security>
   </soapenv:Header>
   <soapenv:Body>
      <tem:EkstreSorgulama>
         <tem:request>
            <hes:BaslangicTarihi>2025-11-20</hes:BaslangicTarihi>
            <hes:BitisTarihi>2025-11-27</hes:BitisTarihi>
            <hes:HesapNo>45000012</hes:HesapNo>
            <hes:SubeKodu>425</hes:SubeKodu>
         </tem:request>
      </tem:EkstreSorgulama>
   </soapenv:Body>
</soapenv:Envelope>
```

## 3. Cevap Yapısı (Response)

**Başarılı Yanıt Örneği (Özet):**
```xml
<EkstreSorgulamaResponse>
  <EkstreSorgulamaResult>
    <HataKodu>0</HataKodu>
    <Hesaplar>
      <Hesap>
        <HesapNo>9425-14876182-45000012</HesapNo>
        <Bakiye>+110283,89</Bakiye>
        <Hareketler>
          <Hareket>
            <Tarih>20/11/2025</Tarih>
            <Saat>11:04:56</Saat>
            <HareketTutari>+10818,96</HareketTutari> <!-- İşaretli Tutar -->
            <Aciklama>... HASAR ODEMESI ...</Aciklama>
            <Bakiye>+119630,50</Bakiye>
            <ReferansNo>0040139</ReferansNo>
          </Hareket>
          <Hareket>
            <HareketTutari>-38440,03</HareketTutari> <!-- Negatif Tutar (Çıkış) -->
            <!-- ... -->
          </Hareket>
        </Hareketler>
      </Hesap>
    </Hesaplar>
  </EkstreSorgulamaResult>
</EkstreSorgulamaResponse>
```

## 4. Veri Dönüşümü (Mapping)

| XML Alanı | UnifiedTransaction Alanı | Notlar |
|-----------|--------------------------|--------|
| `ReferansNo` | `bankRefNo` | Benzersiz ID |
| `Tarih` + `Saat` | `transactionDate` | Birleştirilip ISO formatına çevrilir. |
| `HareketTutari` | `amount` | İşaret temizlenir, mutlak değer alınır. |
| `HareketTutari` (İşaret) | `direction` | `+` -> `INCOMING`, `-` -> `OUTGOING` |
| `Aciklama` | `description` | |
| `Bakiye` | `balanceAfter` | |

## 5. Kritik Bulgular
1.  **Hesap ve Şube Kodu:** Sorguda `HesapNo` ve `SubeKodu` gönderilmesi zorunludur, aksi takdirde hata alınabilir.
2.  **Ondalık Ayracı:** Gelen veride tutarlar virgül (`,`) ile ayrılmıştır (Örn: `+10818,96`).
3.  **Namespace:** `http://schemas.datacontract.org/2004/07/HesapEkstreOrtakWS.Request` namespace'i parametreler için kritiktir.
