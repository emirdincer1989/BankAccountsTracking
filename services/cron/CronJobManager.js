/**
 * Cron Job Manager
 *
 * Zamanlanmış işleri yönetir (başlat/durdur/tetikle).
 */

const cron = require('node-cron');
const { logger } = require('../../utils/logger');
const { query } = require('../../config/database');

class CronJobManager {
    constructor() {
        this.jobs = new Map(); // job name -> { cronTask, config, isRunning, taskFunction }
        this.runningExecutions = new Map(); // job name -> execution promise
        this.stoppedJobs = new Set(); // Durdurulmuş job'lar
    }

    /**
     * Database'den tüm job'ları yükle
     */
    async loadJobsFromDB() {
        try {
            const result = await query(`
                SELECT name, title, description, schedule, is_enabled, config
                FROM cron_jobs
                ORDER BY name
            `);

            logger.info(`✅ ${result.rows.length} cron job database'den yüklendi`);
            return result.rows;

        } catch (error) {
            logger.error('Database\'den job yükleme hatası:', error);
            throw error;
        }
    }

    /**
     * Tek bir job kaydet
     */
    registerJob(jobConfig, taskFunction) {
        const { name, schedule, is_enabled, config } = jobConfig;

        if (this.jobs.has(name)) {
            logger.warn(`Job zaten kayıtlı: ${name}`);
            return;
        }

        // Cron task oluştur
        const cronTask = cron.schedule(schedule, async () => {
            await this.executeJob(name, taskFunction, config);
        }, {
            scheduled: false,
            timezone: 'Europe/Istanbul'
        });

        this.jobs.set(name, {
            cronTask,
            config: jobConfig,
            isRunning: false,
            taskFunction
        });

        logger.info(`✓ ${name} kaydedildi (${schedule})`);

        // Eğer enabled ise başlat, değilse stopped list'e ekle
        if (is_enabled) {
            this.start(name);
        } else {
            this.stoppedJobs.add(name);
            logger.debug(`${name} disabled olarak kaydedildi`);
        }
    }

    /**
     * Job'ı çalıştır ve istatistikleri kaydet
     * @param {boolean} forceRun - Manuel tetiklemelerde disabled kontrolünü bypass et
     */
    async executeJob(name, taskFunction, config, forceRun = false) {
        // Database'den job'ın hala aktif olup olmadığını kontrol et
        // Manuel tetiklemelerde (forceRun = true) bu kontrolü bypass et
        if (!forceRun) {
            try {
                const jobStatus = await query('SELECT is_enabled FROM cron_jobs WHERE name = $1', [name]);
                if (jobStatus.rows.length === 0 || !jobStatus.rows[0].is_enabled) {
                    logger.warn(`⏸️  ${name} database'de pasif, execution atlanıyor`);
                    return { skipped: true, reason: 'Job disabled in database' };
                }
            } catch (err) {
                logger.error(`Database kontrolü hatası: ${name}`, err);
                return { skipped: true, reason: 'Database check failed' };
            }
        } else {
            logger.info(`🔓 ${name} manuel tetikleme - disabled kontrolü bypass ediliyor`);
        }

        // Job durdurulmuşsa çalıştırma
        // Manuel tetiklemelerde (forceRun = true) bu kontrolü de bypass et
        if (!forceRun && this.stoppedJobs.has(name)) {
            logger.warn(`⏸️  ${name} durdurulmuş, execution atlanıyor`);
            return { skipped: true, reason: 'Job stopped' };
        } else if (forceRun && this.stoppedJobs.has(name)) {
            logger.info(`🔓 ${name} manuel tetikleme - stopped kontrolü de bypass ediliyor`);
        }

        // Job zaten çalışıyorsa kontrol et
        if (this.runningExecutions.has(name)) {
            // Manuel tetiklemede ve job takılı kalmışsa temizle
            if (forceRun) {
                logger.warn(`⚠️  ${name} zaten çalışıyor görünüyor, takılı kalmış olabilir. Temizleniyor...`);
                
                // Database'de RUNNING durumundaki eski logları kontrol et (30 dakikadan eski)
                try {
                    const stuckLogs = await query(`
                        SELECT id FROM cron_job_logs
                        WHERE job_name = $1 
                        AND status = 'RUNNING'
                        AND started_at < NOW() - INTERVAL '30 minutes'
                    `, [name]);
                    
                    if (stuckLogs.rows.length > 0) {
                        logger.warn(`🔧 ${stuckLogs.rows.length} adet takılı kalmış log bulundu, temizleniyor...`);
                        await query(`
                            UPDATE cron_job_logs
                            SET status = 'FAILED',
                                completed_at = CURRENT_TIMESTAMP,
                                error_message = 'Job timeout - stuck execution cleared',
                                duration = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
                            WHERE job_name = $1 
                            AND status = 'RUNNING'
                            AND started_at < NOW() - INTERVAL '30 minutes'
                        `, [name]);
                    }
                } catch (err) {
                    logger.error('Stuck log temizleme hatası:', err);
                }
                
                // Memory'deki execution'ı temizle
                this.runningExecutions.delete(name);
                logger.info(`✅ ${name} execution temizlendi, yeniden başlatılıyor...`);
            } else {
                logger.warn(`${name} zaten çalışıyor, atlandı`);
                return { skipped: true, reason: 'Already running' };
            }
        }

        const startTime = new Date();
        logger.info(`🚀 ${name} başlatıldı`);

        // Log başlangıcını kaydet
        let logId;
        try {
            const logResult = await query(`
                INSERT INTO cron_job_logs (job_name, status, started_at)
                VALUES ($1, 'RUNNING', $2)
                RETURNING id
            `, [name, startTime]);
            logId = logResult.rows[0].id;
        } catch (err) {
            logger.error('Log kaydı oluşturulamadı:', err);
        }

        // Timeout mekanizması (30 dakika)
        const timeoutMs = 30 * 60 * 1000; // 30 dakika
        let timeoutHandle;
        
        const executionPromise = (async () => {
            try {
                // Timeout ayarla
                timeoutHandle = setTimeout(() => {
                    logger.error(`⏱️  ${name} timeout oldu (${timeoutMs}ms)`);
                    // Timeout durumunda execution'ı temizle
                    this.runningExecutions.delete(name);
                }, timeoutMs);
                
                // Task'ı çalıştır
                taskFunction.config = config;
                const result = await taskFunction();
                
                // Timeout'u temizle
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }

                const duration = Date.now() - startTime.getTime();

                // Başarılı - istatistikleri güncelle
                await query(`
                    UPDATE cron_jobs
                    SET last_run_at = $1,
                        last_run_status = 'SUCCESS',
                        last_run_duration = $2,
                        run_count = run_count + 1,
                        success_count = success_count + 1
                    WHERE name = $3
                `, [new Date(), duration, name]);

                // Log'u tamamla
                if (logId) {
                    await query(`
                        UPDATE cron_job_logs
                        SET status = 'SUCCESS',
                            completed_at = CURRENT_TIMESTAMP,
                            duration = $1,
                            result = $2
                        WHERE id = $3
                    `, [duration, JSON.stringify(result), logId]);
                }

                logger.info(`✅ ${name} tamamlandı (${duration}ms)`);

                // Socket.io ile frontend'e bildir (eğer testModalJob ise ve başarılıysa)
                logger.info(`🔍 DEBUG - global.io: ${!!global.io}, name: ${name}, result.success: ${result.success}`);
                if (global.io && name === 'testModalJob' && result.success) {
                    global.io.emit('cron-job-result', {
                        jobName: name,
                        result: result
                    });
                    logger.info(`📢 Socket event gönderildi: cron-job-result`);
                } else {
                    logger.warn(`⚠️ Socket event gönderilemedi - global.io: ${!!global.io}, name: ${name}, result.success: ${result?.success}`);
                }

                return result;

            } catch (error) {
                // Timeout'u temizle
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }
                
                const duration = Date.now() - startTime.getTime();

                // Hata - istatistikleri güncelle
                await query(`
                    UPDATE cron_jobs
                    SET last_run_at = $1,
                        last_run_status = 'FAILED',
                        last_run_duration = $2,
                        run_count = run_count + 1,
                        error_count = error_count + 1
                    WHERE name = $3
                `, [new Date(), duration, name]);

                // Log'u tamamla
                if (logId) {
                    await query(`
                        UPDATE cron_job_logs
                        SET status = 'FAILED',
                            completed_at = CURRENT_TIMESTAMP,
                            duration = $1,
                            error_message = $2,
                            error_stack = $3
                        WHERE id = $4
                    `, [duration, error.message, error.stack, logId]);
                }

                logger.error(`❌ ${name} hatası (${duration}ms):`, error.message);
                throw error;
            }
        })();

        this.runningExecutions.set(name, executionPromise);

        try {
            await executionPromise;
        } catch (error) {
            // Hata durumunda da execution'ı temizle
            logger.error(`❌ ${name} execution hatası, temizleniyor:`, error.message);
            throw error;
        } finally {
            // Her durumda execution'ı temizle
            this.runningExecutions.delete(name);
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
            logger.debug(`🧹 ${name} execution temizlendi`);
        }
    }

    /**
     * Job'ı başlat
     */
    start(name) {
        const jobData = this.jobs.get(name);
        if (!jobData) {
            throw new Error(`Job bulunamadı: ${name}`);
        }

        if (jobData.isRunning) {
            logger.warn(`${name} zaten çalışıyor`);
            return;
        }

        // Stopped list'ten çıkar
        this.stoppedJobs.delete(name);

        jobData.cronTask.start();
        jobData.isRunning = true;
        logger.info(`▶️  ${name} başlatıldı`);
    }

    /**
     * Job'ı durdur
     */
    stop(name) {
        const jobData = this.jobs.get(name);
        if (!jobData) {
            throw new Error(`Job bulunamadı: ${name}`);
        }

        if (!jobData.isRunning) {
            logger.warn(`${name} zaten durmuş`);
            return;
        }

        // Schedule'ı durdur
        jobData.cronTask.stop();
        jobData.isRunning = false;

        // Stopped list'e ekle
        this.stoppedJobs.add(name);

        logger.info(`⏸️  ${name} durduruldu`);
    }

    /**
     * Job'ı manuel çalıştır
     * Manuel tetiklemelerde disabled job'lar da çalıştırılır (forceRun = true)
     */
    async runNow(name) {
        const jobData = this.jobs.get(name);
        if (!jobData) {
            throw new Error(`Job bulunamadı: ${name}`);
        }

        logger.info(`▶️  ${name} manuel çalıştırılıyor...`);
        return await this.executeJob(name, jobData.taskFunction, jobData.config.config, true);
    }

    /**
     * Job'ın schedule'ını güncelle
     */
    async updateSchedule(name, newSchedule) {
        // Validate schedule
        if (!cron.validate(newSchedule)) {
            throw new Error('Geçersiz cron schedule formatı');
        }

        const jobData = this.jobs.get(name);
        if (!jobData) {
            throw new Error(`Job bulunamadı: ${name}`);
        }

        // Database'i güncelle
        await query(`
            UPDATE cron_jobs
            SET schedule = $1, updated_at = CURRENT_TIMESTAMP
            WHERE name = $2
        `, [newSchedule, name]);

        // Job'ı yeniden başlat
        const wasRunning = jobData.isRunning;

        if (wasRunning) {
            this.stop(name);
        }

        // Yeni schedule ile yeniden kaydet
        jobData.cronTask.destroy();

        const newCronTask = cron.schedule(newSchedule, async () => {
            await this.executeJob(name, jobData.taskFunction, jobData.config.config);
        }, {
            scheduled: false,
            timezone: 'Europe/Istanbul'
        });

        jobData.cronTask = newCronTask;
        jobData.config.schedule = newSchedule;

        if (wasRunning) {
            this.start(name);
        }

        logger.info(`✓ ${name} schedule güncellendi: ${newSchedule}`);
    }

    /**
     * Job durumunu database'den güncelle (enable/disable)
     */
    async updateJobStatus(name, isEnabled) {
        // Database'i güncelle
        await query(`
            UPDATE cron_jobs
            SET is_enabled = $1, updated_at = CURRENT_TIMESTAMP
            WHERE name = $2
        `, [isEnabled, name]);

        // Job'ı başlat veya durdur
        if (isEnabled) {
            this.start(name);
        } else {
            this.stop(name);
        }

        logger.info(`✓ ${name} ${isEnabled ? 'aktif edildi' : 'pasif edildi'}`);
    }

    /**
     * Job durumunu al
     */
    getStatus(name) {
        const jobData = this.jobs.get(name);
        if (!jobData) {
            return null;
        }

        return {
            name,
            isRunning: jobData.isRunning,
            isExecuting: this.runningExecutions.has(name),
            config: jobData.config
        };
    }

    /**
     * Tüm job'ların durumunu al
     */
    getAllStatus() {
        const statuses = [];
        for (const [name] of this.jobs.entries()) {
            statuses.push(this.getStatus(name));
        }
        return statuses;
    }

    /**
     * Takılı kalmış job'ları temizle
     */
    async clearStuckJobs() {
        logger.info('🔧 Takılı kalmış job'lar temizleniyor...');
        
        try {
            // Database'de RUNNING durumundaki eski logları bul (30 dakikadan eski)
            const stuckLogs = await query(`
                SELECT DISTINCT job_name FROM cron_job_logs
                WHERE status = 'RUNNING'
                AND started_at < NOW() - INTERVAL '30 minutes'
            `);
            
            for (const log of stuckLogs.rows) {
                const jobName = log.job_name;
                logger.warn(`🔧 ${jobName} için takılı kalmış loglar temizleniyor...`);
                
                // Logları FAILED olarak işaretle
                await query(`
                    UPDATE cron_job_logs
                    SET status = 'FAILED',
                        completed_at = CURRENT_TIMESTAMP,
                        error_message = 'Job timeout - stuck execution cleared',
                        duration = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
                    WHERE job_name = $1 
                    AND status = 'RUNNING'
                    AND started_at < NOW() - INTERVAL '30 minutes'
                `, [jobName]);
                
                // Memory'deki execution'ı temizle
                if (this.runningExecutions.has(jobName)) {
                    this.runningExecutions.delete(jobName);
                    logger.info(`✅ ${jobName} execution memory'den temizlendi`);
                }
            }
            
            logger.info(`✅ ${stuckLogs.rows.length} job için takılı kalmış execution temizlendi`);
            return stuckLogs.rows.length;
        } catch (error) {
            logger.error('Takılı kalmış job temizleme hatası:', error);
            return 0;
        }
    }

    /**
     * Tüm job'ları durdur (graceful shutdown)
     */
    async shutdown() {
        logger.info('Cron Job Manager kapatılıyor...');

        for (const [name] of this.jobs.entries()) {
            try {
                if (this.jobs.get(name).isRunning) {
                    this.stop(name);
                }
            } catch (err) {
                logger.error(`${name} durdurulurken hata:`, err);
            }
        }

        logger.info('Cron Job Manager kapatıldı');
    }
}

// Singleton instance
let instance = null;

/**
 * Cron Manager singleton instance döndür
 */
function getCronJobManager() {
    if (!instance) {
        instance = new CronJobManager();
    }
    return instance;
}

module.exports = { CronJobManager, getCronJobManager };
