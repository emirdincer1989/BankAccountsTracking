const https = require('https');
const url = require('url');
const fs = require('fs');

// --- AYARLAR ---
const WSDL_URL = "https://vbservice.vakifbank.com.tr/HesapHareketleri.OnlineEkstre/SOnlineEkstreServis.svc";

function createSoapEnvelope(musteriNo, kullanici, sifre, hesapNo, baslangic, bitis) {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:peak="Peak.Integration.ExternalInbound.Ekstre"
               xmlns:peak1="http://schemas.datacontract.org/2004/07/Peak.Integration.ExternalInbound.Ekstre.DataTransferObjects"
               xmlns:wsa="http://www.w3.org/2005/08/addressing">
  <soap:Header>
    <wsa:Action>Peak.Integration.ExternalInbound.Ekstre/ISOnlineEkstreServis/GetirHareket</wsa:Action>
    <wsa:To>${WSDL_URL}</wsa:To>
  </soap:Header>
  <soap:Body>
    <peak:GetirHareket>
      <peak:sorgu>
        <peak1:MusteriNo>${musteriNo}</peak1:MusteriNo>
        <peak1:KurumKullanici>${kullanici}</peak1:KurumKullanici>
        <peak1:Sifre>${sifre}</peak1:Sifre>
        <peak1:SorguBaslangicTarihi>${baslangic} 00:00</peak1:SorguBaslangicTarihi>
        <peak1:SorguBitisTarihi>${bitis} 23:59</peak1:SorguBitisTarihi>
        <peak1:HesapNo>${hesapNo}</peak1:HesapNo>
        <peak1:HareketTipi></peak1:HareketTipi>
        <peak1:EnDusukTutar>0</peak1:EnDusukTutar>
        <peak1:EnYuksekTutar>0</peak1:EnYuksekTutar>
      </peak:sorgu>
    </peak:GetirHareket>
  </soap:Body>
</soap:Envelope>`;
}

async function sendSoapRequest(xml) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(WSDL_URL);
        const options = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8',
                'Content-Length': Buffer.byteLength(xml),
                'User-Agent': 'VakifBank-Client/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(xml);
        req.end();
    });
}

// Basit XML Parser (Regex ile - Bağımlılık olmasın diye)
function parseResponse(xml) {
    // XML'i dosyaya kaydet
    fs.writeFileSync('vakifbank_response.xml', xml);
    console.log('✅ Ham XML yanıtı vakifbank_response.xml dosyasına kaydedildi.');

    const extract = (tag, content) => {
        const regex = new RegExp(`<[^:]+:${tag}[^>]*>(.*?)</[^:]+:${tag}>`, 'g');
        const matches = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        return matches;
    };

    const islemKodu = extract('IslemKodu', xml)[0];
    const islemAciklama = extract('IslemAciklamasi', xml)[0];

    console.log('İşlem Sonucu:', islemKodu, '-', islemAciklama);

    if (islemKodu === 'VBB0001') {
        console.log('\n--- HAM XML CEVABI (Başarılı) ---');
        console.log(xml);
    } else {
        console.log('\n--- HATA DETAYI ---');
        console.log(xml);
    }
}

async function test() {
    const args = process.argv.slice(2);
    if (args.length < 4) {
        console.log('Kullanım: node test_vakifbank.js <MusteriNo> <KullaniciAdi> <Sifre> <HesapNo>');
        process.exit(1);
    }

    const [musteriNo, kullanici, sifre, hesapNo] = args;
    // Tarih formatı YYYY-MM-DD olmalı
    const today = new Date().toISOString().split('T')[0];

    // Son 1 haftalık veri
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const startDate = lastWeek.toISOString().split('T')[0];

    console.log('--- VAKIFBANK TEST (RAW HTTPS) ---');
    console.log(`Müşteri: ${musteriNo}, Kullanıcı: ${kullanici}`);
    console.log(`Tarih: ${startDate} - ${today}`);

    const xml = createSoapEnvelope(musteriNo, kullanici, sifre, hesapNo, startDate, today);

    // DEBUG: Gönderilen XML'i görelim
    console.log('\n--- GÖNDERİLEN XML ---');
    console.log(xml);
    console.log('----------------------\n');

    try {
        const response = await sendSoapRequest(xml);
        parseResponse(response);
    } catch (error) {
        console.error('HATA:', error.message);
    }
}

test();
