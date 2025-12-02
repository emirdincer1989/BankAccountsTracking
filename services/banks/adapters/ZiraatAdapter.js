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
        console.log('Ziraat Raw XML Response:', xml);

        const transactions = [];
        const movementRegex = /<Hareket>([\s\S]*?)<\/Hareket>/g;

        let match;
        while ((match = movementRegex.exec(xml)) !== null) {
            const block = match[1];

            const getVal = (tag) => {
                const regex = new RegExp(`<${tag}>(.*?)</${tag}>`);
                const m = block.match(regex);
                return m ? m[1] : null;
            };

            const dateStr = getVal('islemTarihi'); // Örn: 25/11/2025
            const amountStr = getVal('tutar');
            const description = getVal('aciklama');
            const timeStr = getVal('islemZamani'); // Örn: 2025-11-25T16:55:33

            // Karşı taraf bilgisi (Açıklamadan)
            let senderReceiver = '';
            if (description && description.includes('Gönd:')) {
                try {
                    // Örn: ... Gönd: AD SOYAD ...
                    const parts = description.split('Gönd:');
                    if (parts[1]) {
                        const subParts = parts[1].trim().split(' ');
                        if (subParts.length >= 2) {
                            senderReceiver = subParts[0] + ' ' + subParts[1];
                        }
                    }
                } catch (e) {
                    console.warn('Ziraat sender parse error:', e);
                }
            }

            if (dateStr && amountStr) {
                // Tutar: 1234,56 -> 1234.56
                let amount = parseFloat(amountStr.replace(',', '.'));
                if (isNaN(amount)) amount = 0;

                // Tarih: 25/11/2025 -> 2025-11-25
                let isoDate;
                if (timeStr) {
                    isoDate = timeStr;
                } else {
                    const [day, month, year] = dateStr.split('/');
                    isoDate = `${year}-${month}-${day}T00:00:00`;
                }

                transactions.push({
                    unique_bank_ref_id: timeStr ? (timeStr + amount) : `${dateStr}-${amount}-${Math.random()}`,
                    date: new Date(isoDate),
                    amount: amount,
                    description: description || '',
                    sender_receiver: senderReceiver,
                    metadata: {
                        raw: {
                            tarih: dateStr,
                            tutar: amountStr,
                            aciklama: description,
                            zaman: timeStr
                        }
                    }
                });
            }
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
