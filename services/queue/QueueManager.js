const { Queue, Worker } = require('bullmq');
const { logger } = require('../../utils/logger');
const AccountService = require('../AccountService');

// Redis Connection Config
const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
};

// 1. Queue Definition
const bankSyncQueue = new Queue('bank-sync', { connection });

// 2. Worker Processor
const bankSyncProcessor = async (job) => {
    const { accountId } = job.data;
    logger.info(`Job ${job.id}: Starting sync for Account ${accountId}`);

    try {
        const result = await AccountService.syncAccount(accountId);
        logger.info(`Job ${job.id}: Sync completed for Account ${accountId}. New Tx: ${result.newTransactions}`);
        return result;
    } catch (error) {
        logger.error(`Job ${job.id}: Sync failed for Account ${accountId}`, error);
        throw error; // BullMQ will handle retries
    }
};

// 3. Worker Initialization
let worker;

const initWorkers = () => {
    worker = new Worker('bank-sync', bankSyncProcessor, {
        connection,
        concurrency: 5, // Aynı anda 5 hesap taranabilir
        limiter: {
            max: 10,
            duration: 1000 // Saniyede max 10 işlem (Rate limiting)
        }
    });

    worker.on('completed', (job) => {
        logger.info(`Job ${job.id} completed!`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`Job ${job.id} failed with ${err.message}`);
    });

    logger.info('🚀 BullMQ Worker initialized: bank-sync');
};

module.exports = {
    bankSyncQueue,
    initWorkers
};
