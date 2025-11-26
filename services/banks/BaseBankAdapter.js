/**
 * Banka Entegrasyonları için Temel Adaptör Sınıfı
 * Tüm banka adaptörleri bu sınıftan türetilmelidir.
 */
class BaseBankAdapter {
    constructor(credentials) {
        this.credentials = credentials;
        this.bankName = 'GENERIC_BANK';
    }

    /**
     * Banka sistemine login olur ve token alır.
     * @returns {Promise<string>} Session Token / Cookie
     */
    async login() {
        throw new Error('login() metodu implemente edilmelidir.');
    }

    /**
     * Hesap listesini çeker.
     * @returns {Promise<Array>} Standartlaştırılmış hesap listesi
     */
    async getAccounts() {
        throw new Error('getAccounts() metodu implemente edilmelidir.');
    }

    /**
     * Hesap hareketlerini çeker.
     * @param {string} accountNumber - Hesap numarası veya IBAN
     * @param {Date} startDate - Başlangıç tarihi
     * @param {Date} endDate - Bitiş tarihi
     * @returns {Promise<Array>} Standartlaştırılmış hareket listesi (UnifiedTransaction)
     */
    async getTransactions(accountNumber, startDate, endDate) {
        throw new Error('getTransactions() metodu implemente edilmelidir.');
    }

    /**
     * Bankadan gelen ham veriyi bizim sistemimizin formatına çevirir.
     * @param {Object} rawData - Bankadan gelen ham veri
     * @returns {Object} UnifiedTransaction objesi
     */
    normalizeTransaction(rawData) {
        throw new Error('normalizeTransaction() metodu implemente edilmelidir.');
    }
}

module.exports = BaseBankAdapter;
