const https = require('https');
const url = require('url');
const fs = require('fs');

// SoapUI'dan doğrulanan URL
const TARGET_URL = "https://webservice.halkbank.com.tr/HesapEkstreOrtakWS/HesapEkstreOrtak.svc/Basic";

function createSoapEnvelope(username, password, hesapNo, subeKodu, baslangic, bitis) {
    // Tarih formatı: YYYY-MM-DD (SoapUI'da böyle görünüyor)
    const fmtBaslangic = baslangic.split('T')[0];
    const fmtBitis = bitis.split('T')[0];

    // WS-Security Header
    const soapHeader = `
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      <wsse:UsernameToken wsu:Id="UsernameToken-1">
        <wsse:Username>${username}</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>`;

    // HesapNo ve SubeKodu (Opsiyonel)
    const hesapNoTag = hesapNo ? `<hes:HesapNo>${hesapNo}</hes:HesapNo>` : '<hes:HesapNo/>';
    const subeKoduTag = subeKodu ? `<hes:SubeKodu>${subeKodu}</hes:SubeKodu>` : '<hes:SubeKodu>0</hes:SubeKodu>';

    return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:hes="http://schemas.datacontract.org/2004/07/HesapEkstreOrtakWS.Request">
   <soapenv:Header>${soapHeader}</soapenv:Header>
   <soapenv:Body>
      <tem:EkstreSorgulama>
         <tem:request>
            <hes:BaslangicTarihi>${fmtBaslangic}</hes:BaslangicTarihi>
            <hes:BitisTarihi>${fmtBitis}</hes:BitisTarihi>
            ${hesapNoTag}
            ${subeKoduTag}
         </tem:request>
      </tem:EkstreSorgulama>
   </soapenv:Body>
</soapenv:Envelope>`;
}

async function sendSoapRequest(xml) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(TARGET_URL);
        const options = {
            hostname: parsedUrl.hostname,
            port: 443,
            path: parsedUrl.path,
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'Content-Length': Buffer.byteLength(xml),
                'SOAPAction': 'http://tempuri.org/IHesapEkstreOrtak/EkstreSorgulama',
                'User-Agent': 'Apache-HttpClient/4.5.5 (Java/12.0.1)' // SoapUI taklidi
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

function parseResponse(xml) {
    // XML'i dosyaya kaydet
    fs.writeFileSync('halkbank_response.xml', xml);
    console.log('✅ Ham XML yanıtı halkbank_response.xml dosyasına kaydedildi.');

    const extract = (tag, content) => {
        // Namespace'li veya namespace'siz tagleri yakala
        const regex = new RegExp(`<(?:[\\w]+:)?${tag}(?: [^>]*)?>(.*?)</(?:[\\w]+:)?${tag}>`, 'g');
        const matches = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        return matches;
    };

    console.log('\n--- SONUÇ ---');

    const hataAciklama = extract('HataAciklama', xml)[0];
    const hataKodu = extract('HataKodu', xml)[0];

    console.log(`Durum: ${hataKodu} - ${hataAciklama}`);

    if (hataKodu === '0') {
        // <Hesap> bloklarını bul
        // Regex ile <b:Hesap>...</b:Hesap> veya <Hesap>...</Hesap> bloklarını ayırıyoruz.
        // Dotall mode için [\s\S]*? kullanıyoruz.
        const hesapRegex = /<(?:[\w]+:)?Hesap>([\s\S]*?)<\/(?:[\w]+:)?Hesap>/g;
        const hesapBloklari = [];
        let match;
        while ((match = hesapRegex.exec(xml)) !== null) {
            hesapBloklari.push(match[1]);
        }

        console.log(`\n✅ ${hesapBloklari.length} gerçek hesap bulundu.`);

        hesapBloklari.forEach((block, index) => {
            // Blok içinden değerleri çek
            const getVal = (tag) => {
                const r = new RegExp(`<(?:[\\w]+:)?${tag}(?: [^>]*)?>(.*?)</(?:[\\w]+:)?${tag}>`);
                const m = r.exec(block);
                return m ? m[1] : 'Bulunamadı';
            };

            const hesapNo = getVal('HesapNo');
            const subeKodu = getVal('SubeKodu');
            const subeAdi = getVal('SubeAdi');
            const musteriNo = getVal('MusteriNo');
            const iban = getVal('IbanNo');

            // Bakiye: Hesap bloğunun hemen altındaki Bakiye tag'ini almalıyız.
            // Ancak Hareketler içindeki Bakiye ile karışmaması için, Hareketler taginden öncesine bakabiliriz
            // Veya basitçe ilk Bakiye tagini alırız (çünkü Hareketler daha sonra gelir)
            const bakiyeMatch = /<(?:[\w]+:)?Bakiye>(.*?)<\/(?:[\w]+:)?Bakiye>/.exec(block);
            const bakiye = bakiyeMatch ? bakiyeMatch[1] : 'Bulunamadı';

            console.log(`\n--- HESAP ${index + 1} ---`);
            console.log(`Hesap No: ${hesapNo}`);
            console.log(`Şube: ${subeKodu} - ${subeAdi}`);
            console.log(`Müşteri No: ${musteriNo}`);
            console.log(`IBAN: ${iban}`);
            console.log(`Bakiye: ${bakiye}`);

            // Hareket Sayısı
            const hareketMatch = block.match(/<(?:[\w]+:)?Hareket>/g);
            console.log(`Hareket Sayısı: ${hareketMatch ? hareketMatch.length : 0}`);

            // Öneri
            let shortAccountNo = hesapNo;
            if (hesapNo && hesapNo.includes('-')) {
                const parts = hesapNo.split('-');
                if (parts.length === 3) shortAccountNo = parts[2];
            }
            console.log(`👉 ÖNERİLEN AYARLAR -> Account Number: ${shortAccountNo}, Branch Code: ${subeKodu}`);
        });

        console.log('\n--- HAM XML ---');
        // console.log(xml); // Çok uzun olabilir, sadece gerekirse açın
        console.log('(XML içeriği dosyaya kaydedildi)');
    } else {
        console.log('\n--- HATA DETAYI ---');
        console.log(xml);
    }
}

async function test() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Kullanım: node test_halkbank.js <KullaniciAdi> <Parola> [HesapNo] [SubeKodu]');
        process.exit(1);
    }

    const [username, password, hesapNo, subeKodu] = args;
    const today = new Date().toISOString();

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const startDate = lastWeek.toISOString();

    console.log('--- HALKBANK TEST (SOAPUI MATCH) ---');
    console.log(`Kullanıcı: ${username}`);
    console.log(`URL: ${TARGET_URL}`);
    if (hesapNo) console.log(`Hesap: ${hesapNo}, Şube: ${subeKodu || '0'}`);

    try {
        const xml = createSoapEnvelope(username, password, hesapNo, subeKodu, startDate, today);
        const response = await sendSoapRequest(xml);
        parseResponse(response);
    } catch (error) {
        console.error(`❌ HATA: ${error.message}`);
    }
}

test();
