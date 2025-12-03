/**
 * Cron Management Routes
 *
 * Cron job'ları yönetmek için API endpoints.
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../config/database');
const { logger } = require('../utils/logger');
const { getCronJobManager } = require('../services/cron/CronJobManager');

/**
 * Middleware: Sadece super_admin erişebilir
 */
const requireSuperAdmin = (req, res, next) => {
    if (req.user.role_name !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Bu işlem için super admin yetkisi gereklidir'
        });
    }
    next();
};

// Tüm route'lar authentication ve super admin gerektirir
router.use(authMiddleware);
router.use(requireSuperAdmin);

/**
 * Cron schedule'ı insan okunabilir formata çevir
 */
function humanizeSchedule(schedule) {
    const schedules = {
        '* * * * *': 'Her dakika',
        '*/2 * * * *': 'Her 2 dakikada',
        '*/5 * * * *': 'Her 5 dakikada',
        '*/10 * * * *': 'Her 10 dakikada',
        '*/15 * * * *': 'Her 15 dakikada',
        '*/30 * * * *': 'Her 30 dakikada',
        '0 * * * *': 'Her saat başı',
        '0 */2 * * *': 'Her 2 saatte',
        '0 */4 * * *': 'Her 4 saatte',
        '0 */6 * * *': 'Her 6 saatte',
        '0 0 * * *': 'Her gün gece yarısı',
        '0 6 * * *': 'Her gün sabah 06:00',
        '0 12 * * *': 'Her gün öğlen 12:00',
        '0 18 * * *': 'Her gün akşam 18:00'
    };

    return schedules[schedule] || schedule;
}

/**
 * GET /api/cron-management/jobs
 * Tüm cron job'ları listele
 */
router.get('/jobs', async (req, res) => {
    try {
        logger.info('Cron jobs listesi istendi');

        // Database'den job'ları al
        const result = await query(`
            SELECT
                id,
                name,
                title,
                description,
                schedule,
                is_enabled,
                last_run_at,
                last_run_status,
                last_run_duration,
                run_count,
                success_count,
                error_count,
                config,
                created_at,
                updated_at
            FROM cron_jobs
            ORDER BY name
        `);

        const jobs = result.rows.map(job => {
            const successRate = job.run_count > 0
                ? Math.round(((job.success_count) / job.run_count) * 100)
                : 100;

            return {
                id: job.id,
                name: job.name,
                title: job.title,
                description: job.description,
                schedule: job.schedule,
                scheduleText: humanizeSchedule(job.schedule),
                isEnabled: job.is_enabled,
                lastRun: job.last_run_at,
                lastRunStatus: job.last_run_status,
                lastRunDuration: job.last_run_duration,
                runCount: job.run_count || 0,
                successCount: job.success_count || 0,
                errorCount: job.error_count || 0,
                successRate: successRate,
                config: job.config || {},
                createdAt: job.created_at,
                updatedAt: job.updated_at
            };
        });

        res.json({
            success: true,
            data: {
                jobs,
                summary: {
                    total: jobs.length,
                    enabled: jobs.filter(j => j.isEnabled).length,
                    disabled: jobs.filter(j => !j.isEnabled).length
                }
            }
        });

    } catch (error) {
        logger.error('Jobs listesi alma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Job listesi alınırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * POST /api/cron-management/jobs/:name/toggle
 * Job'ı aktif/pasif yap
 */
router.post('/jobs/:name/toggle', async (req, res) => {
    try {
        const { name } = req.params;
        const { enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'enabled parametresi boolean olmalıdır'
            });
        }

        logger.info(`Job toggle: ${name} -> ${enabled ? 'ENABLED' : 'DISABLED'} by user ${req.user.id}`);

        // Database'i güncelle
        await query(`
            UPDATE cron_jobs
            SET is_enabled = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
            WHERE name = $3
        `, [enabled, req.user.id, name]);

        // CronJobManager'a bildir
        try {
            const cronManager = getCronJobManager();
            await cronManager.updateJobStatus(name, enabled);
        } catch (err) {
            logger.warn('CronJobManager güncelleme uyarısı:', err.message);
        }

        // Audit log
        await query(`
            INSERT INTO audit_logs (user_id, action, table_name, new_values)
            VALUES ($1, $2, $3, $4)
        `, [
            req.user.id,
            enabled ? 'ENABLE_JOB' : 'DISABLE_JOB',
            'cron_jobs',
            JSON.stringify({ name, enabled })
        ]);

        res.json({
            success: true,
            message: `${name} ${enabled ? 'aktif edildi' : 'pasif edildi'}`,
            data: { name, enabled }
        });

    } catch (error) {
        logger.error('Job toggle hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Job durumu değiştirilirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * POST /api/cron-management/jobs/:name/trigger
 * Job'ı manuel olarak çalıştır
 */
router.post('/jobs/:name/trigger', async (req, res) => {
    try {
        const { name } = req.params;

        logger.info(`Job manuel tetikleme: ${name} by user ${req.user.id}`);

        // CronJobManager üzerinden çalıştır
        const cronManager = getCronJobManager();
        
        // Önce takılı kalmış job'ları temizle
        try {
            await cronManager.clearStuckJobs();
        } catch (clearError) {
            logger.warn('Stuck job temizleme hatası (devam ediliyor):', clearError.message);
        }
        
        // Job zaten çalışıyor mu kontrol et
        const status = cronManager.getStatus(name);
        if (status && status.isExecuting) {
            return res.json({
                success: true,
                message: `${name} zaten çalışıyor`,
                data: { skipped: true, reason: 'Already running' }
            });
        }
        
        // Job'ı asenkron çalıştır (fire-and-forget)
        // Hemen response dön, job arka planda çalışsın
        cronManager.runNow(name)
            .then(result => {
                logger.info(`✅ ${name} manuel tetikleme tamamlandı:`, result);
            })
            .catch(error => {
                logger.error(`❌ ${name} manuel tetikleme hatası:`, error);
            });

        // Audit log (asenkron)
        query(`
            INSERT INTO audit_logs (user_id, action, table_name, new_values)
            VALUES ($1, $2, $3, $4)
        `, [
            req.user.id,
            'TRIGGER_JOB',
            'cron_jobs',
            JSON.stringify({ name, triggered_at: new Date() })
        ]).catch(err => {
            logger.error('Audit log hatası:', err);
        });

        // Hemen response dön (job arka planda çalışıyor)
        res.json({
            success: true,
            message: `${name} başlatıldı, arka planda çalışıyor. Durumu loglardan takip edebilirsiniz.`,
            data: { 
                triggered: true,
                message: 'Job arka planda çalışıyor, loglardan takip edebilirsiniz'
            }
        });

    } catch (error) {
        logger.error('Job trigger hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Job tetiklenirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * PUT /api/cron-management/jobs/:name/schedule
 * Job'ın schedule'ını güncelle
 */
router.put('/jobs/:name/schedule', async (req, res) => {
    try {
        const { name } = req.params;
        const { schedule } = req.body;

        if (!schedule || typeof schedule !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir schedule değeri gerekli'
            });
        }

        // Cron expression'ı validate et
        const cron = require('node-cron');
        if (!cron.validate(schedule)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz cron schedule formatı'
            });
        }

        logger.info(`Job schedule güncelleme: ${name} -> ${schedule} by user ${req.user.id}`);

        // Database'i güncelle
        await query(`
            UPDATE cron_jobs
            SET schedule = $1, updated_at = CURRENT_TIMESTAMP, updated_by = $2
            WHERE name = $3
        `, [schedule, req.user.id, name]);

        // CronJobManager'da da güncelle
        let managerUpdateSuccess = false;
        let managerUpdateError = null;
        
        try {
            const cronManager = getCronJobManager();
            await cronManager.updateSchedule(name, schedule);
            logger.info(`✅ Schedule CronJobManager'da da güncellendi: ${name} -> ${schedule}`);
            
            // Güncellemenin başarılı olduğunu doğrula
            const status = cronManager.getStatus(name);
            if (status && status.config.schedule === schedule) {
                managerUpdateSuccess = true;
                logger.info(`✅ Schedule doğrulandı: ${status.config.schedule}`);
            } else {
                logger.warn(`⚠️  Schedule doğrulama başarısız: Beklenen ${schedule}, Bulunan ${status?.config?.schedule || 'N/A'}`);
            }
        } catch (err) {
            managerUpdateError = err.message;
            logger.error(`❌ CronJobManager güncellenemedi: ${err.message}`);
            logger.error(`Stack:`, err.stack);
        }

        // Audit log
        await query(`
            INSERT INTO audit_logs (user_id, action, table_name, new_values)
            VALUES ($1, $2, $3, $4)
        `, [
            req.user.id,
            'UPDATE_JOB_SCHEDULE',
            'cron_jobs',
            JSON.stringify({ name, schedule, scheduleText: humanizeSchedule(schedule) })
        ]);

        // Eğer CronJobManager güncellenemediyse uyarı ver
        if (!managerUpdateSuccess) {
            const warningMessage = managerUpdateError 
                ? `Schedule veritabanında güncellendi ancak memory'de güncellenemedi. Server'ı yeniden başlatmanız gerekebilir. Hata: ${managerUpdateError}`
                : `Schedule veritabanında güncellendi ancak memory'de doğrulanamadı. Server'ı yeniden başlatmanız gerekebilir.`;
            
            logger.warn(`⚠️  ${warningMessage}`);
            
            res.json({
                success: true,
                message: `${name} schedule veritabanında güncellendi`,
                warning: warningMessage,
                requiresRestart: true,
                data: {
                    name,
                    schedule,
                    scheduleText: humanizeSchedule(schedule),
                    managerUpdated: managerUpdateSuccess
                }
            });
        } else {
            res.json({
                success: true,
                message: `${name} schedule güncellendi ve aktif hale getirildi`,
                data: {
                    name,
                    schedule,
                    scheduleText: humanizeSchedule(schedule),
                    managerUpdated: true
                }
            });
        }

    } catch (error) {
        logger.error('Schedule güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Schedule güncellenirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * GET /api/cron-management/logs
 * Job log'larını getir
 */
router.get('/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const jobName = req.query.jobName;
        const status = req.query.status;

        let whereClause = '';
        const params = [limit, offset];
        let paramIndex = 3;

        if (jobName) {
            whereClause += `WHERE job_name = $${paramIndex}`;
            params.push(jobName);
            paramIndex++;
        }

        if (status) {
            whereClause += whereClause ? ' AND ' : 'WHERE ';
            whereClause += `status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        const logs = await query(`
            SELECT
                id,
                job_name,
                status,
                started_at,
                completed_at,
                duration,
                result,
                error_message,
                created_at
            FROM cron_job_logs
            ${whereClause}
            ORDER BY started_at DESC
            LIMIT $1 OFFSET $2
        `, params);

        const totalCount = await query(`
            SELECT COUNT(*) as count
            FROM cron_job_logs
            ${whereClause}
        `, params.slice(2));

        res.json({
            success: true,
            data: {
                logs: logs.rows,
                pagination: {
                    limit,
                    offset,
                    total: parseInt(totalCount.rows[0].count)
                }
            }
        });

    } catch (error) {
        logger.error('Logs getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Log kayıtları alınırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * DELETE /api/cron-management/logs
 * Tüm cron job loglarını temizle
 */
router.delete('/logs', async (req, res) => {
    try {
        const { jobName } = req.query;

        logger.info(`Log temizleme işlemi başlatıldı${jobName ? ` (job: ${jobName})` : ''} by user ${req.user.id}`);

        let deleteQuery;
        let params = [];

        if (jobName) {
            // Belirli bir job'ın loglarını temizle
            deleteQuery = `DELETE FROM cron_job_logs WHERE job_name = $1`;
            params = [jobName];
        } else {
            // Tüm logları temizle
            deleteQuery = `DELETE FROM cron_job_logs`;
        }

        const result = await query(deleteQuery, params);
        const deletedCount = result.rowCount || 0;

        // Audit log
        await query(`
            INSERT INTO audit_logs (user_id, action, table_name, new_values)
            VALUES ($1, $2, $3, $4)
        `, [
            req.user.id,
            'CLEAR_CRON_LOGS',
            'cron_job_logs',
            JSON.stringify({ jobName: jobName || 'ALL', deletedCount })
        ]);

        logger.info(`${deletedCount} adet log kaydı silindi`);

        res.json({
            success: true,
            message: jobName 
                ? `${jobName} job'ına ait ${deletedCount} adet log kaydı temizlendi`
                : `Tüm loglar temizlendi (${deletedCount} adet)`,
            data: {
                deletedCount
            }
        });

    } catch (error) {
        logger.error('Log temizleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Loglar temizlenirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * POST /api/cron-management/clear-stuck-jobs
 * Takılı kalmış job'ları temizle
 */
router.post('/clear-stuck-jobs', async (req, res) => {
    try {
        logger.info(`Takılı kalmış job'lar temizleniyor by user ${req.user.id}`);

        const cronManager = getCronJobManager();
        const clearedCount = await cronManager.clearStuckJobs();

        // Audit log
        await query(`
            INSERT INTO audit_logs (user_id, action, table_name, new_values)
            VALUES ($1, $2, $3, $4)
        `, [
            req.user.id,
            'CLEAR_STUCK_JOBS',
            'cron_jobs',
            JSON.stringify({ clearedCount })
        ]);

        res.json({
            success: true,
            message: `${clearedCount} adet takılı kalmış job temizlendi`,
            data: { clearedCount }
        });

    } catch (error) {
        logger.error('Stuck job temizleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Takılı kalmış job\'lar temizlenirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * POST /api/cron-management/restart-server
 * Server'ı yeniden başlat (Plesk Passenger için)
 */
router.post('/restart-server', async (req, res) => {
    try {
        logger.info(`Server restart isteği: user ${req.user.id}`);

        const fs = require('fs');
        const path = require('path');

        // Plesk Passenger restart için tmp/restart.txt dosyası oluştur
        const restartFile = path.join(__dirname, '../tmp/restart.txt');
        const tmpDir = path.dirname(restartFile);

        // tmp dizini yoksa oluştur
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        // Restart dosyasını oluştur
        fs.writeFileSync(restartFile, new Date().toISOString());
        
        logger.info(`✅ Restart dosyası oluşturuldu: ${restartFile}`);

        // Audit log
        await query(`
            INSERT INTO audit_logs (user_id, action, table_name, new_values)
            VALUES ($1, $2, $3, $4)
        `, [
            req.user.id,
            'RESTART_SERVER',
            'server',
            JSON.stringify({ restartFile, timestamp: new Date().toISOString() })
        ]);

        res.json({
            success: true,
            message: 'Server yeniden başlatma isteği gönderildi. Birkaç saniye içinde server yeniden başlayacak.',
            data: {
                restartFile,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        logger.error('Server restart hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Server yeniden başlatılırken hata oluştu',
            error: error.message
        });
    }
});

/**
 * GET /api/cron-management/stats
 * İstatistikler
 */
router.get('/stats', async (req, res) => {
    try {
        // Son 24 saatlik istatistikler
        const last24h = await query(`
            SELECT
                COUNT(*) as total_runs,
                COUNT(*) FILTER (WHERE status = 'SUCCESS') as successful_runs,
                COUNT(*) FILTER (WHERE status = 'FAILED') as failed_runs,
                AVG(duration) FILTER (WHERE status = 'SUCCESS') as avg_duration
            FROM cron_job_logs
            WHERE started_at >= NOW() - INTERVAL '24 hours'
        `);

        res.json({
            success: true,
            data: {
                last24Hours: {
                    totalRuns: parseInt(last24h.rows[0].total_runs || 0),
                    successfulRuns: parseInt(last24h.rows[0].successful_runs || 0),
                    failedRuns: parseInt(last24h.rows[0].failed_runs || 0),
                    avgDuration: Math.round(last24h.rows[0].avg_duration || 0)
                }
            }
        });

    } catch (error) {
        logger.error('Stats getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'İstatistikler alınırken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;
