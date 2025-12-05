const https = require('https');
const fs = require('fs');

// --- AYARLAR ---
const API_URL = "https://hesap.ziraatbank.com.tr/HEK_NKYWS/HesapHareketleri.asmx";

function createSoapEnvelope(kullanici, sifre, vkn) {
    // Tarih formatı: YYYY-MM-DDTHH:mm:ss
    const now = new Date();
    const today = now.toISOString().split('.')[0]; // Ms kısmını at

    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <HareketSorgulaVknIle xmlns="http://tempuri.org/">
      <kullaniciKod>${kullanici}</kullaniciKod>
      <sifre>${sifre}</sifre>
      <vkn>${vkn}</vkn>
      <muhasebeTarihi>${today}</muhasebeTarihi>
    </HareketSorgulaVknIle>
  </soap:Body>
</soap:Envelope>`;
}

function parseResponse(xml) {
    // XML'i dosyaya kaydet
    fs.writeFileSync('ziraat_vkn_response.xml', xml);
    console.log('✅ Ham XML yanıtı ziraat_vkn_response.xml dosyasına kaydedildi.');

    // Basit regex ile hesapları bulmaya çalışalım
    // DetayliHesap tagleri içindeki bilgileri alacağız
    const hesapRegex = /<DetayliHesap>(.*?)<\/DetayliHesap>/g;
    let match;
    let hesapSayisi = 0;

    console.log('\n--- BULUNAN HESAPLAR ---');

    while ((match = hesapRegex.exec(xml)) !== null) {
        hesapSayisi++;
        const hesapIcerik = match[1];

        const extract = (tag) => {
            const r = new RegExp(`<${tag}>(.*?)<\/${tag}>`);
            const m = r.exec(hesapIcerik);
            return m ? m[1] : '';
        };

        const iban = extract('IBAN');
        const subeAdi = extract('subeAdi');
        const ekNo = extract('ekNo');
        const hesapTuru = extract('hesapTuru'); // 1: Vadesiz, 2: Vadeli olabilir (tahmini)
        const toplamBakiye = extract('toplamBakiye');
        const paraCinsi = extract('paraCinsi');

        console.log(`\n[Hesap ${hesapSayisi}]`);
        console.log(`IBAN: ${iban}`);
        console.log(`Şube: ${subeAdi}`);
        console.log(`Ek No: ${ekNo}`);
        console.log(`Tür: ${hesapTuru}`);
        console.log(`Bakiye: ${toplamBakiye} ${paraCinsi}`);
    }

    if (hesapSayisi === 0) {
        console.log('Hiç hesap bulunamadı veya XML formatı farklı.');

        // Hata kontrolü
        const hataRegex = /<responseAciklama>(.*?)<\/responseAciklama>/;
        const hataMatch = hataRegex.exec(xml);
        if (hataMatch) {
            console.log('API Mesajı:', hataMatch[1]);
        }
    }
}

async function test() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.log('Kullanım: node test_ziraat_vkn.js <KullaniciAdi> <Sifre> <VKN>');
        process.exit(1);
    }

    const [kullanici, sifre, vkn] = args;

    console.log('--- ZIRAAT BANKASI VKN SORGUSU ---');
    console.log(`Kullanıcı: ${kullanici}`);
    console.log(`VKN: ${vkn}`);

    const xml = createSoapEnvelope(kullanici, sifre, vkn);

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'Content-Length': Buffer.byteLength(xml),
            'SOAPAction': "http://tempuri.org/HareketSorgulaVknIle"
        }
    };

    const req = https.request(API_URL, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                parseResponse(data);
            } else {
                console.log(`\nHTTP HATA: ${res.statusCode}`);
                console.log(data);
            }
        });
    });

    req.on('error', (e) => {
        console.error('Bağlantı Hatası:', e);
    });

    req.write(xml);
    req.end();
}

test();
