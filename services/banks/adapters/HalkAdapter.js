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
        const extract = (tag, content) => {
            const regex = new RegExp(`<[^:]*${tag}[^>]*>(.*?)</[^:]*${tag}>`, 'g');
            const matches = [];
            let match;
            while ((match = regex.exec(content)) !== null) {
                matches.push(match[1]);
            }
            return matches;
        };

        const hataKodu = extract('HataKodu', xml)[0];
        const hataAciklama = extract('HataAciklama', xml)[0];

        if (hataKodu !== '0') {
            throw new Error(`Halkbank API Hatası: ${hataKodu} - ${hataAciklama}`);
        }

        // Halkbank XML yapısına göre alanları çek (Test scriptinden bakarak)
        // Örn: IslemTarihi, Tutar, Aciklama, FisNo
        const tarihler = extract('IslemTarihi', xml);
        const tutarlar = extract('Tutar', xml);
        const aciklamalar = extract('Aciklama', xml);
        const fisNolar = extract('FisNo', xml);
        const borcAlacak = extract('BorcAlacak', xml);

        const transactions = [];

        for (let i = 0; i < tarihler.length; i++) {
            let amount = parseFloat(tutarlar[i]);
            if (isNaN(amount)) amount = 0;

            if (borcAlacak[i] === 'B') { // Borç ise negatif
                amount = -Math.abs(amount);
            }

            const transaction = {
                unique_bank_ref_id: fisNolar[i] || `${tarihler[i]}-${i}-${amount}`,
                date: new Date(tarihler[i]),
                amount: amount,
                description: aciklamalar[i],
                sender_receiver: '',
                metadata: { raw: { tarih: tarihler[i], tutar: tutarlar[i], aciklama: aciklamalar[i] } }
            };
            transactions.push(transaction);
        }

        return transactions;
    }
}

module.exports = HalkAdapter;
