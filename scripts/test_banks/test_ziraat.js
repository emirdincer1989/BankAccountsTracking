const https = require('https');
const querystring = require('querystring');

// --- AYARLAR ---
// HTTP POST için endpoint sonuna metod adı eklenir
const API_URL = "https://hesap.ziraatbank.com.tr/HEK_NKYWS/HesapHareketleri.asmx/SorgulaDetayWS";

function parseResponse(xml) {
    const extract = (tag, content) => {
        // Namespace prefix'lerini (örn: <tns:tutar>) yok sayan regex
        const regex = new RegExp(`<[^:]*${tag}[^>]*>(.*?)</[^:]*${tag}>`, 'g');
        const matches = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        return matches;
    };

    console.log('\n--- SONUÇ ---');

    // Hata kontrolü
    const hataKodu = extract('hataKodu', xml)[0];
    const hataAciklama = extract('hataAciklama', xml)[0];

    if (hataKodu && hataKodu !== '0') {
        console.log(`API HATA: ${hataKodu} - ${hataAciklama}`);
        console.log(xml);
        return;
    }

    // Hareketleri bul
    const tarihler = extract('islemTarihi', xml);
    const tutarlar = extract('tutar', xml); // islemTutari -> tutar
    const aciklamalar = extract('aciklama', xml);
    const borcAlacak = extract('borcAlacakBilgisi', xml);
    const bakiyeler = extract('kalanBakiye', xml);

    if (tarihler.length > 0) {
        console.log(`${tarihler.length} hareket bulundu:`);
        for (let i = 0; i < Math.min(tarihler.length, 10); i++) {
            console.log(`${tarihler[i]} | ${tutarlar[i]} TL | ${borcAlacak[i]} | ${aciklamalar[i]}`);
        }
    } else {
        console.log('Hareket bulunamadı veya XML parse edilemedi.');
        console.log(xml);
    }
}

async function test() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.log('Kullanım: node test_ziraat.js <KullaniciAdi> <Sifre> <IBAN>');
        process.exit(1);
    }

    const [kullanici, sifre, iban] = args;

    // Tarih formatı: dd.MM.yyyy (Ziraat için olası format)
    const now = new Date();
    const today = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;

    const lastWeekDate = new Date();
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const startDate = `${String(lastWeekDate.getDate()).padStart(2, '0')}.${String(lastWeekDate.getMonth() + 1).padStart(2, '0')}.${lastWeekDate.getFullYear()}`;

    console.log('--- ZIRAAT BANKASI TEST (HTTP POST) ---');
    console.log(`URL: ${API_URL}`);
    console.log(`Kullanıcı: ${kullanici}`);
    console.log(`IBAN: ${iban}`);
    console.log(`Tarihler: ${startDate} - ${today}`);

    const postData = querystring.stringify({
        'kullaniciKod': kullanici,
        'sifre': sifre,
        'ibanNo': iban,
        'baslangicTarihi': startDate,
        'bitisTarihi': today
    });

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'Ziraat-Client/1.0'
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

    req.write(postData);
    req.end();
}

test();
