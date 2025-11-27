# Ziraat Bankası Entegrasyon Analizi (Güncel)

Bu döküman, Ziraat Bankası Hesap Hareketleri Web Servisi (HTTP POST) ile yapılan başarılı canlı testler ve alınan gerçek veriler ışığında güncellenmiştir.

## 1. Servis Bilgileri
- **WSDL URL:** `https://hesap.ziraatbank.com.tr/HEK_NKYWS/HesapHareketleri.asmx?wsdl`
- **Endpoint URL:** `https://hesap.ziraatbank.com.tr/HEK_NKYWS/HesapHareketleri.asmx/SorgulaDetayWS`
- **Protokol:** HTTP POST (`application/x-www-form-urlencoded`)
- **Erişim Yöntemi:** Raw HTTPS (Node.js `https` modülü)

## 2. İstek Yapısı (Request)

### 2.1. Metot: `SorgulaDetayWS`
Belirli bir IBAN için hareketleri sorgulamak için kullanılır.

**Form Data Parametreleri:**
- `kullaniciKod`: ESHOTGNMD
- `sifre`: ***
- `ibanNo`: TR620001000137381604485001
- `baslangicTarihi`: 20.11.2025 (Format: dd.MM.yyyy)
- `bitisTarihi`: 27.11.2025 (Format: dd.MM.yyyy)

## 3. Cevap Yapısı (Response)

**Başarılı Yanıt Örneği (Özet):**
```xml
<Hareketler>
  <hataKodu>0</hataKodu>
  <hataAciklama>OK</hataAciklama>
  <hareket>
    <Hareket>
      <islemTarihi>25/11/2025</islemTarihi>
      <aciklama>... DOSYA ÖDEMESİ ...</aciklama>
      <tutar>4027,11</tutar> <!-- Pozitif Tutar (Giriş) -->
      <kalanBakiye>213627,23</kalanBakiye>
      <islemKodu>EFT</islemKodu>
    </Hareket>
    <Hareket>
      <islemTarihi>24/11/2025</islemTarihi>
      <aciklama>... HGS tahsilatı</aciklama>
      <tutar>-390,0</tutar> <!-- Negatif Tutar (Çıkış) -->
      <kalanBakiye>170020,24</kalanBakiye>
      <islemKodu>XXX</islemKodu>
    </Hareket>
  </hareket>
</Hareketler>
```

## 4. Veri Dönüşümü (Mapping)

| XML Alanı | UnifiedTransaction Alanı | Notlar |
|-----------|--------------------------|--------|
| `islemKodu` + Index | `bankRefNo` | Benzersiz ID (XML'de `muhasebeReferansi` yoksa üretilir) |
| `islemTarihi` | `transactionDate` | Format: `dd/MM/yyyy` -> ISO |
| `tutar` | `amount` | İşaret temizlenir, mutlak değer alınır. |
| `tutar` (İşaret) | `direction` | Pozitif -> `INCOMING`, Negatif (`-`) -> `OUTGOING` |
| `aciklama` | `description` | |
| `kalanBakiye` | `balanceAfter` | |

## 5. Kritik Bulgular
1.  **Borç/Alacak Bilgisi:** XML yanıtında `borcAlacakBilgisi` etiketi **GELMEMEKTEDİR**. Yön, `tutar` alanındaki eksi (`-`) işaretine göre belirlenmelidir.
2.  **Ondalık Ayracı:** Tutarlar virgül (`,`) ile ayrılmıştır (Örn: `4027,11` veya `-390,0`).
3.  **Tarih Formatı:** İstekte `dd.MM.yyyy`, cevapta `dd/MM/yyyy` formatı kullanılır.
