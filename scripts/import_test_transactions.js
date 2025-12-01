const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const MAPPINGS = [
    {
        accountId: 7, // Ziraat (ESHOT)
        file: 'scripts/test_banks/ziraat_response.xml',
        type: 'ziraat'
    },
    {
        accountId: 3, // Halkbank (ESHOT)
        file: 'scripts/test_banks/halkbank_response.xml',
        type: 'halk'
    },
    {
        accountId: 8, // Vakıfbank (ESHOT)
        file: 'scripts/test_banks/vakifbank_response.xml',
        type: 'vakif'
    }
];

async function parseZiraat(content) {
    const transactions = [];
    const ibanMatch = content.match(/<IBAN>(.*?)<\/IBAN>/);
    const iban = ibanMatch ? ibanMatch[1] : null;

    const movementRegex = /<Hareket>([\s\S]*?)<\/Hareket>/g;
    let match;
    while ((match = movementRegex.exec(content)) !== null) {
        const block = match[1];
        const dateMatch = block.match(/<islemTarihi>(.*?)<\/islemTarihi>/);
        const amountMatch = block.match(/<tutar>(.*?)<\/tutar>/);
        const descMatch = block.match(/<aciklama>(.*?)<\/aciklama>/);
        const balanceMatch = block.match(/<kalanBakiye>(.*?)<\/kalanBakiye>/);
        const timeMatch = block.match(/<islemZamani>(.*?)<\/islemZamani>/);

        if (dateMatch && amountMatch) {
            let amount = parseFloat(amountMatch[1].replace(',', '.'));
            let description = descMatch ? descMatch[1] : '';
            let senderReceiver = '';
            if (description.includes('Gönd:')) {
                senderReceiver = description.split('Gönd:')[1].split(' ')[1] + ' ' + description.split('Gönd:')[1].split(' ')[2];
            }

            const [day, month, year] = dateMatch[1].split('/');
            const date = `${year}-${month}-${day}`;

            // islemZamani format: 2025-11-25T16:55:33
            const dateTime = timeMatch ? timeMatch[1] : date + 'T00:00:00';

            transactions.push({
                date: date,
                dateTime: dateTime,
                amount: amount,
                description: description,
                balance: balanceMatch ? parseFloat(balanceMatch[1].replace(',', '.')) : 0,
                sender_receiver: senderReceiver.trim(),
                unique_id: timeMatch ? timeMatch[1] + amount : Math.random().toString()
            });
        }
    }
    return { iban, transactions };
}

async function parseHalk(content) {
    const transactions = [];
    const ibanMatch = content.match(/<b:IbanNo>(.*?)<\/b:IbanNo>/);
    const iban = ibanMatch ? ibanMatch[1] : null;

    const movementRegex = /<b:Hareket>([\s\S]*?)<\/b:Hareket>/g;
    let match;
    while ((match = movementRegex.exec(content)) !== null) {
        const block = match[1];
        const dateMatch = block.match(/<b:Tarih>(.*?)<\/b:Tarih>/);
        const timeMatch = block.match(/<b:Saat>(.*?)<\/b:Saat>/);
        const amountMatch = block.match(/<b:HareketTutari>(.*?)<\/b:HareketTutari>/);
        const descMatch = block.match(/<b:Aciklama>(.*?)<\/b:Aciklama>/);
        const balanceMatch = block.match(/<b:Bakiye>(.*?)<\/b:Bakiye>/);
        const senderMatch = block.match(/<b:KarsiAdSoyad>(.*?)<\/b:KarsiAdSoyad>/);
        const refMatch = block.match(/<b:ReferansNo>(.*?)<\/b:ReferansNo>/);

        if (dateMatch && amountMatch) {
            let amount = parseFloat(amountMatch[1].replace('+', '').replace(',', '.'));
            const [day, month, year] = dateMatch[1].split('/');
            const date = `${year}-${month}-${day}`;
            const time = timeMatch ? timeMatch[1] : '00:00:00';
            const dateTime = `${date}T${time}`;

            transactions.push({
                date: date,
                dateTime: dateTime,
                amount: amount,
                description: descMatch ? descMatch[1] : '',
                balance: balanceMatch ? parseFloat(balanceMatch[1].replace('+', '').replace(',', '.')) : 0,
                sender_receiver: senderMatch ? senderMatch[1] : '',
                unique_id: refMatch ? refMatch[1] : Math.random().toString()
            });
        }
    }
    return { iban, transactions };
}

async function parseVakif(content) {
    const transactions = [];
    const iban = 'TR460001500158000046781438';

    const movementRegex = /<b:DtoEkstreHareket>([\s\S]*?)<\/b:DtoEkstreHareket>/g;
    let match;
    while ((match = movementRegex.exec(content)) !== null) {
        const block = match[1];
        const dateMatch = block.match(/<b:IslemTarihi>(.*?)<\/b:IslemTarihi>/);
        const amountMatch = block.match(/<b:Tutar>(.*?)<\/b:Tutar>/);
        const borcAlacakMatch = block.match(/<b:BorcAlacak>(.*?)<\/b:BorcAlacak>/);
        const descMatch = block.match(/<b:Aciklama>(.*?)<\/b:Aciklama>/);
        const balanceMatch = block.match(/<b:IslemSonrasıBakiye>(.*?)<\/b:IslemSonrasıBakiye>/);
        const idMatch = block.match(/<b:Id>(.*?)<\/b:Id>/);

        let senderReceiver = '';
        const gonderenMatch = block.match(/<c:Key>GonderenAdi<\/c:Key><c:Value>(.*?)<\/c:Value>/);
        const aliciMatch = block.match(/<c:Key>AliciAdi<\/c:Key><c:Value>(.*?)<\/c:Value>/);

        if (gonderenMatch && gonderenMatch[1] !== 'ESHOT GENEL MÜDÜRLÜĞÜ') senderReceiver = gonderenMatch[1];
        else if (aliciMatch && aliciMatch[1] !== 'ESHOT GENEL MÜDÜRLÜĞÜ') senderReceiver = aliciMatch[1];

        if (dateMatch && amountMatch) {
            let amount = Math.abs(parseFloat(amountMatch[1]));
            if (borcAlacakMatch && borcAlacakMatch[1] === 'B') {
                amount = -amount;
            }

            // dateMatch format: 2025-11-20 02:06:26
            const dateTime = dateMatch[1].replace(' ', 'T');
            const date = dateMatch[1].split(' ')[0];

            transactions.push({
                date: date,
                dateTime: dateTime,
                amount: amount,
                description: descMatch ? descMatch[1] : '',
                balance: balanceMatch ? parseFloat(balanceMatch[1]) : 0,
                sender_receiver: senderReceiver,
                unique_id: idMatch ? idMatch[1] : Math.random().toString()
            });
        }
    }
    return { iban, transactions };
}

async function importTransactions() {
    try {
        for (const map of MAPPINGS) {
            console.log(`Processing ${map.type.toUpperCase()} (Account ID: ${map.accountId})...`);
            const content = fs.readFileSync(path.resolve(__dirname, '..', map.file), 'utf8');
            let result;

            if (map.type === 'ziraat') result = await parseZiraat(content);
            else if (map.type === 'halk') result = await parseHalk(content);
            else if (map.type === 'vakif') result = await parseVakif(content);

            if (result) {
                console.log(`Found ${result.transactions.length} transactions.`);

                if (result.iban) {
                    await pool.query('UPDATE bank_accounts SET iban = $1 WHERE id = $2', [result.iban, map.accountId]);
                }

                let latestTransaction = null;

                for (const tx of result.transactions) {
                    const check = await pool.query('SELECT id FROM transactions WHERE unique_bank_ref_id = $1 AND account_id = $2', [tx.unique_id, map.accountId]);
                    if (check.rows.length === 0) {
                        await pool.query(
                            `INSERT INTO transactions 
                            (account_id, date, amount, description, sender_receiver, unique_bank_ref_id, balance_after_transaction, metadata) 
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                            [
                                map.accountId,
                                tx.dateTime,
                                tx.amount,
                                tx.description,
                                tx.sender_receiver,
                                tx.unique_id,
                                tx.balance,
                                JSON.stringify({ imported: true, original_desc: tx.description })
                            ]
                        );
                    }

                    // Determine latest transaction for balance update
                    if (!latestTransaction || new Date(tx.dateTime) > new Date(latestTransaction.dateTime)) {
                        latestTransaction = tx;
                    }
                }

                if (latestTransaction) {
                    console.log(`Updating balance for account ${map.accountId} to ${latestTransaction.balance} (from tx date: ${latestTransaction.dateTime})`);
                    await pool.query('UPDATE bank_accounts SET last_balance = $1, last_balance_update = $2 WHERE id = $3', [latestTransaction.balance, latestTransaction.dateTime, map.accountId]);
                }
            }
        }
        console.log('Done.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

importTransactions();
