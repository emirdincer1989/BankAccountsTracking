const AccountService = require('../services/AccountService');

class AccountController {
    // Hesap Ekleme
    async create(req, res, next) {
        try {
            // Validasyon (Basit)
            const { institution_id, bank_name, account_name, credentials } = req.body;
            if (!institution_id || !bank_name || !account_name || !credentials) {
                return res.status(400).json({ success: false, message: 'Eksik bilgi.' });
            }

            const account = await AccountService.createAccount(req.body);
            res.status(201).json({ success: true, data: account });
        } catch (error) {
            next(error);
        }
    }

    // Manuel Senkronizasyon Tetikleme
    async sync(req, res, next) {
        try {
            const { id } = req.params;
            const result = await AccountService.syncAccount(id);
            res.json({ success: true, message: 'Senkronizasyon tamamlandı.', data: result });
        } catch (error) {
            next(error);
        }
    }

    // Hesap Listeleme (Kuruma göre)
    // Bu metod Service'e eklenmeliydi, şimdilik basitçe burada query atalım veya Service'e ekleyelim.
    // Doğrusu Service'e eklemek. Şimdilik placeholder.
    async listByInstitution(req, res, next) {
        try {
            // TODO: AccountService.getAccountsByInstitution(req.params.institutionId)
            res.json({ success: true, message: 'Henüz implemente edilmedi.' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AccountController();
