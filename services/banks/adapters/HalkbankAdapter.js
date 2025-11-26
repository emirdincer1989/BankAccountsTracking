const https = require('https');
const url = require('url');
const BaseBankAdapter = require('../BaseBankAdapter');
const UnifiedTransaction = require('../models/UnifiedTransaction');

class HalkbankAdapter extends BaseBankAdapter {
    constructor(credentials) {
        super(credentials);
        this.bankName = 'HALKBANK';
        // SoapUI ile doğrulanan URL
        this.wsdlUrl = "https://webservice.halkbank.com.tr/HesapEkstreOrtakWS/HesapEkstreOrtak.svc/Basic";
    }

    async login() {
        return true;
    }

    async getAccounts() {
        const today = new Date().toISOString();
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        const startDate = lastWeek.toISOString();

        // Hesap listesi için genel bir sorgu atıyoruz
        const xml = this._createSoapEnvelope(
            this.credentials.username,
            this.credentials.password,
            null, // HesapNo yok
            null, // SubeKodu yok
            startDate,
            today
        );

        try {
            const response = await this._sendSoapRequest(xml);
            return this._parseAccountsFromResponse(response);
        } catch (error) {
            console.error(`${this.bankName} getAccounts Error:`, error);
            throw error;
        }
    }

    async getTransactions(accountNumber, startDate, endDate) {
        // Hesap numarasından şube kodunu ayıklamak gerekebilir
        // Format: SubeKodu-MusteriNo-EkNo (Örn: 9425-14876182-45000012)
        // Ancak testlerde gördük ki HesapNo parametresi "45000012" gibi kısa formatta gidiyor.
        // Ve SubeKodu ayrıca gidiyor.

        // Bu yüzden credentials veya account objesinden şube kodunu bulmamız lazım.
        // Şimdilik basitçe hesap numarasını olduğu gibi gönderiyoruz.
        // Eğer hesap numarası "9425-..." formatındaysa parse edilebilir.

        let subeKodu = null;
        let kisaHesapNo = accountNumber;

        if (accountNumber.includes('-')) {
            const parts = accountNumber.split('-');
            if (parts.length === 3) {
                subeKodu = parts[0];
                kisaHesapNo = parts[2];
            }
        }

        const xml = this._createSoapEnvelope(
            this.credentials.username,
            this.credentials.password,
            kisaHesapNo,
            subeKodu,
            startDate.toISOString(),
            endDate.toISOString()
        );

        try {
            const response = await this._sendSoapRequest(xml);
            return this._parseTransactionsFromResponse(response);
        } catch (error) {
            console.error(`${this.bankName} getTransactions Error:`, error);
            throw error;
        }
    }

    // --- HELPER METHODS (RAW HTTPS) ---

    _createSoapEnvelope(username, password, hesapNo, subeKodu, baslangic, bitis) {
        const fmtBaslangic = baslangic.split('T')[0];
        const fmtBitis = bitis.split('T')[0];

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
            <hes:BaslangicTarihi>${fmtBaslangic}</hes:BaslangicTarihi>
            <hes:BitisTarihi>${fmtBitis}</hes:BitisTarihi>
            ${hesapNoTag}
            ${subeKoduTag}
         </tem:request>
      </tem:EkstreSorgulama>
   </soapenv:Body>
</soapenv:Envelope>`;
    }

    async _sendSoapRequest(xml) {
        return new Promise((resolve, reject) => {
            const parsedUrl = url.parse(this.wsdlUrl);
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
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (e) => reject(e));
            req.write(xml);
            req.end();
        });
    }

    _extractTag(tag, content) {
        const regex = new RegExp(`<[^:]*${tag}[^>]*>(.*?)</[^:]*${tag}>`, 'g');
        const matches = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            matches.push(match[1]);
        }
        return matches;
    }

    _parseAccountsFromResponse(xml) {
        const accounts = [];

        const hesapNolar = this._extractTag('HesapNo', xml);
        const bakiyeler = this._extractTag('Bakiye', xml);
        const subeKodlari = this._extractTag('SubeKodu', xml);
        const subeAdlari = this._extractTag('SubeAdi', xml);
        const ibanlar = this._extractTag('IbanNo', xml);

        for (let i = 0; i < hesapNolar.length; i++) {
            // Bakiyeyi temizle (+110283,89 -> 110283.89)
            let rawBalance = bakiyeler[i] || "0";
            rawBalance = rawBalance.replace('+', '').replace('.', '').replace(',', '.');

            accounts.push({
                accountNumber: hesapNolar[i],
                iban: ibanlar[i] || null,
                currency: 'TRY', // Varsayılan
                balance: parseFloat(rawBalance),
                name: subeAdlari[i] ? `${subeAdlari[i]} - ${hesapNolar[i]}` : `Halkbank ${hesapNolar[i]}`
            });
        }

        return accounts;
    }

    _parseTransactionsFromResponse(xml) {
        const transactions = [];

        const tarihler = this._extractTag('Tarih', xml);
        const saatler = this._extractTag('Saat', xml);
        const tutarlar = this._extractTag('HareketTutari', xml);
        const aciklamalar = this._extractTag('Aciklama', xml);
        const ekstreAciklamalar = this._extractTag('EkstreAciklama', xml);
        const islemKodlari = this._extractTag('IslemKod', xml);
        const referansNolar = this._extractTag('ReferansNo', xml);
        const bakiyeler = this._extractTag('Bakiye', xml);

        for (let i = 0; i < tarihler.length; i++) {
            // Tarih ve Saat birleştir
            // Tarih: 19/11/2025, Saat: 11:52:24 -> ISO
            const [day, month, year] = (tarihler[i] || "").split('/');
            const time = saatler[i] || "00:00:00";
            const isoDate = `${year}-${month}-${day}T${time}`;

            // Tutar temizle (+4806,78 -> 4806.78)
            let rawAmount = tutarlar[i] || "0";
            const isNegative = rawAmount.includes('-');
            rawAmount = rawAmount.replace('+', '').replace('-', '').replace('.', '').replace(',', '.');
            const amount = parseFloat(rawAmount);

            // Bakiye temizle
            let rawBalance = bakiyeler[i] || "0";
            rawBalance = rawBalance.replace('+', '').replace('.', '').replace(',', '.');

            transactions.push(new UnifiedTransaction({
                bankRefNo: referansNolar[i] || `HLK-${Date.now()}-${i}`,
                transactionDate: new Date(isoDate),
                amount: amount,
                currency: 'TRY',
                direction: isNegative ? 'OUTGOING' : 'INCOMING',
                description: ekstreAciklamalar[i] || aciklamalar[i] || '',
                senderIban: null,
                receiverIban: null,
                balanceAfter: parseFloat(rawBalance),
                rawResponse: JSON.stringify({
                    tarih: tarihler[i],
                    saat: saatler[i],
                    tutar: tutarlar[i],
                    aciklama: aciklamalar[i]
                })
            }));
        }

        return transactions;
    }
}

module.exports = HalkbankAdapter;
