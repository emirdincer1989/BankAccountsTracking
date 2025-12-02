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
            const { startDate, endDate } = req.body;
            console.log(`Sync Request - ID: ${id}, Start: ${startDate}, End: ${endDate}`); // Debug log

            const result = await AccountService.syncAccount(id, startDate, endDate);
            res.json({ success: true, message: 'Senkronizasyon tamamlandı.', data: result });
        } catch (error) {
            console.error('Controller Sync Error:', error); // Debug log
            next(error);
        }
    }

    // Hesap Listeleme (Genel)
    async list(req, res, next) {
        try {
            let accounts;

            // Eğer süper admin ise ve query'de institution_id yoksa hepsini getir
            if (req.user.role_name === 'super_admin' && !req.query.institution_id) {
                accounts = await AccountService.getAllAccounts();
            }
            // Eğer süper admin ise ve query'de institution_id varsa o kurumu getir
            else if (req.user.role_name === 'super_admin' && req.query.institution_id) {
                accounts = await AccountService.getAccountsByInstitution(req.query.institution_id);
            }
            // Normal kullanıcı ise kendi kurumlarını getir
            else {
                const userInstitutionIds = req.user.institution_ids || [];

                if (userInstitutionIds.length === 0) {
                    return res.status(400).json({ success: false, message: 'Herhangi bir kuruma yetkiniz bulunamadı.' });
                }

                // Eğer kullanıcı spesifik bir kurum seçtiyse ve yetkisi varsa onu getir
                if (req.query.institution_id) {
                    const requestedId = parseInt(req.query.institution_id);
                    if (!userInstitutionIds.includes(requestedId)) {
                        return res.status(403).json({ success: false, message: 'Bu kuruma erişim yetkiniz yok.' });
                    }
                    accounts = await AccountService.getAccountsByInstitution(requestedId);
                } else {
                    // Yetkili olduğu tüm kurumların hesaplarını getir
                    accounts = await AccountService.getAccountsByInstitutions(userInstitutionIds);
                }
            }

            res.json({ success: true, data: accounts });
        } catch (error) {
            next(error);
        }
    }

    // Hesap Listeleme (Kuruma göre - Legacy support or specific admin usage)
    async listByInstitution(req, res, next) {
        try {
            // Yetki kontrolü eklenebilir: Sadece admin veya o kurumun yetkilisi
            const accounts = await AccountService.getAccountsByInstitution(req.params.institutionId);
            res.json({ success: true, data: accounts });
        } catch (error) {
            next(error);
        }
    }
    // Hesap Silme
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            await AccountService.deleteAccount(id);
            res.json({ success: true, message: 'Hesap başarıyla silindi.' });
        } catch (error) {
            next(error);
        }
    }
    // Tekil Hesap Getir
    async getOne(req, res, next) {
        try {
            const { id } = req.params;
            const account = await AccountService.getAccountById(id);
            if (!account) {
                return res.status(404).json({ success: false, message: 'Hesap bulunamadı.' });
            }
            res.json({ success: true, data: account });
        } catch (error) {
            next(error);
        }
    }

    // Hesap Güncelleme
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const account = await AccountService.updateAccount(id, req.body);
            res.json({ success: true, data: account, message: 'Hesap güncellendi.' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AccountController();
