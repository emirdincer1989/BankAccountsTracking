const { Pool } = require('pg');
const DataEncryption = require('../utils/encryption');
const ZiraatAdapter = require('./banks/adapters/ZiraatAdapter');
const VakifAdapter = require('./banks/adapters/VakifAdapter');
const HalkAdapter = require('./banks/adapters/HalkAdapter');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

class AccountService {
    constructor() {
        this.encryption = new DataEncryption();
    }

    /**
     * Yeni banka hesabı ekler.
     * Credentials şifrelenerek saklanır.
     */
    async createAccount(data) {
        const { institution_id, bank_name, account_name, account_number, iban, credentials } = data;

        // Credentials şifreleme
        // Her bir value'yu ayrı ayrı şifreleyebiliriz veya tüm objeyi string yapıp şifreleyebiliriz.
        // Ancak sorgulama yapmayacağımız için tüm objeyi JSON olarak tutmak ve içindeki değerleri şifreli tutmak daha iyi.
        // Veya basitçe: Her field'ı şifrele.

        const encryptedCredentials = {};
        for (const [key, value] of Object.entries(credentials)) {
            if (value) {
                const enc = this.encryption.encrypt(value);
                encryptedCredentials[key] = enc; // { encrypted: '...', iv: '...', authTag: '...' }
            }
        }

        const query = `
            INSERT INTO bank_accounts (institution_id, bank_name, account_name, account_number, iban, credentials)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await pool.query(query, [
            institution_id, bank_name, account_name, account_number, iban, JSON.stringify(encryptedCredentials)
        ]);

        return result.rows[0];
    }

    /**
     * Hesabın güncel bakiyesini ve hareketlerini çeker.
     * Adapter Factory mantığı burada çalışır.
     */
    async syncAccount(accountId) {
        // 1. Hesabı getir
        const accResult = await pool.query('SELECT * FROM bank_accounts WHERE id = $1', [accountId]);
        if (accResult.rows.length === 0) throw new Error('Hesap bulunamadı');
        const account = accResult.rows[0];

        // 2. Credentials şifresini çöz
        const decryptedCredentials = {};
        const storedCredentials = account.credentials; // JSONB

        for (const [key, value] of Object.entries(storedCredentials)) {
            // value: { encrypted, iv, authTag }
            decryptedCredentials[key] = this.encryption.decrypt(value);
        }

        // 3. Doğru adaptörü seç
        let adapter;
        switch (account.bank_name) {
            case 'Ziraat': adapter = new ZiraatAdapter(decryptedCredentials); break;
            case 'Vakif': adapter = new VakifAdapter(decryptedCredentials); break;
            case 'Halk': adapter = new HalkAdapter(decryptedCredentials); break;
            default: throw new Error('Bilinmeyen banka: ' + account.bank_name);
        }

        // 4. Bankaya bağlan ve veri çek (Son 1 gün veya son başarılı güncellemeden itibaren)
        // Şimdilik son 3 gün diyelim garanti olsun.
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 3);

        const transactions = await adapter.getTransactions(account.account_number, startDate, endDate);

        // 5. Veritabanına kaydet
        let newTransactionsCount = 0;
        let lastBalance = account.last_balance; // Bankadan bakiye dönmüyor, hareketlerden hesaplanmalı veya ayrı servis varsa oradan

        // Not: Bazı bankalar getAccounts() içinde bakiye döner.
        // Eğer adapter.getAccounts() destekliyorsa oradan güncel bakiye alabiliriz.
        try {
            const accountsInfo = await adapter.getAccounts();
            if (accountsInfo.length > 0) {
                // Eşleşen hesabı bul (IBAN veya HesapNo ile)
                const match = accountsInfo.find(a =>
                    (a.accountNumber && account.account_number && a.accountNumber.includes(account.account_number)) ||
                    (a.iban && account.iban && a.iban === account.iban)
                );
                if (match && match.balance !== undefined) {
                    lastBalance = match.balance;
                }
            }
        } catch (e) {
            console.warn('Bakiye sorgulama hatası:', e.message);
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const tx of transactions) {
                // Mükerrer kayıt kontrolü (unique constraint hatasını yakala veya ON CONFLICT DO NOTHING)
                const insertQuery = `
                    INSERT INTO transactions (account_id, unique_bank_ref_id, date, amount, description, metadata)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (account_id, unique_bank_ref_id) DO NOTHING
                    RETURNING id
                `;
                const res = await client.query(insertQuery, [
                    accountId,
                    tx.unique_bank_ref_id,
                    tx.date,
                    tx.amount,
                    tx.description,
                    JSON.stringify(tx.metadata)
                ]);

                if (res.rows.length > 0) {
                    newTransactionsCount++;
                    // Bakiyeyi güncelle (Eğer bankadan net bakiye alamadıysak hareketlerden gitmek zor ama riskli. 
                    // Şimdilik sadece bankadan bakiye gelirse güncelleyelim veya manuel kalsın)
                }
            }

            // Son güncelleme zamanını kaydet
            await client.query('UPDATE bank_accounts SET last_balance_update = NOW(), last_balance = $1 WHERE id = $2', [lastBalance, accountId]);

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

        return { success: true, newTransactions: newTransactionsCount };
    }
}

module.exports = new AccountService();
