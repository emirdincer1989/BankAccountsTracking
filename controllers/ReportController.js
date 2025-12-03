const ReportService = require('../services/ReportService');

class ReportController {
    async getDashboardStats(req, res, next) {
        try {
            const user = req.user;
            let institutionIds = [];

            // Süper admin ise ve filtrede kurum seçilmediyse tüm kurumları görebilir
            if (user.role_name === 'super_admin') {
                if (req.query.institution_id) {
                    institutionIds = [parseInt(req.query.institution_id)];
                } else {
                    // Süper admin için tüm kurumları getir (null = hepsi)
                    institutionIds = null;
                }
            } else {
                institutionIds = user.institution_ids || [];
                if (institutionIds.length === 0) {
                    return res.status(403).json({ success: false, message: 'Herhangi bir kuruma yetkiniz bulunamadı.' });
                }

                // Eğer kullanıcı spesifik bir kurum filtrelemek isterse ve yetkisi varsa
                if (req.query.institution_id) {
                    const requestedId = parseInt(req.query.institution_id);
                    if (!institutionIds.includes(requestedId)) {
                        return res.status(403).json({ success: false, message: 'Bu kuruma erişim yetkiniz yok.' });
                    }
                    institutionIds = [requestedId];
                }
            }

            // Eğer tek bir kurum varsa veya null ise (süper admin), ilk kurumu kullan veya tümünü
            // ReportService şu an tek institution_id bekliyor, bu yüzden ilk kurumu kullanıyoruz
            // Gelecekte ReportService'i güncelleyebiliriz
            const institutionId = institutionIds === null ? null : (institutionIds.length > 0 ? institutionIds[0] : null);

            const [summary, distribution, dailyFlow] = await Promise.all([
                ReportService.getSummaryStats(institutionId),
                ReportService.getBalanceDistribution(institutionId),
                ReportService.getDailyFlow(institutionId, 7)
            ]);

            res.json({
                success: true,
                data: {
                    summary,
                    distribution,
                    dailyFlow
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async getBalanceHistory(req, res, next) {
        try {
            const user = req.user;
            let institutionIds = [];

            // Süper admin ise ve filtrede kurum seçilmediyse tüm kurumları görebilir
            if (user.role_name === 'super_admin') {
                if (req.query.institution_id) {
                    institutionIds = [parseInt(req.query.institution_id)];
                } else {
                    // Süper admin için tüm kurumları getir (null = hepsi)
                    institutionIds = null;
                }
            } else {
                institutionIds = user.institution_ids || [];
                if (institutionIds.length === 0) {
                    return res.status(403).json({ success: false, message: 'Herhangi bir kuruma yetkiniz bulunamadı.' });
                }

                // Eğer kullanıcı spesifik bir kurum filtrelemek isterse ve yetkisi varsa
                if (req.query.institution_id) {
                    const requestedId = parseInt(req.query.institution_id);
                    if (!institutionIds.includes(requestedId)) {
                        return res.status(403).json({ success: false, message: 'Bu kuruma erişim yetkiniz yok.' });
                    }
                    institutionIds = [requestedId];
                }
            }

            // Eğer tek bir kurum varsa veya null ise (süper admin), ilk kurumu kullan veya tümünü
            const institutionId = institutionIds === null ? null : (institutionIds.length > 0 ? institutionIds[0] : null);

            const groupByBank = req.query.groupByBank === 'true';
            const days = parseInt(req.query.days) || 30;

            const balanceHistory = await ReportService.getBalanceHistory(institutionId, groupByBank, days);

            res.json({
                success: true,
                data: balanceHistory
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ReportController();
