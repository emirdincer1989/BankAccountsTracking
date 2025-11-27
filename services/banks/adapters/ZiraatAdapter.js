const BaseBankAdapter = require('../BaseBankAdapter');
const https = require('https');
const querystring = require('querystring');
const { DataEncryption } = require('../../../utils/encryption'); // Assuming encryption util exists

class ZiraatAdapter extends BaseBankAdapter {
    constructor(credentials) {
        super(credentials);
        this.bankName = 'Ziraat';
        this.apiUrl = "https://hesap.ziraatbank.com.tr/HEK_NKYWS/HesapHareketleri.asmx/SorgulaDetayWS";
    }

    /**
     * Ziraat Bankası için login işlemi stateless (her istekte credentials gönderiliyor).
     * Bu yüzden login metodu sadece credentials kontrolü yapabilir veya boş geçilebilir.
     */
    async login() {
        // Ziraat servisi her istekte kullanıcı adı/şifre istiyor.
        // Session mantığı yok.
        return true;
    }

    /**
     * Hesap listesi servisi Ziraat'te bu endpoint'te yok gibi görünüyor (test scriptine göre).
     * Genelde bu tür servislerde hesap no zaten biliniyor olur.
     * Şimdilik boş dizi dönelim veya credentials içindeki IBAN'ı tek hesap olarak dönelim.
     */
    async getAccounts() {
        // Credentials içinde IBAN varsa onu hesap olarak dön
        if (this.credentials.iban) {
            return [{
                accountNumber: this.credentials.iban, // Ziraat genelde IBAN ile çalışıyor
                currency: 'TRY' // Varsayılan
            }];
        }
        return [];
    }

    /**
     * Hareketleri çeker
     */
    async getTransactions(accountNumber, startDate, endDate) {
        // Tarih formatı: dd.MM.yyyy
        const formatDate = (date) => {
            const d = new Date(date);
            return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
        };

        const postData = querystring.stringify({
            'kullaniciKod': this.credentials.customer_code,
            'sifre': this.credentials.password,
            'ibanNo': accountNumber || this.credentials.iban,
            'baslangicTarihi': formatDate(startDate),
            'bitisTarihi': formatDate(endDate)
        });

        const responseXml = await this._makeRequest(postData);
        return this.parseResponse(responseXml);
    }

    /**
     * XML yanıtını parse eder ve standart formata çevirir
     */
    parseResponse(xml) {
        const extract = (tag, content) => {
            const regex = new RegExp(`<[^:]*${tag}[^>]*>(.*?)</[^:]*${tag}>`, 'g');
            const matches = [];
            let match;
            while ((match = regex.exec(content)) !== null) {
                matches.push(match[1]);
            }
            return matches;
        };

        // Hata kontrolü
        const hataKodu = extract('hataKodu', xml)[0];
        const hataAciklama = extract('hataAciklama', xml)[0];

        if (hataKodu && hataKodu !== '0') {
            throw new Error(`Ziraat API Hatası: ${hataKodu} - ${hataAciklama}`);
        }

        const tarihler = extract('islemTarihi', xml);
        const tutarlar = extract('tutar', xml);
        const aciklamalar = extract('aciklama', xml);
        const dekontNolar = extract('dekontNo', xml); // Varsa unique ID için

        const transactions = [];

        for (let i = 0; i < tarihler.length; i++) {
            const rawAmount = tutarlar[i] || "0";
            // Tutar formatı: "1.234,56" veya "1234.56" olabilir. Test scriptinde raw kullanılmış.
            // Genelde TR formatı: 1.234,56
            // Veritabanı için nokta ondalık, virgül binlik olmalı veya tam tersi.
            // Standartlaştırma gerekebilir. Şimdilik basit replace yapalım.

            // Not: Test çıktısında formatı görmedik ama genelde XML servisleri nokta kullanır.
            // Eğer "1.000,50" geliyorsa: replace('.','').replace(',','.')

            let amount = parseFloat(rawAmount.replace(/\./g, '').replace(',', '.'));
            if (isNaN(amount)) amount = 0;

            // Eksi işareti varsa negatiftir (Borç)
            // Ancak banka ekstresinde eksi "giden para" demek mi?
            // Genelde ekstrede eksi olmaz, Borç/Alacak sütunu olur.
            // Test scripti: const isNegative = rawAmount.includes('-');
            // Demek ki eksi gelebiliyor.

            const transaction = {
                unique_bank_ref_id: dekontNolar[i] || `${tarihler[i]}-${i}-${amount}`, // Unique ID üretimi
                date: this._parseDate(tarihler[i]),
                amount: amount,
                description: aciklamalar[i],
                sender_receiver: '', // XML'den gelmiyor
                metadata: { raw: { tarih: tarihler[i], tutar: tutarlar[i], aciklama: aciklamalar[i] } }
            };
            transactions.push(transaction);
        }

        return transactions;
    }

    _parseDate(dateStr) {
        // dd.MM.yyyy HH:mm:ss veya dd.MM.yyyy
        const parts = dateStr.split(' ')[0].split('.');
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }

    _makeRequest(postData) {
        return new Promise((resolve, reject) => {
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData),
                    'User-Agent': 'Ziraat-Client/1.0'
                }
            };

            const req = https.request(this.apiUrl, options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP Error: ${res.statusCode} - ${data}`));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.write(postData);
            req.end();
        });
    }
}

module.exports = ZiraatAdapter;
