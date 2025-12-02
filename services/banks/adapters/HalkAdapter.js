const BaseBankAdapter = require('../BaseBankAdapter');
const https = require('https');
const url = require('url');

class HalkAdapter extends BaseBankAdapter {
    constructor(credentials) {
        super(credentials);
        this.bankName = 'Halk';
        this.targetUrl = "https://webservice.halkbank.com.tr/HesapEkstreOrtakWS/HesapEkstreOrtak.svc/Basic";
    }

    async login() {
        return true;
    }

    async getAccounts() {
        if (this.credentials.account_no) {
            return [{
                accountNumber: this.credentials.account_no,
                currency: 'TRY'
            }];
        }
        return [];
    }

    async getTransactions(accountNumber, startDate, endDate) {
        // Tarih formatı: YYYY-MM-DD
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        const xml = this._createSoapEnvelope(
            this.credentials.username,
            this.credentials.password,
            accountNumber || this.credentials.account_no,
            this.credentials.branch_code,
            formatDate(startDate),
            formatDate(endDate)
        );

        const responseXml = await this._sendSoapRequest(xml);
        return this.parseResponse(responseXml);
    }

    _createSoapEnvelope(username, password, hesapNo, subeKodu, baslangic, bitis) {
        const soapHeader = `
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      <wsse:UsernameToken wsu:Id="UsernameToken-1">
        <wsse:Username>${username}</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${password}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>`;

        const hesapNoTag = hesapNo ? `<hes:HesapNo>${hesapNo}</hes:HesapNo>` : '<hes:HesapNo/>';
        const subeKoduTag = subeKodu ? `<hes:SubeKodu>${subeKodu}</hes:SubeKodu>` : '<hes:SubeKodu>0</hes:SubeKodu>';

        return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="http://tempuri.org/" xmlns:hes="http://schemas.datacontract.org/2004/07/HesapEkstreOrtakWS.Request">
   <soapenv:Header>${soapHeader}</soapenv:Header>
   <soapenv:Body>
      <tem:EkstreSorgulama>
         <tem:request>
            <hes:BaslangicTarihi>${baslangic}</hes:BaslangicTarihi>
            <hes:BitisTarihi>${bitis}</hes:BitisTarihi>
            ${hesapNoTag}
            ${subeKoduTag}
         </tem:request>
      </tem:EkstreSorgulama>
   </soapenv:Body>
</soapenv:Envelope>`;
    }

    _sendSoapRequest(xml) {
        return new Promise((resolve, reject) => {
            const parsedUrl = url.parse(this.targetUrl);
            const options = {
                hostname: parsedUrl.hostname,
                port: 443,
                path: parsedUrl.path,
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'Content-Length': Buffer.byteLength(xml),
                    'SOAPAction': 'http://tempuri.org/IHesapEkstreOrtak/EkstreSorgulama',
                    'User-Agent': 'Apache-HttpClient/4.5.5 (Java/12.0.1)'
                }
            };

            const req = https.request(options, (res) => {
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
            req.write(xml);
            req.end();
        });
    }

    parseResponse(xml) {
        console.log('Halkbank Raw XML Response:', xml);

        const transactions = [];
        const movementRegex = /<[a-zA-Z0-9]+:Hareket>([\s\S]*?)<\/[a-zA-Z0-9]+:Hareket>/g;

        let match;
        while ((match = movementRegex.exec(xml)) !== null) {
            const block = match[1];

            const getVal = (tag) => {
                const regex = new RegExp(`<[a-zA-Z0-9]+:${tag}>(.*?)</[a-zA-Z0-9]+:${tag}>`);
                const m = block.match(regex);
                return m ? m[1] : null;
            };

            const dateStr = getVal('Tarih'); // Örn: 25/11/2025
            const timeStr = getVal('Saat'); // Örn: 16:55:33
            const amountStr = getVal('HareketTutari');
            const description = getVal('Aciklama');
            const refNo = getVal('ReferansNo');
            const senderReceiver = getVal('KarsiAdSoyad');
            const balanceStr = getVal('Bakiye');

            if (dateStr && amountStr) {
                // Tutar: +1234,56 -> 1234.56
                let amount = parseFloat(amountStr.replace('+', '').replace(',', '.'));
                if (isNaN(amount)) amount = 0;

                // Tarih: 25/11/2025 + 16:55:33 -> ISO
                let isoDate;
                if (dateStr.includes('/')) {
                    const [day, month, year] = dateStr.split('/');
                    isoDate = `${year}-${month}-${day}`;
                } else {
                    isoDate = dateStr;
                }

                if (timeStr) {
                    isoDate += `T${timeStr}`;
                } else {
                    isoDate += 'T00:00:00';
                }

                // Unique ID
                const cleanDesc = description ? description.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30) : '';
                const deterministicId = `${dateStr}-${amount}-${cleanDesc}`;

                let balance = 0;
                if (balanceStr) {
                    balance = parseFloat(balanceStr.replace('+', '').replace(',', '.'));
                    if (isNaN(balance)) balance = 0;
                }

                transactions.push({
                    unique_bank_ref_id: refNo || deterministicId,
                    date: new Date(isoDate),
                    amount: amount,
                    description: description || '',
                    sender_receiver: senderReceiver || '',
                    balance_after_transaction: balance,
                    metadata: {
                        raw: {
                            tarih: dateStr,
                            saat: timeStr,
                            tutar: amountStr,
                            aciklama: description,
                            ref: refNo,
                            bakiye: balanceStr
                        }
                    }
                });
            }
        }

        return transactions;
    }
}

module.exports = HalkAdapter;
