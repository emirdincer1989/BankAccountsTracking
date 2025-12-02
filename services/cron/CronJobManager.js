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

        // Job zaten çalışıyorsa atla
        if (this.runningExecutions.has(name)) {
            logger.warn(`${name} zaten çalışıyor, atlandı`);
            return { skipped: true, reason: 'Already running' };
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

        // Job timeout: Cron 5 dakikada bir çalışıyor, bu yüzden 4 dakika timeout
        const JOB_TIMEOUT_MS = 4 * 60 * 1000; // 4 dakika
        
        const executionPromise = (async () => {
            try {
                // Task'ı çalıştır (timeout ile)
                taskFunction.config = config;
                
                logger.info(`⏱️  ${name} başlatıldı, timeout: ${JOB_TIMEOUT_MS / 1000}sn`);
                
                // Timeout wrapper ekle
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => {
                        logger.error(`⏰ ${name} timeout oldu (${JOB_TIMEOUT_MS / 1000}sn)`);
                        reject(new Error(`Job ${name} timeout oldu (${JOB_TIMEOUT_MS / 1000}sn)`));
                    }, JOB_TIMEOUT_MS);
                });
                
                // Job'un başladığını işaretle
                const jobStartTime = Date.now();
                const jobPromise = taskFunction().catch(error => {
                    logger.error(`❌ ${name} içinde hata:`, error.message);
                    throw error;
                });
                
                const result = await Promise.race([
                    jobPromise,
                    timeoutPromise
                ]);
                
                const jobDuration = Date.now() - jobStartTime;
                logger.info(`✅ ${name} tamamlandı (${jobDuration}ms)`);

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
                    logger.warn(`⚠️ Socket event gönderilemedi - global.io: ${!!global.io}, name: ${name}, result.success: ${result && result.success}`);
                }

                return result;

            } catch (error) {
                const duration = Date.now() - startTime.getTime();

                logger.error(`❌ ${name} hatası (${duration}ms):`, error.message);
                logger.error(`Stack trace:`, error.stack);

                // Log'u önce tamamla (logId varsa)
                if (logId) {
                    try {
                        await query(`
                            UPDATE cron_job_logs
                            SET status = 'FAILED',
                                completed_at = CURRENT_TIMESTAMP,
                                duration = $1,
                                error_message = $2,
                                error_stack = $3
                            WHERE id = $4
                        `, [duration, error.message.substring(0, 500), (error.stack || '').substring(0, 2000), logId]);
                        logger.info(`✅ Log kaydı güncellendi (ID: ${logId})`);
                    } catch (logError) {
                        logger.error(`❌ Log kaydı güncellenemedi:`, logError.message);
                    }
                } else {
                    logger.warn(`⚠️  Log ID yok, log kaydı güncellenemedi`);
                }

                // Hata - istatistikleri güncelle
                try {
                    await query(`
                        UPDATE cron_jobs
                        SET last_run_at = $1,
                            last_run_status = 'FAILED',
                            last_run_duration = $2,
                            run_count = run_count + 1,
                            error_count = error_count + 1
                        WHERE name = $3
                    `, [new Date(), duration, name]);
                } catch (statsError) {
                    logger.error(`❌ İstatistik güncellenemedi:`, statsError.message);
                }

                throw error;
            }
        })();

        this.runningExecutions.set(name, executionPromise);

        // Timeout koruması: Eğer job çok uzun sürerse memory'den temizle
        const cleanupTimeout = setTimeout(() => {
            if (this.runningExecutions.has(name)) {
                logger.warn(`⚠️  ${name} timeout oldu, memory'den temizleniyor`);
                this.runningExecutions.delete(name);
            }
        }, JOB_TIMEOUT_MS + 60000); // Job timeout + 1 dakika ekstra

        try {
            await executionPromise;
        } catch (error) {
            // Hata zaten log'landı, burada sadece re-throw ediyoruz
            throw error;
        } finally {
            clearTimeout(cleanupTimeout);
            this.runningExecutions.delete(name);
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
     * RUNNING durumunda olan ama 10 dakikadan fazla süredir çalışan log kayıtlarını FAILED olarak işaretle
     */
    async clearStuckJobs() {
        try {
            logger.info('🔧 Takılı kalmış job\'lar temizleniyor...');
            
            // 2 dakikadan fazla süredir RUNNING durumunda olan log kayıtlarını bul
            // (Job timeout 4 dakika, ama normalde job'lar çok daha hızlı bitmeli)
            // Eğer 2 dakikadan fazla RUNNING ise muhtemelen takılı kalmıştır
            const stuckLogs = await query(`
                SELECT id, job_name, started_at,
                       EXTRACT(EPOCH FROM (NOW() - started_at)) as seconds_ago
                FROM cron_job_logs
                WHERE status = 'RUNNING'
                AND started_at < NOW() - INTERVAL '2 minutes'
                ORDER BY started_at ASC
            `);

            if (stuckLogs.rows.length === 0) {
                logger.info('✅ Takılı kalmış job bulunamadı');
                return { cleared: 0 };
            }

            logger.warn(`⚠️  ${stuckLogs.rows.length} takılı kalmış job bulundu`);

            // Her birini FAILED olarak işaretle
            for (const log of stuckLogs.rows) {
                const duration = Math.round(log.seconds_ago * 1000); // saniyeyi ms'ye çevir
                const minutesAgo = Math.round(log.seconds_ago / 60);
                
                try {
                    await query(`
                        UPDATE cron_job_logs
                        SET status = 'FAILED',
                            completed_at = CURRENT_TIMESTAMP,
                            duration = $1,
                            error_message = $2
                        WHERE id = $3
                    `, [
                        duration, 
                        `Job timeout - ${minutesAgo} dakikadan fazla süredir çalışıyordu (takılı kalmış)`, 
                        log.id
                    ]);

                    logger.warn(`❌ Takılı job temizlendi: ${log.job_name} (Log ID: ${log.id}, ${minutesAgo} dakika)`);
                } catch (updateError) {
                    logger.error(`❌ Log güncellenemedi (ID: ${log.id}):`, updateError.message);
                }
            }

            // Memory'deki runningExecutions'ı da temizle
            for (const log of stuckLogs.rows) {
                if (this.runningExecutions.has(log.job_name)) {
                    this.runningExecutions.delete(log.job_name);
                    logger.info(`🧹 Memory\'den temizlendi: ${log.job_name}`);
                }
            }

            logger.info(`✅ ${stuckLogs.rows.length} takılı job temizlendi`);
            return { cleared: stuckLogs.rows.length };

        } catch (error) {
            logger.error('❌ Takılı job\'lar temizlenirken hata:', error);
            throw error;
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