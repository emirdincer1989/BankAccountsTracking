const TransactionService = require('../services/TransactionService');

class TransactionController {
    async list(req, res, next) {
        try {
            const user = req.user;
            let institution_ids = [];

            // Süper admin ise ve filtrede kurum seçilmediyse tüm kurumları görebilir
            // Ancak TransactionService şu an tek bir institution_id veya ID listesi bekleyecek şekilde güncellenmeli.
            // Şimdilik:
            // 1. Süper admin ise ve institution_id filtresi yoksa -> Tüm kurumlar (institution_ids = null veya boş array ile tümünü getir)
            // 2. Süper admin ise ve institution_id filtresi varsa -> O kurum
            // 3. Normal kullanıcı ise -> Kendi institution_ids listesi

            if (user.role_name === 'super_admin') {
                if (req.query.institution_id) {
                    institution_ids = [parseInt(req.query.institution_id)];
                } else {
                    institution_ids = null; // Hepsi
                }
            } else {
                institution_ids = user.institution_ids || [];
                if (institution_ids.length === 0) {
                    return res.status(403).json({ success: false, message: 'Herhangi bir kuruma yetkiniz bulunamadı.' });
                }

                // Eğer kullanıcı spesifik bir kurum filtrelemek isterse ve yetkisi varsa
                if (req.query.institution_id) {
                    const requestedId = parseInt(req.query.institution_id);
                    if (!institution_ids.includes(requestedId)) {
                        return res.status(403).json({ success: false, message: 'Bu kuruma erişim yetkiniz yok.' });
                    }
                    institution_ids = [requestedId];
                }
            }

            const filters = {
                institution_ids, // Artık array veya null
                account_id: req.query.account_id,
                start_date: req.query.start_date,
                end_date: req.query.end_date,
                min_amount: req.query.min_amount,
                max_amount: req.query.max_amount,
                search_text: req.query.search_text,
                limit: req.query.limit || 20,
                offset: req.query.offset || 0
            };

            const result = await TransactionService.searchTransactions(filters);
            res.json({ success: true, ...result });

        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TransactionController();
