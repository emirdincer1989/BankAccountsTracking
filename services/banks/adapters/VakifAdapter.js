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
        // Vakıfbank servisi her istekte credentials istiyor.
        return true;
    }

    async getAccounts() {
        // Credentials içinde HesapNo varsa onu dön
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
        const extract = (tag, content) => {
            // Namespace'li tagleri yakalamak için regex (örn: <b:IslemTarihi>)
            const regex = new RegExp(`<[^:]+:${tag}[^>]*>(.*?)</[^:]+:${tag}>`, 'g');
            const matches = [];
            let match;
            while ((match = regex.exec(content)) !== null) {
                matches.push(match[1]);
            }
            return matches;
        };

        const islemKodu = extract('IslemKodu', xml)[0];
        const islemAciklama = extract('IslemAciklamasi', xml)[0];

        if (islemKodu !== 'VBB0001') {
            throw new Error(`Vakıfbank API Hatası: ${islemKodu} - ${islemAciklama}`);
        }

        // Hareket detaylarını çek (Tag isimleri test scriptinden veya örnek XML'den teyit edilmeli)
        // Genelde: IslemTarihi, IslemTutari, Aciklama, IslemRefNo
        const tarihler = extract('IslemTarihi', xml);
        const tutarlar = extract('IslemTutari', xml);
        const aciklamalar = extract('Aciklama', xml);
        const refNolar = extract('IslemRefNo', xml);
        const borcAlacak = extract('BorcAlacak', xml); // B veya A

        const transactions = [];

        for (let i = 0; i < tarihler.length; i++) {
            let amount = parseFloat(tutarlar[i]);
            if (isNaN(amount)) amount = 0;

            // Borç ise eksi yapalım (Opsiyonel, sisteme göre değişir)
            if (borcAlacak[i] === 'B') {
                amount = -Math.abs(amount);
            }

            const transaction = {
                unique_bank_ref_id: refNolar[i] || `${tarihler[i]}-${i}-${amount}`,
                date: new Date(tarihler[i]), // ISO format geliyorsa direkt parse edilir
                amount: amount,
                description: aciklamalar[i],
                sender_receiver: '',
                metadata: { raw: { tarih: tarihler[i], tutar: tutarlar[i], aciklama: aciklamalar[i], ref: refNolar[i] } }
            };
            transactions.push(transaction);
        }

        return transactions;
    }
}

module.exports = VakifAdapter;
