const BaseBankAdapter = require('../BaseBankAdapter');
const https = require('https');
const url = require('url');

class VakifAdapter extends BaseBankAdapter {
    constructor(credentials) {
        super(credentials);
        this.bankName = 'Vakif';
        this.wsdlUrl = "https://vbservice.vakifbank.com.tr/HesapHareketleri.OnlineEkstre/SOnlineEkstreServis.svc";
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
        const formatDate = (date) => {
            return date.toISOString().split('T')[0];
        };

        const xml = this._createSoapEnvelope(
            this.credentials.customer_no,
            this.credentials.username,
            this.credentials.password,
            accountNumber || this.credentials.account_no,
            formatDate(startDate),
            formatDate(endDate)
        );

        const responseXml = await this._sendSoapRequest(xml);
        return this.parseResponse(responseXml);
    }

    _createSoapEnvelope(musteriNo, kullanici, sifre, hesapNo, baslangic, bitis) {
        return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:peak="Peak.Integration.ExternalInbound.Ekstre"
               xmlns:peak1="http://schemas.datacontract.org/2004/07/Peak.Integration.ExternalInbound.Ekstre.DataTransferObjects"
               xmlns:wsa="http://www.w3.org/2005/08/addressing">
  <soap:Header>
    <wsa:Action>Peak.Integration.ExternalInbound.Ekstre/ISOnlineEkstreServis/GetirHareket</wsa:Action>
    <wsa:To>${this.wsdlUrl}</wsa:To>
  </soap:Header>
  <soap:Body>
    <peak:GetirHareket>
      <peak:sorgu>
        <peak1:MusteriNo>${musteriNo}</peak1:MusteriNo>
        <peak1:KurumKullanici>${kullanici}</peak1:KurumKullanici>
        <peak1:Sifre>${sifre}</peak1:Sifre>
        <peak1:SorguBaslangicTarihi>${baslangic} 00:00</peak1:SorguBaslangicTarihi>
        <peak1:SorguBitisTarihi>${bitis} 23:59</peak1:SorguBitisTarihi>
        <peak1:HesapNo>${hesapNo}</peak1:HesapNo>
        <peak1:HareketTipi></peak1:HareketTipi>
        <peak1:EnDusukTutar>0</peak1:EnDusukTutar>
        <peak1:EnYuksekTutar>0</peak1:EnYuksekTutar>
      </peak:sorgu>
    </peak:GetirHareket>
  </soap:Body>
</soap:Envelope>`;
    }

    _sendSoapRequest(xml) {
        return new Promise((resolve, reject) => {
            const parsedUrl = url.parse(this.wsdlUrl);
            const options = {
                hostname: parsedUrl.hostname,
                port: 443,
                path: parsedUrl.path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'Content-Length': Buffer.byteLength(xml),
                    'User-Agent': 'VakifBank-Client/1.0'
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
        console.log('VakifBank Raw XML Response:', xml);

        const transactions = [];

        const movementRegex = /<[a-zA-Z0-9]+:DtoEkstreHareket>([\s\S]*?)<\/[a-zA-Z0-9]+:DtoEkstreHareket>/g;

        let match;
        while ((match = movementRegex.exec(xml)) !== null) {
            const block = match[1];

            const getVal = (tag) => {
                const regex = new RegExp(`<[a-zA-Z0-9]+:${tag}>(.*?)</[a-zA-Z0-9]+:${tag}>`);
                const m = block.match(regex);
                return m ? m[1] : null;
            };

            const dateStr = getVal('IslemTarihi');
            const amountStr = getVal('Tutar');
            const borcAlacak = getVal('BorcAlacak');
            const description = getVal('Aciklama');
            const refNo = getVal('Id');
            const balanceStr = getVal('IslemSonrasiBakiye');

            let senderReceiver = '';
            const gonderenMatch = block.match(/<[a-zA-Z0-9]+:Key>GonderenAdi<\/[a-zA-Z0-9]+:Key>\s*<[a-zA-Z0-9]+:Value>(.*?)<\/[a-zA-Z0-9]+:Value>/);
            const aliciMatch = block.match(/<[a-zA-Z0-9]+:Key>AliciAdi<\/[a-zA-Z0-9]+:Key>\s*<[a-zA-Z0-9]+:Value>(.*?)<\/[a-zA-Z0-9]+:Value>/);

            if (gonderenMatch && gonderenMatch[1] && gonderenMatch[1] !== 'ESHOT GENEL MÜDÜRLÜĞÜ') {
                senderReceiver = gonderenMatch[1];
            } else if (aliciMatch && aliciMatch[1] && aliciMatch[1] !== 'ESHOT GENEL MÜDÜRLÜĞÜ') {
                senderReceiver = aliciMatch[1];
            }

            if (dateStr && amountStr) {
                let amount = parseFloat(amountStr);
                if (isNaN(amount)) amount = 0;

                if (borcAlacak === 'B') {
                    amount = -Math.abs(amount);
                }

                let balance = 0;
                if (balanceStr) {
                    balance = parseFloat(balanceStr);
                    if (isNaN(balance)) balance = 0;
                }

                const isoDate = dateStr.replace(' ', 'T');

                const cleanDesc = description ? description.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30) : '';
                const deterministicId = `${dateStr}-${amount}-${cleanDesc}`;

                transactions.push({
                    unique_bank_ref_id: refNo || deterministicId,
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
                            ref: refNo,
                            sender_receiver: senderReceiver,
                            bakiye: balanceStr
                        }
                    }
                });
            }
        }

        return transactions;
    }
}

module.exports = VakifAdapter;
