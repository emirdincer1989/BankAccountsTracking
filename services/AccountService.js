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
    async syncAccount(accountId, startDateInput, endDateInput) {
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
        // Banka adını normalize et (İlk harf büyük, gerisi küçük veya tamamen küçük kontrolü)
        // Frontend 'vakif' gönderiyor, DB'de 'vakif' kayıtlı olabilir.
        // Kodda 'Vakif' bekleniyor.

        const bankName = account.bank_name.toLowerCase();

        switch (bankName) {
            case 'ziraat': adapter = new ZiraatAdapter(decryptedCredentials); break;
            case 'vakif': adapter = new VakifAdapter(decryptedCredentials); break;
            case 'halk': adapter = new HalkAdapter(decryptedCredentials); break;
            default: throw new Error('Bilinmeyen banka: ' + account.bank_name);
        }

        // 4. Bankaya bağlan ve veri çek
        // Tarih aralığı verilmişse onu kullan, yoksa son 3 günü al
        let startDate, endDate;

        if (startDateInput && endDateInput) {
            startDate = new Date(startDateInput);
            endDate = new Date(endDateInput);
        } else {
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 3);
        }

        try {
            const transactions = await adapter.getTransactions(account.account_number, startDate, endDate);

            // 5. Veritabanına kaydet
            let newTransactionsCount = 0;
            let lastBalance = account.last_balance;

            // Bakiye sorgulama (Opsiyonel)
            try {
                const accountsInfo = await adapter.getAccounts();
                if (accountsInfo.length > 0) {
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
                    }
                }

                await client.query('UPDATE bank_accounts SET last_balance_update = NOW(), last_balance = $1 WHERE id = $2', [lastBalance, accountId]);

                await client.query('COMMIT');
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }

            return { success: true, newTransactions: newTransactionsCount };

        } catch (error) {
            console.error('Sync Error Detail:', error);
            throw new Error(`Banka entegrasyon hatası: ${error.message}`);
        }
    }

    /**
     * Tüm hesapları listeler (Admin için).
     */
    async getAllAccounts() {
        const query = `
            SELECT ba.id, ba.institution_id, i.name as institution_name, ba.bank_name, ba.account_name, ba.account_number, ba.iban, ba.is_active, ba.last_balance, ba.last_balance_update, ba.created_at 
            FROM bank_accounts ba
            LEFT JOIN institutions i ON ba.institution_id = i.id
            ORDER BY ba.created_at DESC
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    /**
     * Birden fazla kuruma ait hesapları listeler.
     */
    async getAccountsByInstitutions(institutionIds) {
        if (!institutionIds || institutionIds.length === 0) return [];

        const query = `
            SELECT ba.id, ba.institution_id, i.name as institution_name, ba.bank_name, ba.account_name, ba.account_number, ba.iban, ba.is_active, ba.last_balance, ba.last_balance_update, ba.created_at 
            FROM bank_accounts ba
            LEFT JOIN institutions i ON ba.institution_id = i.id
            WHERE ba.institution_id = ANY($1)
            ORDER BY ba.created_at DESC
        `;
        const result = await pool.query(query, [institutionIds]);
        return result.rows;
    }

    /**
     * Kuruma ait hesapları listeler.
     */
    async getAccountsByInstitution(institutionId) {
        const query = `
            SELECT id, institution_id, bank_name, account_name, account_number, iban, is_active, last_balance, last_balance_update, created_at 
            FROM bank_accounts 
            WHERE institution_id = $1 
            ORDER BY created_at DESC
        `;
        const result = await pool.query(query, [institutionId]);
        return result.rows;
    }
    /**
     * Banka hesabını siler.
     */
    async deleteAccount(id) {
        const query = 'DELETE FROM bank_accounts WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            throw new Error('Hesap bulunamadı veya zaten silinmiş.');
        }

        return { success: true };
    }
    /**
     * Tekil hesap detayını getirir (Credentials çözülmüş olarak - Şifreler hariç veya maskeli).
     */
    async getAccountById(id) {
        const result = await pool.query('SELECT * FROM bank_accounts WHERE id = $1', [id]);
        if (result.rows.length === 0) return null;

        const account = result.rows[0];
        const decryptedCredentials = {};

        if (account.credentials) {
            for (const [key, value] of Object.entries(account.credentials)) {
                try {
                    const val = this.encryption.decrypt(value);
                    // Şifre alanlarını maskele veya boş döndür
                    if (key.includes('password') || key.includes('sifre')) {
                        decryptedCredentials[key] = ''; // Güvenlik için boş gönder
                    } else {
                        decryptedCredentials[key] = val;
                    }
                } catch (e) {
                    console.error('Decryption error:', e);
                }
            }
        }

        return { ...account, credentials: decryptedCredentials };
    }

    /**
     * Banka hesabını günceller.
     */
    async updateAccount(id, data) {
        const { account_name, is_active, credentials } = data;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Mevcut hesabı çek
            const currentRes = await client.query('SELECT * FROM bank_accounts WHERE id = $1', [id]);
            if (currentRes.rows.length === 0) throw new Error('Hesap bulunamadı.');
            const currentAccount = currentRes.rows[0];

            let finalCredentials = currentAccount.credentials; // Varsayılan olarak eskisi kalsın

            // Eğer credentials güncellenecekse
            if (credentials && Object.keys(credentials).length > 0) {
                // 1. Mevcut şifreli veriyi çöz
                const currentDecrypted = {};
                for (const [key, value] of Object.entries(currentAccount.credentials || {})) {
                    try {
                        currentDecrypted[key] = this.encryption.decrypt(value);
                    } catch (e) { }
                }

                // 2. Yeni gelen verilerle birleştir (Boş gelenleri güncelleme)
                for (const [key, value] of Object.entries(credentials)) {
                    if (value && value.trim() !== '') {
                        currentDecrypted[key] = value;
                    }
                }

                // 3. Tekrar şifrele
                const newEncrypted = {};
                for (const [key, value] of Object.entries(currentDecrypted)) {
                    newEncrypted[key] = this.encryption.encrypt(value);
                }

                finalCredentials = JSON.stringify(newEncrypted);
            }

            const updateQuery = `
                UPDATE bank_accounts 
                SET account_name = COALESCE($1, account_name),
                    is_active = COALESCE($2, is_active),
                    credentials = COALESCE($3, credentials),
                    last_balance_update = CURRENT_TIMESTAMP
                WHERE id = $4
                RETURNING *
            `;

            const result = await client.query(updateQuery, [
                account_name,
                is_active,
                typeof finalCredentials === 'string' ? finalCredentials : JSON.stringify(finalCredentials),
                id
            ]);

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

}

module.exports = new AccountService();
