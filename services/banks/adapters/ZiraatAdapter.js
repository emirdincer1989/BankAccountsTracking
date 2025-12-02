const BaseBankAdapter = require('../BaseBankAdapter');
const https = require('https');
const querystring = require('querystring');
const { DataEncryption } = require('../../../utils/encryption');

class ZiraatAdapter extends BaseBankAdapter {
    constructor(credentials) {
        super(credentials);
        this.bankName = 'Ziraat';
        this.apiUrl = "https://hesap.ziraatbank.com.tr/HEK_NKYWS/HesapHareketleri.asmx/SorgulaDetayWS";
    }

    async login() {
        return true;
    }

    async getAccounts() {
        if (this.credentials.iban) {
            return [{
                accountNumber: this.credentials.iban,
                currency: 'TRY'
            }];
        }
        return [];
    }

    async getTransactions(accountNumber, startDate, endDate) {
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
            const balanceStr = getVal('kalanBakiye');

            let senderReceiver = '';
            if (description && description.includes('Gönd:')) {
                try {
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
                let amount = parseFloat(amountStr.replace(',', '.'));
                if (isNaN(amount)) amount = 0;

                let balance = 0;
                if (balanceStr) {
                    balance = parseFloat(balanceStr.replace(',', '.'));
                    if (isNaN(balance)) balance = 0;
                }

                let isoDate;
                if (timeStr) {
                    isoDate = timeStr;
                } else {
                    const parts = dateStr.split('/');
                    isoDate = `${parts[2]}-${parts[1]}-${parts[0]}T00:00:00`;
                }

                const cleanDesc = description ? description.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30) : '';
                const deterministicId = `${dateStr}-${amount}-${cleanDesc}`;

                transactions.push({
                    unique_bank_ref_id: timeStr ? (timeStr + '-' + amount) : deterministicId,
                    date: new Date(isoDate),
                    amount: amount,
                    description: description || '',
                    sender_receiver: senderReceiver,
                    balance_after_transaction: balance,
                    metadata: {
                        raw: {
                            tarih: dateStr,
                            tutar: amountStr,
                            aciklama: description,
                            zaman: timeStr,
                            bakiye: balanceStr
                        }
                    }
                });
            }
        }

        return transactions;
    }

    _parseDate(dateStr) {
        const parts = dateStr.split(' ')[0].split('/');
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
