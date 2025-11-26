const https = require('https');
const querystring = require('querystring');
const BaseBankAdapter = require('../BaseBankAdapter');
const UnifiedTransaction = require('../models/UnifiedTransaction');

class ZiraatBankAdapter extends BaseBankAdapter {
    constructor(credentials) {
        super(credentials);
        this.bankName = 'ZIRAAT';
        // HTTP POST Endpoint
        this.apiUrl = "https://hesap.ziraatbank.com.tr/HEK_NKYWS/HesapHareketleri.asmx/SorgulaDetayWS";
    }

    async login() {
        // Ziraat Bankası'nda her istekte kimlik doğrulama yapıldığı için login işlemi semboliktir.
        return true;
    }

    async getAccounts() {
        // Ziraat Bankası'nda hesap listesi almak için VKN gereklidir.
        // Ancak şu anki entegrasyonumuzda IBAN üzerinden doğrudan sorgulama yapıyoruz.
        // Eğer credentials içinde tanımlı bir IBAN varsa onu tek hesap olarak döndürebiliriz.

        if (this.credentials.iban) {
            return [{
                accountNumber: this.credentials.iban, // Hesap No yerine IBAN kullanıyoruz
                iban: this.credentials.iban,
                currency: 'TRY',
                balance: 0, // Bakiye bilgisi hareket sorgusundan sonra güncellenebilir
                name: `Ziraat Hesabı - ${this.credentials.iban}`
            }];
        }

        return [];
    }

    async getTransactions(accountNumber, startDate, endDate) {
        // accountNumber burada IBAN olmalıdır.
        const iban = accountNumber;

        // Tarih formatı: dd.MM.yyyy
        const fmtStartDate = `${String(startDate.getDate()).padStart(2, '0')}.${String(startDate.getMonth() + 1).padStart(2, '0')}.${startDate.getFullYear()}`;
        const fmtEndDate = `${String(endDate.getDate()).padStart(2, '0')}.${String(endDate.getMonth() + 1).padStart(2, '0')}.${endDate.getFullYear()}`;

        const postData = querystring.stringify({
            'kullaniciKod': this.credentials.username,
            'sifre': this.credentials.password,
            'ibanNo': iban,
            'baslangicTarihi': fmtStartDate,
            'bitisTarihi': fmtEndDate
        });

        try {
            const response = await this._sendRequest(postData);
            return this._parseTransactionsFromResponse(response);
        } catch (error) {
            console.error(`${this.bankName} getTransactions Error:`, error);
            throw error;
        }
    }

    // --- HELPER METHODS (HTTP POST) ---

    async _sendRequest(postData) {
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
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.write(postData);
            req.end();
        });
    }

    _extractTag(tag, content) {
        // Namespace prefix'lerini yok sayan regex
        const regex = new RegExp(`<[^:]*${tag}[^>]*>(.*?)</[^:]*${tag}>`, 'g');
        const matches = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        return matches;
    }

    _parseTransactionsFromResponse(xml) {
        const transactions = [];

        // Hata kontrolü
        const hataKodu = this._extractTag('hataKodu', xml)[0];
        const hataAciklama = this._extractTag('hataAciklama', xml)[0];

        if (hataKodu && hataKodu !== '0') {
            throw new Error(`API Error ${hataKodu}: ${hataAciklama}`);
        }

        const tarihler = this._extractTag('islemTarihi', xml);
        const tutarlar = this._extractTag('tutar', xml);
        const aciklamalar = this._extractTag('aciklama', xml);
        const borcAlacaklar = this._extractTag('borcAlacakBilgisi', xml);
        const bakiyeler = this._extractTag('kalanBakiye', xml);
        const referanslar = this._extractTag('muhasebeReferansi', xml);

        for (let i = 0; i < tarihler.length; i++) {
            // Tarih formatı: dd/MM/yyyy (Test çıktısında böyle göründü)
            // ISO formatına çevirelim
            const [day, month, year] = (tarihler[i] || "").split('/');
            const isoDate = `${year}-${month}-${day}T00:00:00.000Z`;

            // Tutar temizle
            let rawAmount = tutarlar[i] || "0";
            rawAmount = rawAmount.replace(',', '.'); // Virgül varsa noktaya çevir
            const amount = parseFloat(rawAmount);

            // Borç/Alacak
            // A: Alacak (Giriş), B: Borç (Çıkış) varsayımı
            const isIncoming = borcAlacaklar[i] === 'A' || borcAlacaklar[i] === 'ALACAK';

            transactions.push(new UnifiedTransaction({
                bankRefNo: referanslar[i] || `ZRT-${Date.now()}-${i}`,
                transactionDate: new Date(isoDate),
                amount: amount,
                currency: 'TRY',
                direction: isIncoming ? 'INCOMING' : 'OUTGOING',
                description: aciklamalar[i] || '',
                senderIban: null,
                receiverIban: null,
                balanceAfter: parseFloat((bakiyeler[i] || "0").replace(',', '.')),
                rawResponse: JSON.stringify({
                    tarih: tarihler[i],
                    tutar: tutarlar[i],
                    aciklama: aciklamalar[i]
                })
            }));
        }

        return transactions;
    }
}

module.exports = ZiraatBankAdapter;
