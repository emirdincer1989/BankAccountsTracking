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
        // Hesap bilgilerini almak için bugün için kısa bir tarih aralığında sorgu yapıyoruz
        // Bu sayede XML response'undan kalanBakiye'yi parse edebiliriz
        const today = new Date();
        
        try {
            const accountNumber = this.credentials.iban || this.credentials.account_number;
            if (!accountNumber) {
                return [];
            }

            // Bugün için işlem sorgusu yap
            const transactions = await this.getTransactions(accountNumber, today, today);
            
            // Son işlemden bakiyeyi al
            let balance = 0;
            if (transactions && transactions.length > 0) {
                // Tarihe göre sırala (Yeniden eskiye)
                const sortedTx = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
                const latestTx = sortedTx[0];
                if (latestTx.balance_after_transaction !== undefined && latestTx.balance_after_transaction !== null) {
                    balance = latestTx.balance_after_transaction;
                }
            }

            return [{
                accountNumber: accountNumber,
                iban: this.credentials.iban || null,
                currency: 'TRY',
                balance: balance
            }];
        } catch (error) {
            // Hata durumunda fallback: Sadece account bilgilerini döndür
            console.warn('ZiraatAdapter getAccounts hatası:', error.message);
            const accountNumber = this.credentials.iban || this.credentials.account_number;
            if (accountNumber) {
                return [{
                    accountNumber: accountNumber,
                    iban: this.credentials.iban || null,
                    currency: 'TRY',
                    balance: 0
                }];
            }
            return [];
        }
    }

    async getTransactions(accountNumber, startDate, endDate) {
        const formatDate = (date) => {
            const d = new Date(date);
            return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
        };

        // Debug Log: Credentials check
        console.log('Ziraat Adapter Credentials Keys:', Object.keys(this.credentials));

        const postData = querystring.stringify({
            'kullaniciKod': this.credentials.user_code || this.credentials.customer_code, // Fallback for safety
            'sifre': this.credentials.password,
            'ibanNo': accountNumber || this.credentials.iban,
            'baslangicTarihi': formatDate(startDate),
            'bitisTarihi': formatDate(endDate)
        });

        console.log('Ziraat Request Body (Masked):', postData.replace(/sifre=[^&]+/, 'sifre=***'));

        try {
            const responseXml = await this._makeRequest(postData);
            console.log('Ziraat Raw XML Response Length:', responseXml.length);
            // console.log('Ziraat Raw XML Response:', responseXml); // Uncomment if needed, but might be too large
            return this.parseResponse(responseXml);
        } catch (error) {
            console.error('Ziraat Request Error:', error);
            throw error;
        }
    }

    parseResponse(xml) {
        // console.log('Ziraat Raw XML Response:', xml);

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

            const transactionType = getVal('islemAciklama') || getVal('islemKodu');

            let senderReceiver = '';
            if (description) {
                if (description.includes('Gönd:')) {
                    // "Gönd: AD SOYAD ..." formatını yakala
                    // Genellikle "Gönd: " den sonra isim gelir, sonra sayısal bir değer veya "numaralı" gibi bir kelime gelir.
                    const match = description.match(/Gönd:\s*(.*?)(?:\s+(?:\d{10,}|numaralı|hesabından|hesabına|Referanslı|TC:|Vergi No:|$))/i);
                    if (match && match[1]) {
                        senderReceiver = match[1].trim();
                    } else {
                        // Fallback: İlk 3 kelimeyi al
                        const parts = description.split('Gönd:')[1].trim().split(' ');
                        senderReceiver = parts.slice(0, 3).join(' ');
                    }
                } else if (description.includes('OTOMATIK Plaka no:')) {
                    const match = description.match(/Plaka no:\s*(\w+)/);
                    if (match && match[1]) {
                        senderReceiver = `HGS/OGS - ${match[1]}`;
                    } else {
                        senderReceiver = 'HGS/OGS';
                    }
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

                // Metadata object
                const metadata = {
                    sender_receiver: senderReceiver,
                    transaction_type: transactionType,
                    raw: {
                        tarih: dateStr,
                        tutar: amountStr,
                        aciklama: description,
                        zaman: timeStr,
                        bakiye: balanceStr,
                        islem_kodu: getVal('islemKodu')
                    }
                };

                transactions.push({
                    unique_bank_ref_id: timeStr ? (timeStr + '-' + amount) : deterministicId,
                    date: new Date(isoDate),
                    amount: amount,
                    description: description || '',
                    balance_after_transaction: balance,
                    metadata: metadata
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
