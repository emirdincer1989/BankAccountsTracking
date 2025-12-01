const ReportService = require('../services/ReportService');

class ReportController {
    async getDashboardStats(req, res, next) {
        try {
            const institutionId = req.user.institution_id;
            if (!institutionId) return res.status(403).json({ success: false, message: 'Kurum bilgisi yok' });

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
}

module.exports = new ReportController();
